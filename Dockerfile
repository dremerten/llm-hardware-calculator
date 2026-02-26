# ---- Build Stage ----
FROM node:20-alpine AS build

WORKDIR /app

ENV HUSKY=0

COPY package*.json ./

RUN npm ci && \
    npm cache clean --force

COPY . .

RUN npm run build && \
    find dist -name "*.map" -delete

# ---- Runtime Stage ----
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
