import { supabase } from "./supabase";

export type DbRow = {
  id: string;
  data: Record<string, string>;
};

const bucketTableMap = {
  jadwal_reguler: "jadwal_reguler",
  jadwal_khusus: "jadwal_khusus",
  mata_pelajaran: "mata_pelajaran",
  pengajar: "pengajar",
  surat_tugas: "surat_tugas_pengajar",
  penempatan_pengajar: "penempatan_pengajar",
  permintaan_pengajar: "permintaan_pengajar_antar_cabang",
} as const;

type BucketName = keyof typeof bucketTableMap;

type BucketSchema = {
  table: string;
  fromDb: (row: Record<string, unknown>) => Record<string, string>;
  toDb: (data: Record<string, string>) => Record<string, string | number | null>;
};

const encodeId = (bucket: string, id: string) => `${bucket}:${id}`;

const decodeId = (encoded: string) => {
  const [bucket, ...rest] = String(encoded || "").split(":");
  const id = rest.join(":");
  if (!bucket || !id || !(bucket in bucketTableMap)) {
    throw new Error("ID database tidak valid.");
  }
  return { bucket: bucket as BucketName, id };
};

const asString = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const asNumberOrNull = (value: unknown) => {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const schemas: Record<BucketName, BucketSchema> = {
  jadwal_reguler: {
    table: bucketTableMap.jadwal_reguler,
    fromDb: (row) => ({
      Cabang: asString(row.cabang),
      Kelas: asString(row.kelas),
      Sekolah: asString(row.sekolah),
      Tanggal: asString(row.tanggal),
      Mapel: asString(row.mapel),
      Pengajar: asString(row.pengajar),
      Waktu: asString(row.waktu),
      "Urutan Kelas": asString(row.class_order),
    }),
    toDb: (data) => ({
      cabang: asString(data.Cabang),
      kelas: asString(data.Kelas),
      sekolah: asString(data.Sekolah),
      tanggal: asString(data.Tanggal),
      mapel: asString(data.Mapel),
      pengajar: asString(data.Pengajar),
      waktu: asString(data.Waktu),
      class_order: asNumberOrNull(data["Urutan Kelas"]),
    }),
  },
  jadwal_khusus: {
    table: bucketTableMap.jadwal_khusus,
    fromDb: (row) => ({
      Cabang: asString(row.cabang),
      Kelas: asString(row.kelas),
      Sekolah: asString(row.sekolah),
      Tanggal: asString(row.tanggal),
      Mapel: asString(row.mapel),
      Pengajar: asString(row.pengajar),
      Waktu: asString(row.waktu),
      "Urutan Kelas": asString(row.class_order),
    }),
    toDb: (data) => ({
      cabang: asString(data.Cabang),
      kelas: asString(data.Kelas),
      sekolah: asString(data.Sekolah),
      tanggal: asString(data.Tanggal),
      mapel: asString(data.Mapel),
      pengajar: asString(data.Pengajar),
      waktu: asString(data.Waktu),
      class_order: asNumberOrNull(data["Urutan Kelas"]),
    }),
  },
  mata_pelajaran: {
    table: bucketTableMap.mata_pelajaran,
    fromDb: (row) => ({
      Mapel: asString(row.mapel),
      Kode_Mapel: asString(row.kode_mapel),
    }),
    toDb: (data) => ({
      mapel: asString(data.Mapel),
      kode_mapel: asString(data.Kode_Mapel),
    }),
  },
  pengajar: {
    table: bucketTableMap.pengajar,
    fromDb: (row) => ({
      "Kode Pengajar": asString(row.kode_pengajar),
      Nama: asString(row.nama),
      "Bidang Studi": asString(row.bidang_studi),
      Email: asString(row.email),
      "No.WhatsApp": asString(row.no_whatsapp),
      Domisili: asString(row.domisili),
      Username: asString(row.username),
      Password: asString(row.password),
    }),
    toDb: (data) => ({
      kode_pengajar: asString(data["Kode Pengajar"]),
      nama: asString(data.Nama),
      bidang_studi: asString(data["Bidang Studi"]),
      email: asString(data.Email),
      no_whatsapp: asString(data["No.WhatsApp"]),
      domisili: asString(data.Domisili),
      username: asString(data.Username),
      password: asString(data.Password),
    }),
  },
  surat_tugas: {
    table: bucketTableMap.surat_tugas,
    fromDb: (row) => ({
      "Kode Pengajar": asString(row.kode_pengajar),
      Tanggal: asString(row.tanggal),
      "Sesi 1": asString(row.sesi_1),
      "Sesi 2": asString(row.sesi_2),
      "Sesi 3": asString(row.sesi_3),
      "Sesi 4": asString(row.sesi_4),
      "Sesi 5": asString(row.sesi_5),
      "Sesi 6": asString(row.sesi_6),
      "Sesi 7": asString(row.sesi_7),
      "Sesi 8": asString(row.sesi_8),
      "Sesi 9": asString(row.sesi_9),
      "Sesi 10": asString(row.sesi_10),
    }),
    toDb: (data) => ({
      kode_pengajar: asString(data["Kode Pengajar"]),
      tanggal: asString(data.Tanggal),
      sesi_1: asString(data["Sesi 1"]),
      sesi_2: asString(data["Sesi 2"]),
      sesi_3: asString(data["Sesi 3"]),
      sesi_4: asString(data["Sesi 4"]),
      sesi_5: asString(data["Sesi 5"]),
      sesi_6: asString(data["Sesi 6"]),
      sesi_7: asString(data["Sesi 7"]),
      sesi_8: asString(data["Sesi 8"]),
      sesi_9: asString(data["Sesi 9"]),
      sesi_10: asString(data["Sesi 10"]),
    }),
  },
  penempatan_pengajar: {
    table: bucketTableMap.penempatan_pengajar,
    fromDb: (row) => ({
      "Kode Pengajar": asString(row.kode_pengajar),
      "Nama Pengajar": asString(row.nama_pengajar),
      Domisili: asString(row.domisili),
      Hari: asString(row.hari_tersedia),
      "Jam Mulai": asString(row.jam_mulai),
      "Jam Selesai": asString(row.jam_selesai),
      "Cabang Penempatan": asString(row.cabang_penempatan),
    }),
    toDb: (data) => ({
      kode_pengajar: asString(data["Kode Pengajar"]),
      nama_pengajar: asString(data["Nama Pengajar"]),
      domisili: asString(data.Domisili),
      hari_tersedia: asString(data.Hari),
      jam_mulai: asString(data["Jam Mulai"]),
      jam_selesai: asString(data["Jam Selesai"]),
      cabang_penempatan: asString(data["Cabang Penempatan"]),
    }),
  },
  permintaan_pengajar: {
    table: bucketTableMap.permintaan_pengajar,
    fromDb: (row) => ({
      ID: asString(row.id),
      "Kode Pengajar": asString(row.kode_pengajar),
      "Nama Pengajar": asString(row.nama_pengajar),
      "Cabang Peminta": asString(row.cabang_peminta),
      "Cabang Domisili": asString(row.cabang_domisili),
      "Tanggal Mulai": asString(row.tanggal_mulai),
      "Tanggal Selesai": asString(row.tanggal_selesai),
      "Tanggal Khusus": asString(row.tanggal_khusus),
      Hari: asString(row.hari_tersedia),
      "Jam Mulai": asString(row.jam_mulai),
      "Jam Selesai": asString(row.jam_selesai),
      Status: asString(row.status),
      Catatan: asString(row.catatan),
    }),
    toDb: (data) => ({
      kode_pengajar: asString(data["Kode Pengajar"]),
      nama_pengajar: asString(data["Nama Pengajar"]),
      cabang_peminta: asString(data["Cabang Peminta"]),
      cabang_domisili: asString(data["Cabang Domisili"]),
      tanggal_mulai: asString(data["Tanggal Mulai"]),
      tanggal_selesai: asString(data["Tanggal Selesai"]),
      tanggal_khusus: asString(data["Tanggal Khusus"]),
      hari_tersedia: asString(data.Hari),
      jam_mulai: asString(data["Jam Mulai"]),
      jam_selesai: asString(data["Jam Selesai"]),
      status: asString(data.Status),
      catatan: asString(data.Catatan),
    }),
  },
};

const normalizeData = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return {} as Record<string, string>;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, item]) => {
      acc[key] = item === undefined || item === null ? "" : String(item);
      return acc;
    },
    {}
  );
};

export const listRows = async (bucket: string) => {
  if (!(bucket in schemas)) {
    throw new Error(`Bucket tidak dikenal: ${bucket}`);
  }
  const schema = schemas[bucket as BucketName];
  const { data, error } = await supabase
    .from(schema.table)
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => ({
    id: encodeId(bucket, String(row.id || "")),
    data: normalizeData(schema.fromDb(row as Record<string, unknown>)),
  })) as DbRow[];
};

export const insertRow = async (bucket: string, data: Record<string, string>) => {
  if (!(bucket in schemas)) {
    throw new Error(`Bucket tidak dikenal: ${bucket}`);
  }
  const schema = schemas[bucket as BucketName];
  const { data: inserted, error } = await supabase
    .from(schema.table)
    .insert(schema.toDb(data))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: encodeId(bucket, String(inserted.id || "")),
    data: normalizeData(schema.fromDb(inserted as Record<string, unknown>)),
  } as DbRow;
};

export const updateRow = async (id: string, data: Record<string, string>) => {
  const { bucket, id: rawId } = decodeId(id);
  const schema = schemas[bucket];
  const { data: updated, error } = await supabase
    .from(schema.table)
    .update(schema.toDb(data))
    .eq("id", rawId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: encodeId(bucket, String(updated.id || "")),
    data: normalizeData(schema.fromDb(updated as Record<string, unknown>)),
  } as DbRow;
};

export const deleteRowsByIds = async (ids: string[]) => {
  if (ids.length === 0) {
    return;
  }

  const grouped = ids.reduce<Record<string, string[]>>((acc, id) => {
    const decoded = decodeId(id);
    if (!acc[decoded.bucket]) {
      acc[decoded.bucket] = [];
    }
    acc[decoded.bucket].push(decoded.id);
    return acc;
  }, {});

  for (const [bucket, rawIds] of Object.entries(grouped)) {
    const schema = schemas[bucket as BucketName];
    const { error } = await supabase.from(schema.table).delete().in("id", rawIds);
    if (error) {
      throw new Error(error.message);
    }
  }
};

export const replaceBucketRows = async (bucket: string, records: Record<string, string>[]) => {
  if (!(bucket in schemas)) {
    throw new Error(`Bucket tidak dikenal: ${bucket}`);
  }
  const schema = schemas[bucket as BucketName];
  const existing = await listRows(bucket);
  await deleteRowsByIds(existing.map((row) => row.id));
  if (records.length === 0) {
    return;
  }

  const payload = records.map((record) => schema.toDb(record));
  const { error } = await supabase.from(schema.table).insert(payload);
  if (error) {
    throw new Error(error.message);
  }
};
