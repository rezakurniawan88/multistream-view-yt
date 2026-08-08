# MultiStream View YouTube

![MultiStreamViewYoutube](/public/images/preview/demo_preview.png)

MultiStream View YouTube is a modern web application built with Next.js that lets you watch multiple YouTube streams at the same time in a single screen. It is designed for users who want a simple and focused multi-view experience without switching between tabs.

## Features

- Watch multiple YouTube videos simultaneously
- Add and remove stream panels dynamically
- Enter either a YouTube video ID or a full YouTube URL
- Keep your stream setup saved in the browser with local storage
- Mute or unmute all streams with one click
- Rename stream labels for easier organization
- Open live chat panels for supported streams

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- YouTube IFrame API

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- Node.js 18 or newer
- pnpm

### Installation

Clone the repository and install dependencies:
```bash
pnpm install
```

Run the development server :
```bash
pnpm dev
```

Then open:
```
http://localhost:3000
```

### Usage
1. Open the app in your browser.
2. Click the “Add Stream” button.
3. Enter a YouTube video ID or a valid YouTube URL.
4. Click “Apply” to load the video.
5. Use the mute, reset, and label controls to manage your streams.

### Notes
- Stream state is stored in the browser, so refreshing the page will preserve your current setup.
- Some YouTube content may require public accessibility for playback or live chat features.

### License
This project is provided as-is for educational and personal use.