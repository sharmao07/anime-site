# Anime.TV 🎬
### State-of-the-Art 2026 Dark Streaming & Discovery Platform

[![Live Demo](https://img.shields.io/badge/Demo-anime--tv--67.vercel.app-ff4a3d?style=for-the-badge&logo=vercel)](https://anime-tv-67.vercel.app/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Jikan API](https://img.shields.io/badge/Jikan_v4-MyAnimeList-2E51A2?style=for-the-badge)](https://jikan.moe/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

An award-winning, state-of-the-art anime streaming and exploration interface crafted entirely with **Vanilla JavaScript (ES6+)**, **HTML5**, and **Tailwind CSS**. Designed in the visual language of next-generation entertainment platforms (Netflix, Crunchyroll, Disney+, Max), Anime.TV fuses high-density metadata browsing with fluid micro-interactions, cinematic backdrops, and resilient API data fetching.

---

## 🌟 Visual Design System & Aesthetic (2026 Edition)

* **Obsidian Dark Palette (`#050507`):** Multi-tier surface elevations (`#08080b`, `#0d0d13`, `#14141c`) delivering authentic visual depth and eye-comfort for extended sessions.
* **1px Glassmorphism:** Subtle borders (`rgba(255, 255, 255, 0.08)` to `0.16`) coupled with `backdrop-filter: blur(20px) saturate(160%)` creating tactile floating cards and navigation bars.
* **Cinematic Headings & Editorial Typography:** Built with Google Fonts:
  * **Sora:** Bold, geometric display font for hero headlines and section titles (`tracking-[-0.04em]`).
  * **Manrope:** Balanced geometric sans-serif for fluid reading and descriptions.
  * **JetBrains Mono:** Tabular numeric data, episode codes, runtimes, and ratings badges.
* **Micro-Interactions Without Layout Shift:** Poster cards smoothly scale and reveal synopsis overlays with backdrop blur while strictly maintaining rigid 2:3 grid coordinates.

---

## ✨ Feature Highlights

### 1. Edge-to-Edge Spotlight Carousel
* Full-bleed hero banner cycling through the top trending series.
* Multi-directional dark gradient masks ensure complete text readability without dimming background key art.
* Floating thumbnail carousel controls in the bottom-right with active state glowing borders and smooth scale transitions.

### 2. Multi-Filter & Instant Search Console
* Filter simultaneously by **Type** (TV, Movie, OVA, Special, ONA), **Genre** (Action, Drama, Fantasy, Sci-Fi, etc.), **Status** (Airing, Complete, Upcoming), and **Sort** (Score, Popularity).
* Instant search execution on both the landing portal (`index.html`) and the main catalogue (`home.html`).

### 3. Persistent "Continue Watching" Shelf
* Client-side progress tracking powered by `localStorage`.
* Horizontal scrolling shelf with dynamic watch-time progress bars and hover play-state overlays.

### 4. 3-Column Bento Box Sidebars
* Dedicated vertical rankings for **Airing This Season**, **Upcoming Releases**, and **Top Popular Titles**.
* The `#1` item in each column is elevated to a wide 16:9 mini-hero banner, while items `#2`–`#5` are structured as high-density list items.

### 5. Seamless Stream Player
* Embedded Plyr engine with custom accent controls, theater mode, dynamic episode selector queue, and server source switching.

### 6. Built-in Feedback & Title Requests
* Serverless Formspree submission dialog with animated modal transitions and escape-key handling.

---

## 🛡️ API Resilience & Reliability

The application connects to the open **Jikan API v4 (MyAnimeList)** and **AniList GraphQL**:

* **Automatic 429 Rate-Limit Handling:** Automatically detects HTTP 429 responses, invokes exponential backoff with jitter, and retries seamlessly without failing silently.
* **Client-Side Session Caching:** Frequently queried endpoints (Trending, Top Movies, Seasons) are cached in `sessionStorage` with a 5-minute TTL to drastically cut down network roundtrips.
* **Staggered Sequential Fetching:** Secondary sidebar feeds are throttled with intentional micro-delays (1,200ms) to ensure concurrent requests never overwhelm external rate limits.

---

## 📂 Project Architecture

```text
├── index.html        # High-conversion cinematic entry portal & search console
├── home.html         # Main app dashboard (Spotlight hero, catalog grid, bento sidebar)
├── player.html       # Video streaming theater with episode queue & server picker
├── info.html         # Deep-dive title breakdown (Character roster, trailers, stream links)
├── genres.html       # Visual genre index with direct filtering hooks
├── history.html      # Watch history manager & playback resumption dashboard
├── privacy.html      # Privacy policy documentation
├── terms.html        # Terms of service documentation
├── script.js         # Core application engine (Spotlight, API routing, search, pagination)
├── stream.js         # Player stream routing, source parsing, and episode logic
├── ui.css            # Reusable 2026 design tokens & glassmorphic component utilities
├── ui.js             # Shared navigation behavior, dropdown menus & modal lifecycle
├── style.css         # Global stylesheet (Transitions, scrollbars, ripple engine)
└── start-bg.jpg      # High-fidelity cinematic landing backdrop
```

---

## 🚀 Quickstart & Local Development

No complex build steps, node modules, or bundlers required. Everything runs natively in modern browsers.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sharmao07/anime-site.git
   cd anime-site
   ```

2. **Run locally:**
   * Open `index.html` directly in any web browser.
   * Or run with any local static HTTP server (e.g., VS Code **Live Server**, `python3 -m http.server 8000`, or `npx serve`).

---

## ⚖️ Disclaimer

Anime.TV is a frontend portfolio project designed for educational, research, and non-commercial purposes. It does not host, store, or stream media files on its servers. All anime metadata, imagery, and synopsis data are served through publicly accessible APIs (Jikan/MyAnimeList, AniList).
