# Akson: backend + built frontend in one image.

# 1) Frontend
# Base images are pinned by digest (tag kept for readability); update them deliberately.
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Backend
FROM golang:1.26-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -o /out/akson-server ./cmd/server

# 3) Runtime (git is needed to clone repositories)
FROM alpine:3.24@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf
RUN apk add --no-cache git ca-certificates
COPY --from=backend /out/akson-server /usr/local/bin/akson-server
COPY --from=frontend /app/dist /app/web
ENV HOST=0.0.0.0 \
    PORT=3001 \
    DB_PATH=/data/akson.db \
    STATIC_DIR=/app/web
VOLUME ["/data"]
EXPOSE 3001
CMD ["akson-server"]
