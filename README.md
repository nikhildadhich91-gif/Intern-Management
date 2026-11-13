# Qubenix AI Pvt. Ltd. — Intern Management System

> **Automate. Integrate. Elevate.**  
> A full-stack intern management workspace built with **React**, **Tailwind CSS**, **Express**, **Neon PostgreSQL**, and an embedded **Live Workspace AI Assistant**.

- **Live Web App:** https://qubenix-intern-management-system.vercel.app
- **Repository:** https://github.com/nikhildadhich91-gif/Intern-Management

---

## What This App Does

1. **Protected Sign-In (`Admin` & `Intern` Roles)**  
   Clean login page for team administrators and interns using encrypted passwords and signed session tokens.
2. **Intern Directory & Profiles**  
   Admins can add, edit, search, inspect, and remove intern profiles (Name, Email, Phone, Department, Joining Date, Status, Project Link, Bio). Interns see their own profile cleanly.
3. **Task Assignment & Tracking**  
   Create tasks, assign them to interns, set deadlines and priorities (`Low`, `Medium`, `High`, `Critical`), and update progress (`Pending`, `In Progress`, `Completed`).
4. **Work Submissions & Team Meeting View**  
   Interns submit work summaries with project/repository links and document links. Admins can review submissions, approve work in one click, or launch **Meeting View** for live team walkthroughs.
5. **Visual Bento Dashboard & Qubenix Assistant**  
   Real-time visual cards summarize team health at a glance. Typing a question in the Dashboard **Qubenix Assistant** card and pressing **Enter** opens the full **Assistant** view with your exact question already answered using live team records.
6. **Admin-Only Workspace Safety & Activity**  
   Admins can view recent workspace events and run a 5-point live safety verification check. This section is completely hidden from Intern accounts.

---

## Dashboard Data Visualization Guide

Every card on the Dashboard translates live Neon PostgreSQL records into clear, actionable visual metrics:

| Card / Visual Element | Data Source | What It Visualizes | Interactive Behavior |
| :--- | :--- | :--- | :--- |
| **Team Workspace Hero** | `interns` + `tasks.submission` | Total vs. Active interns with avatar stack + number of submissions ready for meeting review | Click any intern avatar for their profile drawer, click **Show in Meeting** for slide review, or **Add Intern / Submit Work** |
| **Task Progress Matrix** | `tasks` status counts | **18 status slots** filled proportionally (`Dark Blue` = Completed, `Half Filled` = In Progress, `White` = Pending) | Switch **`D` / `W` / `M`** toggles to inspect **Tasks Done (`x/y`)**, **Completion Rate (`%`)**, or **Total Submitted**; click any slot to open its task |
| **Work Reviews Carousel** | Submitted `tasks` | One-by-one spotlight of submitted work (`internName`, `status`, summary, Project/Document links) | Cycle with **`<` / `>`** arrows, open **Meeting View**, or click **Approve** (Admin) |
| **Assigned Tasks Meter** | `tasks` breakdown | **24-bar segmented meter** showing exact Completed (`olive`), In Progress (`lime`), and Pending (`light`) proportions | Displays live counts for Completed, In Progress, and Pending tasks below the bar |
| **Active Interns Wave** | `interns` + `completionRate` | Smooth SVG activity curve paired with active intern count and weekly completion percentage | Live updates whenever interns or tasks change |
| **Qubenix Assistant Card** | Live workspace state | Quick prompt pills + instant search/ask box right inside the Dashboard | Type any question and press **Enter** to jump straight into the **Assistant** nav view with your question sent |

---

## How the System Works (Architecture & Data Flow)

```mermaid
flowchart LR
    User["Browser (Admin / Intern)"] -->|"HTTPS / Static Assets"| CDN["Vercel CDN / Express (dist/)"]
    User -->|"/api/* REST Calls + Bearer Token"| API["Express REST API (api/index.js)"]
    API -->|"Role Check + Input Validation"| Auth["Session & Safety Layer"]
    Auth -->|"Parameterized SQL over HTTPS"| DB[("Neon Serverless PostgreSQL")]
    Auth -->|"Relevant Live Records + Question"| AI["OpenRouter LLM (with Live Fallback)"]
```

### Request Lifecycle Step-by-Step

1. **Frontend (`React 18 + Vite + Tailwind CSS`)**  
   Compiled into static files (`dist/`). On Vercel, static assets load from the edge CDN; locally, `server.js` serves `dist/` alongside the API on port `3000`.
2. **Routing & Serverless Backend (`api/index.js`)**  
   - Requests to `/api/*` are rewritten by `vercel.json` to `api/index.js` as a Vercel Serverless Function.
   - Every protected route runs `requireAuth` (and `requireAdmin` for Admin-only routes) before touching data.
3. **Database Layer (`Neon PostgreSQL`)**  
   - Queries run over **HTTPS SQL (`POST https://<neon-host>/sql`)** using parameterized placeholders (`$1`, `$2`) so no open TCP connection pool is needed in serverless environments.
   - Workspace state (`interns`, `tasks`, `auditLogs`) is stored in table `qubenix_ims_store` (`store_key = 'main_state_v1'`) with `JSONB` payload and `TIMESTAMPTZ updated_at`.
4. **Role-Based Data Scoping**  
   - **Admin:** Full read/write access across all interns, tasks, submissions, and safety checks.
   - **Intern:** Receives only their own profile (`interns` filtered to `req.user.internId`) and their assigned tasks. Password hashes (`passwordHash`) are always stripped before sending data to the client.
5. **Qubenix Assistant (`POST /api/ai/chat`)**  
   - Validates input against unsafe text and private-prompt queries.
   - Retrieves relevant live records (`interns`, `tasks`, `submissions`) scoped to the signed-in user's role.
   - Sends context to OpenRouter (`nvidia/nemotron` / `google/gemma` fallback chain) and falls back cleanly to live server-generated summaries if the model endpoint is unavailable.

---

## Built-In Security Practices

| Protection Area | Implementation |
| :--- | :--- |
| **Password Storage** | `PBKDF2-SHA512` (100,000 iterations, 64-byte key) + `crypto.timingSafeEqual` |
| **Authentication** | Stateless HMAC-SHA256 signed JWT tokens (`24h` expiry) checked per request |
| **SQL Injection Defense** | Parameterized SQL (`$1`, `$2`) + payload pattern checks |
| **XSS & Link Safety** | Input sanitization + strict `http:` / `https:` protocol whitelist on submitted URLs |
| **Abuse Prevention** | Per-IP sliding-window rate limiting on API and AI endpoints |
| **Browser Edge Headers** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy` in `vercel.json` |
| **Secret Hygiene** | `.env` and `.vercel` excluded via `.gitignore`; `npm run security:check` verifies zero secrets exist in frontend `src/` |

---

## Project Structure

```text
├── api/
│   └── index.js                       # Express REST API, Auth, Neon HTTPS SQL, Assistant & Safety checks
├── scripts/
│   └── security-audit.js              # Automated 11-point security & code hygiene verification script
├── src/
│   ├── components/
│   │   ├── AssistantPanel.jsx         # Interactive Qubenix Assistant chat view
│   │   ├── MeetingPresenterModal.jsx  # Team Meeting View modal for reviewing submitted work
│   │   └── SafetyPanel.jsx            # Admin-only Workspace Safety & Activity dashboard
│   ├── App.jsx                        # Main Bento workspace, login view, Dashboard cards & CRUD modals
│   ├── index.css                      # Base typography & animations
│   └── main.jsx                       # React entry point
├── index.html                         # Root HTML shell & Inter / Inter Tight fonts
├── server.js                          # Local Node/Express server serving API + built React app
├── vercel.json                        # Vercel routing rewrites & HTTP security headers
└── package.json                       # Scripts & dependencies
```

---

## Local Setup & Commands

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**  
   Create a `.env` file in the project root (never commit `.env` to Git):
   ```env
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
   JWT_SECRET=your_long_random_session_secret
   ADMIN_EMAIL=your_admin_email@example.com
   ADMIN_PASSWORD=your_admin_password
   PORT=3000
   ```

3. **Run security audit, build, and start**
   ```bash
   npm run security:check
   npm run build
   npm start
   ```
   Open `http://localhost:3000` in your browser.
