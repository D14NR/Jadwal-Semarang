import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { categories, initialRecords } from "./config/categories";
import { SidebarMenu } from "./components/layout/SidebarMenu";
import { LoginScreen } from "./components/layout/LoginScreen";
import { ClassModal } from "./components/modals/ClassModal";
import { EditScheduleModal } from "./components/modals/EditScheduleModal";
import { MapelModal } from "./components/modals/MapelModal";
import { PengajarModal, type PengajarDraft } from "./components/modals/PengajarModal";
import {
  PenempatanPengajarModal,
  type PenempatanDraft,
} from "./components/modals/PenempatanPengajarModal";
import {
  IzinPengajarModal,
  type IzinPengajarDraft,
} from "./components/modals/IzinPengajarModal";
import {
  PermintaanPengajarModal,
  type PermintaanDraft,
} from "./components/modals/PermintaanPengajarModal";
import { TopToolbar } from "./components/views/TopToolbar";
import { DashboardView } from "./components/views/DashboardView";
import { ScheduleTableView } from "./components/views/ScheduleTableView";
import { MonitoringKelasView } from "./components/views/MonitoringKelasView";
import { MapelTableView } from "./components/views/MapelTableView";
import { PengajarTableView } from "./components/views/PengajarTableView";
import { PenempatanPengajarView } from "./components/views/PenempatanPengajarView";
import { IzinPengajarView } from "./components/views/IzinPengajarView";
import { PermintaanPengajarView } from "./components/views/PermintaanPengajarView";
import { SuratTugasView } from "./components/views/SuratTugasView";
import { PrintJadwalView } from "./components/views/PrintJadwalView";
import { HapusJadwalView } from "./components/views/HapusJadwalView";
import { LoadingOverlay } from "./components/feedback/LoadingOverlay";
import { ConfirmDialog } from "./components/feedback/ConfirmDialog";
import { ToastStack } from "./components/feedback/ToastStack";
import { authStorageKey, loginAccounts } from "./config/auth";
import type {
  AppToast,
  AuthSession,
  EditingSlot,
  RecordItem,
  ToastType,
} from "./types/app";
import {
  buildRollingScheduleDates,
  buildMonthScheduleDates,
  formatLocalDate,
  formatScheduleLabel,
  formatTimeHHMM,
  mapelHeadersExpected,
  mapMapelRecord,
  normalizeHeader,
  parseFlexibleDate,
  parseRangeFromString,
  parseTimeValue,
} from "./utils/schedule";
import {
  deleteRowsByIds,
  insertRow,
  listRows,
  replaceBucketRows,
  updateRow,
  type DbRow,
} from "./lib/database";

export function App() {
  const MONTH_WINDOW = 2;
  const getMonthKey = (date: Date) =>
    formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1)).slice(0, 7);

  const scheduleSheetByKey = {
    bulanIni: "Jadwal Bulan ini",
    jadwalTambahanPelayanan: "Jadwal Khusus",
  } as const;
  type ScheduleMenuKey = keyof typeof scheduleSheetByKey;
  const dataBucket = {
    "Jadwal Bulan ini": "jadwal_reguler",
    "Jadwal Khusus": "jadwal_khusus",
    "Mata Pelajaran": "mata_pelajaran",
    "Data Pengajar": "pengajar",
    "Surat Tugas Pengajar": "surat_tugas",
    "Penempatan Pengajar": "penempatan_pengajar",
    "Izin Pengajar": "izin_pengajar",
    "Permintaan Pengajar Antar Cabang": "permintaan_pengajar",
  } as const;

  const toRecord = (row: DbRow) => row.data;
  const normalizeValueKey = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const matchByFields = (
    source: Record<string, string>,
    target: Record<string, string>,
    fields: string[]
  ) => fields.every((field) => normalizeValueKey(source[field]) === normalizeValueKey(target[field]));

  const [activeKey, setActiveKey] = useState(categories[0].key);
  const [records, setRecords] = useState<Record<string, RecordItem[]>>(initialRecords);
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);
  const [draft, setDraft] = useState({
    mapel: "",
    pengajar: "",
    waktuMulai: "",
    waktuSelesai: "",
  });
  const [copyTargetDates, setCopyTargetDates] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sheetStatus, setSheetStatus] = useState({
    loading: false,
    saving: false,
    error: "",
    lastSync: "",
  });
  const [mapelStatus, setMapelStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [mapelHeaders, setMapelHeaders] = useState<string[]>([]);
  const [mapelRecords, setMapelRecords] = useState<Record<string, string>[]>([]);
  const [pengajarStatus, setPengajarStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [pengajarHeaders, setPengajarHeaders] = useState<string[]>([]);
  const [pengajarRecords, setPengajarRecords] = useState<Record<string, string>[]>([]);
  const [suratTugasStatus, setSuratTugasStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [suratTugasRecords, setSuratTugasRecords] = useState<Record<string, string>[]>([]);
  const [penempatanStatus, setPenempatanStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [penempatanRecords, setPenempatanRecords] = useState<Record<string, string>[]>([]);
  const [izinStatus, setIzinStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [izinRecords, setIzinRecords] = useState<Record<string, string>[]>([]);
  const [permintaanStatus, setPermintaanStatus] = useState({
    loading: false,
    error: "",
    lastSync: "",
  });
  const [permintaanRecords, setPermintaanRecords] = useState<Record<string, string>[]>([]);
  const [selectedSuratTugasMonthKey, setSelectedSuratTugasMonthKey] = useState("");
  const [selectedSuratTugasKode, setSelectedSuratTugasKode] = useState("");
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classDraft, setClassDraft] = useState({ cabang: "", kelas: "", sekolah: "" });
  const [classError, setClassError] = useState("");
  const [conflictError, setConflictError] = useState("");
  const [isMapelModalOpen, setIsMapelModalOpen] = useState(false);
  const [mapelDraft, setMapelDraft] = useState({ Mapel: "", Kode_Mapel: "" });
  const [editingMapelOldName, setEditingMapelOldName] = useState<string | null>(null);
  const [mapelError, setMapelError] = useState("");
  
  const [isPengajarModalOpen, setIsPengajarModalOpen] = useState(false);
  const [pengajarDraft, setPengajarDraft] = useState<PengajarDraft>({
    "Kode Pengajar": "",
    "Nama": "",
    "Bidang Studi": "",
    "Email": "",
    "No.WhatsApp": "",
    "Domisili": "",
    "Username": "",
    "Password": ""
  });
  const [editingPengajarOldKode, setEditingPengajarOldKode] = useState<string | null>(null);
  const [pengajarError, setPengajarError] = useState("");
  const [isPenempatanModalOpen, setIsPenempatanModalOpen] = useState(false);
  const weekDays = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const createAvailabilityList = (
    defaultStart = "",
    defaultEnd = "",
    enabledDays: string[] = []
  ) => {
    const enabledSet = new Set(
      enabledDays.map((day) => {
        const normalized = String(day || "").trim().toLowerCase();
        return normalized
          ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
          : "";
      })
    );
    return weekDays.map((hari) => ({
      hari,
      enabled: enabledSet.has(hari),
      jamMulai: defaultStart,
      jamSelesai: defaultEnd,
    }));
  };
  const [penempatanDraft, setPenempatanDraft] = useState<PenempatanDraft>({
    kodePengajar: "",
    namaPengajar: "",
    domisili: "",
    availabilityList: createAvailabilityList(),
    cabangList: [],
  });
  const [penempatanOldRecord, setPenempatanOldRecord] = useState<Record<string, string> | null>(null);
  const [penempatanError, setPenempatanError] = useState("");
  const [isIzinModalOpen, setIsIzinModalOpen] = useState(false);
  const [izinDraft, setIzinDraft] = useState<IzinPengajarDraft>({
    kodePengajar: "",
    namaPengajar: "",
    domisili: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    keterangan: "",
  });
  const [editingIzinId, setEditingIzinId] = useState<string | null>(null);
  const [izinError, setIzinError] = useState("");
  const [isPermintaanModalOpen, setIsPermintaanModalOpen] = useState(false);
  const [permintaanDraft, setPermintaanDraft] = useState<PermintaanDraft>({
    id: "",
    kodePengajar: "",
    namaPengajar: "",
    cabangPeminta: "",
    cabangTujuan: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    tanggalList: [],
    tanggalInput: "",
    hariList: [],
    jamMulai: "",
    jamSelesai: "",
    catatan: "",
  });
  const [permintaanError, setPermintaanError] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedMonthKey, setSelectedMonthKey] = useState(() =>
    getMonthKey(new Date())
  );
  const [printScheduleType, setPrintScheduleType] = useState<"reguler" | "tambahan">("reguler");
  const [printSelectedClassKey, setPrintSelectedClassKey] = useState("");
  const [printCopies, setPrintCopies] = useState(5);
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">("landscape");
  const [deleteScheduleType, setDeleteScheduleType] = useState<"bulanIni" | "jadwalTambahanPelayanan">(
    "bulanIni"
  );
  const [deleteMonthKey, setDeleteMonthKey] = useState(() => getMonthKey(new Date()));
  const [isDeletingByMonth, setIsDeletingByMonth] = useState(false);
  const [scheduleCabangView, setScheduleCabangView] = useState<Record<ScheduleMenuKey, string>>({
    bulanIni: "",
    jadwalTambahanPelayanan: "",
  });
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    loading: boolean;
    onConfirm: null | (() => Promise<void> | void);
  }>({
    open: false,
    title: "Konfirmasi",
    message: "",
    confirmLabel: "Ya, Lanjutkan",
    loading: false,
    onConfirm: null,
  });

  const normalizeText = (value: string) => value.trim().toLowerCase();
  const buildClassGroupKey = (cabang: string, kelas: string, sekolah = "") =>
    `${normalizeText(cabang)}||${normalizeText(kelas)}||${normalizeText(sekolah)}`;
  const parseClassOrder = (value: unknown) => {
    const numeric = Number(String(value ?? "").trim());
    return Number.isFinite(numeric) ? numeric : null;
  };
  const titleCase = (value: string) =>
    value ? `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}` : value;
  const parseCabangPenempatan = (value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return [] as string[];
    }
    if (normalized === "semua cabang") {
      return [...cabangOptions];
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const parseHariPenempatan = (value: string) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return [] as string[];
    }
    if (normalized === "semua hari") {
      return ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    }
    return value
      .split(",")
      .map((item) => titleCase(item.trim()))
      .filter(Boolean);
  };
  const parsePermintaanTanggalKhusus = (value: string) => {
    if (!value.trim()) {
      return [] as string[];
    }
    const parsed = value
      .split(/[\n,;|]+/)
      .map((item) => parseFlexibleDate(item.trim()))
      .filter((item): item is Date => Boolean(item))
      .map((item) => formatScheduleLabel(item));
    return Array.from(new Set(parsed));
  };
  const isScheduleMenuKey = (value: string): value is ScheduleMenuKey =>
    value === "bulanIni" || value === "jadwalTambahanPelayanan";
  const activeScheduleKey: ScheduleMenuKey = isScheduleMenuKey(activeKey)
    ? activeKey
    : "bulanIni";
  const isAdmin = normalizeText(authSession?.role || "") === "admin";
  const restrictedCabang = !isAdmin ? (authSession?.cabang || "") : "";
  const selectedScheduleCabang = scheduleCabangView[activeScheduleKey] || restrictedCabang || "";
  const isScheduleReadOnly = Boolean(
    restrictedCabang &&
      selectedScheduleCabang &&
      normalizeText(selectedScheduleCabang) !== normalizeText(restrictedCabang)
  );

  const pushToast = (message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.round(Math.random() * 10000)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const openConfirmDialog = (
    message: string,
    onConfirm: () => Promise<void> | void,
    options?: { title?: string; confirmLabel?: string }
  ) => {
    setConfirmDialog({
      open: true,
      title: options?.title || "Konfirmasi",
      message,
      confirmLabel: options?.confirmLabel || "Ya, Lanjutkan",
      loading: false,
      onConfirm,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) =>
      prev.loading
        ? prev
        : { ...prev, open: false, message: "", onConfirm: null, confirmLabel: "Ya, Lanjutkan" }
    );
  };

  const handleConfirmDialogAction = async () => {
    if (!confirmDialog.onConfirm) {
      closeConfirmDialog();
      return;
    }
    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog((prev) => ({ ...prev, open: false, loading: false, onConfirm: null, message: "" }));
    } catch (_error) {
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const mapelOptions = useMemo(() => {
    return mapelRecords.map((record) => ({
      value: record["Kode_Mapel"] || record["Singkatan"] || "",
      label: `${record["Kode_Mapel"] || record["Singkatan"] || ""} - ${record["Mapel"] || record["Mata Pelajaran"] || ""}`
    })).filter(opt => opt.value);
  }, [mapelRecords]);

  const mapelNameByKode = useMemo(() => {
    return mapelRecords.reduce<Record<string, string>>((acc, record) => {
      const kode = (record["Kode_Mapel"] || record["Singkatan"] || "").trim();
      const nama = (record["Mapel"] || record["Mata Pelajaran"] || "").trim();
      if (!kode || !nama) {
        return acc;
      }
      acc[kode.toLowerCase()] = nama;
      return acc;
    }, {});
  }, [mapelRecords]);

  const pengajarOptions = useMemo(() => {
    return pengajarRecords.map((record) => ({
      value: record["Kode Pengajar"] || "",
      label: `${record["Kode Pengajar"] || ""} - ${record["Nama"] || ""}`
    })).filter(opt => opt.value);
  }, [pengajarRecords]);

  const pengajarByKode = useMemo(() => {
    return pengajarRecords.reduce<Record<string, Record<string, string>>>((acc, record) => {
      const kode = normalizeText(record["Kode Pengajar"] || "");
      if (kode) {
        acc[kode] = record;
      }
      return acc;
    }, {});
  }, [pengajarRecords]);

  const pengajarIzinOptions = useMemo(() => {
    const source = restrictedCabang
      ? pengajarRecords.filter(
          (record) => normalizeText(record["Domisili"] || "") === normalizeText(restrictedCabang)
        )
      : pengajarRecords;

    return source
      .map((record) => ({
        value: (record["Kode Pengajar"] || "").trim().toLowerCase(),
        label: `${record["Kode Pengajar"] || ""} - ${record["Nama"] || ""}`,
      }))
      .filter((option) => option.value);
  }, [pengajarRecords, restrictedCabang]);

  const normalizeToken = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const filteredPengajarOptions = useMemo(() => {
    const selectedMapelKode = draft.mapel.trim();
    if (!selectedMapelKode) {
      return pengajarOptions;
    }

    const selectedMapelName = mapelNameByKode[selectedMapelKode.toLowerCase()] || "";
    const targetKode = normalizeToken(selectedMapelKode);
    const targetName = normalizeToken(selectedMapelName);

    return pengajarRecords
      .filter((record) => {
        const bidangStudi = (record["Bidang Studi"] || "").trim();
        if (!bidangStudi) {
          return false;
        }

        const tokens = bidangStudi
          .split(/[,;/|]+/)
          .map((token) => normalizeToken(token))
          .filter(Boolean);

        if (tokens.includes(targetKode)) {
          return true;
        }
        if (targetName && tokens.includes(targetName)) {
          return true;
        }

        // Backward compatibility for old data: allow partial contains.
        const bidangNormalized = normalizeToken(bidangStudi);
        return Boolean(
          targetKode && bidangNormalized.includes(targetKode)
        ) || Boolean(targetName && bidangNormalized.includes(targetName));
      })
      .map((record) => ({
        value: record["Kode Pengajar"] || "",
        label: `${record["Kode Pengajar"] || ""} - ${record["Nama"] || ""}`,
      }))
      .filter((option) => option.value);
  }, [draft.mapel, mapelNameByKode, pengajarOptions, pengajarRecords]);

  const cabangOptions = useMemo(() => {
    const set = new Set<string>();
    loginAccounts.forEach((account) => {
      if (account.cabang) {
        set.add(account.cabang);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const activeScheduleCabangOptions = useMemo(() => {
    const set = new Set<string>();
    (records[activeScheduleKey] ?? []).forEach((entry) => {
      const cabang = (entry.cabang || "").trim();
      if (cabang) {
        set.add(cabang);
      }
    });
    cabangOptions.forEach((cabang) => set.add(cabang));
    if (restrictedCabang) {
      set.add(restrictedCabang);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeScheduleKey, cabangOptions, records, restrictedCabang]);

  const pengajarPenempatanOptions = useMemo(() => {
    const source = restrictedCabang
      ? pengajarRecords.filter(
          (record) => normalizeText(record["Domisili"] || "") === normalizeText(restrictedCabang)
        )
      : pengajarRecords;

    return source
      .map((record) => {
        const kode = (record["Kode Pengajar"] || "").trim();
        const nama = (record["Nama"] || "").trim();
        return {
          value: kode,
          label: `${kode} - ${nama}`,
        };
      })
      .filter((option) => option.value);
  }, [pengajarRecords, restrictedCabang]);

  const pengajarPermintaanOptions = useMemo(() => {
    return pengajarRecords
      .filter((record) => {
        if (!restrictedCabang) {
          return true;
        }
        return normalizeText(record["Domisili"] || "") !== normalizeText(restrictedCabang);
      })
      .map((record) => {
        const kode = (record["Kode Pengajar"] || "").trim();
        const nama = (record["Nama"] || "").trim();
        const domisili = (record["Domisili"] || "").trim();
        return {
          value: kode,
          label: `${kode} - ${nama} - ${domisili}`,
        };
      })
      .filter((option) => option.value);
  }, [pengajarRecords, restrictedCabang]);

  const approvedPermintaanRecords = useMemo(
    () =>
      permintaanRecords.filter(
        (record) => normalizeText(record.Status || "") === "disetujui"
      ),
    [permintaanRecords]
  );

  const sanitizeWhatsappDigits = (value: string) => {
    let digits = value.replace(/\D/g, "");
    while (digits.startsWith("62")) {
      digits = digits.slice(2);
    }
    while (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits;
  };

  const sanitizePasswordInput = (value: string) =>
    value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let output = "";
    for (let index = 0; index < 6; index += 1) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      output += chars[randomIndex];
    }
    return output;
  };

  const generateUniqueKodePengajar = (nama: string, oldKode?: string | null) => {
    const compact = nama
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim();
    if (!compact) {
      return "";
    }

    const words = compact.split(/\s+/).filter(Boolean);
    const letters = compact.replace(/\s+/g, "");
    const candidates: string[] = [];

    if (words.length >= 2) {
      candidates.push(`${words[0][0]}${words[1][0]}`);
      candidates.push(words.slice(0, 3).map((word) => word[0]).join(""));
    }

    if (letters.length >= 2) {
      candidates.push(letters.slice(0, 2));
    }
    if (letters.length >= 3) {
      candidates.push(letters.slice(0, 3));
    }

    for (let index = 0; index < Math.max(0, letters.length - 2); index += 1) {
      candidates.push(letters.slice(index, index + 3));
    }

    const usedCodes = new Set(
      pengajarRecords
        .map((record) => (record["Kode Pengajar"] || "").trim().toLowerCase())
        .filter((code) => code && (!oldKode || code !== oldKode.trim().toLowerCase()))
    );

    const uniqueCandidates = Array.from(new Set(candidates.filter((candidate) => candidate.length >= 2)));
    for (const candidate of uniqueCandidates) {
      if (!usedCodes.has(candidate)) {
        return candidate;
      }
    }

    const fallback = uniqueCandidates[0] || letters.slice(0, 3) || "pg";
    let counter = 1;
    let attempt = fallback;
    while (usedCodes.has(attempt)) {
      attempt = `${fallback.slice(0, 3)}${counter}`;
      counter += 1;
    }
    return attempt;
  };

  const monthOptions = useMemo(() => {
    return Array.from({ length: MONTH_WINDOW * 2 + 1 }, (_, index) => {
      const offset = index - MONTH_WINDOW;
      const date = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + offset, 1);
      return {
        value: getMonthKey(date),
        label: date.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        }),
      };
    });
  }, [monthAnchor]);

  useEffect(() => {
    const syncMonthAnchor = () => {
      const now = new Date();
      const nowKey = getMonthKey(now);
      setMonthAnchor((prev) => (getMonthKey(prev) === nowKey ? prev : new Date(now.getFullYear(), now.getMonth(), 1)));
    };

    syncMonthAnchor();
    const intervalId = window.setInterval(syncMonthAnchor, 60 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const availableMonthKeys = new Set(monthOptions.map((option) => option.value));
    const currentMonthKey = getMonthKey(new Date());

    if (!availableMonthKeys.has(selectedMonthKey)) {
      setSelectedMonthKey(currentMonthKey);
    }

    if (!availableMonthKeys.has(deleteMonthKey)) {
      setDeleteMonthKey(currentMonthKey);
    }

    if (selectedSuratTugasMonthKey && !availableMonthKeys.has(selectedSuratTugasMonthKey)) {
      setSelectedSuratTugasMonthKey("");
      setSelectedSuratTugasKode("");
    }
  }, [deleteMonthKey, monthOptions, selectedMonthKey, selectedSuratTugasMonthKey]);

  const selectedMonth = useMemo(() => {
    const [year, month] = selectedMonthKey.split("-").map(Number);
    return new Date(year, Math.max(0, (month || 1) - 1), 1);
  }, [selectedMonthKey]);

  const selectedSuratTugasMonthDate = useMemo(() => {
    if (!selectedSuratTugasMonthKey) {
      return null;
    }
    const [year, month] = selectedSuratTugasMonthKey.split("-").map(Number);
    return new Date(year, Math.max(0, (month || 1) - 1), 1);
  }, [selectedSuratTugasMonthKey]);

  const { scheduleDates: monthScheduleDates, dayGroups: monthDayGroups } = useMemo(
    () => buildMonthScheduleDates(selectedMonth),
    [selectedMonth]
  );

  const { scheduleDates: tambahanScheduleDates, dayGroups: tambahanDayGroups } = useMemo(
    () => buildRollingScheduleDates(30),
    []
  );

  const isJadwalTambahanMenu = activeKey === "jadwalTambahanPelayanan";
  const activeScheduleDates = isJadwalTambahanMenu ? tambahanScheduleDates : monthScheduleDates;
  const activeDayGroups = isJadwalTambahanMenu ? tambahanDayGroups : monthDayGroups;
  const activeDayStartIndexes = useMemo(() => {
    const indexes: number[] = [];
    let offset = 0;
    activeDayGroups.forEach((group) => {
      indexes.push(offset);
      offset += group.count;
    });
    return new Set(indexes);
  }, [activeDayGroups]);

  const copyDateOptions = useMemo(() => {
    if (!editingSlot) {
      return [] as { value: string; label: string }[];
    }
    return activeScheduleDates
      .filter((slot) => slot.date !== editingSlot.tanggal)
      .map((slot) => ({ value: slot.date, label: slot.label }));
  }, [activeScheduleDates, editingSlot]);

  const suratTugasCalendar = useMemo(() => {
    if (!selectedSuratTugasMonthDate) {
      return { dayRows: [], dateKeys: new Set<string>() };
    }
    const { scheduleDates, dayGroups: suratDayGroups } = buildMonthScheduleDates(selectedSuratTugasMonthDate);
    let offset = 0;
    const dayRows = suratDayGroups.map((group) => {
      const dates = scheduleDates.slice(offset, offset + group.count);
      offset += group.count;
      return {
        dayLabel: group.label.toUpperCase(),
        dates,
      };
    });
    const dateKeys = new Set(scheduleDates.map((slot) => slot.date));
    return { dayRows, dateKeys };
  }, [selectedSuratTugasMonthDate]);

  const normalizeDateValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    const matchByLabel = monthScheduleDates.find(
      (slot) => slot.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchByLabel) {
      return matchByLabel.date;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatLocalDate(parsed);
    }
    return trimmed;
  };

  const getSlotLabelByDate = (date: string) => {
    return monthScheduleDates.find((slot) => slot.date === date)?.label ?? date;
  };

  const formatSheetTanggal = (value: string) => {
    const trimmed = value?.toString().trim();
    if (!trimmed) {
      return "";
    }
    const labelMatch = monthScheduleDates.find(
      (slot) => slot.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (labelMatch) {
      return labelMatch.label;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatScheduleLabel(parsed);
    }
    return trimmed;
  };

  const resolveSheetTanggal = (rawValue: string, normalizedDate: string) => {
    const trimmed = rawValue?.toString().trim();
    if (trimmed) {
      return formatSheetTanggal(trimmed);
    }
    return normalizedDate ? getSlotLabelByDate(normalizedDate) : "";
  };

  const getEntryValue = (entry: Record<string, unknown>, candidates: string[]) => {
    const normalizedEntries = Object.entries(entry).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        acc[normalizeHeader(key)] = value;
        return acc;
      },
      {}
    );
    const match = candidates.find(
      (candidate) => normalizeHeader(candidate) in normalizedEntries
    );
    if (!match) {
      return "";
    }
    const value = normalizedEntries[normalizeHeader(match)];
    return value === undefined || value === null ? "" : String(value);
  };

  const parseAppsScriptRecords = (payload: unknown) => {
    const normalizeObjectRows = (rows: Record<string, unknown>[]) => {
      return rows.reduce<RecordItem[]>((acc, row, index) => {
        const cabang = getEntryValue(row, ["Cabang"]);
        const kelas = getEntryValue(row, ["Kelas"]);
        const sekolah = getEntryValue(row, ["Sekolah"]);
        const tanggalRaw = getEntryValue(row, ["Tanggal", "Date"]);
        const mapel = getEntryValue(row, ["Mapel", "Mata Pelajaran", "Pelajaran"]);
        const pengajar = getEntryValue(row, ["Pengajar", "Guru", "Pengampu"]);
        const waktuFromWaktu = getEntryValue(row, ["Waktu", "Jam"]);
        const waktuMulai = getEntryValue(row, ["Jam Mulai", "Mulai"]);
        const waktuSelesai = getEntryValue(row, ["Jam Selesai", "Selesai"]);
        const classOrderRaw = getEntryValue(row, ["Urutan Kelas", "Urutan", "Class Order"]);
        const waktu = waktuFromWaktu || [waktuMulai, waktuSelesai].filter(Boolean).join("-");
        const tanggal = normalizeDateValue(tanggalRaw);
        const tanggalSheet = resolveSheetTanggal(tanggalRaw, tanggal);
        const classOrder = parseClassOrder(classOrderRaw);

        if (!cabang && !kelas && !sekolah && !tanggal && !mapel && !pengajar && !waktu) {
          return acc;
        }

        acc.push({
          id: `appscript-${index}-${Date.now()}`,
          cabang,
          kelas,
          sekolah,
          tanggal,
          tanggalSheet,
          mapel,
          pengajar,
          waktu,
          classOrder: classOrder === null ? "" : String(classOrder),
          catatan: "",
        });

        return acc;
      }, []);
    };

    const normalizeMatrixRows = (rows: unknown[][]) => {
      const headerRow = rows[0]?.map((value) => String(value ?? "")) ?? [];
      const normalizedHeaders = headerRow.map(normalizeHeader);
      const hasTanggalColumn = normalizedHeaders.includes("tanggal");
      if (hasTanggalColumn) {
        const mappedRows = rows.slice(1).map((row) => {
          const result: Record<string, unknown> = {};
          headerRow.forEach((header, index) => {
            result[header] = row?.[index];
          });
          return result;
        });
        return normalizeObjectRows(mappedRows);
      }

      const dateColumns = headerRow.slice(2).map((value) => value.trim());
      const entries: RecordItem[] = [];
      let rowIndex = 1;
      while (rowIndex < rows.length) {
        const mapelRow = rows[rowIndex] ?? [];
        const cabang = String(mapelRow[0] ?? "").trim();
        const kelas = String(mapelRow[1] ?? "").trim();
        if (!cabang && !kelas) {
          rowIndex += 1;
          continue;
        }
        const pengajarRow = rows[rowIndex + 1] ?? [];
        const waktuRow = rows[rowIndex + 2] ?? [];

        dateColumns.forEach((label, index) => {
          const columnIndex = index + 2;
          const mapel = String(mapelRow[columnIndex] ?? "").trim();
          const pengajar = String(pengajarRow[columnIndex] ?? "").trim();
          const waktu = String(waktuRow[columnIndex] ?? "").trim();
          if (!label || (!mapel && !pengajar && !waktu)) {
            return;
          }
          const tanggal = normalizeDateValue(label);
          entries.push({
            id: `appscript-matrix-${rowIndex}-${columnIndex}-${Date.now()}`,
            cabang,
            kelas,
            sekolah: "",
            tanggal,
            tanggalSheet: resolveSheetTanggal(label, tanggal),
            mapel,
            pengajar,
            waktu,
            classOrder: "",
            catatan: "",
          });
        });

        rowIndex += 3;
      }
      return entries;
    };

    if (payload && typeof payload === "object") {
      const recordPayload = payload as {
        success?: boolean;
        message?: string;
        data?: Record<string, unknown>[];
        records?: Record<string, unknown>[];
        values?: unknown[][];
      };
      if (recordPayload.success === false) {
        throw new Error(recordPayload.message || "Gagal memuat data dari Apps Script.");
      }
      if (Array.isArray(recordPayload.data)) {
        return normalizeObjectRows(recordPayload.data);
      }
      if (Array.isArray(recordPayload.records)) {
        return normalizeObjectRows(recordPayload.records);
      }
      if (Array.isArray(recordPayload.values)) {
        return normalizeMatrixRows(recordPayload.values);
      }
    }

    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return [];
      }
      if (typeof payload[0] === "object" && !Array.isArray(payload[0])) {
        return normalizeObjectRows(payload as Record<string, unknown>[]);
      }
      if (Array.isArray(payload[0])) {
        return normalizeMatrixRows(payload as unknown[][]);
      }
    }

    return [];
  };

  const visibleCategories = useMemo(
    () => categories.filter((category) => (category.key === "hapusJadwal" ? isAdmin : true)),
    [isAdmin]
  );

  const activeConfig = useMemo(
    () => visibleCategories.find((category) => category.key === activeKey) ?? visibleCategories[0],
    [activeKey, visibleCategories]
  );


  const hasScheduleContent = (entry?: RecordItem) =>
    Boolean(entry && ((entry.mapel || "").trim() || (entry.pengajar || "").trim() || (entry.waktu || "").trim()));

  const buildScheduleGroups = (
    sourceRecords: RecordItem[],
    cabangFilter: string,
    searchText: string
  ) => {
    const entries = cabangFilter
      ? sourceRecords.filter(
          (entry) => normalizeText(entry.cabang || "") === normalizeText(cabangFilter)
        )
      : sourceRecords;
    const grouped = new Map<
      string,
      { cabang: string; kelas: string; sekolah: string; classOrder: number; entriesByDate: Record<string, RecordItem[]> }
    >();
    let fallbackOrder = 1;

    entries.forEach((entry) => {
      const cabang = entry.cabang || "-";
      const kelas = entry.kelas || "-";
      const sekolah = entry.sekolah || "";
      const key = buildClassGroupKey(cabang, kelas, sekolah);
      const parsedOrder = parseClassOrder(entry.classOrder);
      const initialOrder = parsedOrder ?? fallbackOrder;

      if (!grouped.has(key)) {
        grouped.set(key, { cabang, kelas, sekolah, classOrder: initialOrder, entriesByDate: {} });
        fallbackOrder += 1;
      } else if (parsedOrder !== null) {
        const currentOrder = grouped.get(key)?.classOrder ?? parsedOrder;
        grouped.get(key)!.classOrder = Math.min(currentOrder, parsedOrder);
      }

      if (!hasScheduleContent(entry)) {
        return;
      }
      const existingEntries = grouped.get(key)!.entriesByDate[entry.tanggal] ?? [];
      grouped.get(key)!.entriesByDate[entry.tanggal] = [...existingEntries, entry];
    });

    grouped.forEach((group) => {
      Object.keys(group.entriesByDate).forEach((dateKey) => {
        group.entriesByDate[dateKey] = [...group.entriesByDate[dateKey]].sort((a, b) => {
          const aStart = parseRangeFromString(a.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
          const bStart = parseRangeFromString(b.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
          return aStart - bStart;
        });
      });
    });

    const groups = Array.from(grouped.values()).sort((a, b) => {
      if (a.classOrder !== b.classOrder) {
        return a.classOrder - b.classOrder;
      }
      return a.kelas.localeCompare(b.kelas, "id");
    });

    if (!searchText.trim()) {
      return groups;
    }

    const lowered = searchText.toLowerCase();
    return groups.filter((group) => {
      if (
        group.cabang.toLowerCase().includes(lowered) ||
        group.kelas.toLowerCase().includes(lowered) ||
        group.sekolah.toLowerCase().includes(lowered)
      ) {
        return true;
      }
      return Object.values(group.entriesByDate).some((entryList) =>
        entryList.some((entry) =>
          ["mapel", "pengajar", "waktu", "tanggal"].some((key) =>
            entry[key]?.toLowerCase().includes(lowered)
          )
        )
      );
    });
  };

  const monthScheduleGroupsAll = useMemo(
    () => buildScheduleGroups(records[activeScheduleKey] ?? [], selectedScheduleCabang, ""),
    [activeScheduleKey, records, selectedScheduleCabang]
  );

  const monthScheduleGroups = useMemo(() => {
    return buildScheduleGroups(records[activeScheduleKey] ?? [], selectedScheduleCabang, query);
  }, [activeScheduleKey, query, records, selectedScheduleCabang]);

  const tambahanPrintGroups = useMemo(() => {
    return buildScheduleGroups(records.jadwalTambahanPelayanan ?? [], restrictedCabang, "");
  }, [records.jadwalTambahanPelayanan, restrictedCabang]);

  const allScheduleEntries = useMemo(
    () => [
      ...(records.bulanIni ?? []),
      ...(records.jadwalTambahanPelayanan ?? []),
    ],
    [records]
  );

  const conflictingScheduleEntryIds = useMemo(() => {
    const groupedByPengajarTanggal = new Map<string, RecordItem[]>();

    allScheduleEntries.forEach((entry) => {
      if (!hasScheduleContent(entry)) {
        return;
      }
      const pengajarKey = normalizeText(entry.pengajar || "");
      const tanggalKey = (entry.tanggal || "").trim();
      if (!pengajarKey || !tanggalKey) {
        return;
      }
      const groupKey = `${pengajarKey}||${tanggalKey}`;
      const existing = groupedByPengajarTanggal.get(groupKey) ?? [];
      groupedByPengajarTanggal.set(groupKey, [...existing, entry]);
    });

    const conflictIds = new Set<string>();

    groupedByPengajarTanggal.forEach((entries) => {
      for (let i = 0; i < entries.length; i += 1) {
        const current = entries[i];
        const currentRange = parseRangeFromString(current.waktu || "");
        if (!currentRange) {
          continue;
        }
        for (let j = i + 1; j < entries.length; j += 1) {
          const target = entries[j];
          const currentCabang = normalizeText(current.cabang || "");
          const targetCabang = normalizeText(target.cabang || "");
          if (!currentCabang || !targetCabang || currentCabang === targetCabang) {
            continue;
          }

          const targetRange = parseRangeFromString(target.waktu || "");
          if (!targetRange) {
            continue;
          }

          const isOverlap = currentRange.start < targetRange.end && targetRange.start < currentRange.end;
          if (isOverlap) {
            conflictIds.add(current.id);
            conflictIds.add(target.id);
          }
        }
      }
    });

    return conflictIds;
  }, [allScheduleEntries]);

  const getApprovedPermintaanForCabang = (
    kodePengajar: string,
    cabang: string,
    tanggal?: string
  ) => {
    const kodeKey = normalizeText(kodePengajar);
    const cabangKey = normalizeText(cabang);
    if (!kodeKey || !cabangKey) {
      return [] as Record<string, string>[];
    }
    const targetDate = tanggal ? parseFlexibleDate(tanggal) : null;
    return approvedPermintaanRecords.filter((record) => {
      const kode = normalizeText(record["Kode Pengajar"] || "");
      const cabangPeminta = normalizeText(record["Cabang Peminta"] || "");
      if (!(kode === kodeKey && cabangPeminta === cabangKey)) {
        return false;
      }

      if (!targetDate) {
        return true;
      }

      const tanggalKhusus = parsePermintaanTanggalKhusus(record["Tanggal Khusus"] || "");
      if (tanggalKhusus.length > 0) {
        const targetLabel = formatScheduleLabel(targetDate);
        return tanggalKhusus.includes(targetLabel);
      }

      const startRaw = (record["Tanggal Mulai"] || "").trim();
      const endRaw = (record["Tanggal Selesai"] || "").trim();
      if (!startRaw && !endRaw) {
        return true;
      }

      const startDate = parseFlexibleDate(startRaw || endRaw);
      const endDate = parseFlexibleDate(endRaw || startRaw);
      if (!startDate || !endDate) {
        return true;
      }

      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  const hasPengajarAccessInCabang = (kodePengajar: string, cabang: string, tanggal?: string) => {
    const kodeKey = normalizeText(kodePengajar);
    const cabangKey = normalizeText(cabang);
    if (!kodeKey || !cabangKey) {
      return false;
    }

    const hasPenempatan = penempatanRecords.some((record) => {
      const kode = normalizeText(record["Kode Pengajar"] || "");
      if (kode !== kodeKey) {
        return false;
      }
      return parseCabangPenempatan(record["Cabang Penempatan"] || "").some(
        (item) => normalizeText(item) === cabangKey
      );
    });

    if (hasPenempatan) {
      return true;
    }

    return getApprovedPermintaanForCabang(kodePengajar, cabang, tanggal).length > 0;
  };

  const getPengajarIzinOnDate = (kodePengajar: string, tanggal: string) => {
    const kodeKey = normalizeText(kodePengajar);
    const targetDate = parseFlexibleDate(tanggal);
    if (!kodeKey || !targetDate) {
      return null;
    }

    return izinRecords.find((record) => {
      if (normalizeText(record["Kode Pengajar"] || "") !== kodeKey) {
        return false;
      }
      const startDate = parseFlexibleDate(record["Tanggal Mulai"] || "");
      const endDate = parseFlexibleDate(record["Tanggal Selesai"] || "");
      if (!startDate || !endDate) {
        return false;
      }
      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  const pengajarAvailabilityInfo = useMemo(() => {
    const defaultResult = {
      warning: "",
      availableDateLabels: [] as string[],
    };

    if (!editingSlot || !draft.pengajar.trim()) {
      return defaultResult;
    }

    const pengajarKey = draft.pengajar.trim().toLowerCase();
    const occupiedDates = new Set(
      allScheduleEntries
        .filter((entry) => (entry.pengajar || "").trim().toLowerCase() === pengajarKey)
        .map((entry) => entry.tanggal)
        .filter(Boolean)
    );
    const izinDateLabels = new Set(
      izinRecords
        .filter((record) => normalizeText(record["Kode Pengajar"] || "") === normalizeText(draft.pengajar))
        .flatMap((record) => {
          const start = parseFlexibleDate(record["Tanggal Mulai"] || "");
          const end = parseFlexibleDate(record["Tanggal Selesai"] || "");
          if (!start || !end) {
            return [];
          }
          const dates: string[] = [];
          const cursor = new Date(start.getTime());
          while (cursor <= end) {
            dates.push(formatLocalDate(cursor));
            cursor.setDate(cursor.getDate() + 1);
          }
          return dates;
        })
    );
    const availableDateLabels = activeScheduleDates
      .filter((slot) => !occupiedDates.has(slot.date) && !izinDateLabels.has(slot.date))
      .map((slot) => slot.label);

    const izinMatch = getPengajarIzinOnDate(draft.pengajar, editingSlot.tanggal);
    if (izinMatch) {
      const startLabel = izinMatch["Tanggal Mulai"] || "";
      const endLabel = izinMatch["Tanggal Selesai"] || "";
      const reason = (izinMatch.Keterangan || "").trim();
      return {
        warning: `Pengajar sedang izin pada rentang ${startLabel} s.d. ${endLabel}${reason ? ` (${reason})` : ""}.`,
        availableDateLabels,
      };
    }

    const penempatanByPengajar = penempatanRecords.filter(
      (record) => (record["Kode Pengajar"] || "").trim().toLowerCase() === pengajarKey
    );
    const approvedByPengajar = getApprovedPermintaanForCabang(
      draft.pengajar,
      editingSlot.cabang,
      editingSlot.tanggal
    );

    if (penempatanByPengajar.length === 0 && approvedByPengajar.length === 0) {
      return {
        warning:
          "Pengajar belum memiliki data penempatan. Pengajar tidak tersedia di cabang ini, silakan hubungi cabang domisili.",
        availableDateLabels,
      };
    }

    const cabangMatchedRecords = penempatanByPengajar.filter((record) =>
      parseCabangPenempatan(record["Cabang Penempatan"] || "").some(
        (cabang) => normalizeText(cabang) === normalizeText(editingSlot.cabang)
      )
    );
    const approvedAvailabilityRecords: Record<string, string>[] = approvedByPengajar.map((record) => ({
      ...record,
      "Cabang Penempatan": record["Cabang Peminta"] || "",
    }));
    const availabilityRecords: Record<string, string>[] = [
      ...cabangMatchedRecords,
      ...approvedAvailabilityRecords,
    ];

    if (availabilityRecords.length === 0) {
      return {
        warning:
          "Pengajar tidak tersedia di cabang ini, silakan hubungi cabang domisili.",
        availableDateLabels,
      };
    }

    const parsedDate = parseFlexibleDate(editingSlot.tanggal);
    if (!parsedDate) {
      return { warning: "", availableDateLabels };
    }

    const dayName = titleCase(
      parsedDate.toLocaleDateString("id-ID", { weekday: "long" })
    );
    const dayMatchedRecords = availabilityRecords.filter((record) =>
      parseHariPenempatan(record["Hari"] || "").includes(dayName)
    );

    if (dayMatchedRecords.length === 0) {
      return {
        warning: `Pengajar tidak tersedia pada hari ${dayName} di cabang ini, silakan hubungi cabang domisili.`,
        availableDateLabels,
      };
    }

    const startTime = parseTimeValue(draft.waktuMulai);
    const endTime = parseTimeValue(draft.waktuSelesai);
    if (startTime !== null && endTime !== null && startTime < endTime) {
      const hasMatchingTime = dayMatchedRecords.some((record) => {
        const placementStart = parseTimeValue(record["Jam Mulai"] || "");
        const placementEnd = parseTimeValue(record["Jam Selesai"] || "");
        if (placementStart === null || placementEnd === null) {
          return true;
        }
        return startTime >= placementStart && endTime <= placementEnd;
      });

      if (!hasMatchingTime) {
        return {
          warning:
            "Pengajar tidak tersedia pada rentang jam tersebut di cabang ini, silakan hubungi cabang domisili.",
          availableDateLabels,
        };
      }
    }

    return { warning: "", availableDateLabels };
  }, [
    activeScheduleDates,
    allScheduleEntries,
    draft.pengajar,
    draft.waktuMulai,
    draft.waktuSelesai,
    editingSlot,
    izinRecords,
    approvedPermintaanRecords,
    penempatanRecords,
  ]);

  const monitoringRows = useMemo(() => {
    const allowedDates = new Set(monthScheduleDates.map((slot) => slot.date));
    return monthScheduleGroups.map((group) => {
      const mapelCounter = new Map<string, number>();
      let totalSesi = 0;

      Object.entries(group.entriesByDate).forEach(([dateKey, entries]) => {
        if (!allowedDates.has(dateKey)) {
          return;
        }
        entries.forEach((entry) => {
          const mapel = (entry.mapel || "").trim();
          if (!mapel) {
            return;
          }
          totalSesi += 1;
          mapelCounter.set(mapel, (mapelCounter.get(mapel) || 0) + 1);
        });
      });

      const mapelList = Array.from(mapelCounter.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([mapel, count]) => `${mapel} (${count}x)`);

      return {
        cabang: group.cabang,
        kelas: group.kelas,
        mapelList,
        jumlahMapel: mapelCounter.size,
        totalSesi,
      };
    });
  }, [monthScheduleDates, monthScheduleGroups]);

  const filteredMapelRecords = useMemo(() => {
    if (!query.trim()) {
      return mapelRecords;
    }
    const lowered = query.toLowerCase();
    return mapelRecords.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [mapelRecords, query]);

  const filteredPengajarRecords = useMemo(() => {
    const source = restrictedCabang
      ? pengajarRecords.filter(
          (record) => normalizeText(record["Domisili"] || "") === normalizeText(restrictedCabang)
        )
      : pengajarRecords;

    if (!query.trim()) {
      return source;
    }

    const lowered = query.toLowerCase();
    return source.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [pengajarRecords, query, restrictedCabang]);

  const filteredPenempatanRecords = useMemo(() => {
    const source = restrictedCabang
      ? penempatanRecords.filter(
          (record) => normalizeText(record.Domisili || "") === normalizeText(restrictedCabang)
        )
      : penempatanRecords;
    if (!query.trim()) {
      return source;
    }
    const lowered = query.toLowerCase();
    return source.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [penempatanRecords, query, restrictedCabang]);

  const filteredIzinRecords = useMemo(() => {
    const source = restrictedCabang
      ? izinRecords.filter(
          (record) => normalizeText(record.Domisili || "") === normalizeText(restrictedCabang)
        )
      : izinRecords;
    if (!query.trim()) {
      return source;
    }
    const lowered = query.toLowerCase();
    return source.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [izinRecords, query, restrictedCabang]);

  const filteredPermintaanRecords = useMemo(() => {
    const source = permintaanRecords.filter((record) => {
      if (!restrictedCabang) {
        return true;
      }
      const cabangPeminta = normalizeText(record["Cabang Peminta"] || "");
      const cabangDomisili = normalizeText(record["Cabang Domisili"] || "");
      const cabangKey = normalizeText(restrictedCabang);
      return cabangPeminta === cabangKey || cabangDomisili === cabangKey;
    });
    if (!query.trim()) {
      return source;
    }
    const lowered = query.toLowerCase();
    return source.filter((record) =>
      Object.values(record).some((value) => String(value).toLowerCase().includes(lowered))
    );
  }, [permintaanRecords, query, restrictedCabang]);

  const dashboardPendingRequests = useMemo(() => {
    return filteredPermintaanRecords
      .filter((record) => normalizeText(record.Status || "") === "menunggu")
      .map((record) => ({
        id: record.ID || `${record["Kode Pengajar"] || ""}-${record["Cabang Peminta"] || ""}`,
        kodePengajar: record["Kode Pengajar"] || "",
        namaPengajar: record["Nama Pengajar"] || "",
        cabangPeminta: record["Cabang Peminta"] || "",
        cabangDomisili: record["Cabang Domisili"] || "",
        status: record.Status || "Menunggu",
      }));
  }, [filteredPermintaanRecords]);

  const dashboardTodaySchedules = useMemo(() => {
    const todayKey = formatLocalDate(new Date());
    const scheduleItems: Array<RecordItem & { sourceLabel: string }> = [
      ...(records.bulanIni ?? []).map((item) => ({ ...item, sourceLabel: "Jadwal Reguler" })),
      ...(records.jadwalTambahanPelayanan ?? []).map((item) => ({ ...item, sourceLabel: "Jadwal Tambahan & Pelayanan" })),
    ];

    return scheduleItems
      .filter((item) => {
        const parsedDate = parseFlexibleDate(item["tanggalSheet"] || item["tanggal"] || "");
        if (!parsedDate) {
          return false;
        }
        if (formatLocalDate(parsedDate) !== todayKey) {
          return false;
        }
        if (!(item["mapel"] || "").trim() && !(item["pengajar"] || "").trim() && !(item["waktu"] || "").trim()) {
          return false;
        }
        if (restrictedCabang && normalizeText(item["cabang"] || "") !== normalizeText(restrictedCabang)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aStart = parseRangeFromString(a["waktu"] || "")?.start ?? Number.MAX_SAFE_INTEGER;
        const bStart = parseRangeFromString(b["waktu"] || "")?.start ?? Number.MAX_SAFE_INTEGER;
        return aStart - bStart;
      })
      .map((item, index) => ({
        id: item.id || `${item.sourceLabel}-${index}`,
        waktu: item["waktu"] || "",
        mapel: item["mapel"] || "",
        pengajar: item["pengajar"] || "",
        kelas: [item["kelas"] || "", item["sekolah"] || ""].filter(Boolean).join("\n"),
        cabang: item["cabang"] || "",
        sourceLabel: item.sourceLabel,
      }));
  }, [records.bulanIni, records.jadwalTambahanPelayanan, restrictedCabang]);

  const suratTugasRecordsByMonth = useMemo(() => {
    if (!selectedSuratTugasMonthKey) {
      return [];
    }
    const allowedDateKeys = suratTugasCalendar.dateKeys;
    return suratTugasRecords.filter(
      (record) => {
        const parsed = parseFlexibleDate(record["Tanggal"] || "");
        if (!parsed) {
          return false;
        }
        return allowedDateKeys.has(formatLocalDate(parsed));
      }
    );
  }, [selectedSuratTugasMonthKey, suratTugasCalendar.dateKeys, suratTugasRecords]);

  const suratTugasPengajarOptions = useMemo(() => {
    if (!selectedSuratTugasMonthKey) {
      return [];
    }

    const optionMap = new Map<string, { value: string; label: string }>();
    const optionKeyMap = new Map<string, string>();

    pengajarRecords.forEach((record) => {
      const kode = (record["Kode Pengajar"] || "").trim();
      const nama = (record["Nama"] || "").trim();
      if (!kode) {
        return;
      }
      const key = kode.toLowerCase();
      optionKeyMap.set(key, kode);
      optionMap.set(kode, {
        value: kode,
        label: nama ? `${nama} (${kode})` : kode,
      });
    });

    suratTugasRecordsByMonth.forEach((record) => {
      const kode = (record["Kode Pengajar"] || "").trim();
      const key = kode.toLowerCase();
      if (!kode || optionKeyMap.has(key)) {
        return;
      }
      optionKeyMap.set(key, kode);
      optionMap.set(kode, { value: kode, label: kode });
    });

    return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [pengajarRecords, selectedSuratTugasMonthKey, suratTugasRecordsByMonth]);

  const filteredSuratTugasRecords = useMemo(() => {
    return suratTugasRecordsByMonth.filter((record) => {
      const selectedKode = selectedSuratTugasKode.trim().toLowerCase();
      const currentKode = (record["Kode Pengajar"] || "").trim().toLowerCase();
      const matchPengajar =
        !selectedKode || currentKode === selectedKode;
      if (!matchPengajar) {
        return false;
      }
      return true;
    });
  }, [selectedSuratTugasKode, suratTugasRecordsByMonth]);

  const suratTugasRecordsByDate = useMemo(() => {
    const grouped = new Map<string, Record<string, string>[]>();
    filteredSuratTugasRecords.forEach((record) => {
      const parsed = parseFlexibleDate(record["Tanggal"] || "");
      if (!parsed) {
        return;
      }
      const dateKey = formatLocalDate(parsed);
      const list = grouped.get(dateKey) ?? [];
      list.push(record);
      grouped.set(dateKey, list);
    });
    return grouped;
  }, [filteredSuratTugasRecords]);

  const selectedSuratTugasPengajar = useMemo(() => {
    if (!selectedSuratTugasKode) {
      return null;
    }
    const selectedKode = selectedSuratTugasKode.trim().toLowerCase();
    return (
      pengajarRecords.find(
        (record) => (record["Kode Pengajar"] || "").trim().toLowerCase() === selectedKode
      ) ||
      null
    );
  }, [pengajarRecords, selectedSuratTugasKode]);

  const selectedSuratTugasSessionCount = useMemo(() => {
    if (!selectedSuratTugasKode) {
      return 0;
    }
    return filteredSuratTugasRecords.reduce((total, record) => {
      let rowCount = 0;
      for (let index = 1; index <= 10; index += 1) {
        if ((record[`Sesi ${index}`] || "").trim()) {
          rowCount += 1;
        }
      }
      return total + rowCount;
    }, 0);
  }, [filteredSuratTugasRecords, selectedSuratTugasKode]);

  const clearEditing = () => {
    setEditingSlot(null);
    setDraft({ mapel: "", pengajar: "", waktuMulai: "", waktuSelesai: "" });
    setCopyTargetDates([]);
    setConflictError("");
  };

  const handleLoadFromSheet = async (
    scheduleKey: ScheduleMenuKey = "bulanIni",
    options?: { preserveUiState?: boolean }
  ) => {
    setSheetStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const targetSheet = scheduleSheetByKey[scheduleKey];
      const bucket = dataBucket[targetSheet];
      const rows = await listRows(bucket);
      const parsedRecords = rows.map((row, index) => {
        const item = parseAppsScriptRecords([toRecord(row)])[0];
        return {
          ...(item || {
            id: `${bucket}-${index}-${Date.now()}`,
            cabang: "",
            kelas: "",
            sekolah: "",
            tanggal: "",
            tanggalSheet: "",
            mapel: "",
            pengajar: "",
            waktu: "",
            classOrder: "",
            catatan: "",
          }),
          id: row.id,
        } as RecordItem;
      });
      setRecords((prev) => ({
        ...prev,
        [scheduleKey]: parsedRecords,
      }));
      if (!options?.preserveUiState) {
        clearEditing();
        setQuery("");
      }
      setSheetStatus({
        loading: false,
        saving: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setSheetStatus((prev) => ({
        ...prev,
        loading: false,
        saving: false,
        error: "Gagal memuat data dari database Supabase.",
      }));
      pushToast("Gagal memuat data jadwal dari database.", "error");
    }
  };

  const handleLoadMapel = async () => {
    setMapelStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Mata Pelajaran"]);
      const parsed = rows.map((row) => toRecord(row));
      const normalized = parsed.map((row) => mapMapelRecord(row));
      setMapelHeaders(mapelHeadersExpected);
      setMapelRecords(normalized);
      setMapelStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setMapelStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data mata pelajaran dari database.",
      }));
      pushToast("Gagal memuat data mata pelajaran.", "error");
    }
  };

  const handleOpenMapelModal = (record?: Record<string, string>) => {
    if (record) {
      setMapelDraft({ Mapel: record.Mapel || "", Kode_Mapel: record.Kode_Mapel || "" });
      setEditingMapelOldName(record.Mapel || "");
    } else {
      setMapelDraft({ Mapel: "", Kode_Mapel: "" });
      setEditingMapelOldName(null);
    }
    setMapelError("");
    setIsMapelModalOpen(true);
  };

  const handleSaveMapel = async () => {
    const mapel = mapelDraft.Mapel.trim();
    const kode = mapelDraft.Kode_Mapel.trim();
    if (!mapel || !kode) {
      setMapelError("Mata Pelajaran dan Singkatan wajib diisi.");
      return;
    }

    setMapelStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const bucket = dataBucket["Mata Pelajaran"];
      const rows = await listRows(bucket);
      const existing = rows.find((row) => {
        const value = row.data.Mapel || "";
        return normalizeValueKey(value) === normalizeValueKey(editingMapelOldName || mapel);
      });

      if (existing) {
        await updateRow(existing.id, { Mapel: mapel, Kode_Mapel: kode });
      } else {
        await insertRow(bucket, { Mapel: mapel, Kode_Mapel: kode });
      }

      setIsMapelModalOpen(false);
      handleLoadMapel();
      pushToast("Data mata pelajaran berhasil disimpan.", "success");
    } catch (error) {
      setMapelStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan mata pelajaran."
      }));
      pushToast("Gagal menyimpan mata pelajaran.", "error");
    }
  };

  const handleDeleteMapel = (record: Record<string, string>) => {
    openConfirmDialog(
      `Hapus mata pelajaran ${record.Mapel}?`,
      async () => {
        setMapelStatus((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const rows = await listRows(dataBucket["Mata Pelajaran"]);
          const targetIds = rows
            .filter((row) => normalizeValueKey(row.data.Mapel) === normalizeValueKey(record.Mapel))
            .map((row) => row.id);
          await deleteRowsByIds(targetIds);

          handleLoadMapel();
          pushToast("Data mata pelajaran berhasil dihapus.", "success");
        } catch (error) {
          setMapelStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus mata pelajaran."
          }));
          pushToast("Gagal menghapus mata pelajaran.", "error");
        }
      },
      { title: "Hapus Mata Pelajaran", confirmLabel: "Hapus" }
    );
  };

  const handleLoadPengajar = async () => {
    setPengajarStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Data Pengajar"]);
      const parsed = { records: rows.map((row) => toRecord(row)) };
      
      const expectedHeaders = ["Kode Pengajar", "Nama", "Bidang Studi", "Email", "No.WhatsApp", "Domisili", "Username", "Password"];
      
      const records = parsed.records.filter((rec) => rec["Kode Pengajar"] || rec["Nama"]).map((record) => {
        const normalized: Record<string, string> = {};
        expectedHeaders.forEach((h) => {
          const matchedKey = Object.keys(record).find(k => normalizeHeader(k) === normalizeHeader(h));
          normalized[h] = matchedKey ? record[matchedKey] : "";
        });
        return normalized;
      });

      setPengajarHeaders(expectedHeaders);
      setPengajarRecords(records);
      setPengajarStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      });
    } catch (error) {
      setPengajarStatus((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Gagal memuat data pengajar.",
      }));
      pushToast("Gagal memuat data pengajar.", "error");
    }
  };

  const handleOpenPengajarModal = (record?: Record<string, string>) => {
    if (record) {
      const existingNama = record["Nama"] || "";
      const existingKode = (record["Kode Pengajar"] || "").trim();
      const existingWhatsapp = record["No.WhatsApp"] || "";
      const computedUsername = sanitizeWhatsappDigits(existingWhatsapp);
      setPengajarDraft({
        "Kode Pengajar": existingKode || generateUniqueKodePengajar(existingNama),
        "Nama": existingNama,
        "Bidang Studi": record["Bidang Studi"] || "",
        "Email": record["Email"] || "",
        "No.WhatsApp": existingWhatsapp,
        "Domisili": restrictedCabang || record["Domisili"] || "",
        "Username": computedUsername || record["Username"] || "",
        "Password": sanitizePasswordInput(record["Password"] || ""),
      });
      setEditingPengajarOldKode(record["Kode Pengajar"]);
    } else {
      const defaultCabang = restrictedCabang || authSession?.cabang || "";
      setPengajarDraft({
        "Kode Pengajar": "",
        "Nama": "",
        "Bidang Studi": "",
        "Email": "",
        "No.WhatsApp": "",
        "Domisili": defaultCabang,
        "Username": "",
        "Password": generatePassword(),
      });
      setEditingPengajarOldKode(null);
    }
    setPengajarError("");
    setIsPengajarModalOpen(true);
  };

  const handlePengajarDraftChange = (field: keyof PengajarDraft, value: string) => {
    if (field === "Kode Pengajar" || field === "Username") {
      return;
    }

    if (field === "Domisili" && restrictedCabang) {
      return;
    }

    if (field === "Nama") {
      const nama = value;
      const autoKode = generateUniqueKodePengajar(nama, editingPengajarOldKode);
      setPengajarDraft((prev) => ({
        ...prev,
        Nama: nama,
        "Kode Pengajar": autoKode,
      }));
      return;
    }

    if (field === "No.WhatsApp") {
      const sanitizedUsername = sanitizeWhatsappDigits(value);
      setPengajarDraft((prev) => ({
        ...prev,
        "No.WhatsApp": value,
        Username: sanitizedUsername,
      }));
      return;
    }

    if (field === "Password") {
      setPengajarDraft((prev) => ({ ...prev, Password: sanitizePasswordInput(value) }));
      return;
    }

    setPengajarDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleBidangStudiChange = (values: string[]) => {
    const uniqueValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
    setPengajarDraft((prev) => ({
      ...prev,
      "Bidang Studi": uniqueValues.join(", "),
    }));
  };

  const handleGeneratePengajarPassword = () => {
    setPengajarDraft((prev) => ({ ...prev, Password: generatePassword() }));
  };

  const handleLoadSuratTugas = async () => {
    setSuratTugasStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Surat Tugas Pengajar"]);
      const parsed = { records: rows.map((row) => toRecord(row)) };
      
      const expectedHeaders = ["Kode Pengajar", "Tanggal", "Sesi 1", "Sesi 2", "Sesi 3", "Sesi 4", "Sesi 5", "Sesi 6", "Sesi 7", "Sesi 8", "Sesi 9", "Sesi 10"];

      const records = parsed.records.filter((rec) => rec["Kode Pengajar"] || rec["Tanggal"]).map((record) => {
        const normalized: Record<string, string> = {};
        expectedHeaders.forEach((h) => {
          const matchedKey = Object.keys(record).find(k => normalizeHeader(k) === normalizeHeader(h));
          normalized[h] = matchedKey ? record[matchedKey] : "";
        });
        return normalized;
      });

      setSuratTugasRecords(records);
      setSuratTugasStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setSuratTugasStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data Surat Tugas.",
      }));
      pushToast("Gagal memuat data surat tugas.", "error");
    }
  };

  const handleSavePengajar = async () => {
    if (!pengajarDraft["Kode Pengajar"] || !pengajarDraft["Nama"]) {
      setPengajarError("Nama wajib diisi agar Kode Pengajar terisi otomatis.");
      return;
    }
    if (!pengajarDraft.Domisili) {
      setPengajarError("Domisili belum terdeteksi dari akun login. Silakan login ulang dengan akun cabang.");
      return;
    }
    if (!pengajarDraft.Username) {
      setPengajarError("No.WhatsApp wajib diisi agar Username terisi otomatis.");
      return;
    }
    if (!pengajarDraft["Bidang Studi"].trim()) {
      setPengajarError("Bidang Studi wajib dipilih minimal satu mata pelajaran.");
      return;
    }
    if (!pengajarDraft.Password || pengajarDraft.Password.length > 6) {
      setPengajarError("Password wajib diisi dengan kombinasi huruf/angka maksimal 6 karakter.");
      return;
    }
    const normalizedRecord: PengajarDraft = {
      ...pengajarDraft,
      "Kode Pengajar": pengajarDraft["Kode Pengajar"].trim().toLowerCase(),
      Nama: pengajarDraft.Nama.trim(),
      "Bidang Studi": pengajarDraft["Bidang Studi"].trim(),
      Email: pengajarDraft.Email.trim(),
      "No.WhatsApp": pengajarDraft["No.WhatsApp"].trim(),
      Domisili: (restrictedCabang || authSession?.cabang || pengajarDraft.Domisili).trim(),
      Username: sanitizeWhatsappDigits(pengajarDraft["No.WhatsApp"] || pengajarDraft.Username),
      Password: sanitizePasswordInput(pengajarDraft.Password),
    };

    if (!normalizedRecord.Username) {
      setPengajarError("No.WhatsApp tidak valid. Username otomatis tidak boleh kosong.");
      return;
    }

    setPengajarStatus((prev) => ({ ...prev, loading: true }));
    try {
      const bucket = dataBucket["Data Pengajar"];
      const rows = await listRows(bucket);
      const existing = rows.find(
        (row) =>
          normalizeValueKey(row.data["Kode Pengajar"]) ===
          normalizeValueKey(editingPengajarOldKode || normalizedRecord["Kode Pengajar"])
      );
      if (existing) {
        await updateRow(existing.id, normalizedRecord);
      } else {
        await insertRow(bucket, normalizedRecord);
      }

      setIsPengajarModalOpen(false);
      handleLoadPengajar();
      pushToast("Data pengajar berhasil disimpan.", "success");
    } catch (error) {
      setPengajarStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan pengajar.",
      }));
      pushToast("Gagal menyimpan data pengajar.", "error");
    }
  };

  const handleDeletePengajar = (record: Record<string, string>) => {
    openConfirmDialog(
      `Hapus pengajar ${record["Nama"]}?`,
      async () => {
        setPengajarStatus((prev) => ({ ...prev, loading: true }));
        try {
          const rows = await listRows(dataBucket["Data Pengajar"]);
          const targetIds = rows
            .filter(
              (row) =>
                normalizeValueKey(row.data["Kode Pengajar"]) ===
                normalizeValueKey(record["Kode Pengajar"])
            )
            .map((row) => row.id);
          await deleteRowsByIds(targetIds);

          handleLoadPengajar();
          pushToast("Data pengajar berhasil dihapus.", "success");
        } catch (error) {
          setPengajarStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus pengajar.",
          }));
          pushToast("Gagal menghapus data pengajar.", "error");
        }
      },
      { title: "Hapus Pengajar", confirmLabel: "Hapus" }
    );
  };

  const normalizePenempatanRecord = (record: Record<string, string>) => {
    const domisili = restrictedCabang || record["Domisili"] || "";
    const jamMulai = formatTimeHHMM(record["Jam Mulai"] || "");
    const jamSelesai = formatTimeHHMM(record["Jam Selesai"] || "");
    return {
      "Kode Pengajar": record["Kode Pengajar"] || "",
      "Nama Pengajar": record["Nama Pengajar"] || record["Nama"] || "",
      Domisili: domisili,
      Hari: record["Hari"] || "",
      "Jam Mulai": jamMulai,
      "Jam Selesai": jamSelesai,
      "Cabang Penempatan": record["Cabang Penempatan"] || "",
    };
  };

  const handleLoadPenempatanPengajar = async () => {
    setPenempatanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Penempatan Pengajar"]);
      const normalized = rows
        .map((row) => toRecord(row))
        .map((record) => normalizePenempatanRecord(record))
        .filter((record) =>
          restrictedCabang
            ? normalizeText(record.Domisili || "") === normalizeText(restrictedCabang)
            : true
        );
      setPenempatanRecords(normalized);
      setPenempatanStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setPenempatanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data penempatan pengajar dari database.",
      }));
      pushToast("Gagal memuat data penempatan pengajar.", "error");
    }
  };

  const handlePenempatanDraftChange = (next: PenempatanDraft) => {
    const selectedKode = normalizeText(next.kodePengajar || "");
    const prevKode = normalizeText(penempatanDraft.kodePengajar || "");
    const selectedPengajar = selectedKode ? pengajarByKode[selectedKode] : null;

    const resolvedDraft: PenempatanDraft = {
      ...next,
      namaPengajar: selectedPengajar
        ? selectedPengajar["Nama"] || next.namaPengajar
        : next.namaPengajar,
      domisili: restrictedCabang
        ? restrictedCabang
        : selectedPengajar
          ? selectedPengajar["Domisili"] || next.domisili
          : next.domisili,
    };

    if (!selectedKode) {
      resolvedDraft.namaPengajar = "";
      resolvedDraft.domisili = restrictedCabang || "";
    }

    if (selectedKode !== prevKode) {
      setPenempatanError("");
    }

    setPenempatanDraft(resolvedDraft);
  };

  const handleOpenPenempatanModal = (record?: Record<string, string>) => {
    if (!isAdmin) {
      pushToast("Hanya Admin yang dapat menambah atau mengubah data penempatan pengajar.", "error");
      return;
    }

    if (record) {
      const kodePengajar = record["Kode Pengajar"] || "";
      const relatedRecords = penempatanRecords.filter(
        (item) => normalizeValueKey(item["Kode Pengajar"] || "") === normalizeValueKey(kodePengajar)
      );
      const sourceRecords = relatedRecords.length > 0 ? relatedRecords : [record];

      const availabilityByDay = new Map<string, { jamMulai: string; jamSelesai: string }>();
      const cabangSet = new Set<string>();
      sourceRecords.forEach((item) => {
        parseCabangPenempatan(item["Cabang Penempatan"] || "").forEach((cabang) => cabangSet.add(cabang));
        const jamMulai = formatTimeHHMM(item["Jam Mulai"] || "");
        const jamSelesai = formatTimeHHMM(item["Jam Selesai"] || "");
        parseHariPenempatan(item["Hari"] || "").forEach((hari) => {
          if (!availabilityByDay.has(hari)) {
            availabilityByDay.set(hari, { jamMulai, jamSelesai });
          }
        });
      });

      const availabilityList = weekDays.map((hari) => {
        const value = availabilityByDay.get(hari);
        return {
          hari,
          enabled: Boolean(value),
          jamMulai: value?.jamMulai || "",
          jamSelesai: value?.jamSelesai || "",
        };
      });

      setPenempatanDraft({
        kodePengajar,
        namaPengajar:
          record["Nama Pengajar"] || sourceRecords.find((item) => item["Nama Pengajar"] || "")?.["Nama Pengajar"] || "",
        domisili: restrictedCabang || record["Domisili"] || sourceRecords[0]?.["Domisili"] || "",
        availabilityList,
        cabangList: Array.from(cabangSet),
      });
      setPenempatanOldRecord(record);
    } else {
      setPenempatanDraft({
        kodePengajar: "",
        namaPengajar: "",
        domisili: restrictedCabang || "",
        availabilityList: createAvailabilityList(),
        cabangList: restrictedCabang ? [restrictedCabang] : [],
      });
      setPenempatanOldRecord(null);
    }
    setPenempatanError("");
    setIsPenempatanModalOpen(true);
  };

  const handleSavePenempatanPengajar = async () => {
    if (!isAdmin) {
      setPenempatanError("Hanya Admin yang dapat menyimpan data penempatan pengajar.");
      return;
    }

    const uniqueCabang = Array.from(new Set(penempatanDraft.cabangList));
    const selectedAvailabilities = penempatanDraft.availabilityList
      .filter((item) => item.enabled)
      .map((item) => ({
        ...item,
        hari: titleCase(item.hari),
        jamMulai: item.jamMulai.trim(),
        jamSelesai: item.jamSelesai.trim(),
      }));

    const draftValue = {
      ...penempatanDraft,
      kodePengajar: penempatanDraft.kodePengajar.trim(),
      namaPengajar: penempatanDraft.namaPengajar.trim(),
      domisili: (restrictedCabang || penempatanDraft.domisili).trim(),
      availabilityList: selectedAvailabilities,
      cabangList: uniqueCabang,
    };

    if (!draftValue.kodePengajar || !draftValue.namaPengajar) {
      setPenempatanError("Pengajar wajib dipilih.");
      return;
    }
    if (!draftValue.domisili) {
      setPenempatanError("Domisili wajib diisi.");
      return;
    }
    if (draftValue.availabilityList.length === 0) {
      setPenempatanError("Pilih minimal satu hari tersedia.");
      return;
    }
    const invalidAvailability = draftValue.availabilityList.find(
      (item) =>
        !item.jamMulai || !item.jamSelesai || parseTimeValue(item.jamMulai) === null || parseTimeValue(item.jamSelesai) === null
    );
    if (invalidAvailability) {
      setPenempatanError(`Jam mulai dan selesai wajib diisi untuk hari ${invalidAvailability.hari}.`);
      return;
    }
    const invalidOrder = draftValue.availabilityList.find((item) => item.jamMulai >= item.jamSelesai);
    if (invalidOrder) {
      setPenempatanError(`Jam mulai harus lebih awal dari jam selesai untuk hari ${invalidOrder.hari}.`);
      return;
    }
    if (draftValue.cabangList.length === 0) {
      setPenempatanError("Pilih minimal satu cabang penempatan.");
      return;
    }

    const recordsToSave = draftValue.availabilityList.map((item) => ({
      "Kode Pengajar": draftValue.kodePengajar,
      "Nama Pengajar": draftValue.namaPengajar,
      Domisili: draftValue.domisili,
      Hari: item.hari,
      "Jam Mulai": item.jamMulai,
      "Jam Selesai": item.jamSelesai,
      "Cabang Penempatan": draftValue.cabangList.join(", "),
    }));

    setPenempatanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const bucket = dataBucket["Penempatan Pengajar"];
      const rows = await listRows(bucket);
      const targetKode = normalizeValueKey(draftValue.kodePengajar);
      const targetIds = rows
        .filter((row) => normalizeValueKey(row.data["Kode Pengajar"]) === targetKode)
        .map((row) => row.id);
      await deleteRowsByIds(targetIds);
      for (const item of recordsToSave) {
        await insertRow(bucket, item);
      }
      setIsPenempatanModalOpen(false);
      setPenempatanError("");
      await handleLoadPenempatanPengajar();
      pushToast("Penempatan pengajar berhasil disimpan.", "success");
    } catch (error) {
      setPenempatanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan penempatan pengajar.",
      }));
      pushToast("Gagal menyimpan penempatan pengajar.", "error");
    }
  };

  const handleDeletePenempatanPengajar = (record: Record<string, string>) => {
    if (!isAdmin) {
      pushToast("Hanya Admin yang dapat menghapus data penempatan pengajar.", "error");
      return;
    }

    openConfirmDialog(
      `Hapus penempatan untuk ${record["Nama Pengajar"] || record["Kode Pengajar"]}?`,
      async () => {
        setPenempatanStatus((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const rows = await listRows(dataBucket["Penempatan Pengajar"]);
          const targetIds = rows
            .filter(
              (row) =>
                normalizeValueKey(row.data["Kode Pengajar"]) ===
                normalizeValueKey(record["Kode Pengajar"])
            )
            .map((row) => row.id);
          await deleteRowsByIds(targetIds);
          await handleLoadPenempatanPengajar();
          pushToast("Penempatan pengajar berhasil dihapus.", "success");
        } catch (error) {
          setPenempatanStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus penempatan pengajar.",
          }));
          pushToast("Gagal menghapus penempatan pengajar.", "error");
        }
      },
      { title: "Hapus Penempatan", confirmLabel: "Hapus" }
    );
  };

  const normalizeIzinRecord = (record: Record<string, string>) => {
    const startDate = parseFlexibleDate(record["Tanggal Mulai"] || "");
    const endDate = parseFlexibleDate(record["Tanggal Selesai"] || "");
    return {
      // Keep encoded row id from database for reliable update/delete.
      _id: record._id || record.ID || record.Id || record.id || "",
      "Kode Pengajar": (record["Kode Pengajar"] || "").trim().toLowerCase(),
      "Nama Pengajar": record["Nama Pengajar"] || record.Nama || "",
      Domisili: restrictedCabang || record.Domisili || "",
      "Tanggal Mulai": startDate ? formatScheduleLabel(startDate) : "",
      "Tanggal Selesai": endDate ? formatScheduleLabel(endDate) : "",
      Keterangan: record.Keterangan || "",
    };
  };

  const handleLoadIzinPengajar = async () => {
    setIzinStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Izin Pengajar"]);
      const normalized = rows
        .map((row) => ({ ...toRecord(row), _id: row.id }))
        .map((record) => normalizeIzinRecord(record))
        .filter((record) =>
          restrictedCabang
            ? normalizeText(record.Domisili || "") === normalizeText(restrictedCabang)
            : true
        );
      setIzinRecords(normalized);
      setIzinStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setIzinStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data izin pengajar.",
      }));
      pushToast("Gagal memuat data izin pengajar.", "error");
    }
  };

  const handleOpenIzinModal = (record?: Record<string, string>) => {
    if (record) {
      setIzinDraft({
        kodePengajar: (record["Kode Pengajar"] || "").trim().toLowerCase(),
        namaPengajar: record["Nama Pengajar"] || "",
        domisili: restrictedCabang || record.Domisili || "",
        tanggalMulai: formatLocalDate(parseFlexibleDate(record["Tanggal Mulai"] || "") || new Date()),
        tanggalSelesai: formatLocalDate(parseFlexibleDate(record["Tanggal Selesai"] || "") || new Date()),
        keterangan: record.Keterangan || "",
      });
      setEditingIzinId(record._id || null);
    } else {
      const defaultDomisili = restrictedCabang || authSession?.cabang || "";
      const today = formatLocalDate(new Date());
      setIzinDraft({
        kodePengajar: "",
        namaPengajar: "",
        domisili: defaultDomisili,
        tanggalMulai: today,
        tanggalSelesai: today,
        keterangan: "",
      });
      setEditingIzinId(null);
    }
    setIzinError("");
    setIsIzinModalOpen(true);
  };

  const handleSaveIzinPengajar = async () => {
    const normalized = {
      ...izinDraft,
      kodePengajar: izinDraft.kodePengajar.trim().toLowerCase(),
      namaPengajar: izinDraft.namaPengajar.trim(),
      domisili: (restrictedCabang || izinDraft.domisili).trim(),
      tanggalMulai: izinDraft.tanggalMulai.trim(),
      tanggalSelesai: izinDraft.tanggalSelesai.trim(),
      keterangan: izinDraft.keterangan.trim(),
    };

    if (!normalized.kodePengajar || !normalized.namaPengajar) {
      setIzinError("Pengajar wajib dipilih.");
      return;
    }
    const startDate = parseFlexibleDate(normalized.tanggalMulai);
    const endDate = parseFlexibleDate(normalized.tanggalSelesai);
    if (!startDate || !endDate) {
      setIzinError("Tanggal mulai dan selesai wajib diisi.");
      return;
    }
    if (startDate > endDate) {
      setIzinError("Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.");
      return;
    }

    const record = {
      "Kode Pengajar": normalized.kodePengajar,
      "Nama Pengajar": normalized.namaPengajar,
      Domisili: normalized.domisili,
      "Tanggal Mulai": formatScheduleLabel(startDate),
      "Tanggal Selesai": formatScheduleLabel(endDate),
      Keterangan: normalized.keterangan,
    };

    setIzinStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const bucket = dataBucket["Izin Pengajar"];
      if (editingIzinId) {
        await updateRow(editingIzinId, record);
      } else {
        await insertRow(bucket, record);
      }
      setIsIzinModalOpen(false);
      setIzinError("");
      await handleLoadIzinPengajar();
      pushToast("Izin pengajar berhasil disimpan.", "success");
    } catch (error) {
      setIzinStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan izin pengajar.",
      }));
      pushToast("Gagal menyimpan izin pengajar.", "error");
    }
  };

  const handleDeleteIzinPengajar = (record: Record<string, string>) => {
    openConfirmDialog(
      `Hapus izin untuk ${record["Nama Pengajar"] || record["Kode Pengajar"]}?`,
      async () => {
        setIzinStatus((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const targetId = record._id;
          if (targetId) {
            await deleteRowsByIds([targetId]);
          }
          await handleLoadIzinPengajar();
          pushToast("Izin pengajar berhasil dihapus.", "success");
        } catch (error) {
          setIzinStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus izin pengajar.",
          }));
          pushToast("Gagal menghapus izin pengajar.", "error");
        }
      },
      { title: "Hapus Izin", confirmLabel: "Hapus" }
    );
  };

  const normalizePermintaanRecord = (record: Record<string, string>) => {
    const jamMulai = formatTimeHHMM(record["Jam Mulai"] || "");
    const jamSelesai = formatTimeHHMM(record["Jam Selesai"] || "");
    const tanggalMulaiRaw = String(record["Tanggal Mulai"] || record["TanggalMulai"] || "").trim();
    const tanggalSelesaiRaw = String(record["Tanggal Selesai"] || record["TanggalSelesai"] || "").trim();
    const tanggalKhususList = parsePermintaanTanggalKhusus(
      String(record["Tanggal Khusus"] || record["TanggalKhusus"] || "")
    );
    const tanggalMulaiParsed = parseFlexibleDate(tanggalMulaiRaw);
    const tanggalSelesaiParsed = parseFlexibleDate(tanggalSelesaiRaw);
    return {
      ID: record.ID || record.Id || record.id || `REQ-${Date.now()}`,
      "Kode Pengajar": record["Kode Pengajar"] || "",
      "Nama Pengajar": record["Nama Pengajar"] || "",
      "Cabang Peminta": record["Cabang Peminta"] || "",
      "Cabang Domisili": record["Cabang Domisili"] || "",
      "Tanggal Mulai": tanggalMulaiParsed ? formatScheduleLabel(tanggalMulaiParsed) : "",
      "Tanggal Selesai": tanggalSelesaiParsed ? formatScheduleLabel(tanggalSelesaiParsed) : "",
      "Tanggal Khusus": tanggalKhususList.join(", "),
      Hari: record.Hari || "",
      "Jam Mulai": jamMulai,
      "Jam Selesai": jamSelesai,
      Status: record.Status || "Menunggu",
      Catatan: record.Catatan || "",
    };
  };

  const handleLoadPermintaanPengajar = async () => {
    setPermintaanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Permintaan Pengajar Antar Cabang"]);
      const normalized = rows
        .map((row) => toRecord(row))
        .map((record) => normalizePermintaanRecord(record));
      setPermintaanRecords(normalized);
      setPermintaanStatus({
        loading: false,
        error: "",
        lastSync: new Date().toLocaleString("id-ID"),
      });
    } catch (error) {
      setPermintaanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memuat data permintaan pengajar antar cabang.",
      }));
      pushToast("Gagal memuat permintaan pengajar antar cabang.", "error");
    }
  };

  const refreshAllData = async (showToast = false) => {
    if (!authSession || isRefreshingAll) {
      return;
    }
    setIsRefreshingAll(true);
    try {
      await Promise.all([
        handleLoadFromSheet("bulanIni", { preserveUiState: true }),
        handleLoadFromSheet("jadwalTambahanPelayanan", { preserveUiState: true }),
        handleLoadMapel(),
        handleLoadPengajar(),
        handleLoadSuratTugas(),
        handleLoadPenempatanPengajar(),
        handleLoadIzinPengajar(),
        handleLoadPermintaanPengajar(),
      ]);
      if (showToast) {
        pushToast("Semua data berhasil direfresh.", "success");
      }
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const handleRefreshAllData = async () => {
    await refreshAllData(true);
  };

  type ImportMode =
    | "schedule"
    | "mapel"
    | "pengajar"
    | "penempatan"
    | "suratTugas"
    | "permintaan";

  const importTargetByMenu = {
    bulanIni: {
      bucket: dataBucket["Jadwal Bulan ini"],
      label: "Jadwal Reguler",
      mode: "schedule",
    },
    jadwalTambahanPelayanan: {
      bucket: dataBucket["Jadwal Khusus"],
      label: "Jadwal Tambahan & Pelayanan",
      mode: "schedule",
    },
    mataPelajaran: {
      bucket: dataBucket["Mata Pelajaran"],
      label: "Mata Pelajaran",
      mode: "mapel",
    },
    pengajar: {
      bucket: dataBucket["Data Pengajar"],
      label: "Pengajar",
      mode: "pengajar",
    },
    penempatanPengajar: {
      bucket: dataBucket["Penempatan Pengajar"],
      label: "Penempatan Pengajar",
      mode: "penempatan",
    },
  } as const;

  const templateHeadersByMenu = {
    bulanIni: ["Cabang", "Kelas", "Tanggal", "Mapel", "Pengajar", "Waktu", "Urutan Kelas"],
    jadwalTambahanPelayanan: [
      "Cabang",
      "Kelas",
      "Sekolah",
      "Tanggal",
      "Mapel",
      "Pengajar",
      "Waktu",
      "Urutan Kelas",
    ],
    mataPelajaran: ["Mapel", "Kode_Mapel"],
    pengajar: [
      "Kode Pengajar",
      "Nama",
      "Bidang Studi",
      "Email",
      "No.WhatsApp",
      "Domisili",
      "Username",
      "Password",
    ],
    penempatanPengajar: [
      "Kode Pengajar",
      "Nama Pengajar",
      "Domisili",
      "Hari",
      "Jam Mulai",
      "Jam Selesai",
      "Cabang Penempatan",
    ],
  } as const;

  const normalizeImportRows = (
    rows: Record<string, unknown>[],
    mode: ImportMode
  ) => {
    if (mode === "schedule") {
      return rows
        .map((row) => {
          const tanggalRaw = getEntryValue(row, ["Tanggal", "Date"]);
          const parsedTanggal = parseFlexibleDate(tanggalRaw);
          return {
            Cabang: getEntryValue(row, ["Cabang"]).trim(),
            Kelas: getEntryValue(row, ["Kelas"]).trim(),
            Sekolah: getEntryValue(row, ["Sekolah"]).trim(),
            Tanggal: parsedTanggal ? formatScheduleLabel(parsedTanggal) : tanggalRaw.trim(),
            Mapel: getEntryValue(row, ["Mapel", "Mata Pelajaran"]).trim(),
            Pengajar: getEntryValue(row, ["Pengajar", "Guru"]).trim(),
            Waktu: getEntryValue(row, ["Waktu", "Jam"]).trim(),
            "Urutan Kelas": getEntryValue(row, ["Urutan Kelas", "Urutan", "Class Order"]).trim(),
          };
        })
        .filter(
          (row) =>
            (row.Cabang || row.Kelas || row.Sekolah) &&
            (row.Tanggal || row.Mapel || row.Pengajar || row.Waktu)
        );
    }

    if (mode === "mapel") {
      return rows
        .map((row) => ({
          Mapel: getEntryValue(row, ["Mapel", "Mata Pelajaran"]).trim(),
          Kode_Mapel: getEntryValue(row, ["Kode_Mapel", "Kode Mapel", "Singkatan"]).trim(),
        }))
        .filter((row) => row.Mapel || row.Kode_Mapel);
    }

    if (mode === "pengajar") {
      return rows
        .map((row) => ({
          "Kode Pengajar": getEntryValue(row, ["Kode Pengajar"]).trim(),
          Nama: getEntryValue(row, ["Nama"]).trim(),
          "Bidang Studi": getEntryValue(row, ["Bidang Studi"]).trim(),
          Email: getEntryValue(row, ["Email"]).trim(),
          "No.WhatsApp": getEntryValue(row, ["No.WhatsApp", "No WhatsApp", "No WA"]).trim(),
          Domisili: getEntryValue(row, ["Domisili", "Cabang"]).trim(),
          Username: getEntryValue(row, ["Username"]).trim(),
          Password: getEntryValue(row, ["Password"]).trim(),
        }))
        .filter((row) => row["Kode Pengajar"] || row.Nama);
    }

    if (mode === "suratTugas") {
      return rows
        .map((row) => {
          const tanggalRaw = getEntryValue(row, ["Tanggal", "Date"]);
          const parsedTanggal = parseFlexibleDate(tanggalRaw);
          const payload: Record<string, string> = {
            "Kode Pengajar": getEntryValue(row, ["Kode Pengajar"]).trim(),
            Tanggal: parsedTanggal ? formatScheduleLabel(parsedTanggal) : tanggalRaw.trim(),
          };
          for (let index = 1; index <= 10; index += 1) {
            payload[`Sesi ${index}`] = getEntryValue(row, [`Sesi ${index}`]).trim();
          }
          return payload;
        })
        .filter((row) => row["Kode Pengajar"] || row.Tanggal);
    }

    if (mode === "penempatan") {
      return rows
        .map((row) => ({
          "Kode Pengajar": getEntryValue(row, ["Kode Pengajar"]).trim(),
          "Nama Pengajar": getEntryValue(row, ["Nama Pengajar", "Nama"]).trim(),
          Domisili: getEntryValue(row, ["Domisili"]).trim(),
          Hari: getEntryValue(row, ["Hari", "Hari Tersedia"]).trim(),
          "Jam Mulai": formatTimeHHMM(getEntryValue(row, ["Jam Mulai"])),
          "Jam Selesai": formatTimeHHMM(getEntryValue(row, ["Jam Selesai"])),
          "Cabang Penempatan": getEntryValue(row, ["Cabang Penempatan"]).trim(),
        }))
        .filter((row) => row["Kode Pengajar"] || row["Nama Pengajar"]);
    }

    return rows
      .map((row) => {
        const tanggalMulaiRaw = getEntryValue(row, ["Tanggal Mulai"]);
        const tanggalSelesaiRaw = getEntryValue(row, ["Tanggal Selesai"]);
        const tanggalMulai = parseFlexibleDate(tanggalMulaiRaw);
        const tanggalSelesai = parseFlexibleDate(tanggalSelesaiRaw);
        return {
          ID: getEntryValue(row, ["ID"]).trim() || `REQ-${Date.now()}-${Math.round(Math.random() * 1000)}`,
          "Kode Pengajar": getEntryValue(row, ["Kode Pengajar"]).trim(),
          "Nama Pengajar": getEntryValue(row, ["Nama Pengajar", "Nama"]).trim(),
          "Cabang Peminta": getEntryValue(row, ["Cabang Peminta"]).trim(),
          "Cabang Domisili": getEntryValue(row, ["Cabang Domisili"]).trim(),
          "Tanggal Mulai": tanggalMulai ? formatScheduleLabel(tanggalMulai) : tanggalMulaiRaw.trim(),
          "Tanggal Selesai": tanggalSelesai ? formatScheduleLabel(tanggalSelesai) : tanggalSelesaiRaw.trim(),
          "Tanggal Khusus": getEntryValue(row, ["Tanggal Khusus"]).trim(),
          Hari: getEntryValue(row, ["Hari", "Hari Tersedia"]).trim(),
          "Jam Mulai": formatTimeHHMM(getEntryValue(row, ["Jam Mulai"])),
          "Jam Selesai": formatTimeHHMM(getEntryValue(row, ["Jam Selesai"])),
          Status: getEntryValue(row, ["Status"]).trim() || "Menunggu",
          Catatan: getEntryValue(row, ["Catatan"]).trim(),
        };
      })
      .filter((row) => row["Kode Pengajar"] || row["Nama Pengajar"]);
  };

  const handleOpenExcelImport = () => {
    const canImport = isAdmin;
    if (!canImport) {
      pushToast("Import data Excel hanya tersedia untuk Admin.", "error");
      return;
    }
    importInputRef.current?.click();
  };

  const handleDownloadExcelTemplate = () => {
    const canDownloadTemplate = isAdmin;
    if (!canDownloadTemplate) {
      pushToast("Template Excel hanya tersedia untuk Admin.", "error");
      return;
    }

    const target = importTargetByMenu[activeKey as keyof typeof importTargetByMenu];
    const headers = templateHeadersByMenu[activeKey as keyof typeof templateHeadersByMenu];
    if (!target || !headers?.length) {
      pushToast("Template belum tersedia untuk menu ini.", "error");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([[...headers]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    const filename = `template-${target.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`;
    XLSX.writeFile(workbook, filename);
    pushToast(`Template ${target.label} berhasil diunduh.`, "success");
  };

  const handleExcelImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    const target = importTargetByMenu[activeKey as keyof typeof importTargetByMenu];
    if (!target) {
      pushToast("Menu ini belum mendukung import Excel.", "error");
      return;
    }

    const canImport = isAdmin;
    if (!canImport) {
      pushToast("Import data Excel hanya tersedia untuk Admin.", "error");
      return;
    }

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        throw new Error("Sheet Excel tidak ditemukan.");
      }
      const worksheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
      });
      const normalizedRows = normalizeImportRows(rows, target.mode);
      if (normalizedRows.length === 0) {
        throw new Error("Data Excel kosong atau header tidak sesuai.");
      }

      await replaceBucketRows(target.bucket, normalizedRows);
      await refreshAllData(false);
      pushToast(`Import ${target.label} berhasil (${normalizedRows.length} baris).`, "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Import Excel gagal diproses.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenPermintaanModal = () => {
    const initialCabang = restrictedCabang || authSession?.cabang || "";
    setPermintaanDraft({
      id: `REQ-${Date.now()}`,
      kodePengajar: "",
      namaPengajar: "",
      cabangPeminta: initialCabang,
      cabangTujuan: "",
      tanggalMulai: "",
      tanggalSelesai: "",
      tanggalList: [],
      tanggalInput: "",
      hariList: [],
      jamMulai: "",
      jamSelesai: "",
      catatan: "",
    });
    setPermintaanError("");
    setIsPermintaanModalOpen(true);
  };

  const handleAddPermintaanTanggalKhusus = () => {
    if (!permintaanDraft.tanggalInput) {
      return;
    }
    const parsed = parseFlexibleDate(permintaanDraft.tanggalInput);
    if (!parsed) {
      setPermintaanError("Tanggal khusus tidak valid.");
      return;
    }
    const label = formatScheduleLabel(parsed);
    setPermintaanDraft((prev) => ({
      ...prev,
      tanggalList: Array.from(new Set([...prev.tanggalList, label])).sort((a, b) => {
        const dateA = parseFlexibleDate(a);
        const dateB = parseFlexibleDate(b);
        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
      }),
      tanggalInput: "",
    }));
    setPermintaanError("");
  };

  const handleRemovePermintaanTanggalKhusus = (tanggal: string) => {
    setPermintaanDraft((prev) => ({
      ...prev,
      tanggalList: prev.tanggalList.filter((item) => item !== tanggal),
    }));
  };

  const handleSavePermintaanPengajar = async () => {
    const normalizedDraft = {
      ...permintaanDraft,
      kodePengajar: permintaanDraft.kodePengajar.trim().toLowerCase(),
      namaPengajar: permintaanDraft.namaPengajar.trim(),
      cabangPeminta: (restrictedCabang || permintaanDraft.cabangPeminta).trim(),
      cabangTujuan: permintaanDraft.cabangTujuan.trim(),
      tanggalMulai: permintaanDraft.tanggalMulai.trim(),
      tanggalSelesai: permintaanDraft.tanggalSelesai.trim(),
      tanggalList: Array.from(
        new Set(
          permintaanDraft.tanggalList
            .map((item) => parseFlexibleDate(item))
            .filter((item): item is Date => Boolean(item))
            .map((item) => formatScheduleLabel(item))
        )
      ),
      hariList: Array.from(new Set(permintaanDraft.hariList.map((day) => titleCase(day.trim())).filter(Boolean))),
      jamMulai: permintaanDraft.jamMulai.trim(),
      jamSelesai: permintaanDraft.jamSelesai.trim(),
      catatan: permintaanDraft.catatan.trim(),
    };

    if (!normalizedDraft.kodePengajar || !normalizedDraft.namaPengajar) {
      setPermintaanError("Pengajar wajib dipilih.");
      return;
    }
    if (!normalizedDraft.cabangPeminta || !normalizedDraft.cabangTujuan) {
      setPermintaanError("Cabang peminta dan cabang domisili wajib tersedia.");
      return;
    }
    if (normalizeText(normalizedDraft.cabangPeminta) === normalizeText(normalizedDraft.cabangTujuan)) {
      setPermintaanError("Permintaan antar cabang hanya untuk pengajar dari cabang lain.");
      return;
    }
    const derivedHariList = normalizedDraft.tanggalList
      .map((tanggal) => parseFlexibleDate(tanggal))
      .filter((item): item is Date => Boolean(item))
      .map((item) =>
        titleCase(item.toLocaleDateString("id-ID", { weekday: "long" }))
      );
    const effectiveHariList =
      normalizedDraft.hariList.length > 0
        ? normalizedDraft.hariList
        : Array.from(new Set(derivedHariList));

    if (effectiveHariList.length === 0) {
      setPermintaanError("Pilih minimal satu hari.");
      return;
    }
    const startTime = parseTimeValue(normalizedDraft.jamMulai);
    const endTime = parseTimeValue(normalizedDraft.jamSelesai);
    if (startTime === null || endTime === null || startTime >= endTime) {
      setPermintaanError("Rentang jam tidak valid.");
      return;
    }

    const startDate = parseFlexibleDate(normalizedDraft.tanggalMulai || normalizedDraft.tanggalSelesai);
    const endDate = parseFlexibleDate(normalizedDraft.tanggalSelesai || normalizedDraft.tanggalMulai);
    if ((normalizedDraft.tanggalMulai || normalizedDraft.tanggalSelesai) && (!startDate || !endDate)) {
      setPermintaanError("Rentang tanggal tidak valid.");
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setPermintaanError("Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.");
      return;
    }

    const existingRequest = [...permintaanRecords]
      .reverse()
      .find(
        (item) =>
          normalizeText(item["Kode Pengajar"] || "") === normalizeText(normalizedDraft.kodePengajar)
      );

    const resolvedRequestId = String(existingRequest?.ID || normalizedDraft.id || "").trim();

    const record = {
      ID: resolvedRequestId,
      "Kode Pengajar": normalizedDraft.kodePengajar,
      "Nama Pengajar": normalizedDraft.namaPengajar,
      "Cabang Peminta": normalizedDraft.cabangPeminta,
      "Cabang Domisili": normalizedDraft.cabangTujuan,
      "Tanggal Mulai": startDate ? formatScheduleLabel(startDate) : "",
      "Tanggal Selesai": endDate ? formatScheduleLabel(endDate) : "",
      "Tanggal Khusus": normalizedDraft.tanggalList.join(", "),
      Hari: effectiveHariList.join(", "),
      "Jam Mulai": normalizedDraft.jamMulai,
      "Jam Selesai": normalizedDraft.jamSelesai,
      Status: "Menunggu",
      Catatan: normalizedDraft.catatan,
    };

    setPermintaanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const bucket = dataBucket["Permintaan Pengajar Antar Cabang"];
      const rows = await listRows(bucket);
      const existing = rows.find(
        (row) =>
          normalizeValueKey(row.data.ID) === normalizeValueKey(record.ID) ||
          normalizeValueKey(row.data["Kode Pengajar"]) === normalizeValueKey(record["Kode Pengajar"])
      );
      if (existing) {
        await updateRow(existing.id, record);
      } else {
        await insertRow(bucket, record);
      }
      setIsPermintaanModalOpen(false);
      setPermintaanError("");
      await handleLoadPermintaanPengajar();
      pushToast(
        existingRequest
          ? "Permintaan sebelumnya untuk pengajar ini diperbarui otomatis."
          : "Permintaan pengajar berhasil dibuat.",
        "success"
      );
    } catch (error) {
      setPermintaanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal menyimpan permintaan pengajar.",
      }));
      pushToast("Gagal menyimpan permintaan pengajar.", "error");
    }
  };

  const handleDeletePermintaanPengajar = (record: Record<string, string>) => {
    const cabangDomisiliKey = normalizeText(record["Cabang Domisili"] || "");
    const userCabangKey = normalizeText(restrictedCabang || authSession?.cabang || "");
    const canDelete = isAdmin || cabangDomisiliKey === userCabangKey;

    if (!canDelete) {
      pushToast("Hanya Admin atau Cabang Domisili yang dapat menghapus permintaan.", "error");
      return;
    }

    openConfirmDialog(
      "Hapus permintaan pengajar ini?",
      async () => {
        setPermintaanStatus((prev) => ({ ...prev, loading: true, error: "" }));
        try {
          const rows = await listRows(dataBucket["Permintaan Pengajar Antar Cabang"]);
          const targetIds = rows
            .filter((row) => normalizeValueKey(row.data.ID) === normalizeValueKey(record.ID))
            .map((row) => row.id);
          await deleteRowsByIds(targetIds);
          await Promise.all([
            handleLoadPermintaanPengajar(),
            handleLoadFromSheet("bulanIni"),
            handleLoadFromSheet("jadwalTambahanPelayanan"),
            handleLoadSuratTugas(),
          ]);
          pushToast("Permintaan pengajar berhasil dihapus.", "success");
        } catch (error) {
          setPermintaanStatus((prev) => ({
            ...prev,
            loading: false,
            error: "Gagal menghapus permintaan pengajar.",
          }));
          pushToast("Gagal menghapus permintaan pengajar.", "error");
        }
      },
      { title: "Hapus Permintaan", confirmLabel: "Hapus" }
    );
  };

  const handleUpdatePermintaanStatus = async (
    record: Record<string, string>,
    status: "Disetujui" | "Ditolak"
  ) => {
    setPermintaanStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const rows = await listRows(dataBucket["Permintaan Pengajar Antar Cabang"]);
      const existing = rows.find(
        (row) => normalizeValueKey(row.data.ID) === normalizeValueKey(record.ID)
      );
      if (existing) {
        await updateRow(existing.id, {
          ...existing.data,
          Status: status,
        });
      }
      await handleLoadPermintaanPengajar();
      pushToast(`Permintaan pengajar ${status.toLowerCase()}.`, "success");
    } catch (error) {
      setPermintaanStatus((prev) => ({
        ...prev,
        loading: false,
        error: "Gagal memperbarui status permintaan.",
      }));
      pushToast("Gagal memperbarui status permintaan.", "error");
    }
  };

  const handleLogin = () => {
    const username = loginUsername.trim();
    const password = loginPassword;
    const matched = loginAccounts.find(
      (account) => account.username === username && account.password === password
    );

    if (!matched) {
      setLoginError("Username atau password tidak sesuai.");
      pushToast("Login gagal. Periksa username dan password.", "error");
      return;
    }

    const nextSession: AuthSession = {
      username: matched.username,
      role: matched.role,
      cabang: matched.cabang,
    };

    localStorage.setItem(authStorageKey, JSON.stringify(nextSession));
    setAuthSession(nextSession);
    setLoginError("");
    setLoginPassword("");
    pushToast(`Selamat datang, ${nextSession.username}.`, "success");
  };

  const handleLogout = () => {
    localStorage.removeItem(authStorageKey);
    setAuthSession(null);
    setSidebarMobileOpen(false);
    setLoginUsername("");
    setLoginPassword("");
    setLoginError("");
    pushToast("Anda telah logout dari aplikasi.", "info");
  };

  useEffect(() => {
    const storedSession = localStorage.getItem(authStorageKey);
    if (!storedSession) {
      return;
    }

    try {
      const parsed = JSON.parse(storedSession) as AuthSession;
      const matched = loginAccounts.find((account) => account.username === parsed.username);
      if (!matched) {
        localStorage.removeItem(authStorageKey);
        return;
      }

      setAuthSession({
        username: matched.username,
        role: matched.role,
        cabang: matched.cabang,
      });
    } catch (error) {
      localStorage.removeItem(authStorageKey);
    }
  }, []);

  useEffect(() => {
    if (!authSession) {
      return;
    }
    setScheduleCabangView({
      bulanIni: restrictedCabang || "",
      jadwalTambahanPelayanan: restrictedCabang || "",
    });
    void refreshAllData();
  }, [authSession, restrictedCabang]);

  useEffect(() => {
    const hasActive = visibleCategories.some((category) => category.key === activeKey);
    if (!hasActive && visibleCategories[0]) {
      setActiveKey(visibleCategories[0].key);
    }
  }, [activeKey, visibleCategories]);

  useEffect(() => {
    if (!authSession) {
      return;
    }
    const refreshInterval = window.setInterval(() => {
      void refreshAllData();
    }, 5 * 60 * 1000);
    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [authSession, restrictedCabang]);

  useEffect(() => {
    if (!sidebarMobileOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [sidebarMobileOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setSidebarMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleDraftChange = (
    fieldKey: "mapel" | "pengajar" | "waktuMulai" | "waktuSelesai",
    value: string,
  ) => {
    setDraft((prev) => {
      if (fieldKey === "mapel") {
        setConflictError("");
        return { ...prev, mapel: value, pengajar: "" };
      }
      if (fieldKey === "pengajar") {
        const nextPengajar = value.trim();
        if (!nextPengajar) {
          setConflictError("");
          return { ...prev, pengajar: "" };
        }
        if (editingSlot) {
          const hasPlacementInCabang = hasPengajarAccessInCabang(
            nextPengajar,
            editingSlot.cabang,
            editingSlot.tanggal
          );
          if (!hasPlacementInCabang) {
            setConflictError(
              "Pengajar tidak tersedia di cabang ini, silakan hubungi cabang domisili."
            );
            return { ...prev, pengajar: "" };
          }
          const izinMatch = getPengajarIzinOnDate(nextPengajar, editingSlot.tanggal);
          if (izinMatch) {
            const startLabel = izinMatch["Tanggal Mulai"] || "";
            const endLabel = izinMatch["Tanggal Selesai"] || "";
            const reason = (izinMatch.Keterangan || "").trim();
            setConflictError(
              `Pengajar sedang izin pada rentang ${startLabel} s.d. ${endLabel}${reason ? ` (${reason})` : ""}.`
            );
            return { ...prev, pengajar: "" };
          }
        }
        setConflictError("");
        return { ...prev, pengajar: nextPengajar };
      }
      return { ...prev, [fieldKey]: value };
    });
  };

  const handleOpenClassModal = () => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat menambah kelas.", "error");
      return;
    }
    setClassDraft({ cabang: restrictedCabang || "", kelas: "", sekolah: "" });
    setClassError("");
    setIsClassModalOpen(true);
  };

  const handleClassDraftChange = (key: "cabang" | "kelas" | "sekolah", value: string) => {
    if (key === "cabang" && restrictedCabang) {
      return;
    }
    setClassDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleInlineSaveClass = async (
    group: { cabang: string; kelas: string; sekolah: string },
    nextKelasValue: string,
    nextSekolahValue: string
  ) => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat mengubah kelas.", "error");
      return false;
    }
    const cabang = group.cabang;
    const kelas = nextKelasValue.trim();
    const sekolah = (activeScheduleKey === "jadwalTambahanPelayanan"
      ? nextSekolahValue
      : group.sekolah || "").trim();
    const shouldRequireSekolah = activeScheduleKey === "jadwalTambahanPelayanan";

    if (!kelas || (shouldRequireSekolah && !sekolah)) {
      pushToast(
        shouldRequireSekolah
          ? "Kelas dan Sekolah wajib diisi untuk jadwal tambahan."
          : "Nama kelas wajib diisi.",
        "error"
      );
      return false;
    }

    const hasDuplicate = (records[activeScheduleKey] ?? []).some((item) => {
      const isCurrentClass =
        item.cabang === group.cabang &&
        item.kelas === group.kelas &&
        (item.sekolah || "") === (group.sekolah || "");
      if (isCurrentClass) {
        return false;
      }
      const isTargetClass =
        item.cabang === cabang &&
        item.kelas === kelas &&
        (shouldRequireSekolah ? (item.sekolah || "") === sekolah : true);
      return isTargetClass;
    });

    if (hasDuplicate) {
      pushToast("Nama kelas tersebut sudah ada.", "error");
      return false;
    }

    const sourceItems = records[activeScheduleKey] ?? [];
    const matchingItems = sourceItems.filter(
      (item) =>
        item.cabang === group.cabang &&
        item.kelas === group.kelas &&
        (item.sekolah || "") === (group.sekolah || "")
    );
    if (matchingItems.length === 0) {
      pushToast("Data kelas tidak ditemukan.", "error");
      return false;
    }

    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: (prev[activeScheduleKey] ?? []).map((item) => {
        if (
          item.cabang === group.cabang &&
          item.kelas === group.kelas &&
          (item.sekolah || "") === (group.sekolah || "")
        ) {
          return { ...item, cabang, kelas, sekolah };
        }
        return item;
      }),
    }));

    await Promise.all(
      matchingItems.map((item) => {
        const oldTanggal = resolveSheetTanggal(item.tanggalSheet || "", item.tanggal || "");
        const oldRecord = buildSheetRecord(
          group.cabang,
          group.kelas,
          oldTanggal,
          item.mapel || "",
          item.pengajar || "",
          item.waktu || "",
          group.sekolah || "",
          item.classOrder || ""
        );
        const newRecord = buildSheetRecord(
          cabang,
          kelas,
          oldTanggal,
          item.mapel || "",
          item.pengajar || "",
          item.waktu || "",
          sekolah,
          item.classOrder || ""
        );
        return postToSheet({ action: "upsert", record: newRecord, oldRecord });
      })
    );

    pushToast("Nama kelas berhasil diperbarui.", "success");
    return true;
  };

  const handleSaveNewClass = async () => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat menambah kelas.", "error");
      return;
    }
    const cabang = restrictedCabang || classDraft.cabang.trim();
    const kelas = classDraft.kelas.trim();
    const sekolah = classDraft.sekolah.trim();
    const shouldRequireSekolah = activeScheduleKey === "jadwalTambahanPelayanan";
    if (!cabang || !kelas || (shouldRequireSekolah && !sekolah)) {
      setClassError(
        shouldRequireSekolah
          ? "Cabang, Kelas, dan Sekolah wajib diisi."
          : "Cabang dan Kelas wajib diisi."
      );
      return;
    }

    const existing = (records[activeScheduleKey] ?? []).some(
      (item) =>
        item.cabang === cabang &&
        item.kelas === kelas &&
        (shouldRequireSekolah ? (item.sekolah || "") === sekolah : true)
    );
    if (existing) {
      setClassError("Kelas tersebut sudah ada di jadwal.");
      return;
    }

    const firstSlot = activeScheduleDates[0];
    if (!firstSlot) {
      setClassError("Tanggal jadwal belum tersedia.");
      return;
    }
    const classOrders = (records[activeScheduleKey] ?? [])
      .filter((item) => normalizeText(item.cabang || "") === normalizeText(cabang))
      .map((item) => parseClassOrder(item.classOrder))
      .filter((value): value is number => value !== null);
    const nextClassOrder = (classOrders.length > 0 ? Math.max(...classOrders) : 0) + 1;
    const sheetRecord = buildSheetRecord(
      cabang,
      kelas,
      firstSlot.label,
      "",
      "",
      "",
      sekolah,
      String(nextClassOrder)
    );
    const newItem: RecordItem = {
      id: `kelas-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      cabang,
      kelas,
      sekolah,
      classOrder: String(nextClassOrder),
      tanggal: firstSlot.date,
      tanggalSheet: sheetRecord.Tanggal,
      mapel: "",
      pengajar: "",
      waktu: "",
      catatan: "",
    };
    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: [...(prev[activeScheduleKey] ?? []), newItem],
    }));
    setIsClassModalOpen(false);
    setClassDraft({ cabang: "", kelas: "", sekolah: "" });
    setClassError("");
    pushToast("Kelas baru berhasil ditambahkan.", "success");
    await persistRecordToSheet(sheetRecord);
  };

  const handleDeleteClass = (group: {
    cabang: string;
    kelas: string;
    sekolah: string;
    entriesByDate: Record<string, RecordItem[]>;
  }) => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat menghapus kelas.", "error");
      return;
    }
    openConfirmDialog(
      `Hapus seluruh jadwal untuk ${group.kelas} (${group.cabang})? Tindakan ini akan menghapus semua data terkait di Surat Tugas Pengajar.`,
      async () => {
        setRecords((prev) => ({
          ...prev,
          [activeScheduleKey]: (prev[activeScheduleKey] ?? []).filter(
            (item) =>
              item.cabang !== group.cabang ||
              item.kelas !== group.kelas ||
              (item.sekolah || "") !== (group.sekolah || "")
          ),
        }));
        if (
          editingSlot &&
          editingSlot.cabang === group.cabang &&
          editingSlot.kelas === group.kelas &&
          (editingSlot.sekolah || "") === (group.sekolah || "")
        ) {
          clearEditing();
        }
        await postToSheet({
          action: "deleteClass",
          cabang: group.cabang,
          kelas: group.kelas,
          sekolah: group.sekolah || "",
        });
        pushToast("Kelas dan seluruh jadwalnya berhasil dihapus.", "success");
      },
      { title: "Hapus Kelas", confirmLabel: "Hapus" }
    );
  };

  const handleMoveClass = async (group: { cabang: string; kelas: string; sekolah: string }, direction: -1 | 1) => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat mengatur urutan kelas.", "error");
      return;
    }

    const key = buildClassGroupKey(group.cabang, group.kelas, group.sekolah || "");
    const currentIndex = monthScheduleGroupsAll.findIndex(
      (item) => buildClassGroupKey(item.cabang, item.kelas, item.sekolah || "") === key
    );
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= monthScheduleGroupsAll.length) {
      return;
    }

    const currentGroup = monthScheduleGroupsAll[currentIndex];
    const targetGroup = monthScheduleGroupsAll[nextIndex];
    const currentOrder = currentGroup.classOrder;
    const targetOrder = targetGroup.classOrder;

    const currentKey = buildClassGroupKey(currentGroup.cabang, currentGroup.kelas, currentGroup.sekolah || "");
    const targetKey = buildClassGroupKey(targetGroup.cabang, targetGroup.kelas, targetGroup.sekolah || "");

    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: (prev[activeScheduleKey] ?? []).map((item) => {
        const itemKey = buildClassGroupKey(item.cabang || "", item.kelas || "", item.sekolah || "");
        if (itemKey === currentKey) {
          return { ...item, classOrder: String(targetOrder) };
        }
        if (itemKey === targetKey) {
          return { ...item, classOrder: String(currentOrder) };
        }
        return item;
      }),
    }));

    await Promise.all([
      postToSheet(
        {
          action: "reorderClass",
          cabang: currentGroup.cabang,
          kelas: currentGroup.kelas,
          sekolah: currentGroup.sekolah || "",
          classOrder: String(targetOrder),
        },
        activeScheduleKey
      ),
      postToSheet(
        {
          action: "reorderClass",
          cabang: targetGroup.cabang,
          kelas: targetGroup.kelas,
          sekolah: targetGroup.sekolah || "",
          classOrder: String(currentOrder),
        },
        activeScheduleKey
      ),
    ]);
    pushToast("Urutan kelas berhasil diperbarui.", "success");
  };

  const buildSheetRecord = (
    cabang: string,
    kelas: string,
    tanggalSheet: string,
    mapel: string,
    pengajar: string,
    waktu: string,
    sekolah = "",
    classOrder = ""
  ) => ({
    Cabang: cabang,
    Kelas: kelas,
    ...(sekolah ? { Sekolah: sekolah } : {}),
    ...(String(classOrder).trim() ? { "Urutan Kelas": String(classOrder).trim() } : {}),
    Tanggal: formatSheetTanggal(tanggalSheet),
    Mapel: mapel,
    Pengajar: pengajar,
    Waktu: waktu,
  });

  const rebuildSuratTugasBucket = async () => {
    const regulerRows = await listRows(dataBucket["Jadwal Bulan ini"]);
    const khususRows = await listRows(dataBucket["Jadwal Khusus"]);
    const allRows = [...regulerRows, ...khususRows].map((row) => row.data);
    const now = new Date();
    const day = now.getDate();
    const month = now
      .toLocaleDateString("id-ID", { month: "long" })
      .toLowerCase();
    const year = now.getFullYear();
    const time = now.toLocaleTimeString("en-GB", { hour12: false });
    const updatedLabel = `${day} ${month} ${year} ${time}`;

    const grouped = new Map<string, string[]>();
    allRows.forEach((row) => {
      const kodePengajar = (row.Pengajar || "").trim();
      const mapel = (row.Mapel || "").trim();
      const waktu = (row.Waktu || "").trim();
      const cabang = (row.Cabang || "").trim();
      const kelas = (row.Kelas || "").trim();
      const sekolah = (row.Sekolah || "").trim();
      const tanggalLabel = formatSheetTanggal(row.Tanggal || "");
      if (!kodePengajar || !tanggalLabel || !mapel || !waktu) {
        return;
      }
      const kelasLabel = [kelas, sekolah].filter(Boolean).join(" ");
      const sesiText = `${waktu}/${mapel}-${kelasLabel}/${cabang} update ${updatedLabel}`;
      const key = `${normalizeValueKey(kodePengajar)}||${normalizeValueKey(tanggalLabel)}`;
      const list = grouped.get(key) ?? [];
      list.push(sesiText);
      grouped.set(key, list);
    });

    const suratRows = Array.from(grouped.entries()).map(([key, sesiList]) => {
      const [kodeKey, tanggalKey] = key.split("||");
      const template = allRows.find(
        (row) =>
          normalizeValueKey(row.Pengajar) === kodeKey &&
          normalizeValueKey(formatSheetTanggal(row.Tanggal || "")) === tanggalKey
      );
      const tanggalLabel = template ? formatSheetTanggal(template.Tanggal || "") : "";
      const row: Record<string, string> = {
        "Kode Pengajar": template?.Pengajar || "",
        Tanggal: tanggalLabel,
      };
      for (let index = 0; index < 10; index += 1) {
        row[`Sesi ${index + 1}`] = sesiList[index] || "";
      }
      return row;
    });

    await replaceBucketRows(dataBucket["Surat Tugas Pengajar"], suratRows);
  };

  const postToSheet = async (
    payload: Record<string, unknown>,
    scheduleKey: ScheduleMenuKey = activeScheduleKey
  ) => {
    setSheetStatus((prev) => ({ ...prev, saving: true, error: "" }));
    const bucket = dataBucket[scheduleSheetByKey[scheduleKey]];

    const mutateScheduleBucket = async () => {
      const action = String(payload.action || "");
      const record = (payload.record as Record<string, string> | undefined) ?? null;
      const oldRecord = (payload.oldRecord as Record<string, string> | undefined) ?? null;
      const rows = await listRows(bucket);
      const sessionFields = ["Cabang", "Kelas", "Sekolah", "Tanggal", "Mapel", "Pengajar", "Waktu"];

      if (action === "append" && record) {
        await insertRow(bucket, record);
        return;
      }

      if (action === "appendMany") {
        const recordsToAppend = ((payload.records as Record<string, string>[] | undefined) || []).filter(
          (item) => item && Object.keys(item).length > 0
        );
        for (const item of recordsToAppend) {
          await insertRow(bucket, item);
        }
        return;
      }

      if (action === "upsert" && record) {
        const target = rows.find((row) => {
          if (oldRecord) {
            return matchByFields(row.data, oldRecord, sessionFields);
          }
          return matchByFields(row.data, record, ["Cabang", "Kelas", "Sekolah", "Tanggal"]);
        });
        if (target) {
          await updateRow(target.id, record);
        } else {
          await insertRow(bucket, record);
        }
        return;
      }

      if (action === "deleteSession" && record) {
        const targetIds = rows
          .filter((row) => matchByFields(row.data, record, sessionFields))
          .map((row) => row.id);
        await deleteRowsByIds(targetIds);
        return;
      }

      if (action === "deleteClass") {
        const cabang = String(payload.cabang ?? "");
        const kelas = String(payload.kelas ?? "");
        const sekolah = String(payload.sekolah ?? "");
        const targetIds = rows
          .filter(
            (row) =>
              normalizeValueKey(row.data.Cabang) === normalizeValueKey(cabang) &&
              normalizeValueKey(row.data.Kelas) === normalizeValueKey(kelas) &&
              normalizeValueKey(row.data.Sekolah || "") === normalizeValueKey(sekolah)
          )
          .map((row) => row.id);
        await deleteRowsByIds(targetIds);
        return;
      }

      if (action === "reorderClass") {
        const cabang = String(payload.cabang ?? "");
        const kelas = String(payload.kelas ?? "");
        const sekolah = String(payload.sekolah ?? "");
        const classOrder = String(payload.classOrder ?? "");
        const targets = rows.filter(
          (row) =>
            normalizeValueKey(row.data.Cabang) === normalizeValueKey(cabang) &&
            normalizeValueKey(row.data.Kelas) === normalizeValueKey(kelas) &&
            normalizeValueKey(row.data.Sekolah || "") === normalizeValueKey(sekolah)
        );
        for (const row of targets) {
          await updateRow(row.id, {
            ...row.data,
            "Urutan Kelas": classOrder,
          });
        }
      }
    };

    const finalizeSuccess = () => {
      setSheetStatus((prev) => ({
        ...prev,
        saving: false,
        lastSync: new Date().toLocaleString("id-ID"),
      }));
      // Keep Surat Tugas view in sync right after any jadwal save/delete.
      handleLoadSuratTugas();
      pushToast("Perubahan jadwal berhasil disimpan.", "success");
      return true;
    };

    try {
      await mutateScheduleBucket();
      await rebuildSuratTugasBucket();
      return finalizeSuccess();
    } catch (error) {
      setSheetStatus((prev) => ({
        ...prev,
        saving: false,
        error: "Gagal menyimpan ke database Supabase.",
      }));
      pushToast("Gagal menyimpan ke database.", "error");
      return false;
    }
  };

  const persistRecordToSheet = async (record: Record<string, string>) => {
    return postToSheet({ action: "upsert", record }, activeScheduleKey);
  };

  const handleDeleteScheduleByMonth = () => {
    if (!isAdmin) {
      pushToast("Menu ini hanya untuk Admin.", "error");
      return;
    }
    const scheduleLabel =
      deleteScheduleType === "bulanIni" ? "Jadwal Reguler" : "Jadwal Tambahan & Pelayanan";
    const monthLabel =
      monthOptions.find((option) => option.value === deleteMonthKey)?.label || deleteMonthKey;

    openConfirmDialog(
      `Hapus semua data ${scheduleLabel} pada ${monthLabel}? Data Surat Tugas Mengajar akan ikut disinkronkan.`,
      async () => {
        setIsDeletingByMonth(true);
        setSheetStatus((prev) => ({ ...prev, error: "" }));
        try {
          const targetBucket = dataBucket[scheduleSheetByKey[deleteScheduleType]];
          const rows = await listRows(targetBucket);
          const targetIds = rows
            .filter((row) => {
              const parsed = parseFlexibleDate(row.data.Tanggal || "");
              if (!parsed) {
                return false;
              }
              return formatLocalDate(parsed).slice(0, 7) === deleteMonthKey;
            })
            .map((row) => row.id);

          if (targetIds.length === 0) {
            pushToast(`Tidak ada data ${scheduleLabel} pada ${monthLabel}.`, "info");
            return;
          }

          await deleteRowsByIds(targetIds);
          await rebuildSuratTugasBucket();
          await Promise.all([
            handleLoadFromSheet(deleteScheduleType, { preserveUiState: true }),
            handleLoadSuratTugas(),
          ]);
          setSheetStatus((prev) => ({
            ...prev,
            lastSync: new Date().toLocaleString("id-ID"),
          }));
          pushToast(
            `${targetIds.length} data ${scheduleLabel} pada ${monthLabel} berhasil dihapus.`,
            "success"
          );
        } catch (error) {
          setSheetStatus((prev) => ({
            ...prev,
            error: "Gagal menghapus jadwal berdasarkan bulan.",
          }));
          pushToast("Gagal menghapus jadwal berdasarkan bulan.", "error");
        } finally {
          setIsDeletingByMonth(false);
        }
      },
      { title: "Hapus Jadwal Bulanan", confirmLabel: "Hapus Semua" }
    );
  };

  const handleSelectBulanIniSlot = (
    group: { cabang: string; kelas: string; sekolah: string; entriesByDate: Record<string, RecordItem[]> },
    slot: { date: string; label: string },
    entry?: RecordItem
  ) => {
    if (isScheduleReadOnly) {
      return;
    }
    const targetEntry = entry;
    if (
      editingSlot &&
      editingSlot.cabang === group.cabang &&
      editingSlot.kelas === group.kelas &&
      (editingSlot.sekolah || "") === (group.sekolah || "") &&
      editingSlot.tanggal === slot.date &&
      editingSlot.entryId === targetEntry?.id
    ) {
      return;
    }
    const waktuParts = targetEntry?.waktu ? targetEntry.waktu.split("-").map((part) => part.trim()) : [];
    setEditingSlot({
      cabang: group.cabang,
      kelas: group.kelas,
      sekolah: group.sekolah || "",
      tanggal: slot.date,
      tanggalSheet: targetEntry?.tanggalSheet || slot.label,
      entryId: targetEntry?.id,
    });
    setDraft({
      mapel: targetEntry?.mapel ?? "",
      pengajar: targetEntry?.pengajar ?? "",
      waktuMulai: waktuParts[0] ?? "",
      waktuSelesai: waktuParts[1] ?? "",
    });
    setCopyTargetDates([]);
    setConflictError("");
  };

  const handleSaveSlot = async () => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat mengubah jadwal.", "error");
      return;
    }
    if (!editingSlot) {
      return;
    }
    const { cabang, kelas, sekolah, tanggal, tanggalSheet, entryId } = editingSlot;
    const sekolahValue = sekolah || "";
    const waktuMulai = draft.waktuMulai.trim();
    const waktuSelesai = draft.waktuSelesai.trim();
    const waktuValue = [waktuMulai, waktuSelesai].filter(Boolean).join("-");
    const nextValues = {
      mapel: draft.mapel.trim(),
      pengajar: draft.pengajar.trim(),
      waktu: waktuValue,
    };

    setConflictError("");
    if (nextValues.pengajar && pengajarAvailabilityInfo.warning) {
      setConflictError(pengajarAvailabilityInfo.warning);
      return;
    }
    if (nextValues.pengajar) {
      const izinMatch = getPengajarIzinOnDate(nextValues.pengajar, tanggal);
      if (izinMatch) {
        const startLabel = izinMatch["Tanggal Mulai"] || "";
        const endLabel = izinMatch["Tanggal Selesai"] || "";
        const reason = (izinMatch.Keterangan || "").trim();
        setConflictError(
          `Pengajar sedang izin pada rentang ${startLabel} s.d. ${endLabel}${reason ? ` (${reason})` : ""}.`
        );
        return;
      }
    }
    const pengajarKey = nextValues.pengajar.toLowerCase();
    const startTime = parseTimeValue(waktuMulai);
    const endTime = parseTimeValue(waktuSelesai);
    if (nextValues.pengajar && startTime !== null && endTime !== null) {
      if (startTime >= endTime) {
        setConflictError("Jam mulai harus lebih awal daripada jam selesai.");
        return;
      }
      const otherEntries = allScheduleEntries.filter(
        (item) =>
          item.id !== entryId &&
          item.tanggal === tanggal &&
          item.pengajar?.toLowerCase() === pengajarKey
      );
      for (const entry of otherEntries) {
        if (!entry.waktu) {
          continue;
        }
        const range = parseRangeFromString(entry.waktu);
        if (!range) {
          continue;
        }
        const overlap = startTime < range.end && endTime > range.start;
        if (overlap) {
          const tanggalLabel = getSlotLabelByDate(entry.tanggal ?? tanggal);
          const cabangLabel = entry.cabang || "Cabang tidak diketahui";
          const kelasLabel = entry.kelas || "Kelas tidak diketahui";
          const waktuLabel = entry.waktu || "jam tidak diketahui";
          setConflictError(
            `Pengajar sudah mengajar di ${cabangLabel} (${kelasLabel}) pada ${tanggalLabel} pukul ${waktuLabel}.`
          );
          return;
        }
        if (entry.cabang !== cabang) {
          const hasGap = startTime >= range.end + 60 || range.start >= endTime + 60;
          if (!hasGap) {
            const tanggalLabel = getSlotLabelByDate(entry.tanggal ?? tanggal);
            const cabangLabel = entry.cabang || "Cabang tidak diketahui";
            const kelasLabel = entry.kelas || "Kelas tidak diketahui";
            const waktuLabel = entry.waktu || "jam tidak diketahui";
            setConflictError(
              `Pengajar sudah mengajar di ${cabangLabel} (${kelasLabel}) pada ${tanggalLabel} pukul ${waktuLabel}. Antar cabang wajib jeda minimal 1 jam.`
            );
            return;
          }
        }
      }
    }

    const existingEntry = entryId
      ? (records[activeScheduleKey] ?? []).find((item) => item.id === entryId)
      : undefined;
    const classOrderValue =
      existingEntry?.classOrder ||
      (records[activeScheduleKey] ?? []).find(
        (item) =>
          item.cabang === cabang &&
          item.kelas === kelas &&
          (item.sekolah || "") === sekolahValue
      )?.classOrder ||
      "";

    const dateLabelByKey = new Map(activeScheduleDates.map((slot) => [slot.date, slot.label]));
    const currentEntries = records[activeScheduleKey] ?? [];
    const sanitizedCopyDates = Array.from(
      new Set(
        copyTargetDates.filter(
          (dateKey) => dateKey !== tanggal && dateLabelByKey.has(dateKey)
        )
      )
    );
    const validCopyDates: string[] = [];
    const skippedCopyLabels: string[] = [];

    if (sanitizedCopyDates.length > 0 && (nextValues.mapel || nextValues.pengajar || nextValues.waktu)) {
      for (const targetDate of sanitizedCopyDates) {
        const dateLabel = dateLabelByKey.get(targetDate) || targetDate;
        const duplicatedInClass = currentEntries.some(
          (item) =>
            item.id !== entryId &&
            item.cabang === cabang &&
            item.kelas === kelas &&
            (item.sekolah || "") === sekolahValue &&
            item.tanggal === targetDate &&
            (item.mapel || "") === nextValues.mapel &&
            (item.pengajar || "") === nextValues.pengajar &&
            (item.waktu || "") === nextValues.waktu
        );
        if (duplicatedInClass) {
          skippedCopyLabels.push(`${dateLabel} (sudah ada)`);
          continue;
        }

        if (nextValues.pengajar && startTime !== null && endTime !== null) {
          const izinAtTargetDate = getPengajarIzinOnDate(nextValues.pengajar, targetDate);
          if (izinAtTargetDate) {
            skippedCopyLabels.push(`${dateLabel} (pengajar izin)`);
            continue;
          }
          const copyDateEntries = allScheduleEntries.filter(
            (item) =>
              item.id !== entryId &&
              item.tanggal === targetDate &&
              item.pengajar?.toLowerCase() === pengajarKey
          );
          let conflictFound = false;
          for (const entry of copyDateEntries) {
            const range = parseRangeFromString(entry.waktu || "");
            if (!range) {
              continue;
            }
            const overlap = startTime < range.end && endTime > range.start;
            if (overlap) {
              conflictFound = true;
              break;
            }
            if (entry.cabang !== cabang) {
              const hasGap = startTime >= range.end + 60 || range.start >= endTime + 60;
              if (!hasGap) {
                conflictFound = true;
                break;
              }
            }
          }
          if (conflictFound) {
            skippedCopyLabels.push(`${dateLabel} (bentrok pengajar)`);
            continue;
          }
        }

        validCopyDates.push(targetDate);
      }
    }

    const copiedItems: RecordItem[] = validCopyDates.map((dateKey, index) => ({
      id: `${activeScheduleKey}-${Date.now()}-${index + 1000}`,
      cabang,
      kelas,
      sekolah: sekolahValue,
      classOrder: classOrderValue,
      tanggal: dateKey,
      tanggalSheet: dateLabelByKey.get(dateKey) || dateKey,
      ...nextValues,
      catatan: "",
    }));
    const copiedSheetRecords = validCopyDates.map((dateKey) =>
      buildSheetRecord(
        cabang,
        kelas,
        resolveSheetTanggal(dateLabelByKey.get(dateKey) || dateKey, dateKey),
        nextValues.mapel,
        nextValues.pengajar,
        nextValues.waktu,
        sekolahValue,
        classOrderValue
      )
    );

    const sheetRecord = buildSheetRecord(
      cabang,
      kelas,
      resolveSheetTanggal(tanggalSheet, tanggal),
      nextValues.mapel,
      nextValues.pengajar,
      nextValues.waktu,
      sekolahValue,
      classOrderValue
    );

    const oldSheetRecord = existingEntry
      ? buildSheetRecord(
          existingEntry.cabang || cabang,
          existingEntry.kelas || kelas,
          resolveSheetTanggal(existingEntry.tanggalSheet || existingEntry.tanggal || tanggalSheet, existingEntry.tanggal || tanggal),
          existingEntry.mapel || "",
          existingEntry.pengajar || "",
          existingEntry.waktu || "",
          existingEntry.sekolah || sekolahValue,
          existingEntry.classOrder || classOrderValue
        )
      : null;

    setRecords((prev) => {
      const current = prev[activeScheduleKey] ?? [];
      if (entryId) {
        return {
          ...prev,
          [activeScheduleKey]: [
            ...current.map((item) =>
              item.id === entryId
                ? {
                    ...item,
                    ...nextValues,
                    cabang,
                    kelas,
                    sekolah: sekolahValue,
                    classOrder: classOrderValue,
                    tanggal,
                    tanggalSheet: sheetRecord.Tanggal,
                  }
                : item
            ),
            ...copiedItems,
          ],
        };
      }
      if (!nextValues.mapel && !nextValues.pengajar && !nextValues.waktu) {
        return prev;
      }
      const newItem: RecordItem = {
        id: `${activeScheduleKey}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        cabang,
        kelas,
        sekolah: sekolahValue,
        classOrder: classOrderValue,
        tanggal,
        tanggalSheet: sheetRecord.Tanggal,
        ...nextValues,
        catatan: "",
      };
      return {
        ...prev,
        [activeScheduleKey]: [...current, newItem, ...copiedItems],
      };
    });
    clearEditing();

    if (skippedCopyLabels.length > 0) {
      pushToast(
        `Sebagian tanggal salinan dilewati: ${skippedCopyLabels.join(", ")}.`,
        "info"
      );
    }

    if (entryId) {
      await postToSheet({ action: "upsert", record: sheetRecord, oldRecord: oldSheetRecord });
      if (copiedSheetRecords.length > 0) {
        await postToSheet({ action: "appendMany", records: copiedSheetRecords });
      }
      return;
    }
    if (copiedSheetRecords.length > 0) {
      await postToSheet({ action: "appendMany", records: [sheetRecord, ...copiedSheetRecords] });
      return;
    }
    await postToSheet({ action: "append", record: sheetRecord });
  };

  const handleDeleteSlot = async () => {
    if (isScheduleReadOnly) {
      pushToast("Mode lihat cabang lain aktif. Anda tidak dapat menghapus jadwal.", "error");
      return;
    }
    if (!editingSlot) {
      return;
    }
    if (!editingSlot.entryId) {
      clearEditing();
      return;
    }
    const existingEntry = (records[activeScheduleKey] ?? []).find((item) => item.id === editingSlot.entryId);
    const sheetRecord = buildSheetRecord(
      editingSlot.cabang,
      editingSlot.kelas,
      resolveSheetTanggal(editingSlot.tanggalSheet, editingSlot.tanggal),
      existingEntry?.mapel || "",
      existingEntry?.pengajar || "",
      existingEntry?.waktu || "",
      existingEntry?.sekolah || editingSlot.sekolah || "",
      existingEntry?.classOrder || ""
    );
    setRecords((prev) => ({
      ...prev,
      [activeScheduleKey]: (prev[activeScheduleKey] ?? []).filter((item) => item.id !== editingSlot.entryId),
    }));
    clearEditing();
    await postToSheet({ action: "deleteSession", record: sheetRecord });
  };

  const isBusy =
    isImporting ||
    sheetStatus.loading ||
    sheetStatus.saving ||
    mapelStatus.loading ||
    pengajarStatus.loading ||
    suratTugasStatus.loading ||
    penempatanStatus.loading ||
    izinStatus.loading ||
    permintaanStatus.loading;

  const busyMessage = sheetStatus.saving
    ? "Menyimpan perubahan ke database..."
    : "Memuat data terbaru...";

  if (!authSession) {
    return (
      <div className="app-shell">
        <LoginScreen
          username={loginUsername}
          password={loginPassword}
          error={loginError}
          onUsernameChange={(value) => {
            setLoginUsername(value);
            if (loginError) {
              setLoginError("");
            }
          }}
          onPasswordChange={(value) => {
            setLoginPassword(value);
            if (loginError) {
              setLoginError("");
            }
          }}
          onSubmit={handleLogin}
        />
        <ToastStack toasts={toasts} onClose={dismissToast} />
      </div>
    );
  }


  return (
    <div className="min-vh-100 app-font-10 app-shell">
      <div className="container-fluid py-4">
        <div className="row g-4">
          <div className={`d-none d-lg-block ${sidebarCollapsed ? "col-lg-1" : "col-lg-2"}`}>
            <SidebarMenu
              categories={visibleCategories}
              activeKey={activeKey}
              sidebarCollapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((prev) => !prev)}
              onSelect={(key) => {
                setActiveKey(key);
                clearEditing();
                setIsClassModalOpen(false);
                setIsPenempatanModalOpen(false);
                  setIsIzinModalOpen(false);
                setIsPermintaanModalOpen(false);
              }}
            />
          </div>

          <div className={`col-12 ${sidebarCollapsed ? "col-lg-11" : "col-lg-10"}`}>
            <div className="card shadow-sm mb-4 surface-panel app-header-card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm d-lg-none"
                      onClick={() => setSidebarMobileOpen(true)}
                      aria-label="Buka menu"
                    >
                      <i className="bi bi-list" />
                    </button>
                    <div>
                    <h2 className="h4 mb-0">{activeConfig.name}</h2>
                    <div className="text-muted small mt-1">
                      Login sebagai: {authSession.username}
                      {authSession.cabang ? ` (${authSession.cabang})` : ""}
                    </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {isAdmin &&
                    importTargetByMenu[activeKey as keyof typeof importTargetByMenu] ? (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        title="Import data Excel"
                        onClick={handleOpenExcelImport}
                        disabled={isImporting || isBusy}
                      >
                        {isImporting ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        ) : (
                          <>
                            <i className="bi bi-file-earmark-arrow-up me-1" />
                            Import Excel
                          </>
                        )}
                      </button>
                    ) : null}
                    {isAdmin &&
                    templateHeadersByMenu[activeKey as keyof typeof templateHeadersByMenu] ? (
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        title="Unduh template Excel"
                        onClick={handleDownloadExcelTemplate}
                        disabled={isImporting || isBusy}
                      >
                        <i className="bi bi-download me-1" />
                        Template
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      title="Refresh semua data"
                      aria-label="Refresh semua data"
                      onClick={() => {
                        void handleRefreshAllData();
                      }}
                      disabled={isRefreshingAll || isBusy}
                    >
                      {isRefreshingAll ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      ) : (
                        <i className="bi bi-arrow-clockwise" />
                      )}
                    </button>
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>

             <div className="card shadow-sm surface-panel">
              <div className="card-body">
                <TopToolbar
                  activeKey={activeKey}
                  activeName={activeConfig.name}
                  query={query}
                  scheduleCabangOptions={activeScheduleCabangOptions}
                  selectedScheduleCabang={selectedScheduleCabang}
                  allowAllCabang={!restrictedCabang}
                  monthOptions={monthOptions}
                  selectedMonthKey={selectedMonthKey}
                  selectedSuratTugasMonthKey={selectedSuratTugasMonthKey}
                  selectedSuratTugasKode={selectedSuratTugasKode}
                  suratTugasPengajarOptions={suratTugasPengajarOptions}
                  sheetStatus={sheetStatus}
                  mapelStatus={mapelStatus}
                  pengajarStatus={pengajarStatus}
                  suratTugasStatus={suratTugasStatus}
                  penempatanStatus={penempatanStatus}
                  izinStatus={izinStatus}
                  permintaanStatus={permintaanStatus}
                  onQueryChange={setQuery}
                  onScheduleCabangChange={(nextCabang) => {
                    if (!isScheduleMenuKey(activeKey)) {
                      return;
                    }
                    setScheduleCabangView((prev) => ({
                      ...prev,
                      [activeKey]: nextCabang,
                    }));
                    clearEditing();
                  }}
                  onMonthChange={(nextMonth) => {
                    setSelectedMonthKey(nextMonth);
                  }}
                  onSuratMonthChange={(nextMonth) => {
                    setSelectedSuratTugasMonthKey(nextMonth);
                    setSelectedSuratTugasKode("");
                  }}
                  onSuratKodeChange={setSelectedSuratTugasKode}
                />
                {(activeKey === "bulanIni" ||
                  activeKey === "jadwalTambahanPelayanan" ||
                  activeKey === "monitoringKelas" ||
                  activeKey === "printJadwal" ||
                  activeKey === "hapusJadwal" ||
                  activeKey === "dashboard") &&
                  sheetStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {sheetStatus.error}
                  </div>
                )}
                {activeKey === "dashboard" && permintaanStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {permintaanStatus.error}
                  </div>
                )}
                {activeKey === "mataPelajaran" && mapelStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {mapelStatus.error}
                  </div>
                )}
                
                {activeKey === "pengajar" && pengajarStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {pengajarStatus.error}
                  </div>
                )}

                {activeKey === "suratTugasMengajar" && suratTugasStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {suratTugasStatus.error}
                  </div>
                )}

                {activeKey === "penempatanPengajar" && penempatanStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {penempatanStatus.error}
                  </div>
                )}

                {activeKey === "izinPengajar" && izinStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {izinStatus.error}
                  </div>
                )}

                {activeKey === "permintaanPengajarAntarCabang" && permintaanStatus.error && (
                  <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
                    {permintaanStatus.error}
                  </div>
                )}

                {activeKey === "dashboard" ? (
                  <DashboardView
                    loading={sheetStatus.loading || permintaanStatus.loading}
                    pendingRequests={dashboardPendingRequests}
                    todaySchedules={dashboardTodaySchedules}
                  />
                ) : activeKey === "bulanIni" || activeKey === "jadwalTambahanPelayanan" ? (
                  <ScheduleTableView
                    isJadwalTambahanMenu={isJadwalTambahanMenu}
                    readOnly={isScheduleReadOnly}
                    activeScheduleDates={activeScheduleDates}
                    activeDayGroups={activeDayGroups}
                    activeDayStartIndexes={activeDayStartIndexes}
                    monthScheduleGroups={monthScheduleGroups}
                    conflictEntryIds={conflictingScheduleEntryIds}
                    editingSlot={editingSlot}
                    saving={sheetStatus.saving}
                    onInlineSaveClass={handleInlineSaveClass}
                    onDeleteClass={handleDeleteClass}
                    onMoveClass={handleMoveClass}
                    onSelectSlot={handleSelectBulanIniSlot}
                    onOpenClassModal={handleOpenClassModal}
                  />
                ) : activeKey === "monitoringKelas" ? (
                  <MonitoringKelasView loading={sheetStatus.loading} rows={monitoringRows} />
                ) : activeKey === "mataPelajaran" ? (
                  <MapelTableView
                    headers={mapelHeaders}
                    loading={mapelStatus.loading}
                    records={filteredMapelRecords}
                    onAdd={() => handleOpenMapelModal()}
                    onEdit={handleOpenMapelModal}
                    onDelete={handleDeleteMapel}
                  />
                ) : activeKey === "pengajar" ? (
                  <PengajarTableView
                    headers={pengajarHeaders}
                    loading={pengajarStatus.loading}
                    records={filteredPengajarRecords}
                    query=""
                    onAdd={() => handleOpenPengajarModal()}
                    onEdit={handleOpenPengajarModal}
                    onDelete={handleDeletePengajar}
                  />
                ) : activeKey === "penempatanPengajar" ? (
                  <PenempatanPengajarView
                    canManage={isAdmin}
                    loading={penempatanStatus.loading}
                    records={filteredPenempatanRecords}
                    query={query}
                    onAdd={() => handleOpenPenempatanModal()}
                    onEdit={handleOpenPenempatanModal}
                    onDelete={handleDeletePenempatanPengajar}
                  />
                ) : activeKey === "izinPengajar" ? (
                  <IzinPengajarView
                    loading={izinStatus.loading}
                    records={filteredIzinRecords}
                    onAdd={() => handleOpenIzinModal()}
                    onEdit={handleOpenIzinModal}
                    onDelete={handleDeleteIzinPengajar}
                  />
                ) : activeKey === "permintaanPengajarAntarCabang" ? (
                  <PermintaanPengajarView
                    loading={permintaanStatus.loading}
                    records={filteredPermintaanRecords}
                    query={query}
                    isAdmin={isAdmin}
                    userCabang={restrictedCabang}
                    onAdd={handleOpenPermintaanModal}
                    onDelete={handleDeletePermintaanPengajar}
                    onApprove={(record) => handleUpdatePermintaanStatus(record, "Disetujui")}
                    onReject={(record) => handleUpdatePermintaanStatus(record, "Ditolak")}
                  />
                ) : activeKey === "suratTugasMengajar" ? (
                  <SuratTugasView
                    loading={suratTugasStatus.loading}
                    selectedMonthKey={selectedSuratTugasMonthKey}
                    selectedPengajarKode={selectedSuratTugasKode}
                    selectedPengajar={selectedSuratTugasPengajar}
                    selectedSessionCount={selectedSuratTugasSessionCount}
                    dayRows={suratTugasCalendar.dayRows}
                    recordsByDate={suratTugasRecordsByDate}
                  />
                ) : activeKey === "printJadwal" ? (
                  <PrintJadwalView
                    monthOptions={monthOptions}
                    selectedMonthKey={selectedMonthKey}
                    onMonthChange={setSelectedMonthKey}
                    selectedScheduleType={printScheduleType}
                    onScheduleTypeChange={setPrintScheduleType}
                    selectedClassKey={printSelectedClassKey}
                    onClassKeyChange={setPrintSelectedClassKey}
                    printCopies={printCopies}
                    onPrintCopiesChange={setPrintCopies}
                    printOrientation={printOrientation}
                    onPrintOrientationChange={setPrintOrientation}
                    regulerDates={monthScheduleDates}
                    regulerDayGroups={monthDayGroups}
                    regulerGroups={monthScheduleGroups}
                    tambahanGroups={tambahanPrintGroups}
                    mapelNameByKode={mapelNameByKode}
                  />
                ) : activeKey === "hapusJadwal" ? (
                  <HapusJadwalView
                    scheduleType={deleteScheduleType}
                    monthOptions={monthOptions}
                    selectedMonthKey={deleteMonthKey}
                    deleting={isDeletingByMonth}
                    onTypeChange={setDeleteScheduleType}
                    onMonthChange={setDeleteMonthKey}
                    onDelete={handleDeleteScheduleByMonth}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClassModal
        isOpen={isClassModalOpen}
        classDraft={classDraft}
        fixedCabang={restrictedCabang || undefined}
        showSekolahField={activeScheduleKey === "jadwalTambahanPelayanan"}
        classError={classError}
        onClose={() => {
          setIsClassModalOpen(false);
          setClassError("");
        }}
        onDraftChange={handleClassDraftChange}
        onSave={handleSaveNewClass}
      />

      <EditScheduleModal
        editingSlot={editingSlot}
        dateLabel={activeScheduleDates.find((slot) => slot.date === editingSlot?.tanggal)?.label || ""}
        draft={draft}
        mapelOptions={mapelOptions}
        pengajarOptions={filteredPengajarOptions}
        copyDateOptions={copyDateOptions}
        selectedCopyDates={copyTargetDates}
        pengajarAvailabilityWarning={pengajarAvailabilityInfo.warning}
        pengajarAvailableDateLabels={pengajarAvailabilityInfo.availableDateLabels}
        conflictError={conflictError}
        saving={sheetStatus.saving}
        onClose={clearEditing}
        onDraftChange={handleDraftChange}
        onCopyDatesChange={setCopyTargetDates}
        onDelete={handleDeleteSlot}
        onSave={handleSaveSlot}
      />

      <MapelModal
        isOpen={isMapelModalOpen}
        editingMapelOldName={editingMapelOldName}
        mapelDraft={mapelDraft}
        mapelError={mapelError}
        loading={mapelStatus.loading}
        onClose={() => setIsMapelModalOpen(false)}
        onMapelChange={(value) => setMapelDraft((prev) => ({ ...prev, Mapel: value }))}
        onKodeMapelChange={(value) => setMapelDraft((prev) => ({ ...prev, Kode_Mapel: value }))}
        onSave={handleSaveMapel}
      />

      <PengajarModal
        isOpen={isPengajarModalOpen}
        isEditing={Boolean(editingPengajarOldKode)}
        draft={pengajarDraft}
        cabangLabel={restrictedCabang || authSession?.cabang || pengajarDraft.Domisili || "-"}
        isDomisiliLocked={Boolean(restrictedCabang)}
        domisiliOptions={cabangOptions}
        bidangStudiOptions={mapelOptions}
        error={pengajarError}
        loading={pengajarStatus.loading}
        onClose={() => setIsPengajarModalOpen(false)}
        onChange={handlePengajarDraftChange}
        onBidangStudiChange={handleBidangStudiChange}
        onGeneratePassword={handleGeneratePengajarPassword}
        onSave={handleSavePengajar}
      />

      <PenempatanPengajarModal
        isOpen={isPenempatanModalOpen}
        isEditing={Boolean(penempatanOldRecord)}
        loading={penempatanStatus.loading}
        error={penempatanError}
        draft={penempatanDraft}
        pengajarOptions={pengajarPenempatanOptions}
        cabangOptions={cabangOptions}
        isDomisiliLocked={Boolean(restrictedCabang)}
        onClose={() => {
          setIsPenempatanModalOpen(false);
          setPenempatanError("");
        }}
        onDraftChange={handlePenempatanDraftChange}
        onSave={handleSavePenempatanPengajar}
      />

      <IzinPengajarModal
        isOpen={isIzinModalOpen}
        isEditing={Boolean(editingIzinId)}
        loading={izinStatus.loading}
        error={izinError}
        draft={izinDraft}
        pengajarOptions={pengajarIzinOptions}
        isDomisiliLocked={Boolean(restrictedCabang)}
        onClose={() => {
          setIsIzinModalOpen(false);
          setIzinError("");
        }}
        onDraftChange={setIzinDraft}
        onSave={handleSaveIzinPengajar}
      />

      <PermintaanPengajarModal
        isOpen={isPermintaanModalOpen}
        loading={permintaanStatus.loading}
        error={permintaanError}
        isAdmin={isAdmin}
        draft={permintaanDraft}
        pengajarOptions={pengajarPermintaanOptions}
        onClose={() => {
          setIsPermintaanModalOpen(false);
          setPermintaanError("");
        }}
        onDraftChange={setPermintaanDraft}
        onAddTanggalKhusus={handleAddPermintaanTanggalKhusus}
        onRemoveTanggalKhusus={handleRemovePermintaanTanggalKhusus}
        onSave={handleSavePermintaanPengajar}
      />

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        loading={confirmDialog.loading}
        onCancel={closeConfirmDialog}
        onConfirm={() => {
          void handleConfirmDialogAction();
        }}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="d-none"
        onChange={(event) => {
          void handleExcelImportChange(event);
        }}
      />

      <LoadingOverlay show={isBusy} message={busyMessage} />
      <ToastStack toasts={toasts} onClose={dismissToast} />

      <div
        className={`sidebar-mobile-backdrop d-lg-none ${sidebarMobileOpen ? "show" : ""}`}
        onClick={() => setSidebarMobileOpen(false)}
        aria-hidden={!sidebarMobileOpen}
      />
      <div className={`sidebar-mobile d-lg-none ${sidebarMobileOpen ? "show" : ""}`}>
        <SidebarMenu
          categories={visibleCategories}
          activeKey={activeKey}
          sidebarCollapsed={false}
          isMobile
          onCloseMobile={() => setSidebarMobileOpen(false)}
          onToggle={() => {
            // Desktop collapse is not used in mobile drawer.
          }}
          onSelect={(key) => {
            setActiveKey(key);
            clearEditing();
            setIsClassModalOpen(false);
            setIsPenempatanModalOpen(false);
            setIsIzinModalOpen(false);
            setIsPermintaanModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
