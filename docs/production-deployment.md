# Production Deployment Guide

This guide provides instructions for deploying the BPKAD Zoom Book application in a production environment using Docker.

## Prerequisites

- Docker and Docker Compose installed on your server
- Zoom API credentials (see [zoom-integration.md](./zoom-integration.md))

## Environment Variables Setup

1. Create a `.env` file in the root directory with the following content:

```
# Database configuration
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/bpkad_zoom_book"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=bpkad_zoom_book

# NextAuth configuration
NEXTAUTH_SECRET="your-long-random-string-for-jwt-security"
NEXTAUTH_URL="https://your-production-domain.com"
```

2. Replace the placeholder values with your actual configuration:
   - For database credentials, use strong passwords
   - For `NEXTAUTH_SECRET`, generate a strong random string (see below)
   - For `NEXTAUTH_URL`, use your production domain
   - For Zoom credentials, use the values from your Zoom Developer account

### Important Notes about JWT Security

- The `NEXTAUTH_SECRET` is critical for securing your JWT tokens
- Generate a strong random string using a command like:
  ```bash
  openssl rand -base64 32
  ```
- Never use the development secret in production
- If this secret is compromised, all sessions should be considered compromised

## Database Migration

The docker-compose.yml includes a PostgreSQL database service and automatically handles migrations:

1. The PostgreSQL container is configured to use persistent volume storage
2. Default credentials are set via environment variables (customize these for production!)
3. The migration service automatically applies database migrations on startup

If you prefer to use an external PostgreSQL database:
1. Update the `DATABASE_URL` in your `.env` file to point to your external PostgreSQL database
2. Remove or comment out the `postgres` service in docker-compose.yml
3. Remove the dependency on `postgres` for the app and migrate services

## Docker Production Setup

1. Our docker-compose.yml includes three services:
   - `app`: The main Next.js application
   - `migrate`: Service to run database migrations and seeds
   - `postgres`: PostgreSQL database server

2. The PostgreSQL service uses:
   - Alpine-based PostgreSQL 15 for smaller image size
   - Persistent volume for data storage
   - Environment variables for configuration
   - Exposed port 5432 (consider removing for production if not needed externally)

## Deployment Steps

1. Push your code to the server (or clone it)
2. Set up your `.env` file with all required environment variables
3. Update the Prisma schema to use PostgreSQL:

```
// In prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

4. Build and start the containers:

```bash
docker-compose -f docker/docker-compose.yml up -d --build
```

5. Verify the containers are running:

```bash
docker ps
```

6. Check logs for any issues:

```bash
# Check app logs
docker logs bpkad-zoom-book-app

# Check migration logs
docker logs bpkad-zoom-book-migrate

# Check database logs
docker logs bpkad-zoom-book-postgres
```

7. Access your application at your domain or server IP on port 3000

## Security Considerations

1. **JWT Tokens**:
   - Always use a strong NEXTAUTH_SECRET in production
   - Set an appropriate token expiration time
   - Consider using HTTPS to protect JWT tokens in transit

2. **Database**:
   - Use a strong password for your database
   - Consider using a separate database user with limited permissions for the application
   - Back up your database regularly

3. **Zoom API Credentials**:
   - Store Zoom API credentials securely
   - Only grant necessary scopes to your Zoom app

## Troubleshooting

- If you encounter authentication issues, check that NEXTAUTH_SECRET and NEXTAUTH_URL are set correctly
- For database connection issues:
  - Verify that PostgreSQL is running (`docker ps | grep postgres`)
  - Check the PostgreSQL logs (`docker logs bpkad-zoom-book-postgres`)
  - Ensure the DATABASE_URL is correct with proper credentials
  - Test the connection directly (`docker exec -it bpkad-zoom-book-postgres psql -U postgres -d bpkad_zoom_book`)
- If migrations fail:
  - Check the migration logs (`docker logs bpkad-zoom-book-migrate`)
  - Ensure the database exists and the user has appropriate permissions
  - Try running migrations manually within the container
- If Zoom integration fails, ensure your Zoom API credentials are correct and have the necessary permissions 