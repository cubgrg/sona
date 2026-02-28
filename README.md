# Sona

A hospitality employee engagement hub built for restaurant teams. Combines real-time messaging, shift scheduling, team feed, employee directory, payroll visibility, and peer recognition into a single mobile-first app.

## Features

### Home Dashboard
- **Personalised greeting** with role badge and location
- **Next shift card** — date, time, role, and location at a glance
- **Pay day card** — estimated net pay, hours worked, hourly rate, and countdown to next pay date
- **Weekly schedule** — Mon–Sun overview with shift indicators and today highlighted
- **Mini feed** — latest 3 company updates
- **Unread messages summary** — quick links into channels with unread counts
- **Recent praise** — latest shoutouts received

### Team Feed
- **Announcements, events, policy updates** — manager-created posts scoped to all or specific locations
- **Shoutouts** — any employee can recognise a teammate with categories (Teamwork, Customer Service, Above & Beyond)
- **Emoji reactions** — toggle reactions on any feed post
- **Location-scoped filtering** — "My Location" vs "All Company" toggle

### Messaging
- **Channels** — public and private channels with member management
- **Direct Messages** — 1:1 conversations between team members
- **Threaded Replies** — reply to any message in a slide-out thread panel
- **Emoji Reactions** — react to messages with quick emoji picker
- **Full-Text Search** — search across all messages with `Cmd+K` / `Ctrl+K`
- **Presence** — real-time online/offline status indicators
- **Unread Counts** — badge counts on channels and DMs
- **Typing Indicators** — see when others are typing
- **Read Receipts** — track last-read position per channel/conversation

### Employee Directory
- **Searchable staff list** — filter by name and location
- **Role badges** — colour-coded by position (manager, chef, server, bartender, host, kitchen staff)
- **Quick actions** — message or send a shoutout directly from a profile card

### Payroll
- **Next pay period** — estimated net pay based on hours worked and hourly rate
- **Pay day countdown** — days until next pay date on the home dashboard

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
├── client/                # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── auth/          # Login, Register
│       │   ├── home/          # Home dashboard
│       │   ├── feed/          # Team feed + shoutout modal
│       │   ├── directory/     # Employee directory
│       │   ├── channels/      # Channel management
│       │   ├── dm/            # Direct message modals
│       │   ├── messages/      # Message items, input, threads
│       │   ├── layout/        # AppShell, TopNavBar, BottomTabBar, Sidebar
│       │   └── common/        # Search modal
│       ├── stores/            # Zustand stores (auth, channels, conversations,
│       │                      #   dashboard, directory, feed, messages, shifts,
│       │                      #   threads, unread)
│       ├── services/          # API client, Socket.IO client
│       └── types/             # TypeScript interfaces
├── server/                # Express backend
│   └── src/
│       ├── routes/            # REST API (auth, channels, conversations,
│       │                      #   dashboard, feed, locations, messages,
│       │                      #   praise, shifts, users)
│       ├── socket/            # Socket.IO event handlers
│       ├── middleware/        # Auth middleware
│       ├── __tests__/         # Jest test suites (88 tests)
│       └── prisma/            # Schema, migrations, seed data
└── package.json           # Root workspace config
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

All passwords are `password123`.

| Name | Email | Role | Location |
|---|---|---|---|
| Maria Santos | maria@goldenfork.com | Manager | Downtown |
| James Chen | james@goldenfork.com | Chef | Downtown |
| Sophie Williams | sophie@goldenfork.com | Server | Downtown |
| Kai Nakamura | kai@goldenfork.com | Bartender | Downtown |
| Priya Patel | priya@goldenfork.com | Manager | Waterfront |
| Tom O'Brien | tom@goldenfork.com | Chef | Waterfront |
| Aisha Mohammed | aisha@goldenfork.com | Server | Waterfront |
| Luca Rossi | luca@goldenfork.com | Kitchen Staff | Waterfront |
| Emma Davis | emma@goldenfork.com | Host | Midtown |
| Ryan Kim | ryan@goldenfork.com | Server | Midtown |

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

88 tests across 9 suites covering auth, channels, conversations, dashboard, feed, praise, read receipts, shifts, and threads.

## License

MIT
