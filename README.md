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
* **Yönlendirme ve Port Yönetimi:** Web sitelerinin ve API'lerinin alan adlarını (SSL sertifikası dahil) karmaşık konfigürasyon dosyalarıyla uğraşmadan bağlarsın.
* **Hızlı Dağıtım:** Git reposundaki kodunu verip servisi tek tıkla ayağa kaldırabilirsin.

---

## Nelerle Geliyor?

* **Ön Yüz:** React, TypeScript, Tailwind CSS, Framer Motion
* **Sistem Entegrasyonu:** Docker Engine API, Traefik