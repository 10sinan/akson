# Gelişim Günlüğü

Her değişiklik için kısa kayıt. En yeni kayıt en üstte.

---

## 2026-11-10 — İki deploy hatası düzeltildi

- **Ne yapacaktık:** Testte bulunan iki deploy hatasını düzeltmek.
- **Ne yaptık:**
  1. Başarısız deploy artık geride bozuk konteyner bırakmıyor, otomatik siliniyor. Aynı isimle tekrar denemek mümkün.
  2. Başarısız deploy'lar artık geçmişe "failed" olarak kaydediliyor. Bunun için yeni bir test eklendi.
  - Tüm testler geçti. Ayrı bir test sunucusunda dolu port senaryosu canlı denendi ve çalıştı.
- **Sonraki adım:** `npm run dev`'i yeniden başlatıp (yeni kod ancak öyle devreye girer) içinde Dockerfile olan gerçek bir Git reposuyla deploy denemek.

## 2026-11-10 — Branch temizliği

- **Ne yapacaktık:** İşi bitmiş eski branch'leri kaldırmak.
- **Ne yaptık:** `feat/git-build-deploy`, `feat/container-deploy-api` ve `frontend-ui-refresh` silindi. Silmeden önce içerikleri zaten `backend`/`frontend` branch'lerindeydi, kod kaybı yok. Çalışma artık `backend` branch'inde devam ediyor.
- **Sonraki adım:** Testte bulunan iki deploy hatasını düzeltmek.

## 2026-11-10 — Deploy'u canlı test etme

- **Ne yapacaktık:** Çalışan uygulamada deploy özelliğini denemek.
- **Ne yaptık:** Normal imaj deploy'u, canlı log ve CPU/RAM bilgisi çalışıyor. Yanlış Git adresi doğru hata veriyor. İki hata bulundu:
  1. Başarısız deploy geride bozuk bir konteyner bırakıyor.
  2. Başarısız deploy'lar geçmişe kaydedilmiyor.
- **Sonraki adım:** Bu iki hatayı düzeltmek.

## 2026-11-10 — GitHub'a gönderme

- **Ne yapacaktık:** Var olan özellikleri GitHub'a göndermek (yeni kod yok).
- **Ne yaptık:** `backend` ve `frontend` branch'leri GitHub'a gönderildi. `main`'e dokunulmadı.
- **Sonraki adım:** Uygulamayı çalıştırıp deploy'u denemek.

## 2026-11-10 — Sahte "başarılı deploy" hatası

- **Ne yapacaktık:** Deploy hata verince ekranda yine de "başarılı" görünmesini engellemek.
- **Ne yaptık:** Gerçek hata artık konsolda kırmızı satır olarak görünüyor. Sahte simülasyon sadece demo modunda (backend kapalıyken) çalışıyor. Git'ten build alınan deploy'larda bekleme süresi 2 dakikadan 10 dakikaya çıkarıldı. Ardından `backend` ve `frontend` branch'lerine birleştirildi.
- **Sonraki adım:** Değişiklikleri GitHub'a göndermek.

## 2026-11-10 — CLAUDE.md eklendi

- **Ne yapacaktık:** Claude Code için proje rehberi yazmak.
- **Ne yaptık:** `CLAUDE.md` eklendi: komutlar (çalıştırma, test, build) ve projenin genel yapısı.
- **Sonraki adım:** Branch durumunu kontrol etmek.
