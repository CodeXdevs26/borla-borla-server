# Running Borla Backend with Docker

The backend expects a MongoDB connection string and all application secrets in
`.env`. Docker does not copy that file into the image; Compose supplies it at
runtime.

## Start the API

```bash
docker compose up --build -d api
```

The API and Socket.IO server are available on `http://localhost:5000` by
default. Set `HOST_PORT` in the shell or `.env` to expose a different host port.

View logs:

```bash
docker compose logs -f api
```

Stop it:

```bash
docker compose down
```

## Apply Prisma schema changes

Run this explicitly after a Prisma schema update and before deploying the API:

```bash
docker compose run --rm migrate
```

It runs `prisma db push` and the project's contact-index setup script against
`DATABASE_URL` from `.env`.

## Persistent uploads

Files written to `public/uploads` are kept in the named Docker volume
`uploads`, so recreating the API container does not remove them. S3 uploads
remain controlled by the S3 variables in `.env`.
