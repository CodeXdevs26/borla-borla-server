FROM node:20-bookworm-slim AS base

WORKDIR /app

ENV npm_config_update_notifier=false

COPY package*.json ./

RUN npm ci

FROM base AS builder

COPY prisma ./prisma
COPY public ./public
COPY src ./src
COPY tsconfig.json ./

RUN npm run prisma:generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update -y \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000
ENV IP=0.0.0.0
ENV TS_NODE_BASEURL=./dist

COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/tsconfig.json ./tsconfig.json
COPY --chown=node:node package*.json ./

USER node

EXPOSE 5000

CMD ["node", "-r", "tsconfig-paths/register", "dist/server.js"]