### Summary of the Flow:

1.  **GitHub Actions** builds the image and pushes it to Docker Hub.
2.  **GitHub Actions** SSHs into EC2 to pull the latest code for **Prisma** .
3.  **EC2 Host** runs the database migrations (`prisma db push`)
4.  **EC2 Docker** pulls the new image and restarts the container using the `.env` file

# 🚀 Borla Backend: Docker CI/CD Guide

This guide explains the automated deployment pipeline for the Borla Backend, which uses a **Hybrid Docker** approach to ensure environmental consistency and database safety.

---

## 🏗️ 1. Architecture Overview

The pipeline is split into two main stages:

1.  **The Build (GitHub Cloud):** Builds a production-ready Docker image and pushes it to Docker Hub.
2.  **The Deploy (AWS EC2):** Connects via SSH to run database migrations on the host and then launches the new container.

---

## 📦 2. The Importance of `package-lock.json`

You must **never** ignore `package-lock.json` in this setup.

- **Requirement:** The `Dockerfile` uses `npm ci` for a "Clean Install." This command will fail if the lockfile is missing.
- **Consistency:** It ensures the exact versions of dependencies used during development are used in the production container.

**Action:** Ensure your `.gitignore` does NOT contain `package-lock.json`.

---

## 🔐 3. Required GitHub Secrets

Before pushing, ensure these secrets are added in **Settings > Secrets and variables > Actions**:

| Secret Name       | Description                                    |
| :---------------- | :--------------------------------------------- |
| `EC2_HOST`        | The Public IP of your EC2 instance.            |
| `EC2_USER`        | Usually `ubuntu`.                              |
| `EC2_SSH_KEY`     | Your private SSH key (`borla_github_actions`). |
| `DOCKER_USERNAME` | Your Docker Hub username (`abirwerks`).        |
| `DOCKER_PASSWORD` | Your Docker Hub password or Access Token.      |

---

## 🚀 4. The Deployment Script (`deploy.yml`)

The workflow performs the following steps on every push to `main`:

```bash
# 1. Update schema files for Prisma
git pull origin main

# 2. Run Database Migrations (Host-side)
npm install --only=dev
npx prisma generate
npx prisma db push

# 3. Docker Lifecycle
docker stop borla-backend-api || true
docker rm borla-backend-api || true
docker pull abirwerks/borla-backend:latest
docker run -d --name borla-backend-api --restart always -p 5000:5000 --env-file ~/borla_backend/.env abirwerks/borla-backend:latest
```

---

## 🔍 5. How to Check & Verify

### In GitHub Actions:

- Go to the **Actions** tab.
- Green checkmarks mean success.
- If red, click the job to see exactly which step failed (e.g., Build or SSH connection).

### On the EC2 Server:

Run these commands to verify the container:

```bash
# Check if the container is running
docker ps

# See real-time application logs
docker logs -f borla-backend-api

# Check memory and CPU usage
docker stats borla-backend-api
```

---

## 🧹 6. Maintenance: Disk Space

Docker keeps old images on the server. To prevent your EC2 from running out of disk space, run this occasionally:

```bash
docker image prune -f
```

This removes unused images that are no longer linked to a running container.
