// =============================================================
// Insta Saver — background service worker
// Uses Instagram's API to fetch the exact story/post being viewed,
// then downloads it via chrome.downloads.
// =============================================================

const IG_APP_ID = "936619743392459"; // Instagram's public web app ID

// Build common headers for Instagram API requests
function igHeaders(csrftoken) {
  const h = {
    "x-ig-app-id": IG_APP_ID,
    "x-requested-with": "XMLHttpRequest",
  };
  if (csrftoken) h["x-csrftoken"] = csrftoken;
  return h;
}

// Fetch user ID from username
async function getUserId(username, csrftoken) {
  const resp = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    { headers: igHeaders(csrftoken), credentials: "include" }
  );
  if (!resp.ok) throw new Error(`Profile fetch failed: ${resp.status}`);
  const data = await resp.json();
  return data?.data?.user?.id || null;
}

// Fetch stories for a user ID and find the specific story item
async function getStoryItem(userId, storyId, csrftoken) {
  const resp = await fetch(
    `https://www.instagram.com/api/v1/feed/reels_media/?reel_ids=${userId}`,
    { headers: igHeaders(csrftoken), credentials: "include" }
  );
  if (!resp.ok) throw new Error(`Stories fetch failed: ${resp.status}`);
  const data = await resp.json();

  // Instagram returns { reels: { "userId": { items: [...] } } }
  const reels = data?.reels || {};
  const reel = reels[userId] || Object.values(reels)[0];
  if (!reel || !reel.items) return null;

  for (const item of reel.items) {
    const pk = String(item.pk || "");
    const id = String(item.id || "");
    if (pk === storyId || id.split("_")[0] === storyId) {
      return item;
    }
  }

  // If storyId didn't match, return the first item as fallback
  // (user might be on a story without ID in URL)
  return reel.items[0] || null;
}

// Extract the best media URL from a story item
function extractMediaUrl(item) {
  if (!item) return null;

  // Video story
  if (item.video_versions && item.video_versions.length > 0) {
    // video_versions is sorted by quality, first = best
    return { url: item.video_versions[0].url, isVideo: true };
  }

  // Image story
  if (item.image_versions2 && item.image_versions2.candidates && item.image_versions2.candidates.length > 0) {
    return { url: item.image_versions2.candidates[0].url, isVideo: false };
  }

  return null;
}

// Main handler: fetch story from API and download
// Main handler: fetch story from API and download
async function handleDownloadStory(message) {
  const { username, storyId, csrftoken } = message;

  try {
    // Step 1: Get user ID
    const userId = await getUserId(username, csrftoken);
    if (!userId) return { success: false, error: "Could not find user ID" };

    // Step 2: Fetch stories and find the item
    const item = await getStoryItem(userId, storyId || "", csrftoken);
    if (!item) return { success: false, error: "Story not found or expired" };

    // Step 3: Extract media URL
    const media = extractMediaUrl(item);
    if (!media) return { success: false, error: "No media in story item" };

    // Step 4: Download
    const timestamp = Date.now();
    const ext = media.isVideo ? "mp4" : "jpg";
    // Format: instaloader_profile_name_story_time
    const filename = `instaloader_${username}_story_${timestamp}.${ext}`;

    return new Promise((resolve) => {
      chrome.downloads.download(
        { url: media.url, filename, conflictAction: "uniquify" },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Download failed:", chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            console.log("Download started, id:", downloadId);
            resolve({ success: true, downloadId });
          }
        }
      );
    });
  } catch (err) {
    console.error("[Insta Saver] API error:", err);
    return { success: false, error: err.message };
  }
}

// Direct URL download (fallback for images detected from DOM)
function handleDirectDownload(message) {
  const { url, isVideo, username } = message;
  const timestamp = Date.now();
  const ext = isVideo ? "mp4" : "jpg";
  const user = username || "user";
  // Fallback downloads are usually posts
  const filename = `instaloader_${user}_post_${timestamp}.${ext}`;

  return new Promise((resolve) => {
    chrome.downloads.download(
      { url, filename, conflictAction: "uniquify" },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("Download failed:", chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log("Download started, id:", downloadId);
          resolve({ success: true, downloadId });
        }
      }
    );
  });
}

// ---------------------------------------------------------------
// Post / Reel download via API
// ---------------------------------------------------------------

// Fetch media info for a post by its shortcode (from /p/SHORTCODE/ or /reel/SHORTCODE/)
async function getPostMedia(shortcode, csrftoken) {
  // Use the graphql info endpoint
  const resp = await fetch(
    `https://www.instagram.com/api/v1/media/${shortcode}/info/`,
    { headers: igHeaders(csrftoken), credentials: "include" }
  );
  if (!resp.ok) throw new Error(`Post info fetch failed: ${resp.status}`);
  const data = await resp.json();

  const items = data?.items || [];
  if (items.length === 0) return null;

  return items[0];
}

// Convert a shortcode to a media ID (needed for the info endpoint)
// Instagram shortcodes are base64-encoded media IDs
function shortcodeToMediaId(shortcode) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let id = BigInt(0);
  for (const char of shortcode) {
    id = id * BigInt(64) + BigInt(alphabet.indexOf(char));
  }
  return id.toString();
}

// Extract all media URLs from a post item (handles carousels)
function extractPostMedia(item) {
  if (!item) return [];

  const results = [];
  const username = item.user?.username || "";

  // Carousel post (multiple images/videos)
  if (item.carousel_media && item.carousel_media.length > 0) {
    for (const child of item.carousel_media) {
      const media = extractMediaUrl(child);
      if (media) results.push({ ...media, username });
    }
    return results;
  }

  // Single post
  const media = extractMediaUrl(item);
  if (media) results.push({ ...media, username });
  return results;
}

// Main handler: fetch post from API and download ALL media
async function handleDownloadPost(message) {
  const { shortcode, csrftoken, type } = message;
  // type can be "post" or "reel"

  try {
    const mediaId = shortcodeToMediaId(shortcode);
    const item = await getPostMedia(mediaId, csrftoken);
    if (!item) return { success: false, error: "Post not found" };

    const mediaList = extractPostMedia(item);
    if (mediaList.length === 0) return { success: false, error: "No media in post" };

    const username = mediaList[0].username || "post";
    const timestamp = Date.now();
    const mediaType = type || "post";
    let downloaded = 0;

    for (let i = 0; i < mediaList.length; i++) {
      const media = mediaList[i];
      const ext = media.isVideo ? "mp4" : "jpg";
      const suffix = mediaList.length > 1 ? `_${i + 1}` : "";
      const filename = `instaloader_${username}_${mediaType}_${timestamp}${suffix}.${ext}`;

      await new Promise((resolve) => {
        chrome.downloads.download(
          { url: media.url, filename, conflictAction: "uniquify" },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error("Download failed:", chrome.runtime.lastError.message);
            } else {
              downloaded++;
            }
            resolve();
          }
        );
      });
    }

    return {
      success: downloaded > 0,
      downloaded,
      total: mediaList.length,
    };
  } catch (err) {
    console.error("[Insta Saver] Post API error:", err);
    return { success: false, error: err.message };
  }
}

// Handler: download a SINGLE item from a post by index (0-based)
async function handleDownloadPostSingle(message) {
  const { shortcode, csrftoken, index, type } = message;

  try {
    const mediaId = shortcodeToMediaId(shortcode);
    const item = await getPostMedia(mediaId, csrftoken);
    if (!item) return { success: false, error: "Post not found" };

    const mediaList = extractPostMedia(item);
    if (mediaList.length === 0) return { success: false, error: "No media in post" };

    // Clamp index to valid range
    const idx = Math.max(0, Math.min(index || 0, mediaList.length - 1));
    const media = mediaList[idx];
    const username = media.username || "post";
    const timestamp = Date.now();
    const mediaType = type || "post";
    const ext = media.isVideo ? "mp4" : "jpg";
    const filename = `instaloader_${username}_${mediaType}_${timestamp}.${ext}`;

    return new Promise((resolve) => {
      chrome.downloads.download(
        { url: media.url, filename, conflictAction: "uniquify" },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Download failed:", chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve({ success: true, downloadId });
          }
        }
      );
    });
  } catch (err) {
    console.error("[Insta Saver] Post single API error:", err);
    return { success: false, error: err.message };
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadStory") {
    handleDownloadStory(message).then(sendResponse);
    return true;
  }

  if (message.action === "downloadPost") {
    handleDownloadPost(message).then(sendResponse);
    return true;
  }

  if (message.action === "downloadPostSingle") {
    handleDownloadPostSingle(message).then(sendResponse);
    return true;
  }

  if (message.action === "download") {
    handleDirectDownload(message).then(sendResponse);
    return true;
  }
});
