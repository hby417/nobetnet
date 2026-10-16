-- =====================================================================
-- NöbetNet — "candidates" ve "job_applicants" görünümlerindeki
-- UNRESTRICTED / "Security Definer View" uyarısının düzeltilmesi
--
-- Neden: Postgres'te görünümler (view) varsayılan olarak, kendisini
-- çağıran kullanıcının değil, görünümü oluşturan yöneticinin yetkisiyle
-- çalışır ve tabloların RLS kurallarını atlar. Supabase bu yüzden onları
-- kırmızıyla işaretler.
--
-- Çözüm: Kısıtlı veriyi döndüren sorgu, API'ye açık olmayan "private"
-- şemasında bir fonksiyona taşınır. Görünümler "security_invoker" moduna
-- alınır, yani artık çağıran kullanıcının yetkisiyle çalışır. Sitenin
-- gördüğü sonuç değişmez, js/app.js'te değişiklik gerekmez.
--
-- Kullanım: 01_schema.sql ve 02_dosyalar.sql'den SONRA, bir kez çalıştır.
-- Birden fazla kez çalıştırmak sorun çıkarmaz.
-- =====================================================================

-- ---------- 1) API'ye kapalı şema ----------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------- 2) Eski görünümleri kaldır (veri tutmazlar, silmek güvenli) ----------
drop view if exists public.candidates;
drop view if exists public.job_applicants;

-- ---------- 3) Kısıtlı veriyi döndüren fonksiyonlar ----------

-- Adaylar: ad kısaltılmış; telefon, e-posta, doğum tarihi yok. Yalnızca işveren hesapları satır görür.
create or replace function private.candidates_data()
returns table (
  worker_id uuid, short_name text, age int,
  gender text, marital text, education text, computer text, languages jsonb, lang_keys text[],
  dl_has boolean, dl_classes text[], dl_exp date, src boolean, psycho boolean,
  pass_has boolean, pass_type text, pass_exp date,
  card_has boolean, card_type text, card_exp date,
  services text[]
)
language sql stable security definer set search_path = public as $$
  select
    w.user_id,
    regexp_replace(trim(p.full_name), '\s+(\S)\S*$', ' \1.'),
    date_part('year', age(w.birth_date))::int,
    w.gender, w.marital, w.education, w.computer, w.languages, w.lang_keys,
    w.dl_has, w.dl_classes, w.dl_exp, w.src, w.psycho,
    w.pass_has, w.pass_type, w.pass_exp,
    w.card_has, w.card_type, w.card_exp,
    w.services
  from public.worker_profiles w
  join public.profiles p on p.id = w.user_id
  where public.is_employer()
    and w.birth_date is not null
    and w.education is not null;
$$;

-- İşverenin yalnızca KENDİ ilanlarına başvuranlar
create or replace function private.job_applicants_data()
returns table (
  application_id bigint, job_id bigint, worker_id uuid, created_at timestamptz,
  short_name text, education text, card_has boolean, card_type text,
  src boolean, psycho boolean, dl_has boolean, dl_classes text[]
)
language sql stable security definer set search_path = public as $$
  select
    a.id, a.job_id, a.worker_id, a.created_at,
    regexp_replace(trim(p.full_name), '\s+(\S)\S*$', ' \1.'),
    w.education, w.card_has, w.card_type, w.src, w.psycho, w.dl_has, w.dl_classes
  from public.applications a
  join public.jobs j     on j.id = a.job_id
  join public.profiles p on p.id = a.worker_id
  left join public.worker_profiles w on w.user_id = a.worker_id
  where j.owner_id = auth.uid();
$$;

-- ---------- 4) Görünümleri güvenli modda yeniden oluştur ----------
create view public.candidates with (security_invoker = true) as
  select * from private.candidates_data();

create view public.job_applicants with (security_invoker = true) as
  select * from private.job_applicants_data();

-- ---------- 5) Yetkiler ----------
revoke all on function private.candidates_data(), private.job_applicants_data() from public, anon;
grant execute on function private.candidates_data(), private.job_applicants_data() to authenticated;

revoke all on public.candidates, public.job_applicants from anon;
grant select on public.candidates, public.job_applicants to authenticated;
