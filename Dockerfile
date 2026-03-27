# Step 1: Build Astro app
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Step 2: Run with Node.js (SSR)
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy the built output and node_modules needed at runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]