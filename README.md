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
* **Kartlardan Hızlı İşlem:** Her servis kartında **Başlat**, **Durdur** ve **Yeniden başlat** butonları vardır. Durdurmadan önce onay sorulur.
* **Ayarlar Sayfası:** Docker sürümü, Traefik durumu, kullanılmayan imajlar ve sistem ayarları tek yerde görünür. Kullanılmayan imajları buradan temizleyebilirsin.

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
>
> Güvenlik için Akson varsayılan olarak yalnızca bu bilgisayardan erişilebilir: `docker-compose.yml` portu `127.0.0.1:3001` üzerinde açar, Docker dışında çalışan arka yüz de `HOST=127.0.0.1` adresini dinler. Başka bir makineden erişmek istiyorsan önce `AKSON_TOKEN` ayarla, sonra bu adresi bilerek değiştir (tercihen önüne HTTPS'li bir ters vekil koy).

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

Testler için: `npm run test:backend`. Ön yüzü derleyip tip kontrolü yapmak için: `cd frontend && npm run build`.

---

## Sık Karşılaşılan Sorunlar

* **`npm run dev` "package.json bulunamadı" diyor:** Yanlış klasördesin. Önce proje klasörüne geç (`cd akson`), ilk seferde `npm install` çalıştır.
* **Ayarlar sayfasında "HTTP 404" görünüyor:** `:3001` portunu Docker'daki eski bir Akson konteyneri tutuyor olabilir. Onu durdur (`docker stop akson`) ya da imajı yeniden derle (`docker compose up -d --build`).
* **Arka yüz hiç açılmıyor:** Docker'ın çalıştığından emin ol. Akson, Docker'a bağlanamazsa başlamaz.
* **Bir servis sürekli yeniden başlıyor:** Servisin bağlandığı başka bir konteyner (veritabanı, kuyruk vb.) durmuş olabilir. Logları kontrol et.

---

## Lisans

[MIT](LICENSE)
