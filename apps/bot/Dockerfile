# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm@10.10.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy package configurations
COPY packages/database/package.json ./packages/database/
COPY packages/services/package.json ./packages/services/
COPY packages/config-typescript/package.json ./packages/config-typescript/

# Copy app package.json
COPY apps/bot/package.json ./apps/bot/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/bot ./apps/bot

# Generate Prisma client
RUN pnpm run generate

# Expose port if needed (optional, for future webhook support)
# EXPOSE 3000

# Run the bot using tsx (runs TypeScript directly without watch)
CMD ["pnpm", "tsx", "apps/bot/index.ts"]

