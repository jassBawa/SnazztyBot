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
COPY apps/scheduler/package.json ./apps/scheduler/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages ./packages
COPY apps/scheduler ./apps/scheduler

# Generate Prisma client
RUN pnpm run generate

# Run the scheduler using tsx (runs TypeScript directly without watch)
CMD ["pnpm", "tsx", "apps/scheduler/src/index.ts"]

