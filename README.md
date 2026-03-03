
# InstaLoader


<img width="1000" height="251" alt="download_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24" src="https://github.com/user-attachments/assets/65b7491a-631c-4d7c-a50f-8811977d8a76" />

A Chrome extension to download Instagram stories, posts, and reels directly from the three-dot menu.

## Features

- **Stories** — Download the current story (image or video)
- **Posts** — Download single images, videos, or entire carousel posts
- **Reels** — Download reels with one click
- **Smart Detection** — Automatically detects carousel posts and lets you download the current slide or all media
- **High Quality** — Always downloads the highest quality version available


## Usage

1. Open Instagram in Chrome
2. Navigate to a **Story**, **Post**, or **Reel**
3. Click the **••• (three-dot menu)** on the media
4. Select the **Download** option:
   - **Stories**: "Download Story"
   - **Posts**: "Download Current" or "Download All Media"
   - **Reels**: "Download Reel"
5. Check your Downloads folder

## File Naming

Downloaded files follow this naming convention:

```
instaloader_[username]_[type]_[timestamp].[ext]
```

## Requirements

- Chromium-based browser
- Must be logged into Instagram in your browser

## Permissions

| Permission | Purpose |
|------------|---------|
| `downloads` | Save media files to your computer |
| `https://www.instagram.com/*` | Access Instagram pages and API |

## Technical Details

- Built with Manifest V3
- Uses Instagram's internal API for reliable media fetching
- Content script detects menu types and injects download buttons dynamically
- Background service worker handles API requests and downloads


## Disclaimer

This extension is for personal use only. Always respect Instagram's Terms of Service and content creators' rights. Do not use downloaded content for commercial purposes without permission.
