# Database setup

BanqMaster Pro uses **PostgreSQL 16** running in **Docker**. This guide covers
getting the database up, seeded, and ready for the Next.js app.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Node.js 20+
- A populated `.env` file (copy from `.env.example`)

```bash
cp .env.example .env
# Generate a real AUTH_SECRET:
#   openssl rand -base64 32
# Then paste it into AUTH_SECRET in .env
```

The default `DATABASE_URL` in `.env.example` already matches the Docker compose
config, so you usually don't need to change it.

## Start the database

```bash
npm run db:up
```

This runs `docker compose up -d` and starts two containers:

| Service       | What it is             | Port  | URL                          |
| ------------- | ---------------------- | ----- | ---------------------------- |
| `banqmaster-db`      | Postgres 16            | 5432  | `localhost:5432`             |
| `banqmaster-adminer` | Web DB browser         | 8080  | http://localhost:8080        |

Default DB credentials (set in `docker-compose.yml`):

```
host:     localhost
port:     5432
user:     banqmaster
password: banqmaster
database: banqmaster
```

To open Adminer, visit http://localhost:8080 and log in with the values above
(system = PostgreSQL, server = `db`).

## Apply the schema

The first time, push the Prisma schema to create all tables:

```bash
npm run db:push
```

## Seed demo data

```bash
npm run db:seed
```

This populates:

- The 7 system **roles** (Owner, Admin, Manager, Accountant, Receptionist, Staff, Developer) with their default permissions
- 5 **users** for testing:

| Username     | Role         | Password   |
| ------------ | ------------ | ---------- |
| `owner`      | OWNER        | `admin123` |
| `admin`      | ADMIN        | `admin123` |
| `manager`    | MANAGER      | `admin123` |
| `reception`  | RECEPTIONIST | `admin123` |
| `accountant` | ACCOUNTANT   | `admin123` |

- 22 rooms across 3 floors
- A few vendors and inventory items
- One demo booking with sample payments

## Daily commands

```bash
npm run db:up        # Start containers
npm run db:down      # Stop containers (data persists in the Docker volume)
npm run db:push      # Sync Prisma schema → DB (use after schema.prisma changes)
npm run db:seed      # Re-run the seed script (idempotent — safe to repeat)
npm run db:studio    # Open Prisma Studio GUI for browsing data
```

Adminer (full SQL browser) lives at http://localhost:8080.

## Reset the database

If you need to wipe everything and start fresh:

```bash
npm run db:down                     # stop containers
docker volume rm banqmaster-pro_postgres-data   # delete the volume
npm run db:up                       # start fresh
npm run db:push
npm run db:seed
```

## Backups

A daily backup script lives at `docker/backup.sh`. It uses `pg_dump` inside the
container and writes a gzip'd SQL dump to `./backups/`:

```bash
./docker/backup.sh
# → ./backups/banqmaster-YYYY-MM-DD_HHMMSS.sql.gz
```

Schedule it with cron for production:

```cron
0 2 * * *  cd /path/to/banqmaster-pro && ./docker/backup.sh >> ./backups/backup.log 2>&1
```

The script keeps the last 30 days and deletes older dumps automatically.

## Restore from a backup

```bash
./docker/restore.sh ./backups/banqmaster-2026-05-12_020000.sql.gz
```

**Destructive:** drops the existing `banqmaster` database and recreates it from
the dump. The script prompts you to type `RESTORE` to confirm before proceeding.

## Troubleshooting

**`Error: P1001: Can't reach database server` after `db:push`**
Docker isn't running, or the container hasn't finished starting. Run
`docker ps` — you should see `banqmaster-db` with status `(healthy)`. If not,
`npm run db:up` and wait ~5 seconds.

**`port is already allocated` on `db:up`**
Another Postgres is using port 5432 (often a locally-installed Postgres).
Either stop it, or change the host port in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"   # host:container
```

…and update `DATABASE_URL` in `.env` to `localhost:5433`.

**`prisma:error … column does not exist`**
Schema is ahead of the DB. Run `npm run db:push` to sync.

**Need to inspect data?**
Either `npm run db:studio` (Prisma Studio GUI) or open Adminer at
http://localhost:8080.
