-- =====================================================================
-- NöbetNet — İşveren (firma) profilleri tablosu
--
-- js/app.js işveren formunu "employer_profiles" tablosuna kaydeder, ama bu
-- tablo önceki dosyalarda yoktu (ilk kurulumda panelden elle açılmıştı).
-- Bu dosya projeyi sıfırdan kuran biri için eksiği kapatır.
--
-- Mevcut kurulumda çalıştırmak da güvenlidir: tablo varsa yeniden
-- oluşturulmaz, veri silinmez; yalnızca eksik sütun, güvenlik kuralı ve
-- yetkiler tamamlanır. 03_gorunum_guvenlik.sql'den SONRA çalıştır.
-- =====================================================================

create table if not exists public.employer_profiles (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  sector      text,
  city        text,
  phone       text,
  services    text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

-- Tablo önceden elle açıldıysa eksik kalmış olabilecek sütunlar
alter table public.employer_profiles add column if not exists sector     text;
alter table public.employer_profiles add column if not exists city       text;
alter table public.employer_profiles add column if not exists phone      text;
alter table public.employer_profiles add column if not exists services   text[] not null default '{}';
alter table public.employer_profiles add column if not exists updated_at timestamptz not null default now();

-- Her işveren yalnızca kendi firma kaydını okur ve değiştirir
alter table public.employer_profiles enable row level security;

drop policy if exists "employer_profiles_own" on public.employer_profiles;
create policy "employer_profiles_own" on public.employer_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.employer_profiles from anon;
grant select, insert, update, delete on public.employer_profiles to authenticated;
