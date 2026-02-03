# 2026 Standard Configuration
# Node 22 LTS (Alpine) for minimal footprint
FROM node:22-alpine

WORKDIR /app

# Enable Corepack for consistent dependency management
RUN corepack enable

# Copy package metadata first for better caching
COPY package.json package-lock.json ./

# Clean install of dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose Vite development port
EXPOSE 3001
# Expose MCP Router port (if used)
EXPOSE 8003

# Default command for development
CMD ["npm", "run", "dev"]
