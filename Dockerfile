# --- STAGE 1: Base ---
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Keep the container running in development mode
CMD ["npm", "run", "start:dev"]


# --- STAGE 2: Production Build (Leave this as it was) ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]