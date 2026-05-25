type DashboardRequestItem = {
  id: string;
  kodePengajar: string;
  namaPengajar: string;
  cabangPeminta: string;
  cabangDomisili: string;
  status: string;
};

import { useState } from "react";
import { formatLocalDate, parseFlexibleDate, parseRangeFromString } from "../../utils/schedule";

type DashboardScheduleItem = {
  id: string;
  tanggal: string;
  waktu: string;
  mapel: string;
  pengajar: string;
  kelas: string;
  cabang: string;
  sourceLabel: string;
};

type DashboardIzinItem = {
  id: string;
  namaPengajar: string;
  domisili: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  keterangan: string;
  status: string;
  diputuskanOleh: string;
  diputuskanPada: string;
};


type DashboardViewProps = {
  loading: boolean;
  pendingRequests: DashboardRequestItem[];
  dashboardSchedules: DashboardScheduleItem[];
  izinRequests: DashboardIzinItem[];
  canManageIzin: boolean;
  canManagePermintaan: boolean;
  onApproveIzin: (item: DashboardIzinItem) => void;
  onRejectIzin: (item: DashboardIzinItem) => void;
  onApprovePermintaan: (item: DashboardRequestItem) => void;
  onRejectPermintaan: (item: DashboardRequestItem) => void;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const getInitials = (name: string) => {
  if (!name) return "-";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");
};

const colorFromString = (s: string) => {
  if (!s) return "#6c757d";
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} 60% 45%)`;
};

export function DashboardView({
  loading,
  pendingRequests,
  dashboardSchedules,
  izinRequests,
  canManageIzin,
  canManagePermintaan,
  onApproveIzin,
  onRejectIzin,
  onApprovePermintaan,
  onRejectPermintaan,
}: DashboardViewProps) {
  const todayKey = formatLocalDate(new Date());
  const tomorrowKey = formatLocalDate(new Date(Date.now() + 86400000));
  const [scheduleMode, setScheduleMode] = useState<"today" | "tomorrow" | "custom">("today");
  const [customScheduleDate, setCustomScheduleDate] = useState(todayKey);

  const selectedScheduleKey =
    scheduleMode === "today"
      ? todayKey
      : scheduleMode === "tomorrow"
      ? tomorrowKey
      : customScheduleDate;

  const scheduleLabel =
    scheduleMode === "today"
      ? "Hari ini"
      : scheduleMode === "tomorrow"
      ? "Besok"
      : new Date(customScheduleDate).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  const visibleSchedules = (dashboardSchedules || []).filter((item) => {
    const parsedDate = parseFlexibleDate(item.tanggal || "");
    return parsedDate && formatLocalDate(parsedDate) === selectedScheduleKey;
  });

  const scheduleGroups = (() => {
    const sorted = [...visibleSchedules].sort((a, b) => {
      const pa = (a.pengajar || "").toLowerCase();
      const pb = (b.pengajar || "").toLowerCase();
      if (pa !== pb) return pa.localeCompare(pb);
      const aStart = parseRangeFromString(a.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
      const bStart = parseRangeFromString(b.waktu || "")?.start ?? Number.MAX_SAFE_INTEGER;
      return aStart - bStart;
    });
    const groups = new Map<string, typeof sorted>();
    sorted.forEach((s) => {
      const key = s.pengajar || "(Tanpa Pengajar)";
      if (!groups.has(key)) groups.set(key, [] as typeof sorted);
      groups.get(key)!.push(s);
    });
    return groups;
  })();

  // Show all izin requests regardless of date status
  // (both active and expired records should be visible)
  const visibleIzinRequests = (izinRequests || []);
  const waitingIzinRequests = visibleIzinRequests.filter(
    (item) => normalizeText(item.status || "Menunggu") === "menunggu"
  );
  const showIzinSection = waitingIzinRequests.length > 0;
  const showPermintaanSection = pendingRequests.length > 0;
  const showDashboardRequestAlert = showIzinSection || showPermintaanSection;

  return (
    <div className="mt-3">
      {showDashboardRequestAlert && (
        <div className="alert alert-info border-info mb-4 shadow-sm">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div>
              <h5 className="mb-1">Permintaan baru menunggu persetujuan</h5>
              <p className="mb-0 text-muted">
                {showPermintaanSection && `${pendingRequests.length} permintaan pengajar antar cabang menunggu.`}
                {showPermintaanSection && showIzinSection && " "}
                {showIzinSection && `${waitingIzinRequests.length} permintaan izin pengajar menunggu.`}
              </p>
            </div>
            <div className="text-muted small">
              Setelah semua permintaan disetujui atau ditolak, notifikasi ini akan otomatis hilang.
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-3 p-3 mb-4 bg-body-secondary shadow-sm">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
          <div>
            <h5 className="mb-1">Jadwal {scheduleLabel}</h5>
            <p className="mb-0 text-muted">
              Pilih jadwal untuk melihat detail kelas, pengajar, dan cabang secara cepat.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn btn-sm ${scheduleMode === "today" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setScheduleMode("today")}
            >
              Hari ini
            </button>
            <button
              type="button"
              className={`btn btn-sm ${scheduleMode === "tomorrow" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setScheduleMode("tomorrow")}
            >
              Besok
            </button>
            <button
              type="button"
              className={`btn btn-sm ${scheduleMode === "custom" ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setScheduleMode("custom")}
            >
              Tanggal lain
            </button>
          </div>
          {scheduleMode === "custom" ? (
            <div className="input-group input-group-sm w-auto">
              <span className="input-group-text">Tanggal</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={customScheduleDate}
                onChange={(event) => setCustomScheduleDate(event.target.value)}
              />
            </div>
          ) : null}
        </div>
        <div className="mt-3 text-muted small">
          Menampilkan <strong>{visibleSchedules.length}</strong> jadwal untuk <strong>{scheduleLabel}</strong>.
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span className="badge text-bg-warning-subtle border border-warning-subtle text-warning-emphasis px-3 py-2">
          Permintaan Menunggu: {pendingRequests.length}
        </span>
        <span className="badge text-bg-primary-subtle border border-primary-subtle text-primary-emphasis px-3 py-2">
          Jadwal Terpilih: {visibleSchedules.length}
        </span>
        <span className="badge text-bg-danger-subtle border border-danger-subtle text-danger-emphasis px-3 py-2">
          Izin Pengajar: {visibleIzinRequests.length}
        </span>
      </div>

      {showIzinSection && (
        <>
          <h6 className="fw-semibold mb-2">Permintaan Izin Pengajar</h6>
          <div className="table-responsive border rounded table-sticky-wrapper mb-4 dashboard-table-wrapper">
            <table className="table table-sm table-bordered align-middle mb-0 table-sticky">
              <thead className="table-light">
                <tr>
                  <th>Nama Pengajar</th>
                  <th>Domisili</th>
                  <th>Tanggal Mulai</th>
                  <th>Tanggal Selesai</th>
                  <th>Keterangan Izin</th>
                  <th>Keterangan Status</th>
                  <th>Diputuskan Oleh</th>
                  <th>Diputuskan Pada</th>
                  <th className="text-center" style={{ width: 130 }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-3">
                      Memuat data dashboard...
                    </td>
                  </tr>
                ) : (
                  waitingIzinRequests.map((item) => {
                    const normalizedStatus = normalizeText(item.status || "Menunggu");
                    const canShowAction = canManageIzin && normalizedStatus === "menunggu";
                    return (
                      <tr key={item.id}>
                        <td>{item.namaPengajar || "-"}</td>
                        <td>{item.domisili || "-"}</td>
                        <td>{item.tanggalMulai || "-"}</td>
                        <td>{item.tanggalSelesai || "-"}</td>
                        <td>{item.keterangan || "-"}</td>
                        <td>
                          <span className="badge text-bg-warning">{item.status || "Menunggu"}</span>
                        </td>
                        <td>{item.diputuskanOleh || "-"}</td>
                        <td>{item.diputuskanPada || "-"}</td>
                        <td>
                          {canShowAction ? (
                            <div className="d-flex justify-content-center gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => onApproveIzin(item)}
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => onRejectIzin(item)}
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showPermintaanSection && (
        <>
          <h6 className="fw-semibold mb-2">Permintaan Pengajar Antar Cabang (Menunggu)</h6>
          <div className="table-responsive border rounded table-sticky-wrapper mb-4 dashboard-table-wrapper">
            <table className="table table-sm table-bordered align-middle mb-0 table-sticky">
              <thead className="table-light">
                <tr>
                  <th>Kode Pengajar</th>
                  <th>Nama Pengajar</th>
                  <th>Cabang Peminta</th>
                  <th>Cabang Domisili</th>
                  <th>Status</th>
                  <th className="text-center" style={{ width: 130 }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-3">
                      Memuat data dashboard...
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((item) => {
                    const statusKey = normalizeText(item.status || "Menunggu");
                    const canShowAction = canManagePermintaan && statusKey === "menunggu";
                    return (
                      <tr key={item.id}>
                        <td>{item.kodePengajar || "-"}</td>
                        <td>{item.namaPengajar || "-"}</td>
                        <td>{item.cabangPeminta || "-"}</td>
                        <td>{item.cabangDomisili || "-"}</td>
                        <td>
                          <span className="badge text-bg-warning">{item.status || "Menunggu"}</span>
                        </td>
                        <td>
                          {canShowAction ? (
                            <div className="d-flex justify-content-center gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => onApprovePermintaan(item)}
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => onRejectPermintaan(item)}
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h6 className="fw-semibold mb-2">Jadwal {scheduleLabel}</h6>
      <div className="border rounded table-sticky-wrapper dashboard-table-wrapper" style={{ maxHeight: 520, overflowY: "auto", overflowX: "hidden" }}>
        {/* Group schedules by pengajar and sort */}
        {loading ? (
          <div className="p-3 text-center text-muted">Memuat data dashboard...</div>
        ) : visibleSchedules.length === 0 ? (
          <div className="p-3 text-center text-muted">Tidak ada jadwal untuk tanggal ini.</div>
        ) : (
          <div className="p-2">
            <div className="row row-cols-1 row-cols-md-auto g-1 justify-content-start">
              {Array.from(scheduleGroups.entries()).map(([pengajar, items]) => (
                <div key={pengajar} className="col-12 col-md-auto">
                  <div className="card h-100 shadow-sm" style={{ minWidth: 280, maxWidth: 420 }}>
                    <div className="card-body p-1">
                      <div className="d-flex align-items-center mb-1">
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 18,
                            backgroundColor: colorFromString(pengajar),
                            color: "#fff",
                            marginRight: 6,
                            fontWeight: 700,
                          }}
                        >
                          {getInitials(pengajar)}
                        </div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{pengajar}</div>
                          <div className="text-muted small">{items.length} sesi • {scheduleLabel}</div>
                        </div>
                        <div>
                          <span className="badge text-bg-primary">{items.length}</span>
                        </div>
                      </div>

                      <div style={{ maxHeight: 240, overflowY: "auto", overflowX: "hidden" }}>
                        <ul className="list-group list-group-flush" style={{ minWidth: 0 }}>
                          {items.map((item) => (
                            <li key={item.id} className="list-group-item d-flex align-items-center py-1 flex-wrap gap-1" style={{ minWidth: 0 }}>
                              <div style={{ width: 60, minWidth: 60 }} className="text-xxs fw-semibold flex-shrink-0">{item.waktu || "-"}</div>
                              <div className="flex-grow-1 ms-0 pe-1" style={{ minWidth: 0 }}>
                                <div className="fw-semibold text-xxs text-truncate d-block" style={{ maxWidth: "100%", overflow: "hidden" }}>{item.mapel || "-"}</div>
                                <div className="text-muted text-xxs text-truncate d-block" style={{ maxWidth: "100%", overflow: "hidden" }}>{item.kelas || "-"}</div>
                              </div>
                              <div style={{ minWidth: 0, maxWidth: 110 }} className="text-end ps-1 flex-shrink-1">
                                <span className="badge bg-secondary text-xxs d-inline-block" style={{ maxWidth: "100%", whiteSpace: "normal", overflowWrap: "break-word" }}>{item.sourceLabel}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}