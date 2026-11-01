# 🐳 Borla Backend – Docker Setup & Run Guide

This document explains how to **build, run, debug, and manage** the Borla Backend application using Docker.

---

## 📦 Prerequisites

Make sure you have installed:

- Docker Desktop (running)
- Node.js (for local development if needed)
- `.env` file configured properly

---

## 🚀 Step-by-Step Guide

---

### 🔧 1. Build the Docker Image

```bash
docker build -t borla-backend .
```

### 📖 Explanation:

- `docker build` → Builds a Docker image from your Dockerfile
- `-t borla-backend` → Tags the image with the name **borla-backend**
- `.` → Uses the current directory as build context

---

### ▶️ 2. Run the Container

```bash
docker run -d --name borla-backend-api --env-file .env -p 5000:5000 borla-backend
```

### 📖 Explanation:

- `docker run` → Starts a new container
- `-d` → Runs in **detached mode** (background)
- `--name borla-backend-api` → Assigns a container name
- `--env-file .env` → Loads environment variables
- `-p 5000:5000` → Maps:
  - Host port: `5000`
  - Container port: `5000`

- `borla-backend` → Image name

---

### 📜 3. Check Logs (Debugging)

```bash
docker logs -f borla-backend-api
```

### 📖 Explanation:

- `docker logs` → Shows container output
- `-f` → Follow logs in real-time (like `tail -f`)

---

### 🌐 4. Test the API

Open in browser:

```
http://localhost:5000
```

Or via terminal:

```bash
curl http://localhost:5000
```

---

## 🔁 Development Workflow

---

### 🛑 Stop the Container

```bash
docker stop borla-backend-api
```

### 📖 Explanation:

- Gracefully stops the running container

---

### 🗑️ Remove the Container

```bash
docker rm borla-backend-api
```

### 📖 Explanation:

- Deletes the container (required before re-running with same name)

---

### 🔄 Rebuild After Code Changes

```bash
docker build -t borla-backend . ; docker stop borla-backend-api ; docker rm borla-backend-api ; docker run -d --name borla-backend-api --env-file .env -p 5000:5000 borla-backend
```

### 📖 Explanation:

This is a chained command that:

1. Builds updated image
2. Stops old container
3. Removes old container
4. Runs new container

---

## 🧹 Clean Rebuild (Recommended for Debugging)

```bash
docker stop borla-backend-api
docker rm borla-backend-api
docker build --no-cache -t borla-backend .
docker run -d --name borla-backend-api --env-file .env -p 5000:5000 borla-backend
docker logs -f borla-backend-api
```

### 📖 Explanation:

- `--no-cache` → Forces fresh build (avoids stale layers)
- Ensures all changes are applied cleanly

---

### Push image docker hub repo

```bash
docker login -u username
docker tag borla-backend abirwerks/borla-backend:1.0
docker push abirwerks/borla-backend:1.0
```

## ⚠️ Common Issues & Fixes

---

### ❌ Port already in use

**Error:**

```
bind: Only one usage of each socket address...
```

**Fix:**

- Stop conflicting process OR
- Change port:

```bash
-p 5001:5000
```

---

### ❌ Container exits immediately

Check logs:

```bash
docker logs borla-backend-api
```

Common causes:

- Missing env variables
- DB connection failure
- Build/runtime errors

---

### ❌ Module not found (@app/...)

**Cause:** TypeScript path aliases not resolved in production

**Fix:**
Use `tsc-alias` in build step:

```json
"build": "tsc && tsc-alias"
```

---

## 🧠 Best Practices

- Always use `--no-cache` when debugging build issues
- Keep `.env` outside Docker image
- Avoid using TypeScript aliases in runtime without resolving them
- Use multi-stage Docker builds (already implemented ✅)

---

## ✅ Quick Start (Copy-Paste)

```bash
docker stop borla-backend-api
docker rm borla-backend-api
docker build --no-cache -t borla-backend .
docker run -d --name borla-backend-api --env-file .env -p 5000:5000 borla-backend
docker logs -f borla-backend-api
```

---

## 🎯 Final Result

Once everything is running:

👉 Visit: **http://localhost:5000**

---

If something breaks, always start with:

```bash
docker logs borla-backend-api
```

That’s your **single source of truth** for debugging.

---
