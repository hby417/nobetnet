# Kurulum

Sıfırdan kurulum yaklaşık 15 dakika sürer. Gerekenler: bir Supabase hesabı, bir tarayıcı ve yerelde denemek için Python.

## 1. Supabase projesi aç

1. [supabase.com](https://supabase.com) adresinden ücretsiz hesap aç.
2. **New project** de. Ad, güçlü bir veritabanı şifresi ve bölge seç.
3. Proje hazır olana kadar 1–2 dakika bekle.

## 2. Veritabanını kur

1. Sol menüden **SQL Editor** > **New query**.
2. `supabase/migrations/01_schema.sql` dosyasının **tamamını** yapıştır, **Run**'a bas.
3. Aynı işlemi sırayla `02_dosyalar.sql`, `03_gorunum_guvenlik.sql`, `04_isveren_profilleri.sql` için tekrarla.
4. Her seferinde **"Success. No rows returned"** görmelisin.

Supabase "destructive operation" uyarısı verirse **Run this query** de. 03 numaralı dosya yalnızca veri tutmayan görünümleri silip yeniden oluşturur.

### Kontrol

- **Storage**: `avatars` ve `cvs` bucket'ları **Private** olarak görünmeli.
- **Table Editor**: `profiles`, `worker_profiles`, `employer_profiles`, `jobs`, `applications`, `invites` tabloları ve `candidates`, `job_applicants` görünümleri olmalı. Hiçbirinde kırmızı **UNRESTRICTED** etiketi olmamalı.
- **Advisors > Security Advisor**: hata (ERROR) olmamalı.

## 3. Anahtarları yaz

1. **Project Settings > API** sayfasını aç.
2. **Project URL** ve **anon (veya publishable) key** değerlerini `js/config.js` içine yapıştır.
3. `service_role` anahtarını **asla** kullanma. anon anahtar herkese açıktır; veriyi RLS kuralları korur.

## 4. Üyelik ayarları

**Authentication > URL Configuration**
- **Site URL**: sitenin yayın adresi (yerelde `http://localhost:8000`)
- **Redirect URLs**: aynı adres (şifre sıfırlama bağlantısı için gerekli)

**Authentication > Sign In / Providers > Email**
- E-posta doğrulaması varsayılan olarak açıktır. Geliştirirken "Confirm email" kapatılabilir; yayında açık olmalı.
- Supabase'in kendi e-posta gönderimi saatlik düşük bir sınırla gelir. Yayında **Authentication > Emails > SMTP Settings** üzerinden kendi e-posta servisini bağla.

## 5. Yerelde dene

Proje klasöründe bir terminal aç:

```bash
python -m http.server 8000
```

Tarayıcıda `http://localhost:8000` adresine git. Dosyaya çift tıklayarak açma; üyelik bağlantıları `file://` adresinde çalışmaz.

## 6. Test akışı (şu an açık olan ekranlar)

1. Bir tarayıcıda **görevli** olarak kayıt ol. Profil formunu doldur, fotoğraf ve CV yükle, kaydet. "Profilin kaydedildi" ekranı gelmeli.
2. Gizli pencerede **işveren** olarak kayıt ol. Firma bilgilerini ve logoyu kaydet.
3. Supabase **Table Editor**'de `worker_profiles` ve `employer_profiles` satırlarını, **Storage**'da kullanıcı klasörlerini gör.
4. Çıkış yap, tekrar giriş yap: bilgiler ve fotoğraf yerinde olmalı. **Bilgilerimi düzenle** ile formu yeniden aç.

## 7. Yayına al

1. Klasörü Netlify (netlify.com/drop), Cloudflare Pages, GitHub Pages ya da bir hosting'in `public_html` dizinine yükle. `.claude/`, `docs/` ve `supabase/` klasörlerini yükleme; site için gerekli değiller ve herkese açık olurlar.
2. 4. adımdaki **Site URL** ve **Redirect URLs** değerlerini gerçek adresle güncelle.
3. Yayından önce [güvenlik ve KVKK kontrol listesini](guvenlik-kvkk.md#yayın-öncesi-kontrol-listesi) tamamla.

## Sorun giderme

| Belirti | Neden | Çözüm |
| --- | --- | --- |
| Sayfanın üstünde kırmızı "Supabase ayarı yapılmamış" şeridi | `js/config.js` boş | 3. adım |
| Kayıttan sonra giriş yapılamıyor, "E-postanı doğrulamadın" | E-posta doğrulaması açık | Gelen kutusundaki bağlantıya tıkla |
| Şifre sıfırlama bağlantısı ana sayfaya atıyor ama pencere açılmıyor | Redirect URL eksik | 4. adım |
| Fotoğraf/CV yüklerken "Bucket not found" | 02 numaralı SQL çalışmamış | 2. adımı tekrarla |
| Fotoğraf yüklerken "row-level security" hatası | Depolama kuralları eksik | `02_dosyalar.sql`'i tekrar çalıştır |
| İşveren formu kaydedilmiyor, `employer_profiles` hatası | Tablo yok | `04_isveren_profilleri.sql`'i çalıştır |
| `unrecognized parameter "security_invoker"` | Postgres sürümü 15'ten eski | Project Settings > Infrastructure'dan sürümü yükselt |
