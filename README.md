# Executive Operations Dashboard

A complete AI-powered operations dashboard with ClickUp, Google Calendar, and Gmail integrations.

## Features

- **Dashboard Overview** - Real-time KPIs and metrics
- **ClickUp Integration** - Sync tasks as projects
- **Google Calendar** - Sync and view upcoming events
- **Gmail Integration** - Send automated invoice reminders
- **AI Assistant** - Chat with your data using local Ollama
- **Supabase Database** - Store and query all your data

---

## Prerequisites

Before starting, make sure you have:

- **Node.js 18+** installed
- **Docker** installed and running
- **Git** installed

---

## Quick Start

### Step 1: Clone/Copy the Project

```bash
cd executive-dashboard
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Get Your Credentials

You need these credentials (see detailed instructions below):

1. **Supabase** - Database
2. **ClickUp** - Task management
3. **Google Service Account** - Calendar & Gmail

### Step 4: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials.

### Step 5: Setup Database

1. Go to [Supabase Dashboard](https://supabase.com)
2. Open SQL Editor
3. Copy contents of `supabase-schema.sql`
4. Run the SQL

### Step 6: Start Ollama (AI)

```bash
# Start Ollama container
docker-compose up -d

# Wait 30 seconds, then download the model (~5GB)
docker exec executive-ollama ollama pull llama3.1:8b
```

### Step 7: Run the Dashboard

```bash
npm run dev
```

Open http://localhost:3000

---

## Detailed Credential Setup

### 1. Supabase (Required)

1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Name it "executive-dashboard"
5. Wait for project to initialize (~2 min)
6. Go to **Settings → API**
7. Copy these values to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 2. ClickUp (Required)

1. Go to https://app.clickup.com
2. Click your avatar → **Settings**
3. Click **Apps** in sidebar
4. Scroll to "API Token"
5. Click **Generate** (or copy existing)
6. Copy token to `.env.local`:

```env
CLICKUP_API_TOKEN=pk_12345678_ABCDEFGHIJKLMNOP
```

7. Get Space ID:
   - Go to any space in ClickUp
   - Look at URL: `app.clickup.com/12345678/v/li/901234567`
   - The second number is your Space ID

```env
CLICKUP_SPACE_ID=901234567
```

### 3. Google Service Account (Required)

1. Go to https://console.cloud.google.com
2. Create a new project: "Executive Dashboard"
3. **Enable APIs**:
   - Search "Gmail API" → Enable
   - Search "Google Calendar API" → Enable

4. **Create Service Account**:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: "dashboard-bot"
   - Click "Create and Continue"
   - Skip role selection → "Continue"
   - Click "Done"

5. **Create Key**:
   - Click on the service account you created
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Select "JSON"
   - Download the file

6. **Copy values to `.env.local`**:

Open the downloaded JSON and copy:

```env
GOOGLE_CLIENT_EMAIL=dashboard-bot@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

**Important**: Keep the `\n` in the private key as-is.

7. **Share Calendar** (for calendar to work):
   - Open Google Calendar
   - Click ⚙️ → Settings
   - Select your calendar on the left
   - Scroll to "Share with specific people"
   - Add the service account email
   - Give "Make changes to events" permission

8. **Gmail Note**: 
   
   For Gmail to work with a service account, you need either:
   - **Option A**: Google Workspace with domain-wide delegation
   - **Option B**: Use OAuth2 instead (requires user consent)
   
   For testing, you can leave Gmail disabled and the dashboard will still work.

---

## Environment Variables Reference

```env
# SUPABASE (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CLICKUP (Required)
CLICKUP_API_TOKEN=pk_xxxxx
CLICKUP_SPACE_ID=xxxxx

# GOOGLE (Required for Calendar, optional for Gmail)
GOOGLE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=primary

# GMAIL (Optional - only if using domain-wide delegation)
GMAIL_SENDER_EMAIL=your-email@domain.com

# OLLAMA (Optional - defaults shown)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# APP
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Troubleshooting

### Ollama Not Connecting

```bash
# Check if container is running
docker ps

# If not running, start it
docker-compose up -d

# Check logs
docker logs executive-ollama

# Verify model is downloaded
docker exec executive-ollama ollama list
```

### ClickUp Sync Not Working

1. Verify your API token is correct
2. Check Space ID in ClickUp URL
3. Make sure you have tasks in the space

### Calendar Not Syncing

1. Verify service account has calendar access
2. Check if calendar is shared with service account email
3. Use `primary` as GOOGLE_CALENDAR_ID for main calendar

### Gmail Not Sending

Gmail with service accounts requires domain-wide delegation (Google Workspace).
For personal Gmail, you'll need to use OAuth2 instead.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check all service connections |
| `/api/clients` | GET/POST | Manage clients |
| `/api/projects` | GET/POST | Manage projects |
| `/api/invoices` | GET/POST | Manage invoices |
| `/api/calendar/events` | GET | Get calendar events |
| `/api/calendar/sync` | POST | Sync from Google Calendar |
| `/api/clickup/tasks` | GET | Get ClickUp tasks |
| `/api/clickup/sync` | POST | Sync ClickUp → Projects |
| `/api/gmail/send` | POST | Send email or reminders |
| `/api/ai/chat` | POST | Chat with AI assistant |

---

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Ollama (local, runs in Docker)
- **Integrations**: ClickUp API, Google APIs
- **Design**: Cream & Gold color scheme

---

## License

MIT
