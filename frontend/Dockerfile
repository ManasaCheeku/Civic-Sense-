# Stage 1: Compile React client using Bun
FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

# Stage 2: Serve built assets using Nginx
FROM nginx:alpine

# Copy compilation assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration to support client-side routing redirects
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
