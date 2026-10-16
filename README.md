# Akson - Docker Dağıtım ve Yönetim Paneli

Akson, modern ve akıcı bir kullanıcı deneyimi sunan, Go backend ve React 19 frontend mimarisi üzerine kurulu konteyner yönetim platformudur.

## 🚀 Hızlı Başlangıç

Tüm full-stack sistemi tek komutla ayağa kaldırmak için:

```bash
# Geliştirme ortamını başlat (Backend: 3001, Frontend: 5173)
npm run dev
# veya doğrudan:
./scripts/dev.sh
```

Tarayıcınızda açın: **`http://localhost:5173`**

---

## 🛠️ Mimari ve Bileşenler

### 1. Backend (`/backend`)
- **Dil**: Go 1.22+
- **HTTP Engine**: `net/http` ve REST API
- **Docker İletişimi**: Docker Go SDK v28 (`github.com/docker/docker/client`)
- **Kalıcılık**: SQLite veritabanı (`mattn/go-sqlite3`)
- **Canlı Akış (Streaming)**: SSE (Server-Sent Events) ile anlık konteyner CPU/RAM istatistikleri ve canlı log akışı (`/api/v1/containers/:id/logs`, `/api/v1/containers/:id/stats`).

### 2. Frontend (`/frontend`)
- **Framework**: React 19 + TypeScript + Vite
- **Stil & Tasarım**: Tailwind CSS, Glassmorphic UI, L-Shell Layout
- **Animasyonlar**: Framer Motion (Wise Motion Spring & Bouncy fizik eğrileri)
- **Ses & Hissiyat**: Web Audio API sentetik haptik tıklama sesleri
- **Canlı Grafikler**: SVG tabanlı mikro sparkline dalgaları
- **Yapay Zeka**: Gemini AI Sohbet Asistanı (L-yapısına oturan, üst barı taşmayan pürüzsüz drawer)

---

## 💻 Kullanılabilir Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Hem Go backend hem React frontend'i eşzamanlı başlatır |
| `npm run dev:backend` | Sadece Go backend sunucusunu başlatır (`:3001`) |
| `npm run dev:frontend` | Sadece Vite React frontend sunucusunu başlatır (`:5173`) |
| `npm run build:frontend`| React uygulamasını production için derler |
| `npm run test:backend`  | Go backend birim ve entegrasyon testlerini çalıştırır |

---

## 🔄 Hibrit Çalışma Modu (Demo & Canlı Docker)
- **Canlı Docker Modu**: Sistemde Docker Daemon ve Go backend aktif olduğunda gerçek konteynerler listelenir, başlatma/durdurma/yeniden başlatma/silme işlemleri doğrudan Docker Engine API'sine iletilir.
- **Offline / Demo Modu**: Docker veya Go backend çalışmadığında sistem otomatik olarak kesintisiz demo moduna geçer ve arayüzü tam işlevsel olarak deneyimlemenizi sağlar.