# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
# The server starts and answers MCP introspection without credentials.
# Provide COMBELL_API_KEY / COMBELL_API_SECRET at runtime to actually call the Combell API,
# and whitelist the container's outbound IP address in My Combell > API.
ENTRYPOINT ["node", "dist/index.js"]
