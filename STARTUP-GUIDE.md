# 🚀 Executive Dashboard - Startup Guide

This document outlines all the services and steps required to run the Executive Dashboard.

---

## ✅ Pre-Startup Checklist

Run these steps **every time** before starting the app:

### 1. Start Docker Desktop
Make sure Docker Desktop is running on your machine.

```bash
# Verify Docker is running
docker ps
```

---

### 2. Start Ollama (AI Service)

The AI chatbot requires Ollama to be running.

```bash
# Navigate to project directory
cd executive-dashboard

# Start Ollama container
docker-compose up -d
```

**Verify Ollama is running:**
```bash
docker ps
# Should show: executive-ollama container running
```

**First-time setup only - Pull the AI model (~5GB):**
```bash
docker exec executive-ollama ollama pull llama3.1:8b
```

**Verify model is downloaded:**
```bash
docker exec executive-ollama ollama list
# Should show: llama3.1:8b
```

---

### 3. Start the Next.js App

```bash
# Using npm
npm run dev

# Or using cmd on Windows (if PowerShell has execution policy issues)
cmd /c npm run dev
```

**App URL:** http://localhost:3000

---

## 🔧 Services Required

| Service | Port | Purpose | How to Start |
|---------|------|---------|--------------|
| **Ollama** | 11434 | Local AI chatbot | `docker-compose up -d` |
| **Next.js** | 3000 | Web application | `npm run dev` |
| **Supabase** | Cloud | Database | Always available (cloud hosted) |

---

## ⚡ Quick Start Commands

**One-liner to start everything:**
```bash
# Start Ollama + Next.js
docker-compose up -d && npm run dev
```

---

## 🔌 Integration Status Check

After starting the app, go to **Settings** page to verify all connections:

- ✅ Supabase (Database)
- ✅ ClickUp (Tasks)
- ✅ Google Calendar
- ✅ Gmail
- ✅ Ollama (AI)

If any service shows disconnected, check:
1. API keys are configured in Settings
2. Required services are running

---

## 🛑 Shutdown Commands

```bash
# Stop Next.js
Ctrl + C (in terminal)

# Stop Ollama
docker-compose down
```

---

## ⚠️ Troubleshooting

### Ollama Not Connecting
```bash
# Check if container is running
docker ps

# Restart Ollama
docker-compose restart

# Check logs
docker logs executive-ollama
```

### Port Already in Use
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Kill process on port 11434 (Windows)
netstat -ano | findstr :11434
taskkill /PID <PID> /F
```

### AI Model Missing
```bash
# Re-download the model
docker exec executive-ollama ollama pull llama3.1:8b
```

---

## 📋 Summary

**Every time you start:**
1. ✅ Open Docker Desktop
2. ✅ Run `docker-compose up -d` (starts Ollama)
3. ✅ Run `npm run dev` (starts the app)
4. ✅ Open http://localhost:3000
