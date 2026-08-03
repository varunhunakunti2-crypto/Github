# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY backend/git-daemon/package*.json ./backend/git-daemon/
COPY packages/database/package*.json ./packages/database/
RUN npm ci

COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=@gitforge/database
RUN npm run build --workspace=@gitforge/git-daemon

# Stage 2: Production runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install git, openssh-client (needed for git operations and hook executions)
RUN apk add --no-cache git openssh-client

COPY package*.json ./
COPY backend/git-daemon/package*.json ./backend/git-daemon/
COPY packages/database/package*.json ./packages/database/
RUN npm ci --only=production

COPY --from=builder /app/backend/git-daemon/dist ./backend/git-daemon/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3002 2222
CMD ["node", "backend/git-daemon/dist/index.js"]
