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

type DashboardViewProps = {
  loading: boolean;
  pendingRequests: DashboardRequestItem[];
  todaySchedules: DashboardScheduleItem[];
};

export function DashboardView({ loading, pendingRequests, todaySchedules }: DashboardViewProps) {
  return (
    <div className="mt-3">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span className="badge text-bg-warning-subtle border border-warning-subtle text-warning-emphasis px-3 py-2">
          Permintaan Menunggu: {pendingRequests.length}
        </span>
        <span className="badge text-bg-primary-subtle border border-primary-subtle text-primary-emphasis px-3 py-2">
          Jadwal Hari Ini: {todaySchedules.length}
        </span>
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