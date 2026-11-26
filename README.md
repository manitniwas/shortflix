# Shortflix

A Netflix-style home for great short films. Prototype web app: React + Tailwind, installable as a PWA ("Add to Home Screen" on a phone).

## What it does

- Browses a catalog of real short films and series, all free to watch on their official YouTube channels with embedding enabled
- Plays the real film in an in-app player (YouTube IFrame API), with play/pause, 10s skip and a live progress bar
- Saves My List, thumbs up/down ratings and per-film watch progress in the browser (localStorage), and shows a Continue Watching row
- Search filters titles, genres and awards live
- Rows: Trending, Award-Winning, Short Film Series, Under 10 Minutes
- Catalog is plain data in `src/catalog.js` - add a film by adding an entry with its YouTube video ID

## Stack

- React 18 + Vite
- Tailwind CSS 3
- YouTube IFrame Player API for playback
- PWA manifest for home-screen install (no service worker yet)
- No backend, no accounts - all state is local

## Run it

```sh
npm install
npm run dev
```

Build for production:

```sh
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host.

## Catalog notes

Every entry was verified against YouTube's oEmbed endpoint: the video exists, is on the filmmaker's or distributor's official channel, and allows embedding. Posters come from YouTube's own thumbnails. If a video is ever removed or made private, swap the `videoId` in `src/catalog.js`.

## Later

- Real backend: accounts, synced lists, an API
- Recommendations
- More sources (Vimeo, Internet Archive) after checking each source's terms
