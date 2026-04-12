type DashboardRequestItem = {
  id: string;
  kodePengajar: string;
  namaPengajar: string;
  cabangPeminta: string;
  cabangDomisili: string;
  status: string;
};

type DashboardScheduleItem = {
  id: string;
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
  todaySchedules: DashboardScheduleItem[];
  izinRequests: DashboardIzinItem[];
  canManageIzin: boolean;
  onApproveIzin: (item: DashboardIzinItem) => void;
  onRejectIzin: (item: DashboardIzinItem) => void;
};

export function DashboardView({
  loading,
  pendingRequests,
  todaySchedules,
  izinRequests,
  canManageIzin,
  onApproveIzin,
  onRejectIzin,
}: DashboardViewProps) {
  return (
    <div className="mt-3">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span className="badge text-bg-warning-subtle border border-warning-subtle text-warning-emphasis px-3 py-2">
          Permintaan Menunggu: {pendingRequests.length}
        </span>
        <span className="badge text-bg-primary-subtle border border-primary-subtle text-primary-emphasis px-3 py-2">
          Jadwal Hari Ini: {todaySchedules.length}
        </span>
        <span className="badge text-bg-danger-subtle border border-danger-subtle text-danger-emphasis px-3 py-2">
          Izin Pengajar: {izinRequests.length}
        </span>
      </div>

      <h6 className="fw-semibold mb-2">Permintaan Izin Pengajar</h6>
      <div className="table-responsive border rounded table-sticky-wrapper mb-4">
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
            ) : izinRequests.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted py-3">
                  Tidak ada permintaan izin pengajar.
                </td>
              </tr>
            ) : (
              izinRequests.map((item) => {
                const normalizedStatus = (item.status || "Menunggu").trim().toLowerCase();
                const canShowAction = canManageIzin && normalizedStatus === "menunggu";
                return (
                <tr key={item.id}>
                  <td>{item.namaPengajar || "-"}</td>
                  <td>{item.domisili || "-"}</td>
                  <td>{item.tanggalMulai || "-"}</td>
                  <td>{item.tanggalSelesai || "-"}</td>
                  <td>{item.keterangan || "-"}</td>
                  <td>
                    <span
                      className={`badge ${
                        normalizedStatus === "disetujui"
                          ? "text-bg-success"
                          : normalizedStatus === "ditolak"
                            ? "text-bg-danger"
                            : "text-bg-warning"
                      }`}
                    >
                      {item.status || "Menunggu"}
                    </span>
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

      <h6 className="fw-semibold mb-2">Permintaan Pengajar Antar Cabang (Menunggu)</h6>
      <div className="table-responsive border rounded table-sticky-wrapper mb-4">
        <table className="table table-sm table-bordered align-middle mb-0 table-sticky">
          <thead className="table-light">
            <tr>
              <th>Kode Pengajar</th>
              <th>Nama Pengajar</th>
              <th>Cabang Peminta</th>
              <th>Cabang Domisili</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-3">
                  Memuat data dashboard...
                </td>
              </tr>
            ) : pendingRequests.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-3">
                  Tidak ada permintaan pengajar menunggu.
                </td>
              </tr>
            ) : (
              pendingRequests.map((item) => (
                <tr key={item.id}>
                  <td>{item.kodePengajar || "-"}</td>
                  <td>{item.namaPengajar || "-"}</td>
                  <td>{item.cabangPeminta || "-"}</td>
                  <td>{item.cabangDomisili || "-"}</td>
                  <td>
                    <span className="badge text-bg-warning">{item.status || "Menunggu"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h6 className="fw-semibold mb-2">Jadwal Hari Ini</h6>
      <div className="table-responsive border rounded table-sticky-wrapper">
        <table className="table table-sm table-bordered align-middle mb-0 table-sticky">
          <thead className="table-light">
            <tr>
              <th>Waktu</th>
              <th>Mata Pelajaran</th>
              <th>Pengajar</th>
              <th>Kelas</th>
              <th>Cabang</th>
              <th>Jenis Jadwal</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-3">
                  Memuat data dashboard...
                </td>
              </tr>
            ) : todaySchedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-3">
                  Belum ada jadwal untuk hari ini.
                </td>
              </tr>
            ) : (
              todaySchedules.map((item) => (
                <tr key={item.id}>
                  <td>{item.waktu || "-"}</td>
                  <td>{item.mapel || "-"}</td>
                  <td>{item.pengajar || "-"}</td>
                  <td>{item.kelas || "-"}</td>
                  <td>{item.cabang || "-"}</td>
                  <td>{item.sourceLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}