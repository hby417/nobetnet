-- =====================================================================
-- NöbetNet — Profil fotoğrafı ve CV yükleme
-- 01_schema.sql çalıştırıldıktan SONRA, bir kez çalıştır:
-- Supabase paneli > SQL Editor > New query > bu dosyanın tamamını yapıştır > Run.
-- =====================================================================

-- ---------- 1) YENİ SÜTUNLAR ----------

-- Profil fotoğrafı (görevli) / firma logosu (işveren): Storage'daki dosya yolu
alter table public.profiles add column if not exists avatar_path text;
grant update (avatar_path) on public.profiles to authenticated;

-- Görevlinin CV dosyası: Storage yolu ve kullanıcının yüklediği dosya adı
alter table public.worker_profiles add column if not exists cv_path text;
alter table public.worker_profiles add column if not exists cv_name text;


-- ---------- 2) DEPOLAMA ALANLARI (bucket) ----------
-- İkisi de gizli (public = false). Dosyalar yalnızca süreli bağlantıyla açılır.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 2097152,            -- 2 MB
     array['image/jpeg','image/png','image/webp']),
  ('cvs',     'cvs',     false, 5242880,            -- 5 MB
     array['application/pdf','application/msword',
           'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ---------- 3) ERİŞİM KURALLARI ----------
-- Her kullanıcı yalnızca kendi klasörüne (<kullanıcı id>/...) dosya yükler, okur, siler.
-- İşverenlerin aday CV'sini görmesi bu aşamada kapalı.

drop policy if exists "own_files_select" on storage.objects;
drop policy if exists "own_files_insert" on storage.objects;
drop policy if exists "own_files_update" on storage.objects;
drop policy if exists "own_files_delete" on storage.objects;

create policy "own_files_select" on storage.objects
  for select to authenticated
  using (bucket_id in ('avatars','cvs') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_files_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars','cvs') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_files_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars','cvs') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('avatars','cvs') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own_files_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars','cvs') and (storage.foldername(name))[1] = auth.uid()::text);
