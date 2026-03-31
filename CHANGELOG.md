# Changelog

All notable changes to this project will be documented in this file.

## [1.1.5] - 2026-03-31

### Fixed
- **Backpack Rename:** Fixed an issue where clicking the rename button would accidentally trigger the item selection (spawning it into the canvas). Added event propagation protection and improved layering.

## [1.1.4] - 2026-03-31

### Fixed
- **Background Controls:** Added a prominent "Remove Background Image" button in settings for better accessibility, especially on mobile devices where hover states are not available.

## [1.1.3] - 2026-03-31

### Fixed
- **Backpack Accessibility:** Increased the touch target and icon size for renaming saved selections in the backpack, making it easier to use on mobile devices.

## [1.1.2] - 2026-03-31

### Fixed
- **Mobile Accessibility:** Enabled Zoom In, Zoom Out, and Reset View buttons for Android and other mobile devices.

## [1.1.1] - 2026-03-31

### Fixed
- **Canvas Background Rendering:** Frame-specific background settings now correctly override global project settings on the main canvas.
- **Thumbnail Consistency:** Background colors, gradients, and images are now correctly rendered in both Frame Manager and Timeline thumbnails.
- **Timeline Background Image Support:** Background images are now correctly displayed behind frame thumbnails in the main timeline.

### Changed
- **Standardized Thumbnail Generation:** Thumbnails are now generated with transparent backgrounds for better Onion Skinning support and UI consistency.

## [1.1.0] - 2026-03-30

### Added
- **Freesound Integration:** Users can now search and add thousands of high-quality sound effects directly from Freesound.org.
- **Server-Side Proxy:** Implemented a backend proxy server (`server.ts`) to handle API requests securely and bypass browser CORS restrictions.
- **Vercel Support:** Added `vercel.json` and refactored the server to support seamless deployment on Vercel as a full-stack application.
- **Sound Library UI:** New modal for searching sounds with real-time previews and "Add to Timeline" functionality.

### Fixed
- **CORS Errors:** Resolved "Failed to fetch" issues by routing API calls through the backend.
- **API Key Security:** Moved sensitive API keys to the server-side environment.
- **Sound Previews:** Improved preview detection to support multiple audio formats (MP3, OGG).
- **Error Handling:** Added detailed error reporting for API connection and authentication issues.

### Changed
- Converted project from a client-side SPA to a Full-Stack Express + Vite application.
- Updated build and dev scripts to support the new server-side architecture.
