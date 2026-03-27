-- Supabase schema for KBM-Qu
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- ==========================================================
-- 1) Compatibility table used by current frontend (bucket + json)
-- ==========================================================
create table if not exists public.app_records (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_records_bucket_check check (
    bucket in (
      'jadwal_reguler',
      'jadwal_khusus',
      'mata_pelajaran',
      'pengajar',
      'surat_tugas',
      'penempatan_pengajar',
      'izin_pengajar',
      'permintaan_pengajar'
    )
  )
);

create index if not exists idx_app_records_bucket
  on public.app_records (bucket);

create index if not exists idx_app_records_bucket_created_at
  on public.app_records (bucket, created_at);

create index if not exists idx_app_records_data_gin
  on public.app_records using gin (data);

-- ==========================================================
-- 2) Optional normalized tables (recommended for long-term)
-- ==========================================================
create table if not exists public.mata_pelajaran (
  id uuid primary key default gen_random_uuid(),
  kode_mapel text not null unique,
  mapel text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pengajar (
  id uuid primary key default gen_random_uuid(),
  kode_pengajar text not null unique,
  nama text not null,
  bidang_studi text not null default '',
  email text not null default '',
  no_whatsapp text not null default '',
  domisili text not null default '',
  username text not null default '',
  password text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jadwal_reguler (
  id uuid primary key default gen_random_uuid(),
  cabang text not null,
  kelas text not null,
  sekolah text not null default '',
  tanggal text not null,
  mapel text not null,
  pengajar text not null,
  waktu text not null,
  class_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jadwal_khusus (
  id uuid primary key default gen_random_uuid(),
  cabang text not null,
  kelas text not null,
  sekolah text not null default '',
  tanggal text not null,
  mapel text not null,
  pengajar text not null,
  waktu text not null,
  class_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.surat_tugas_pengajar (
  id uuid primary key default gen_random_uuid(),
  kode_pengajar text not null,
  tanggal text not null,
  sesi_1 text not null default '',
  sesi_2 text not null default '',
  sesi_3 text not null default '',
  sesi_4 text not null default '',
  sesi_5 text not null default '',
  sesi_6 text not null default '',
  sesi_7 text not null default '',
  sesi_8 text not null default '',
  sesi_9 text not null default '',
  sesi_10 text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kode_pengajar, tanggal)
);

create table if not exists public.penempatan_pengajar (
  id uuid primary key default gen_random_uuid(),
  kode_pengajar text not null,
  nama_pengajar text not null,
  domisili text not null,
  hari_tersedia text not null default '',
  jam_mulai text not null default '',
  jam_selesai text not null default '',
  cabang_penempatan text not null default '',
  availability_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.izin_pengajar (
  id uuid primary key default gen_random_uuid(),
  kode_pengajar text not null,
  nama_pengajar text not null,
  domisili text not null default '',
  tanggal_mulai text not null,
  tanggal_selesai text not null,
  keterangan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permintaan_pengajar_antar_cabang (
  id uuid primary key default gen_random_uuid(),
  kode_pengajar text not null,
  nama_pengajar text not null,
  cabang_peminta text not null,
  cabang_domisili text not null,
  status text not null default 'Menunggu'
    check (status in ('Menunggu', 'Disetujui', 'Ditolak')),
  tanggal_mulai text not null default '',
  tanggal_selesai text not null default '',
  tanggal_khusus text not null default '',
  hari_tersedia text not null default '',
  jam_mulai text not null default '',
  jam_selesai text not null default '',
  catatan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================================
-- 3) Shared trigger for updated_at
-- ==========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_records_updated_at on public.app_records;
create trigger trg_app_records_updated_at
before update on public.app_records
for each row execute function public.set_updated_at();

drop trigger if exists trg_mata_pelajaran_updated_at on public.mata_pelajaran;
create trigger trg_mata_pelajaran_updated_at
before update on public.mata_pelajaran
for each row execute function public.set_updated_at();

drop trigger if exists trg_pengajar_updated_at on public.pengajar;
create trigger trg_pengajar_updated_at
before update on public.pengajar
for each row execute function public.set_updated_at();

drop trigger if exists trg_jadwal_reguler_updated_at on public.jadwal_reguler;
create trigger trg_jadwal_reguler_updated_at
before update on public.jadwal_reguler
for each row execute function public.set_updated_at();

drop trigger if exists trg_jadwal_khusus_updated_at on public.jadwal_khusus;
create trigger trg_jadwal_khusus_updated_at
before update on public.jadwal_khusus
for each row execute function public.set_updated_at();

drop trigger if exists trg_surat_tugas_updated_at on public.surat_tugas_pengajar;
create trigger trg_surat_tugas_updated_at
before update on public.surat_tugas_pengajar
for each row execute function public.set_updated_at();

drop trigger if exists trg_penempatan_updated_at on public.penempatan_pengajar;
create trigger trg_penempatan_updated_at
before update on public.penempatan_pengajar
for each row execute function public.set_updated_at();

drop trigger if exists trg_izin_pengajar_updated_at on public.izin_pengajar;
create trigger trg_izin_pengajar_updated_at
before update on public.izin_pengajar
for each row execute function public.set_updated_at();

drop trigger if exists trg_permintaan_updated_at on public.permintaan_pengajar_antar_cabang;
create trigger trg_permintaan_updated_at
before update on public.permintaan_pengajar_antar_cabang
for each row execute function public.set_updated_at();

-- ==========================================================
-- 4) RLS policy (anon access for current app mode)
--    NOTE: This is permissive. Tighten for production auth later.
-- ==========================================================
alter table public.app_records enable row level security;
alter table public.mata_pelajaran enable row level security;
alter table public.pengajar enable row level security;
alter table public.jadwal_reguler enable row level security;
alter table public.jadwal_khusus enable row level security;
alter table public.surat_tugas_pengajar enable row level security;
alter table public.penempatan_pengajar enable row level security;
alter table public.izin_pengajar enable row level security;
alter table public.permintaan_pengajar_antar_cabang enable row level security;

drop policy if exists app_records_anon_all on public.app_records;
create policy app_records_anon_all on public.app_records
for all to anon
using (true)
with check (true);

drop policy if exists mata_pelajaran_anon_all on public.mata_pelajaran;
create policy mata_pelajaran_anon_all on public.mata_pelajaran
for all to anon
using (true)
with check (true);

drop policy if exists pengajar_anon_all on public.pengajar;
create policy pengajar_anon_all on public.pengajar
for all to anon
using (true)
with check (true);

drop policy if exists jadwal_reguler_anon_all on public.jadwal_reguler;
create policy jadwal_reguler_anon_all on public.jadwal_reguler
for all to anon
using (true)
with check (true);

drop policy if exists jadwal_khusus_anon_all on public.jadwal_khusus;
create policy jadwal_khusus_anon_all on public.jadwal_khusus
for all to anon
using (true)
with check (true);

drop policy if exists surat_tugas_anon_all on public.surat_tugas_pengajar;
create policy surat_tugas_anon_all on public.surat_tugas_pengajar
for all to anon
using (true)
with check (true);

drop policy if exists penempatan_anon_all on public.penempatan_pengajar;
create policy penempatan_anon_all on public.penempatan_pengajar
for all to anon
using (true)
with check (true);

drop policy if exists izin_pengajar_anon_all on public.izin_pengajar;
create policy izin_pengajar_anon_all on public.izin_pengajar
for all to anon
using (true)
with check (true);

drop policy if exists permintaan_anon_all on public.permintaan_pengajar_antar_cabang;
create policy permintaan_anon_all on public.permintaan_pengajar_antar_cabang
for all to anon
using (true)
with check (true);