# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm@10.10.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies (will fail if no workspace config, so use npm as fallback)
COPY apps/off-chain-relayer/package.json ./apps/off-chain-relayer/
RUN pnpm install --frozen-lockfile || npm install

# Copy source code
COPY apps/off-chain-relayer ./apps/off-chain-relayer

# Build the project  
RUN pnpm --filter off-chain-relayer build || (cd apps/off-chain-relayer && npm run build)

# Run the off-chain-relayer
CMD ["node", "apps/off-chain-relayer/dist/index.js"]
