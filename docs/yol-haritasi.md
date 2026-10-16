# Yol haritası

## Faz 1 — Yayına hazırlık

- [ ] KVKK metinleri, açık rıza, hesap silme yolu ([guvenlik-kvkk.md](guvenlik-kvkk.md))
- [ ] Alan adı, kurumsal e-posta, Supabase'e kendi SMTP servisi
- [ ] İşveren doğrulama: `verified` sütunu + yönetici onayı
- [ ] Kayıt formunda CAPTCHA
- [ ] Gerçek hizmet fotoğrafları
- [ ] Görevli ve işveren için uçtan uca elle test listesi

## Faz 2 — Eşleştirme

- [ ] Sekmeli panel: ilan, başvuru, aday arama, davet ekranlarını açmak ([mimari.md](mimari.md#kapalı-ekranları-açmak))
- [ ] Yönetici paneli: kullanıcı listesi, işveren onayı, belge onayı, istatistik
- [ ] Belge görüntüsü yükleme (kimlik kartı, ehliyet) ve onay rozeti
- [ ] İşverenin, daveti kabul eden adayın CV'sini görebilmesi (depolama kuralı + `candidate_contact` benzeri fonksiyon)
- [ ] E-posta bildirimleri: yeni davet, başvuru, davet yanıtı

## Faz 3 — Operasyon

- [ ] Puantaj: göreve giriş-çıkış kaydı
- [ ] Karşılıklı değerlendirme ve puan
- [ ] Acil görevlendirme: kısa süreli ilan + SMS / WhatsApp bildirimi
- [ ] Mobil uyum için PWA (ana ekrana eklenebilir uygulama)

## Teknik borç

| Konu | Etki | Öneri |
| --- | --- | --- |
| `app.js` tek dosyada ~750 satır | Yeni geliştiricinin yön bulması zor | Kapalı ekranlar açılırken ES modüllerine ayırmak (`auth.js`, `profile.js`, `jobs.js` ...) |
| Otomatik test yok | Değişiklikler elle denenmeli | RLS kuralları için SQL testleri (pgTAP), arayüz için Playwright |
| HTML metin birleştirerek çiziliyor | Hata yapmaya açık, `esc()` unutulursa XSS | Küçük bir şablon yardımcısı veya hafif bir kütüphane (Lit, Preact) |
| Kullanılmayan CSS sınıfları (`.formgrid` vb.) | Önemsiz | Ekranlar açılınca temizlemek |
| Sürüm kontrolü (git) yok | Geri dönüş ve değişiklik geçmişi yok | `git init` + GitHub (özel depo) |
