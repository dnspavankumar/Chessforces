# Chess Game Setup

## Quick Start (In-Memory Mode)

The app works out of the box with in-memory storage:

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production Setup with Upstash Redis

For persistent storage that works across deployments:

### 1. Create Upstash Redis Database

1. Go to https://console.upstash.com/
2. Sign up for a free account
3. Click "Create Database"
4. Choose a name and region
5. Click "Create"

### 2. Get Your Credentials

After creating the database:
1. Click on your database
2. Scroll to "REST API" section
3. Copy the `UPSTASH_REDIS_REST_URL`
4. Copy the `UPSTASH_REDIS_REST_TOKEN`

### 3. Configure Environment Variables

Update `.env.local`:

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 4. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add the same environment variables in Vercel dashboard:
- Go to your project settings
- Navigate to "Environment Variables"
- Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

## Features

- ✅ Multiplayer chess game
- ✅ No WebSockets (uses polling)
- ✅ Vercel-compatible
- ✅ Drag and drop pieces
- ✅ Click to move
- ✅ Player usernames
- ✅ Game full detection
- ✅ Persistent storage with Redis
- ✅ Fallback to in-memory storage

## How to Play

1. Click "Create Game" to start a new game
2. Enter your username
3. Share the Game ID with your opponent
4. Your opponent enters the Game ID and clicks "Join"
5. They enter their username
6. Play chess!

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- Upstash Redis
- Cookie-based player identification
- Polling for real-time updates
