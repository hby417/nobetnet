# Güvenlik ve KVKK

> Bu belge teknik bir özettir, hukuki görüş değildir. Yayından önce bir avukata danışılmalıdır.

## Güvenlik modeli

| Koruma | Nasıl sağlanıyor |
| --- | --- |
| Giriş yapmayan ziyaretçi veri okuyamaz | Tüm tablolarda `anon` yetkisi kaldırıldı |
| Herkes yalnızca kendi profilini görür | `profiles`, `worker_profiles`, `employer_profiles` üzerinde RLS: `user_id = auth.uid()` |
| İşveren adayın iletişim bilgisini göremez | `candidates` görünümünde telefon, e-posta, doğum tarihi yok; ad kısaltılmış |
| İletişim bilgisi rızayla açılır | `candidate_contact` yalnızca davet `kabul` durumundaysa döner |
| Rol değiştirilemez | `profiles` tablosunda yalnızca `full_name` ve `avatar_path` güncellenebilir |
| Sahte firma adı / davet durumu yazılamaz | Bu alanları tetikleyiciler sunucuda doldurur |
| Fotoğraf ve CV herkese açık değil | Gizli bucket, kullanıcı klasörü kuralı, 1 saatlik süreli bağlantı |
| XSS | Kullanıcı metinleri `esc()` ile kaçışlanarak HTML'e yazılır |
| Gizli anahtar sızıntısı | Tarayıcıda yalnızca anon anahtar var; `service_role` hiçbir dosyada yok |

## Bilinen açıklar ve riskler

1. **İşveren doğrulaması yok.** Kayıtta "İşveren" seçen herkes işveren sayılır. Aday arama açıldığında tüm adayların kısaltılmış bilgilerini görebilir. Çözüm: `profiles` tablosuna `verified` sütunu, `is_employer()` içinde bu sütunun kontrolü ve yönetici onay ekranı.
2. **Belgeler beyana dayalı.** Kimlik kartı, ehliyet, SRC bilgileri kullanıcının yazdığıdır. Belge görüntüsü yükleme ve yönetici onayı yok.
3. **Kötüye kullanım sınırı yok.** Kayıt ve dosya yükleme için CAPTCHA veya hız sınırı yok. Supabase Auth'ta CAPTCHA (hCaptcha / Turnstile) açılabilir.
4. **Hesap silme ekranı yok.** KVKK kapsamında kişinin verisini silme talebi şu an elle karşılanmalı.
5. **E-posta gönderimi.** Supabase'in yerleşik e-postası düşük limitli; kendi SMTP servisi bağlanmalı.

## Yayın öncesi kontrol listesi

- [ ] KVKK aydınlatma metni hazırlandı, `index.html` içindeki iki `href="#"` bağlantısına eklendi
- [ ] Açık rıza metni hazırlandı (özellikle sağlık raporu, adli sicil gibi özel nitelikli veriler toplanacaksa)
- [ ] Supabase sunucu bölgesi seçildi; yurt dışına veri aktarımı konusunda hukuki görüş alındı
- [ ] İŞKUR özel istihdam bürosu izninin gerekip gerekmediği netleştirildi
- [ ] Veri sorumlusu olarak VERBİS kaydı yükümlülüğü kontrol edildi
- [ ] İşveren hesapları için onay süreci kuruldu
- [ ] Supabase Auth'ta e-posta doğrulaması açık, kendi SMTP servisi bağlı
- [ ] Kayıt formunda CAPTCHA açık
- [ ] Hesap ve veri silme talebi için bir iletişim yolu yazıldı
- [ ] Security Advisor'da hata yok
- [ ] Örnek hizmet görselleri gerçek ve lisanslı fotoğraflarla değiştirildi (veya örnek olarak bırakılmasına karar verildi)

## Yasal çerçeve (özet)

| Konu | Neden önemli |
| --- | --- |
| 6698 sayılı KVKK | Kimlik, iletişim, eğitim ve belge bilgileri kişisel veridir; sağlık raporu ve adli sicil özel nitelikli veridir |
| Yurt dışına aktarım | Supabase sunucuları Türkiye dışındadır; aktarım için KVKK'daki şartlar sağlanmalıdır |
| 4904 sayılı Türkiye İş Kurumu Kanunu | İş arayan ile işvereni aracılık ederek buluşturmak özel istihdam bürosu iznine tabi olabilir |
| 5188 sayılı Özel Güvenlik Hizmetlerine Dair Kanun | Görevlinin kimlik kartı ve eğitim şartları; platform belge alanlarını bu kanuna göre tasarladı |
