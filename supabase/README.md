# Veritabanı dosyaları

`migrations/` içindeki dosyalar Supabase **SQL Editor**'de **numara sırasıyla** çalıştırılır.
Her biri bir kez çalıştırılır; 02, 03 ve 04 tekrar çalıştırılırsa sorun çıkarmaz.

| Sıra | Dosya | Ne yapar |
| --- | --- | --- |
| 1 | `01_schema.sql` | Tablolar, yardımcı fonksiyonlar, tetikleyiciler, görünümler, RLS kuralları, yetkiler |
| 2 | `02_dosyalar.sql` | `avatars` ve `cvs` depolama alanları, fotoğraf/CV sütunları, dosya erişim kuralları |
| 3 | `03_gorunum_guvenlik.sql` | `candidates` ve `job_applicants` görünümlerini güvenli moda alır (UNRESTRICTED uyarısını giderir) |
| 4 | `04_isveren_profilleri.sql` | `employer_profiles` tablosu ve kuralları (eksikse oluşturur, varsa tamamlar) |

`01_schema.sql` yalnızca boş bir projede çalışır (tabloları `create table` ile açar).
Yeni bir değişiklik eklerken bir sonraki numarayla yeni dosya aç (`05_...sql`), eski dosyaları değiştirme.

Ayrıntılı açıklama: [../docs/veritabani.md](../docs/veritabani.md)
