# InstaLoader Chrome Web Store Launch Design

**Date:** 2026-02-12
**Status:** Approved
**Approach:** Modular (errors.js + logger.js)

---

## Overview

Prepare InstaLoader Chrome extension for Chrome Web Store submission by addressing code quality issues, adding required documentation, and improving error handling.

---

## Goals

1. Remove all console.* debug statements for production
2. Add user-friendly, specific error messages
3. Add required documentation (README, privacy policy)
4. Update manifest with required fields
5. Remove unexplained telemetry-id file

---

## File Structure Changes

### New Files

| File | Purpose |
|------|---------|
| `README.md` | Extension documentation, installation, features |
| `privacy-policy.html` | Privacy policy page explaining cookie usage |
| `scripts/errors.js` | Error constants and message formatting |
| `scripts/logger.js` | Debug logger with production toggle |

### Modified Files

| File | Changes |
|------|---------|
| `manifest.json` | Add author, homepage_url, version format, default_icon |
| `scripts/content.js` | Import errors.js and logger.js, replace console.* |
| `scripts/background.js` | Import errors.js and logger.js, replace console.*, add error mapping |
| `InstaLoader.html` | Add link to privacy policy |

### Deleted Files

| File | Reason |
|------|--------|
| `telemetry-id` | Unexplained file, could cause Chrome Web Store review delays |

---

## Error Handling Module

### `scripts/errors.js`

```javascript
export const Errors = {
  STORY_EXPIRED: { code: 'STORY_EXPIRED', message: 'Story has expired' },
  PRIVATE_ACCOUNT: { code: 'PRIVATE_ACCOUNT', message: 'Private account — cannot download' },
  RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Rate limited — wait a moment' },
  NETWORK_ERROR: { code: 'NETWORK_ERROR', message: 'Network error — check connection' },
  MEDIA_NOT_FOUND: { code: 'MEDIA_NOT_FOUND', message: 'Media not found' },
  DOWNLOAD_FAILED: { code: 'DOWNLOAD_FAILED', message: 'Download failed — retry' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Please log in to Instagram' }
};

export function getErrorMessage(error) {
  // Maps HTTP status codes and API errors to friendly messages
  if (error.status === 401) return Errors.UNAUTHORIZED.message;
  if (error.status === 403) return Errors.PRIVATE_ACCOUNT.message;
  if (error.status === 404) return Errors.MEDIA_NOT_FOUND.message;
  if (error.status === 429) return Errors.RATE_LIMITED.message;
  if (error.status === 0) return Errors.NETWORK_ERROR.message;
  return Errors.DOWNLOAD_FAILED.message;
}
```

### Integration

- Background script catches errors, maps to error codes, returns to content script
- Content script displays the mapped message in the "Failed — {message}" format

---

## Logger Module

### `scripts/logger.js`

```javascript
const DEBUG = false; // Set to true during development

export const logger = {
  log: (...args) => DEBUG && console.log('[InstaLoader]', ...args),
  warn: (...args) => DEBUG && console.warn('[InstaLoader]', ...args),
  error: (...args) => DEBUG && console.error('[InstaLoader]', ...args)
};
```

### Usage

- Replace all `console.log/warn/error` calls with `logger.log/warn/error`
- In production (`DEBUG = false`), no console output
- During development, set `DEBUG = true` to see logs with `[InstaLoader]` prefix

---

## Manifest Updates

### Current State

```json
{
  "version": "1.0",
  "action": {
    "default_popup": "InstaLoader.html"
  }
}
```

### Target State

```json
{
  "version": "1.0.0",
  "author": "[USER TO PROVIDE]",
  "homepage_url": "[USER TO PROVIDE]",
  "action": {
    "default_popup": "InstaLoader.html",
    "default_icon": {
      "16": "images/icon-16.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png"
    }
  }
}
```

---

## Privacy Policy

### Content

The privacy policy (`privacy-policy.html`) will explain:

1. **Cookie Usage:** Extension uses Instagram session cookies (CSRF token) to authenticate API requests
2. **Data Collection:** No data is collected, stored, or transmitted to third parties
3. **Processing:** All processing happens locally in the browser
4. **Contact:** Contact information for questions

### Format

Simple HTML page with clean styling matching the extension popup. Accessible from:
- Link in `InstaLoader.html` popup
- Chrome Web Store listing

---

## README

### Sections

1. **Extension Description:** What InstaLoader does
2. **Features:** Stories, posts, reels, carousels
3. **Installation:** How to install from Chrome Web Store
4. **How It Works:** High-level technical explanation
5. **Privacy:** Note with link to privacy policy
6. **License:** MIT License reference
7. **Contributing:** How to contribute (optional)

---

## Chrome Web Store Assets

### Screenshots (User to capture)

- Size: 1280x800 or 640x400 PNG
- Recommended: 3-5 screenshots showing:
  1. Extension popup with instructions
  2. Download button in Instagram story menu
  3. Download button in Instagram post menu
  4. Download button in Instagram reel menu
  5. Successful download in progress

### Promotional Tiles (Optional)

- Small tile: 440x280 PNG
- Large tile: 920x680 PNG

### Store Listing

- **Name:** InstaLoader
- **Short Description:** Download Instagram stories, posts, and reels
- **Category:** Productivity
- **Language:** English

---

## Implementation Order

1. Create `scripts/logger.js`
2. Create `scripts/errors.js`
3. Update `scripts/background.js`:
   - Import logger and errors modules
   - Replace all console.* calls with logger.*
   - Add error mapping in API response handlers
4. Update `scripts/content.js`:
   - Import logger module
   - Replace all console.* calls with logger.*
   - Update error message display
5. Create `privacy-policy.html`
6. Create `README.md`
7. Update `manifest.json`
8. Update `InstaLoader.html` with privacy policy link
9. Delete `telemetry-id`
10. Test extension locally
11. Create screenshots for store listing
12. Submit to Chrome Web Store

---

## Success Criteria

- [ ] Zero console.* statements in production build
- [ ] All errors display specific, user-friendly messages
- [ ] README.md exists with complete documentation
- [ ] privacy-policy.html exists and is accessible
- [ ] manifest.json has author, homepage_url, semantic version
- [ ] telemetry-id file removed
- [ ] Extension passes Chrome Web Store review
