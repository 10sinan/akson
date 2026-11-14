# Akson — Yerel Docker ve Servis Kontrol Paneli

## Bu Proje Neyi Çözer?

Kendi sunucunda veya bilgisayarında Docker ile projeler geliştirirken:

* Terminalde sürekli `docker ps` veya `docker logs` yazıp komut kovalamaktan,
* Hangi servisin ne kadar RAM ve CPU harcadığını görememekten,
* Port numaralarını ve web sitesi yönlendirmelerini karıştırmaktan

bıkan geliştiriciler için **sade, hızlı ve tek ekranlı bir yönetim paneli** sunar.

---

## Günlük Hayatta Ne İşe Yarar?

* **Canlı Log İzleme:** Çalışan servislerin terminal çıktılarını anlık takip edebilir, sadece hata (`ERROR`) veren satırları kolayca süzebilirsin.
* **Donanım Takibi:** Sunucuyu yoran veya hafıza sızdıran konteynerleri anlık grafiklerle hemen fark edersin.
* **Otomatik Port:** Dağıttığın her uygulama boş bir porta yerleşir, Akson sana `http://localhost:PORT` adresini söyler.
* **Alan Adı Yönlendirme (Traefik):** Sunucunda Traefik çalışıyorsa uygulamalara `uygulama.siten.com` gibi adresler verebilirsin.
* **Hızlı Dağıtım:** Git reposunun linkini verip servisi tek tıkla ayağa kaldırabilirsin. Repoda `Dockerfile` yoksa Akson proje türünü tanır ve kendisi oluşturur.

---

## Nelerle Geliyor?

* **Ön Yüz:** React, TypeScript, Tailwind CSS, Framer Motion
* **Sistem Entegrasyonu:** Docker Engine API, Traefik
* **Arka Yüz:** Go, SQLite

---

## Kurulum (Tek Komut)

Gereken tek şey **Docker** (Docker Desktop veya Docker Engine + Compose).

```bash
git clone https://github.com/10sinan/akson.git
cd akson
docker compose up -d --build
```

Sonra tarayıcıda **http://localhost:3001** adresini aç.

Durdurmak için: `docker compose down`

> **Not:** Akson, konteynerleri yönetebilmek için Docker soketine (`/var/run/docker.sock`) erişir. Bu, Akson'a bilgisayarındaki Docker üzerinde tam yetki verir. Akson'u internete açacaksan `AKSON_TOKEN` ayarla ve tarayıcıda `localStorage.setItem('akson_token', '<token>')` ile aynı değeri gir.

---

## Hangi Projeler Dağıtılabilir?

Repoda `Dockerfile` varsa doğrudan o kullanılır. Yoksa Akson şunları tanır:

| Proje | Nasıl tanınır | Nasıl çalıştırılır |
|---|---|---|
| Node.js | `package.json` içinde `start` scripti | `npm start` (port 3000) |
| Vite / React (sadece build) | `package.json` içinde sadece `build` scripti | Derlenir, nginx ile sunulur (port 80) |
| Python | `requirements.txt` + `main.py` / `app.py` | Flask, FastAPI veya `python app.py` (port 8000) |
| Go | `go.mod` | Derlenip çalıştırılır (port 8080) |
| Statik site | `index.html` | nginx ile sunulur (port 80) |

---

## Geliştirme

Kaynak koddan çalıştırmak için Go, Node.js ve git gerekir:

```bash
npm run dev
```

Arka yüz `:3001`, ön yüz `http://localhost:5173` adresinde açılır.

---

## Lisans

[MIT](LICENSE)
