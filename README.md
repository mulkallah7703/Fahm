# فَهْم — FAHM

Adaptive AI Learning Companion. Screen 1 is the student dashboard: real authentication, SQL Server data, file/camera upload, learning pulse, and recommendations.

## Architecture

- `client/` — React + Vite + TypeScript, Arabic-first RTL
- `server/` — Express + TypeScript, layered routes → controllers → services → repositories
- Database — existing Microsoft SQL Server database `Fahm`, schema `fahm` (not created or reset by this app)

## Setup

1. Copy `.env.example` to `.env` and set `JWT_SECRET`.
2. SQL Server Express should already have database `Fahm`.
3. Default connection uses Windows authentication:

```
DB_AUTH=windows
DB_SERVER=localhost
DB_INSTANCE=SQLEXPRESS
DB_DATABASE=Fahm
```

4. Install and run:

```
npm install
npm run dev
```

- API: http://localhost:4000
- App: http://localhost:5173

Create a student account from `/register`. There is no hardcoded demo student.

## Scripts

```
npm run typecheck
npm run lint
npm test
npm run build
```
