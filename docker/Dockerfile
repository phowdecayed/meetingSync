# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
# Use npm ci for faster, more reliable builds in CI/CD environments
RUN npm ci

COPY . .

# Ensure the public directory exists, even if it's empty, to prevent COPY errors later.
RUN mkdir -p public

# Generate Prisma Client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/.next ./.next
# This copy will now always succeed because we ensured the public directory exists.
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

RUN chown -R node:node /app

# It's a good practice to run containers as a non-root user
USER node

EXPOSE 3000

# Start the application
CMD ["npm", "start"]