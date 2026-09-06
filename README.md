# Ctrl+Savings

A zero-lag, offline-first allowance and savings tracker built for a seamless, native-app experience across mobile, tablet, and desktop.

## Features

- **Offline-First (PWA)**: Hard-caches assets using Workbox and Vite PWA. It works completely offline and is fully installable on iOS, Android, and Desktop.
- **Hero Animations**: Beautiful, addicting shared-element UI transitions when launching the app.
- **High-Contrast Design**: Carefully engineered Tailwind CSS palette avoiding low-contrast gradients and relying on crisp Green+Black and Green+White aesthetics.
- **Fully Responsive**: Instead of fixed dimensions, it locks to the viewport height (`100dvh`), scales beautifully up to `max-w-2xl` on desktops, and perfectly aligns navigation tools dynamically.

## Developer & Academic Credit

- **Developer**: **Justine Roy P. Salvador**
- **Program**: Computer Science Student
- **Institution**: University of Science and Technology of Southern Philippines (**USTP**)
- **Subject / Course**: **CS111 - Introduction to Computing**
- **Purpose**: Developed for Project-Based Learning (PBL) to pass the **Prelims Examination**.

## Tech Stack

- **Frontend**: Svelte 5 + Vite
- **Styling**: Tailwind CSS v4
- **PWA**: vite-plugin-pwa (Auto-update, Offline Caching)
- **Deployment**: Ready for Vercel

## Local Development

To run the app locally in development mode:
```bash
npm install
npm run dev
```
*(Alternatively, just double-click `run.bat` if on Windows)*

### Testing Offline PWA Capabilities
Development mode does not support hard-caching because files are not bundled. To test true offline support:
```bash
npm run build
npm run preview
```
*(Alternatively, double-click `test-offline.bat` if on Windows)*

## Deploying to Vercel

This repository is strictly configured to deploy effortlessly on Vercel.

1. Push this repository to your GitHub account.
2. Log into [Vercel](https://vercel.com/) and click **Add New > Project**.
3. Import your GitHub repository.
4. Vercel will automatically detect **Vite** as the framework.
5. Click **Deploy**.

*Note: The project includes a custom `vercel.json` which automatically handles Single-Page Application (SPA) routing and protects the Service Worker (`sw.js`) from being aggressively cached by Vercel's CDN, ensuring your app receives updates correctly.*
