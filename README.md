# Sona

A real-time internal team messaging app built for small product teams. Supports channels, direct messages, threaded replies, emoji reactions, full-text search, and more.

## Features

- **Channels** — Public and private channels with member management
- **Direct Messages** — 1:1 conversations between team members
- **Threaded Replies** — Reply to any message in a slide-out thread panel
- **Emoji Reactions** — React to messages with quick emoji picker
- **Full-Text Search** — Search across all messages with `Cmd+K` / `Ctrl+K`
- **Presence** — Real-time online/offline status indicators
- **Unread Counts** — Badge counts on channels and DMs in the sidebar
- **Typing Indicators** — See when others are typing
- **Read Receipts** — Track last-read position per channel/conversation
- **Mobile Responsive** — Sliding sidebar, full-screen threads on small screens

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Real-time | Socket.IO |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (access + refresh tokens), bcrypt |
| State | Zustand |

## Project Structure

```
sona/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/   # UI components (auth, channels, dm, messages, layout)
│       ├── stores/       # Zustand stores (auth, channels, conversations, messages, threads, unread)
│       ├── services/     # API client, Socket.IO client
│       └── types/        # TypeScript interfaces
├── server/          # Express backend
│   └── src/
│       ├── routes/       # REST API routes (auth, channels, conversations, messages, users)
│       ├── socket/       # Socket.IO event handlers
│       ├── middleware/   # Auth & error handling middleware
│       └── prisma/       # Database schema & migrations
└── package.json     # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Docker)
- npm

### 1. Clone the repo

```bash
git clone https://github.com/cubgrg/sona.git
cd sona
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

Start PostgreSQL (e.g. with Docker):

```bash
docker run --name sona-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sona -p 5432:5432 -d postgres:16
```

Create the server `.env` file:

```bash
cp server/.env.example server/.env
```

Run migrations and seed data:

```bash
cd server
npx prisma migrate deploy
npx prisma db seed
cd ..
```

### 4. Start the dev servers

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) concurrently.

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Test Accounts (from seed data)

| Name | Email | Password |
|---|---|---|
| Alice | test@sona.com | password123 |
| Bob | bob@sona.com | password123 |
| Carol | carol@sona.com | password123 |
| Dave | dave@sona.com | password123 |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both client and server in dev mode |
| `npm run dev:client` | Start only the frontend |
| `npm run dev:server` | Start only the backend |
| `npm run build` | Build both client and server |

## Running Tests

```bash
cd server
npx jest
```

## License

MIT
