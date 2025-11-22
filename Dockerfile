# Use Node.js LTS version
FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy application files
COPY src ./src

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the port
EXPOSE 3979

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3979/', (r) => {process.exit(r.statusCode === 302 ? 0 : 1)})"

# Start the application
CMD ["node", "src/index.js"]
