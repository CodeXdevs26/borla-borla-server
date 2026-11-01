# 🐳 Dockerfile Deep Dive – Borla Backend

This document explains **every single line** of the Dockerfile.

---

# 📌 Overview

The Dockerfile uses a **multi-stage build**, which is best practice for:

- Smaller final image size ✅
- Better security ✅
- Separation of build vs runtime ✅

It has **3 stages**:

1. `base` → install dependencies
2. `builder` → build the app
3. `runner` → run the app (production image)

---

# 🧱 Stage 1: Base Image

```dockerfile id="a1"
FROM node:20-bookworm-slim AS base
```

### 📖 Explanation:

- Uses official Node.js v20 image
- `bookworm-slim` = lightweight Debian (smaller image size)
- `AS base` → names this stage so others can reuse it

---

```dockerfile id="a2"
WORKDIR /app
```

### 📖 Explanation:

- Sets working directory inside container
- All future commands run inside `/app`

---

```dockerfile id="a3"
ENV npm_config_update_notifier=false
```

### 📖 Explanation:

- Disables npm update notification
- Prevents unnecessary logs during install

---

```dockerfile id="a4"
COPY package*.json ./
```

### 📖 Explanation:

- Copies:
  - `package.json`
  - `package-lock.json`

- Used for dependency installation

👉 Important for Docker caching:

- If dependencies don’t change → layer is cached

---

```dockerfile id="a5"
RUN npm ci
```

### 📖 Explanation:

- Installs dependencies exactly from `package-lock.json`
- Faster and more reliable than `npm install`
- Ideal for production builds

---

# 🏗️ Stage 2: Builder

```dockerfile id="b1"
FROM base AS builder
```

### 📖 Explanation:

- Reuses everything from `base`
- Creates a new stage called `builder`

---

```dockerfile id="b2"
COPY prisma ./prisma
COPY public ./public
COPY src ./src
COPY tsconfig.json ./
```

### 📖 Explanation:

Copies project files needed for build:

- `prisma/` → database schema & client
- `public/` → static assets
- `src/` → TypeScript source code
- `tsconfig.json` → TS compiler config

---

```dockerfile id="b3"
RUN npm run prisma:generate
```

### 📖 Explanation:

- Generates Prisma client
- Required before building app

---

```dockerfile id="b4"
RUN npm run build
```

### 📖 Explanation:

- Compiles TypeScript → JavaScript
- Output goes to `dist/`

---

```dockerfile id="b5"
RUN npm prune --omit=dev
```

### 📖 Explanation:

- Removes **devDependencies**
- Keeps only production dependencies

👉 Reduces final image size significantly

---

# 🚀 Stage 3: Runner (Production)

```dockerfile id="c1"
FROM node:20-bookworm-slim AS runner
```

### 📖 Explanation:

- Fresh clean image for production
- Does NOT include build tools → smaller & safer

---

```dockerfile id="c2"
WORKDIR /app
```

### 📖 Explanation:

- Sets working directory again for runtime

---

```dockerfile id="c3"
RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*
```

### 📖 Explanation:

- Updates package list
- Installs `openssl` (required by Prisma / secure connections)
- Removes cache to reduce image size

---

```dockerfile id="c4"
ENV NODE_ENV=production
ENV PORT=5000
ENV IP=0.0.0.0
ENV TS_NODE_BASEURL=./dist
```

### 📖 Explanation:

- `NODE_ENV=production`
  - Enables production optimizations

- `PORT=5000`
  - App runs on port 5000

- `IP=0.0.0.0`
  - Allows external access (important for Docker)

- `TS_NODE_BASEURL=./dist`
  - Used by `tsconfig-paths` (mostly dev-related)

---

```dockerfile id="c5"
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
```

### 📖 Explanation:

- Copies installed dependencies from builder stage
- `--chown=node:node` → assigns correct permissions

---

```dockerfile id="c6"
COPY --chown=node:node --from=builder /app/dist ./dist
```

### 📖 Explanation:

- Copies compiled JavaScript files

---

```dockerfile id="c7"
COPY --chown=node:node --from=builder /app/public ./public
```

### 📖 Explanation:

- Copies static assets

---

```dockerfile id="c8"
COPY --chown=node:node --from=builder /app/tsconfig.json ./tsconfig.json
```

### 📖 Explanation:

- Copies TypeScript config (used by tsconfig-paths if enabled)

---

```dockerfile id="c9"
COPY --chown=node:node package*.json ./
```

### 📖 Explanation:

- Copies package metadata (optional but useful for debugging/tools)

---

```dockerfile id="c10"
USER node
```

### 📖 Explanation:

- Runs container as non-root user (`node`)
- Improves security

---

```dockerfile id="c11"
EXPOSE 5000
```

### 📖 Explanation:

- Documents that container listens on port 5000
- Does NOT actually publish port (that’s `-p` in docker run)

---

```dockerfile id="c12"
CMD ["node", "-r", "tsconfig-paths/register", "dist/server.js"]
```

### 📖 Explanation:

- Starts the application

- `node dist/server.js` → runs compiled app

- `-r tsconfig-paths/register` → tries to resolve TS aliases at runtime

---

# 🧠 Summary

### What the Dockerfile does:

1. Installs dependencies
2. Builds TypeScript → JavaScript
3. Removes dev dependencies
4. Copies only necessary files
5. Runs app in a clean production environment

---

# 🎯 Key Benefits of The Setup

- ✅ Optimized image size
- ✅ Secure (non-root user)
- ✅ Clean separation of build/runtime
- ✅ Production-ready structure
