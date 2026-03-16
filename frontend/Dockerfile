# --- Build stage ---
FROM node:18-alpine AS build
WORKDIR /app

# Pass API base at build-time for CRA (REACT_APP_* are embedded during build)
ARG REACT_APP_API_BASE_URL=http://localhost:8000
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

# Copy the rest of the source and build
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM nginx:alpine

# Nginx config for SPA routing (fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
