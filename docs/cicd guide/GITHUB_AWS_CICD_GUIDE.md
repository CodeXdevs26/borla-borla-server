# CI/CD Pipeline Documentation: Borla Backend

## 1. Overview

This document outlines the end-to-end CI/CD process for the borla_backend project. The pipeline automates the deployment of the Node.js/TypeScript backend to an AWS EC2 instance, ensuring that updates pushed to GitHub are automatically pulled, built, and restarted on the production server.

## 2. Infrastructure Setup

### SSH Key Generation

To allow GitHub to communicate securely with your AWS EC2 instance without a password, a dedicated SSH key pair is used.

Generate the key on local Windows machine:

```bash
ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\borla_github_actions"
```

**Important:** The private key (`borla_github_actions`) is stored as a secret in GitHub, while the public key (`borla_github_actions.pub`) is added to the EC2 instance's `~/.ssh/authorized_keys` file.

## 3. GitHub Actions Configuration

The pipeline is defined in `.github/workflows/deploy.yml`. It triggers automatically on every push to the main branch.

```yaml
name: Deploy Backend
on:
  push:
    branches:
      - main
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/borla_backend
            git pull origin main
            npm install
            npx prisma generate
            npx prisma db push
            npm run build
            pm2 restart backend || pm2 start dist/server.js --name backend
```

## 4. Deployment Steps

Every time you push code, the following actions occur on your EC2 server:

- **Checkout:** GitHub downloads your latest code.
- **SSH Connection:** GitHub logs into your EC2 instance using the provided credentials.
- **Pulling Code:** The server updates its local git repository.
- **Dependency Management:** `npm install` ensures all required packages are updated.
- **Database Migration:** `npx prisma db push` keeps your database schema in sync.
- **Building:** `npm run build` compiles your TypeScript files.
- **Restarting:** `pm2` manages the application, ensuring it stays online.

## 5. Security & Maintenance

- **Secrets:** Never hardcode credentials. Use GitHub Repository Secrets for `EC2_HOST`, `EC2_USER`, and `EC2_SSH_KEY`.
- **Environment Variables:** Keep your `.env` file on the EC2 server and do not commit it to GitHub.
- **Monitoring:** Use `pm2 logs` on your EC2 instance to monitor the application output in real-time.
