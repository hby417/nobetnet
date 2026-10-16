# NöbetNet — Koruma ve güvenlik iş platformu

Özel güvenlik görevlileri ile işverenleri vardiya bazında buluşturan web platformu.
Ön yüz sade HTML, CSS ve JavaScript; arka uç [Supabase](https://supabase.com) (PostgreSQL, üyelik, dosya depolama).
Derleme adımı ve ayrı bir sunucu yok: klasörü herhangi bir statik barındırmaya yüklemek yeterli.

## Şu an neler çalışıyor

| Özellik | Durum |
| --- | --- |
| Tanıtım sayfası, görselli hizmet alanları | Açık |
| Kayıt, giriş, e-posta doğrulama, şifre sıfırlama | Açık |
| Görevli profili (kişisel bilgi, belgeler, dil, fotoğraf, CV) | Açık |
| İşveren firma profili (sektör, şehir, ihtiyaç duyulan hizmetler, logo) | Açık |
| İlan yayınlama, ilana başvuru, aday arama, görüşme daveti | Kodda hazır, kapalı |

Kapalı ekranların nasıl açılacağı: [docs/mimari.md](docs/mimari.md#kapalı-ekranları-açmak).

## Hızlı kurulum

1. Supabase'de proje aç.
2. SQL Editor'de `supabase/migrations/` içindeki dosyaları **numara sırasıyla** çalıştır (01 → 04).
3. `js/config.js` içine Project URL ve anon anahtarını yaz.
4. Klasörde `python -m http.server 8000` çalıştır, `http://localhost:8000` adresini aç.

Adım adım anlatım ve sorun giderme: [docs/kurulum.md](docs/kurulum.md)

## Dosya yapısı

```
özel-güvenlik-site/
├── index.html                  Tek sayfa: tanıtım, giriş/kayıt penceresi, panel alanı
├── css/style.css               Tasarım: renkler, açık/koyu tema, bileşenler
├── js/
│   ├── config.js               Supabase adresi ve anon anahtarı
│   └── app.js                  Tüm uygulama mantığı (başındaki DOSYA HARİTASI'na bak)
├── img/hizmetler/              Hizmet kartlarındaki 8 örnek görsel (SVG)
├── supabase/
│   ├── README.md               SQL dosyalarının sırası
│   └── migrations/
│       ├── 01_schema.sql           Tablolar, görünümler, fonksiyonlar, RLS kuralları
│       ├── 02_dosyalar.sql         Fotoğraf ve CV depolama alanları
│       ├── 03_gorunum_guvenlik.sql Görünümlerin güvenli sürümü
│       └── 04_isveren_profilleri.sql İşveren profili tablosu
├── docs/
│   ├── kurulum.md              Kurulum, yayına alma, sorun giderme
│   ├── mimari.md               Uygulamanın yapısı, ekran akışı, app.js haritası
│   ├── veritabani.md           Tablolar, görünümler, depolama, erişim kuralları
│   ├── guvenlik-kvkk.md        Güvenlik modeli ve yayın öncesi yasal kontrol listesi
│   └── yol-haritasi.md         Bilinen eksikler ve sonraki adımlar
└── README.md
```

## Belgeler

- [Kurulum](docs/kurulum.md)
- [Mimari](docs/mimari.md)
- [Veritabanı](docs/veritabani.md)
- [Güvenlik ve KVKK](docs/guvenlik-kvkk.md)
- [Yol haritası](docs/yol-haritasi.md)

## Nereyi değiştirmeliyim?

| Ne | Nerede |
| --- | --- |
| Marka adı, tanıtım metinleri, hizmet açıklamaları | `index.html` |
| Hizmet görselleri | `img/hizmetler/` (aynı adla `.jpg` koyup `index.html` içindeki uzantıyı değiştir) |
| Renkler ve yazı tipleri | `css/style.css` başındaki `:root` |
| Hizmet listesi (panelde) | `js/app.js` içinde `SERVICES` |
| Eğitim, dil, ehliyet sınıfı, pasaport listeleri | `js/app.js` içinde `EDU`, `LANGS`, `DLC`, `PASS` |
| Fotoğraf ve CV boyut/tür sınırları | `js/app.js` içinde `FILES` ve `supabase/migrations/02_dosyalar.sql` |
