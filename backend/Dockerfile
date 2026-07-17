FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN mkdir -p /app/data
# Runs as root: /app/data is a host bind-mount (see docker-compose.yml) and its
# ownership depends on the host user, which a fixed container UID can't reliably
# match across different servers. The backend has no published port and is only
# reachable from the frontend container over the compose network.
EXPOSE 4000
CMD ["node", "src/server.js"]
