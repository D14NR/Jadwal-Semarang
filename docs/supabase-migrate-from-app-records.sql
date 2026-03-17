-- One-time migration from app_records (json bucket) to normalized tables.
-- Run AFTER docs/supabase-schema.sql in Supabase SQL Editor.

insert into public.mata_pelajaran (kode_mapel, mapel)
select
  coalesce(data->>'Kode_Mapel', ''),
  coalesce(data->>'Mapel', '')
from public.app_records
where bucket = 'mata_pelajaran'
  and coalesce(data->>'Kode_Mapel', '') <> ''
on conflict (kode_mapel)
do update set mapel = excluded.mapel;

insert into public.pengajar (
  kode_pengajar,
  nama,
  bidang_studi,
  email,
  no_whatsapp,
  domisili,
  username,
  password
)
select
  coalesce(data->>'Kode Pengajar', ''),
  coalesce(data->>'Nama', ''),
  coalesce(data->>'Bidang Studi', ''),
  coalesce(data->>'Email', ''),
  coalesce(data->>'No.WhatsApp', ''),
  coalesce(data->>'Domisili', ''),
  coalesce(data->>'Username', ''),
  coalesce(data->>'Password', '')
from public.app_records
where bucket = 'pengajar'
  and coalesce(data->>'Kode Pengajar', '') <> ''
on conflict (kode_pengajar)
do update set
  nama = excluded.nama,
  bidang_studi = excluded.bidang_studi,
  email = excluded.email,
  no_whatsapp = excluded.no_whatsapp,
  domisili = excluded.domisili,
  username = excluded.username,
  password = excluded.password;

insert into public.jadwal_reguler (
  cabang,
  kelas,
  sekolah,
  tanggal,
  mapel,
  pengajar,
  waktu,
  class_order
)
select
  coalesce(data->>'Cabang', ''),
  coalesce(data->>'Kelas', ''),
  coalesce(data->>'Sekolah', ''),
  coalesce(data->>'Tanggal', ''),
  coalesce(data->>'Mapel', ''),
  coalesce(data->>'Pengajar', ''),
  coalesce(data->>'Waktu', ''),
  nullif(data->>'Urutan Kelas', '')::int
from public.app_records
where bucket = 'jadwal_reguler';

insert into public.jadwal_khusus (
  cabang,
  kelas,
  sekolah,
  tanggal,
  mapel,
  pengajar,
  waktu,
  class_order
)
select
  coalesce(data->>'Cabang', ''),
  coalesce(data->>'Kelas', ''),
  coalesce(data->>'Sekolah', ''),
  coalesce(data->>'Tanggal', ''),
  coalesce(data->>'Mapel', ''),
  coalesce(data->>'Pengajar', ''),
  coalesce(data->>'Waktu', ''),
  nullif(data->>'Urutan Kelas', '')::int
from public.app_records
where bucket = 'jadwal_khusus';

insert into public.surat_tugas_pengajar (
  kode_pengajar,
  tanggal,
  sesi_1,
  sesi_2,
  sesi_3,
  sesi_4,
  sesi_5,
  sesi_6,
  sesi_7,
  sesi_8,
  sesi_9,
  sesi_10
)
select
  coalesce(data->>'Kode Pengajar', ''),
  coalesce(data->>'Tanggal', ''),
  coalesce(data->>'Sesi 1', ''),
  coalesce(data->>'Sesi 2', ''),
  coalesce(data->>'Sesi 3', ''),
  coalesce(data->>'Sesi 4', ''),
  coalesce(data->>'Sesi 5', ''),
  coalesce(data->>'Sesi 6', ''),
  coalesce(data->>'Sesi 7', ''),
  coalesce(data->>'Sesi 8', ''),
  coalesce(data->>'Sesi 9', ''),
  coalesce(data->>'Sesi 10', '')
from public.app_records
where bucket = 'surat_tugas'
  and coalesce(data->>'Kode Pengajar', '') <> ''
on conflict (kode_pengajar, tanggal)
do update set
  sesi_1 = excluded.sesi_1,
  sesi_2 = excluded.sesi_2,
  sesi_3 = excluded.sesi_3,
  sesi_4 = excluded.sesi_4,
  sesi_5 = excluded.sesi_5,
  sesi_6 = excluded.sesi_6,
  sesi_7 = excluded.sesi_7,
  sesi_8 = excluded.sesi_8,
  sesi_9 = excluded.sesi_9,
  sesi_10 = excluded.sesi_10;

insert into public.penempatan_pengajar (
  kode_pengajar,
  nama_pengajar,
  domisili,
  hari_tersedia,
  jam_mulai,
  jam_selesai,
  cabang_penempatan
)
select
  coalesce(data->>'Kode Pengajar', ''),
  coalesce(data->>'Nama Pengajar', ''),
  coalesce(data->>'Domisili', ''),
  coalesce(data->>'Hari', ''),
  coalesce(data->>'Jam Mulai', ''),
  coalesce(data->>'Jam Selesai', ''),
  coalesce(data->>'Cabang Penempatan', '')
from public.app_records
where bucket = 'penempatan_pengajar';

insert into public.permintaan_pengajar_antar_cabang (
  kode_pengajar,
  nama_pengajar,
  cabang_peminta,
  cabang_domisili,
  status,
  tanggal_mulai,
  tanggal_selesai,
  tanggal_khusus,
  hari_tersedia,
  jam_mulai,
  jam_selesai,
  catatan
)
select
  coalesce(data->>'Kode Pengajar', ''),
  coalesce(data->>'Nama Pengajar', ''),
  coalesce(data->>'Cabang Peminta', ''),
  coalesce(data->>'Cabang Domisili', ''),
  coalesce(nullif(data->>'Status', ''), 'Menunggu'),
  coalesce(data->>'Tanggal Mulai', ''),
  coalesce(data->>'Tanggal Selesai', ''),
  coalesce(data->>'Tanggal Khusus', ''),
  coalesce(data->>'Hari', ''),
  coalesce(data->>'Jam Mulai', ''),
  coalesce(data->>'Jam Selesai', ''),
  coalesce(data->>'Catatan', '')
from public.app_records
where bucket = 'permintaan_pengajar';