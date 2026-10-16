#!/usr/bin/env bash
set -e

# Akson Full-Stack Development Orchestrator
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Detect Go binary
if command -v go >/dev/null 2>&1; then
    GO_BIN="go"
elif [ -x "/tmp/go/bin/go" ]; then
    GO_BIN="/tmp/go/bin/go"
elif [ -x "/usr/local/go/bin/go" ]; then
    GO_BIN="/usr/local/go/bin/go"
else
    echo "⚠️  Go binary bulunamadı! Backend başlatılamıyor."
    exit 1
fi

echo "🚀 Akson Full-Stack Başlatılıyor..."
echo "🔹 Go Backend Port: 3001"
echo "🔹 Frontend UI:     http://localhost:5173"
echo "----------------------------------------"

cleanup() {
    echo ""
    echo "🛑 Servisler kapatılıyor..."
    kill $(jobs -p) 2>/dev/null || true
    wait $(jobs -p) 2>/dev/null || true
    echo "✅ Tüm servisler temizce durduruldu."
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Go Backend
(
    cd "$ROOT_DIR/backend"
    PORT=3001 $GO_BIN run ./cmd/server/main.go
) &
BACKEND_PID=$!

# 2. Wait a moment for backend to bind port
sleep 1

# 3. Start Frontend Vite Server
(
    cd "$ROOT_DIR/frontend"
    npm run dev
) &
FRONTEND_PID=$!

# Wait for both processes
wait
