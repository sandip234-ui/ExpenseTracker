# ==============================================================================
# FinTrack Server - Production Container Image
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install openssl for Prisma runtime engines
RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production
ENV PORT=5001

# Copy dependency definitions
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code
COPY src ./src

# Expose API port
EXPOSE 5001

# Run with dumb-init for proper signal handling and zombie reaping
USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
