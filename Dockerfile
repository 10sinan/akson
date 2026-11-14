# Akson: backend + built frontend in one image.

# 1) Frontend
FROM node:22-alpine AS frontend
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
FROM alpine:3.20
RUN apk add --no-cache git ca-certificates
COPY --from=backend /out/akson-server /usr/local/bin/akson-server
COPY --from=frontend /app/dist /app/web
ENV PORT=3001 \
    DB_PATH=/data/akson.db \
    STATIC_DIR=/app/web
VOLUME ["/data"]
EXPOSE 3001
CMD ["akson-server"]
