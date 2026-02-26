// =============================================================
// Insta Saver — content script
// Detects Instagram menus (stories + feed posts/reels) by button
// TEXT, injects a download button, and uses Instagram's API
// (via the background script) to fetch the exact media.
// =============================================================

(function () {
  "use strict";

  const BUTTON_LABEL = "Download Story";
  const POST_ALL_LABEL = "Download All Media";
  const POST_CURRENT_LABEL = "Download Current";
  const POST_SINGLE_LABEL = "Download";
  const REEL_LABEL = "Download Reel";

  // Texts that appear in story menus
  const STORY_MARKER_TEXTS = [
    "report inappropriate",
    "report",
    "about this account",
  ];

  // Texts that appear in feed post/reel menus
  const POST_MARKER_TEXTS = [
    "report",
    "go to post",
    "about this account",
    "not interested",
    "share to",
    "copy link",
    "embed",
    "unfollow",
    "add to favorites",
    "remove from favorites",
  ];

  // ---------------------------------------------------------------
  // 1. Parse info from the current URL / page context
  // ---------------------------------------------------------------

  function getStoryInfo() {
    // URL format: /stories/USERNAME/STORY_PK/
    const match = window.location.pathname.match(/\/stories\/([^\/]+)(?:\/(\d+))?/);
    if (!match) return null;
    return {
      username: match[1],
      storyId: match[2] || "",
    };
  }

  function getPostShortcode() {
    // Check URL first: /p/SHORTCODE/ or /reel/SHORTCODE/
    const urlMatch = window.location.pathname.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];

    // If on feed/explore, find the shortcode from the closest visible post link
    // Look for <a> tags with /p/ or /reel/ href near the menu
    return null;
  }

  function findPostShortcodeFromMenu(menuContainer) {
    // When a post menu opens on the feed, the post's <article> or link
    // with /p/SHORTCODE/ should be in the DOM. Try URL first.
    const fromUrl = getPostShortcode();
    if (fromUrl) return fromUrl;

    // For feed pages, find the most recently focused/visible post.
    // Look for <a> elements with /p/ or /reel/ hrefs that are visible.
    const links = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
    let bestLink = null;
    let bestTop = Infinity;
    const viewportCenter = window.innerHeight / 2;

    for (const link of links) {
      const rect = link.getBoundingClientRect();
      // Find the link closest to the center of the viewport
      const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (dist < bestTop) {
        bestTop = dist;
        bestLink = link;
      }
    }

    if (bestLink) {
      const match = bestLink.getAttribute("href").match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
      if (match) return match[1];
    }

    return null;
  }

  function findReelShortcodeFromMenu(menuContainer) {
    // Reel menus contain an <a> "Go to post" with href="/reel/SHORTCODE/"
    const links = menuContainer.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]');
    for (const link of links) {
      const m = link.getAttribute("href").match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
      if (m) return m[1];
    }
    // Fallback: the URL changes with each reel in the feed
    const urlMatch = window.location.pathname.match(/\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    return null;
  }

  function getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : "";
  }

  // ---------------------------------------------------------------
  // 2. Download via background script (API-based)
  // ---------------------------------------------------------------

  function sendMessage(payload) {
    return new Promise((resolve) => {
      try {
        if (!chrome.runtime || !chrome.runtime.id) {
          console.warn("[Insta Saver] Extension context not available.");
          return resolve({ success: false, error: "Extension context lost" });
        }
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("[Insta Saver] sendMessage:", chrome.runtime.lastError.message);
            return resolve({ success: false, error: chrome.runtime.lastError.message });
          }
          resolve(response || { success: false });
        });
      } catch (err) {
        console.warn("[Insta Saver] sendMessage threw:", err);
        resolve({ success: false, error: err.message });
      }
    });
  }

  function downloadCurrentStory() {
    const info = getStoryInfo();
    if (!info) {
      return Promise.resolve({ success: false, error: "Not on a story page" });
    }
    return sendMessage({
      action: "downloadStory",
      username: info.username,
      storyId: info.storyId,
      csrftoken: getCsrfToken(),
    });
  }

  function downloadPost(shortcode, type = "post") {
    if (!shortcode) {
      return Promise.resolve({ success: false, error: "Could not find post" });
    }
    return sendMessage({
      action: "downloadPost",
      shortcode: shortcode,
      type: type,
      csrftoken: getCsrfToken(),
    });
  }

  function downloadPostSingle(shortcode, index, type = "post") {
    if (!shortcode) {
      return Promise.resolve({ success: false, error: "Could not find post" });
    }
    return sendMessage({
      action: "downloadPostSingle",
      shortcode: shortcode,
      index: index,
      type: type,
      csrftoken: getCsrfToken(),
    });
  }

  function findBestVisibleArticle() {
    const articles = document.querySelectorAll("article");
    let bestArticle = null;
    let bestDist = Infinity;
    const yCentre = window.innerHeight / 2;

    for (const article of articles) {
      const rect = article.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - yCentre);
      if (dist < bestDist) {
        bestDist = dist;
        bestArticle = article;
      }
    }

    return bestArticle;
  }

  function detectCarouselDotsCount(article) {
    if (!article) return 0;

    const allDivs = article.querySelectorAll("div");
    for (const container of allDivs) {
      const kids = Array.from(container.children);
      if (kids.length < 2 || kids.length > 20) continue;

      let allSmall = true;
      for (const kid of kids) {
        const rect = kid.getBoundingClientRect();
        if (rect.width > 14 || rect.height > 14 || rect.width < 2) {
          allSmall = false;
          break;
        }
      }
      if (!allSmall) continue;

      const classMap = {};
      for (const kid of kids) {
        const className = kid.className;
        classMap[className] = (classMap[className] || 0) + 1;
      }

      const entries = Object.entries(classMap);
      if (entries.length !== 2) continue;

      const hasSingleActiveClass = entries.some(([, count]) => count === 1);
      if (hasSingleActiveClass) return kids.length;
    }

    return 0;
  }

  // Fallback carousel detection: count <li> slide elements that have
  // translateX transforms AND contain media (img/video) inside a <ul>.
  // Instagram carousels use this specific structure; plain grids don't.
  function detectCarouselFromList(root) {
    if (!root) return 0;
    const uls = root.querySelectorAll("ul");
    for (const ul of uls) {
      const lis = Array.from(ul.querySelectorAll(":scope > li"));
      if (lis.length < 2) continue;

      let mediaCount = 0;
      for (const li of lis) {
        // Only count <li>'s that use translateX (carousel slide positioning)
        const transform = li.style.transform || "";
        const hasTranslate = /translateX\(/.test(transform);
        if (hasTranslate && li.querySelector("img, video")) {
          mediaCount++;
        }
      }

      if (mediaCount >= 2) return mediaCount;
    }
    return 0;
  }

  // Detect carousel from the presence of both prev AND next navigation buttons
  function detectCarouselFromButtons(root) {
    if (!root) return false;
    const buttons = root.querySelectorAll('button[aria-label]');
    let hasNext = false;
    let hasPrev = false;
    for (const btn of buttons) {
      const label = btn.getAttribute("aria-label").toLowerCase();
      if (label === "next" || label === "go forward") hasNext = true;
      if (label === "go back") hasPrev = true;
    }
    // Require both directions to avoid false positives from standalone buttons
    return hasNext && hasPrev;
  }

  function getPostMediaCount() {
    const article = findBestVisibleArticle();

    // Strategy 1: dot indicators inside the article
    const dotsCount = detectCarouselDotsCount(article);
    if (dotsCount > 1) return dotsCount;

    // Strategy 2: count <li> slides with translateX inside the article
    const articleSlides = detectCarouselFromList(article);
    if (articleSlides > 1) return articleSlides;

    // Strategy 3: carousel nav buttons inside the article
    if (article && detectCarouselFromButtons(article)) return 2;

    // Strategy 4: document-wide scan ONLY when no <article> exists
    // (e.g., on dedicated /p/SHORTCODE/ pages)
    if (!article) {
      const docSlides = detectCarouselFromList(document);
      if (docSlides > 1) return docSlides;

      if (detectCarouselFromButtons(document)) return 2;
    }

    return 1;
  }

  // Detect which carousel slide is currently active (0-based index).
  // Uses multiple strategies depending on context.
  function getCarouselIndex() {
    // Strategy 1: URL param (works on post pages opened from profile)
    const params = new URLSearchParams(window.location.search);
    const imgIndex = params.get("img_index");
    if (imgIndex) return Math.max(0, parseInt(imgIndex, 10) - 1);

    // Strategy 2: dot indicators in the feed / FYP
    const bestArticle = findBestVisibleArticle();
    const dotIndex = getCarouselIndexFromDots(bestArticle);
    if (dotIndex !== null) return dotIndex;

    // Strategy 3: <li> transform-based detection
    // The visible slide is the one with translateX closest to 0.
    const searchRoot = bestArticle || document;
    const liIndex = getCarouselIndexFromTransforms(searchRoot);
    if (liIndex !== null) return liIndex;

    return 0;
  }

  // Detect active carousel index from dot indicators (original strategy)
  function getCarouselIndexFromDots(root) {
    if (!root) return null;

    const allDivs = root.querySelectorAll("div");
    for (const container of allDivs) {
      const kids = Array.from(container.children);
      if (kids.length < 2 || kids.length > 20) continue;

      let allSmall = true;
      for (const kid of kids) {
        const kr = kid.getBoundingClientRect();
        if (kr.width > 14 || kr.height > 14 || kr.width < 2) {
          allSmall = false;
          break;
        }
      }
      if (!allSmall) continue;

      const classMap = {};
      for (const kid of kids) {
        const cn = kid.className;
        classMap[cn] = (classMap[cn] || 0) + 1;
      }

      const entries = Object.entries(classMap);
      if (entries.length !== 2) continue;

      let activeClass = null;
      for (const [cn, count] of entries) {
        if (count === 1) { activeClass = cn; break; }
      }
      if (!activeClass) continue;

      for (let i = 0; i < kids.length; i++) {
        if (kids[i].className === activeClass) return i;
      }
    }

    return null;
  }

  // Detect active carousel index from <li> translateX transforms.
  // The currently visible slide has translateX closest to 0.
  function getCarouselIndexFromTransforms(root) {
    if (!root) return null;
    const uls = root.querySelectorAll("ul");
    for (const ul of uls) {
      const lis = Array.from(ul.querySelectorAll(":scope > li"));
      if (lis.length < 2) continue;

      // Filter <li> elements that contain actual media
      const mediaLis = lis.filter(li => li.querySelector("img, video"));
      if (mediaLis.length < 2) continue;

      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < mediaLis.length; i++) {
        const transform = mediaLis[i].style.transform;
        const m = transform && transform.match(/translateX\(([^)]+)px\)/);
        if (m) {
          const dist = Math.abs(parseFloat(m[1]));
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
      }
      return bestIdx;
    }
    return null;
  }

  // ---------------------------------------------------------------
  // 3. Menu Detection & Injection
  // ---------------------------------------------------------------

  function classifyMenu(node) {
    // Returns { type: "story"|"post"|"reel", el } or null
    if (!(node instanceof HTMLElement)) return null;

    const candidates = [node, ...node.querySelectorAll("div")];

    for (const el of candidates) {
      // --- Path A: <button>-based menus (stories + posts) ---
      const buttons = el.querySelectorAll(":scope > button");
      if (buttons.length >= 2) {
        const texts = Array.from(buttons).map((b) =>
          b.textContent.trim().toLowerCase()
        );

        const hasCancel = texts.includes("cancel");
        if (hasCancel) {
          const isStory = texts.some((t) =>
            STORY_MARKER_TEXTS.some((m) => t.includes(m))
          );
          const isPost = texts.some((t) =>
            POST_MARKER_TEXTS.some((m) => t.includes(m))
          );
          if (isStory && getStoryInfo()) return { type: "story", el };
          if (isPost) return { type: "post", el };
          if (isStory) return { type: "story", el };
        }
      }

      // --- Path B: role-based menus (reels) ---
      // Reel menus use <div role="button"> and <a role="link"> instead of <button>
      const roleItems = el.querySelectorAll(
        ':scope > [role="button"], :scope > [role="link"]'
      );
      if (roleItems.length >= 3) {
        const texts = Array.from(roleItems).map((b) =>
          b.textContent.trim().toLowerCase()
        );
        const hasReport = texts.some((t) => t.includes("report"));
        const hasGoToPost = texts.some((t) => t.includes("go to post"));
        const hasCopyLink = texts.some((t) => t.includes("copy link"));
        if (hasReport && (hasGoToPost || hasCopyLink)) {
          return { type: "reel", el };
        }
      }
    }
    return null;
  }

  function injectButton(menuContainer, type) {
    if (menuContainer.querySelector(`[data-insta-saver]`)) return;

    if (type === "reel") {
      // Reel menus use div[role="button"] items — different injection path
      injectReelButton(menuContainer);
      return;
    }

    const buttons = menuContainer.querySelectorAll(":scope > button");
    if (buttons.length === 0) return;

    let cancelBtn = null;
    for (const btn of buttons) {
      if (btn.textContent.trim().toLowerCase() === "cancel") {
        cancelBtn = btn;
        break;
      }
    }

    const template = cancelBtn || buttons[0];

    if (type === "story") {
      // Single button for stories
      const dlBtn = createDownloadBtn(template, BUTTON_LABEL, () => {
        if (!getStoryInfo()) return Promise.resolve({ success: false, error: "Not a story page" });
        return downloadCurrentStory();
      });
      insertBefore(menuContainer, dlBtn, cancelBtn);
    } else {
      // Two buttons for posts: "Download Current" and "Download All Media"
      const currentBtn = createDownloadBtn(template, POST_CURRENT_LABEL, () => {
        const shortcode = findPostShortcodeFromMenu(menuContainer);
        if (!shortcode) return Promise.resolve({ success: false, error: "Post not found" });
        const idx = getCarouselIndex();
        return downloadPostSingle(shortcode, idx, "post");
      });

      const mediaCount = getPostMediaCount();
      console.log("[Insta Saver] Detected media count for post:", mediaCount);
      if (mediaCount <= 1) {
        const singleBtn = createDownloadBtn(template, POST_SINGLE_LABEL, () => {
          const shortcode = findPostShortcodeFromMenu(menuContainer);
          if (!shortcode) return Promise.resolve({ success: false, error: "Post not found" });
          const idx = getCarouselIndex();
          return downloadPostSingle(shortcode, idx, "post");
        });
        insertBefore(menuContainer, singleBtn, cancelBtn);
        return;
      }

      const allBtn = createDownloadBtn(template, POST_ALL_LABEL, () => {
        const shortcode = findPostShortcodeFromMenu(menuContainer);
        if (!shortcode) return Promise.resolve({ success: false, error: "Post not found" });
        return downloadPost(shortcode, "post");
      });

      // Insert both before Cancel (current first, then all)
      insertBefore(menuContainer, allBtn, cancelBtn);
      insertBefore(menuContainer, currentBtn, allBtn);
    }
  }

  function injectReelButton(menuContainer) {
    // Find a role="button" div to use as template
    const templateItem = menuContainer.querySelector('[role="button"]');
    if (!templateItem) return;

    const dlBtn = templateItem.cloneNode(true);
    dlBtn.setAttribute("data-insta-saver", "true");

    // Set the text in the deeply nested span
    setNestedText(dlBtn, REEL_LABEL);
    styleReelButton(dlBtn, "#00c853");

    dlBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      setNestedText(dlBtn, "Downloading…");

      const shortcode = findReelShortcodeFromMenu(menuContainer);
      if (!shortcode) {
        setNestedText(dlBtn, "Reel not found!");
        styleReelButton(dlBtn, "#ff5252");
        setTimeout(() => {
          setNestedText(dlBtn, REEL_LABEL);
          styleReelButton(dlBtn, "#00c853");
        }, 2500);
        return;
      }

      downloadPost(shortcode, "reel").then((response) => {
        if (response && response.success) {
          setNestedText(dlBtn, "Downloaded");
          styleReelButton(dlBtn, "#00c853");
        } else {
          const err = (response && response.error) || "Unknown error";
          console.warn("[Insta Saver] Reel download failed:", err);
          setNestedText(dlBtn, "Failed — retry");
          styleReelButton(dlBtn, "#ff5252");
        }
        setTimeout(() => {
          setNestedText(dlBtn, REEL_LABEL);
          styleReelButton(dlBtn, "#00c853");
        }, 2500);
      });
    });

    // Insert before the last item ("About this account")
    const items = menuContainer.querySelectorAll(
      ':scope > [role="button"], :scope > [role="link"]'
    );
    const lastItem = items[items.length - 1];
    if (lastItem) {
      menuContainer.insertBefore(dlBtn, lastItem);
    } else {
      menuContainer.appendChild(dlBtn);
    }
  }

  function setNestedText(el, text) {
    // Reel menu items have deeply nested spans; find the innermost text span
    const spans = el.querySelectorAll("span");
    for (let i = spans.length - 1; i >= 0; i--) {
      if (spans[i].children.length === 0 && spans[i].textContent.trim()) {
        spans[i].textContent = text;
        return;
      }
    }
    // Fallback: first leaf span
    for (const span of spans) {
      if (span.children.length === 0) {
        span.textContent = text;
        return;
      }
    }
  }

  function styleReelButton(el, color) {
    const spans = el.querySelectorAll("span");
    for (const span of spans) {
      span.style.color = color;
      span.style.fontWeight = "600";
    }
  }

  function createDownloadBtn(template, label, downloadFn) {
    const dlBtn = template.cloneNode(true);
    dlBtn.textContent = label;
    dlBtn.setAttribute("data-insta-saver", "true");
    dlBtn.setAttribute("tabindex", "0");
    dlBtn.style.color = "#00c853";
    dlBtn.style.fontWeight = "600";

    dlBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      dlBtn.textContent = "Downloading…";

      downloadFn().then((response) => {
        if (response && response.success) {
          const count = response.downloaded || 1;
          const total = response.total || 1;
          dlBtn.textContent = total > 1 ? `Downloaded ${count}/${total} ✓` : "Downloaded ✓";
          dlBtn.style.color = "#00c853";
        } else {
          const err = (response && response.error) || "Unknown error";
          console.warn("[Insta Saver] Download failed:", err);
          dlBtn.textContent = "Failed — retry";
          dlBtn.style.color = "#ff5252";
        }
        setTimeout(() => {
          dlBtn.textContent = label;
          dlBtn.style.color = "#00c853";
        }, 2500);
      });
    });

    return dlBtn;
  }

  function insertBefore(container, newNode, refNode) {
    if (refNode) {
      container.insertBefore(newNode, refNode);
    } else {
      container.appendChild(newNode);
    }
  }

  // ---------------------------------------------------------------
  // 4. MutationObserver — start when body is available
  // ---------------------------------------------------------------

  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const result = classifyMenu(node);
          if (result) injectButton(result.el, result.type);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    console.log("[Insta Saver] Content script loaded — stories + posts.");
  }

  if (document.body) {
    setupObserver();
  } else {
    document.addEventListener("DOMContentLoaded", setupObserver);
  }
})();
