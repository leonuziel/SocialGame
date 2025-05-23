# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy root package files first for dependency caching
COPY package.json package-lock.json* ./
# Install root dependencies (like concurrently, though mostly dev)
RUN npm install

# Copy client package files and install client dependencies
COPY client/package.json client/package-lock.json* client/ ./client/
RUN npm install --prefix client

# Copy client source and build the client
COPY client/ ./client/
RUN npm run build --prefix client

# Copy server2 package files and install server2 dependencies
COPY server2/package.json server2/package-lock.json* server2/ ./server2/
RUN npm install --prefix server2

# Copy server2 source and build server2
COPY server2/ ./server2/
RUN npm run build --prefix server2


# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy server2 production dependencies definition
COPY --from=builder /usr/src/app/server2/package.json /usr/src/app/server2/package.json
COPY --from=builder /usr/src/app/server2/package-lock.json* /usr/src/app/server2/package-lock.json*
# Install server2 production dependencies
RUN npm install --prefix server2 --only=production

# Copy built server2 application from builder stage
COPY --from=builder /usr/src/app/server2/dist ./server2/dist

# Copy built client application from builder stage
COPY --from=builder /usr/src/app/client/build ./client-build

# Expose port - Port will be picked up from process.env.PORT by server2/src/config.ts, typically 8080 in managed environments
EXPOSE 8080

# Start the server
CMD ["node", "server2/dist/server.js"]
