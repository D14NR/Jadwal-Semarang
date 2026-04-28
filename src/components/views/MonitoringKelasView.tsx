import type { MonitoringRow } from "../../types/app";
import { getTagStyle } from "../../utils/tagColor";

type MonitoringKelasViewProps = {
  loading: boolean;
  rows: MonitoringRow[];
};

export function MonitoringKelasView({ loading, rows }: MonitoringKelasViewProps) {
  // Get all unique subject codes from all rows
  const allMapelKodes = Array.from(
    new Set(
      rows.flatMap((row) => Object.keys(row.mapelCountByKode))
    )
  ).sort();

  const getCountColor = (count: number | undefined) => {
    if (!count || count === 0) return "#f0f0f0"; // light gray
    if (count === 1) return "#c8e6c9"; // light green
    if (count === 2) return "#a5d6a7"; // green
    if (count === 3) return "#81c784"; // darker green
    return "#66bb6a"; // darkest green
  };

  return (
    <div className="table-responsive border rounded mt-4 table-sticky-wrapper">
      <table className="table table-bordered align-middle mb-0 table-sticky">
        <thead className="table-light">
          <tr>
            <th 
              className="text-center text-nowrap"
              style={{ width: 120, backgroundColor: "#f8f9fa" }}
            >
              Kelas
            </th>
            {allMapelKodes.map((kode) => (
              <th
                key={kode}
                className="text-center text-nowrap"
                style={{ width: 45, fontSize: "0.75rem" }}
              >
                {kode}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={allMapelKodes.length + 1} className="text-center text-muted py-4">
                Memuat data jadwal...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={allMapelKodes.length + 1} className="text-center text-muted py-4">
                Belum ada data jadwal untuk ditampilkan.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${row.cabang}-${row.kelas}`}>
                <td 
                  className="fw-semibold text-nowrap"
                  style={{ backgroundColor: "#f8f9fa" }}
                >
                  {row.kelas}
                </td>
                {allMapelKodes.map((kode) => {
                  const count = row.mapelCountByKode[kode] || 0;
                  return (
                    <td
                      key={`${row.cabang}-${row.kelas}-${kode}`}
                      className="text-center fw-semibold"
                      style={{
                        backgroundColor: getCountColor(count),
                        color: count > 2 ? "#fff" : "#000",
                      }}
                    >
                      {count > 0 ? count : "-"}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}