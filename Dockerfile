# Multi-stage Dockerfile for building the Astro site and serving with nginx

# ----------- Builder stage -----------
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package manifests first to leverage layer caching
COPY package.json package-lock.json* ./

# Install dependencies (npm ci is deterministic). Build needs dev deps depending on setup.
RUN npm ci

# Copy the rest of the source and run the build
COPY . .
RUN npm run build

# ----------- Runner stage (nginx) -----------
FROM nginx:stable-alpine AS runner

# Remove default nginx content (if any) and create config dir
RUN rm -rf /usr/share/nginx/html/* \
 && mkdir -p /etc/nginx/conf.d

# Copy built static site from builder
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# Add a minimal nginx config with SPA fallback (try_files) and caching for static assets
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Serve files directly, fallback to index.html for client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Strong caching for static assets
    location ~* \.(?:css|js|svg|png|jpg|jpeg|gif|ico|webp|avif|woff2?|eot|ttf)$ {
        try_files $uri =404;
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # Disable logging for health checks or unnecessary noise (optional)
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;
}
EOF

EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

