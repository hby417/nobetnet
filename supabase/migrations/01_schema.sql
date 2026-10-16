-- =====================================================================
-- NöbetNet — Supabase veritabanı şeması
-- Kullanım: Supabase paneli > SQL Editor > New query > bu dosyanın
-- tamamını yapıştır > Run. Bir kez çalıştırman yeterli.
-- Bu klasördeki dosyalar numara sırasıyla (01, 02, 03, 04) çalıştırılır.
-- =====================================================================

-- ---------- 1) TABLOLAR ----------

-- Her kullanıcının temel kaydı (auth.users ile birebir)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('isci','isveren')),
  full_name   text not null default '',
  email       text,
  created_at  timestamptz not null default now()
);

-- İşçinin ayrıntılı profili (yalnızca kendisi görür; işverenler "candidates" görünümünü kullanır)
create table public.worker_profiles (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  gender       text,
  birth_date   date,
  marital      text,
  phone        text,
  education    text,
  computer     text,
  languages    jsonb   not null default '[]',   -- [{lang, level}]
  lang_keys    text[]  not null default '{}',   -- filtre için: 'İngilizce:1'
  dl_has       boolean not null default false,  -- sürücü belgesi
  dl_classes   text[]  not null default '{}',
  dl_exp       date,
  src          boolean not null default false,
  psycho       boolean not null default false,  -- psikoteknik
  pass_has     boolean not null default false,  -- pasaport
  pass_type    text,
  pass_exp     date,
  card_has     boolean not null default false,  -- özel güvenlik kimlik kartı
  card_type    text,                            -- 'Silahlı' | 'Silahsız'
  card_exp     date,
  services     text[]  not null default '{}',
  updated_at   timestamptz not null default now()
);

create table public.jobs (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  company     text not null default '',
  city        text not null,
  shift       text not null,
  service     text not null,
  headcount   int  not null default 1 check (headcount > 0),
  pay         int  not null check (pay > 0),
  daily       boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.applications (
  id          bigint generated always as identity primary key,
  job_id      bigint not null references public.jobs(id) on delete cascade,
  worker_id   uuid   not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (job_id, worker_id)
);

create table public.invites (
  id             bigint generated always as identity primary key,
  employer_id    uuid not null references public.profiles(id) on delete cascade,
  worker_id      uuid not null references public.profiles(id) on delete cascade,
  employer_name  text not null default '',
  job_title      text,
  status         text not null default 'bekliyor' check (status in ('bekliyor','kabul','red')),
  created_at     timestamptz not null default now(),
  unique (employer_id, worker_id)
);

create index on public.jobs (service);
create index on public.jobs (owner_id);
create index on public.applications (worker_id);
create index on public.invites (worker_id);
create index on public.worker_profiles using gin (services);


-- ---------- 2) YARDIMCI FONKSİYONLAR VE TETİKLEYİCİLER ----------

create or replace function public.is_employer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'isveren');
$$;

-- Yeni üye kaydolunca profiles satırını otomatik aç
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'isveren' then 'isveren' else 'isci' end,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Davet eklenirken işveren adını sunucu yazsın, durum her zaman 'bekliyor' başlasın
create or replace function public.set_invite_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.employer_name := coalesce((select full_name from public.profiles where id = new.employer_id), '');
  new.status := 'bekliyor';
  return new;
end $$;

create trigger invites_defaults
  before insert on public.invites
  for each row execute function public.set_invite_defaults();

-- İlandaki firma adını sunucu yazsın (sahte firma adı yazılamasın)
create or replace function public.set_job_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.company := coalesce((select full_name from public.profiles where id = new.owner_id), '');
  return new;
end $$;

create trigger jobs_company
  before insert on public.jobs
  for each row execute function public.set_job_company();

-- İşçi daveti kabul eder veya reddeder
create or replace function public.respond_invite(p_invite bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.invites
     set status = case when p_accept then 'kabul' else 'red' end
   where id = p_invite and worker_id = auth.uid() and status = 'bekliyor';
end $$;

-- İşveren, YALNIZCA daveti kabul eden adayın telefon ve e-postasını görebilir
create or replace function public.candidate_contact(p_worker uuid)
returns table (phone text, email text)
language sql stable security definer set search_path = public as $$
  select w.phone, p.email
    from public.invites i
    join public.worker_profiles w on w.user_id = i.worker_id
    join public.profiles p        on p.id = i.worker_id
   where i.employer_id = auth.uid() and i.worker_id = p_worker and i.status = 'kabul';
$$;


-- ---------- 3) GÖRÜNÜMLER (işverenin göreceği kısıtlı veri) ----------
-- Not: 03_gorunum_guvenlik.sql bu iki görünümü, Supabase'in "UNRESTRICTED"
-- uyarısı vermeyen güvenli sürümüyle değiştirir. Onu da mutlaka çalıştır.

-- Adaylar: ad kısaltılmış, telefon/e-posta/doğum tarihi yok. Sadece işveren hesapları görür.
create or replace view public.candidates as
select
  w.user_id as worker_id,
  regexp_replace(trim(p.full_name), '\s+(\S)\S*$', ' \1.') as short_name,
  date_part('year', age(w.birth_date))::int as age,
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

-- İşverenin kendi ilanlarına başvuranlar
create or replace view public.job_applicants as
select
  a.id as application_id, a.job_id, a.worker_id, a.created_at,
  regexp_replace(trim(p.full_name), '\s+(\S)\S*$', ' \1.') as short_name,
  w.education, w.card_has, w.card_type, w.src, w.psycho, w.dl_has, w.dl_classes
from public.applications a
join public.jobs j     on j.id = a.job_id
join public.profiles p on p.id = a.worker_id
left join public.worker_profiles w on w.user_id = a.worker_id
where j.owner_id = auth.uid();

-- Dashboard için hizmet başına aday sayısı
create or replace function public.candidate_service_counts()
returns table (service text, n bigint)
language sql stable set search_path = public as $$
  select s, count(*) from public.candidates c, unnest(c.services) s group by s;
$$;


-- ---------- 4) SATIR DÜZEYİNDE GÜVENLİK (RLS) ----------

alter table public.profiles        enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.jobs            enable row level security;
alter table public.applications    enable row level security;
alter table public.invites         enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "worker_profiles_own" on public.worker_profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "jobs_select_all" on public.jobs
  for select to authenticated using (true);
create policy "jobs_insert_employer" on public.jobs
  for insert to authenticated with check (owner_id = auth.uid() and public.is_employer());
create policy "jobs_update_own" on public.jobs
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "jobs_delete_own" on public.jobs
  for delete to authenticated using (owner_id = auth.uid());

create policy "applications_select_own" on public.applications
  for select to authenticated using (worker_id = auth.uid());
create policy "applications_insert_worker" on public.applications
  for insert to authenticated with check (worker_id = auth.uid() and not public.is_employer());

create policy "invites_select_parties" on public.invites
  for select to authenticated using (employer_id = auth.uid() or worker_id = auth.uid());
create policy "invites_insert_employer" on public.invites
  for insert to authenticated with check (employer_id = auth.uid() and public.is_employer());


-- ---------- 5) YETKİLER ----------
-- Giriş yapmamış (anon) ziyaretçi hiçbir veriye erişemez.

revoke all on public.profiles, public.worker_profiles, public.jobs, public.applications,
              public.invites, public.candidates, public.job_applicants from anon;

grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;      -- rol değiştirilemez
grant select, insert, update, delete on public.worker_profiles to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select, insert on public.applications to authenticated;
grant select, insert on public.invites to authenticated;
grant select on public.candidates, public.job_applicants to authenticated;

revoke execute on function public.is_employer(), public.respond_invite(bigint, boolean),
  public.candidate_contact(uuid), public.candidate_service_counts() from public, anon;
grant execute on function public.is_employer(), public.respond_invite(bigint, boolean),
  public.candidate_contact(uuid), public.candidate_service_counts() to authenticated;
