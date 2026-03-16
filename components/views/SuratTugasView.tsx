import { sesiHeaders } from "../../utils/schedule";
import { formatSessionParts } from "../../utils/schedule";

type SuratDayRow = {
  dayLabel: string;
  dates: Array<{ date: string; label: string }>;
};

type SuratTugasViewProps = {
  loading: boolean;
  selectedMonthKey: string;
  selectedPengajarKode: string;
  selectedPengajar: Record<string, string> | null;
  selectedSessionCount: number;
  dayRows: SuratDayRow[];
  recordsByDate: Map<string, Record<string, string>[]>;
};

export function SuratTugasView({
  loading,
  selectedMonthKey,
  selectedPengajarKode,
  selectedPengajar,
  selectedSessionCount,
  dayRows,
  recordsByDate,
}: SuratTugasViewProps) {
  const shouldShowSessions = Boolean(selectedPengajarKode);

  return (
    <>
      <div className="mt-4 mb-2 small text-muted">
        <span className="me-3">Nama: {selectedPengajar?.Nama || "-"}</span>
        <span className="me-3">Bidang Studi: {selectedPengajar?.["Bidang Studi"] || "-"}</span>
        <span className="me-3">Domisili: {selectedPengajar?.Domisili || "-"}</span>
        <span>Jumlah Sesi: {selectedSessionCount}</span>
      </div>

      {!selectedMonthKey ? (
        <div className="alert alert-info mt-3 mb-0 text-xs">Pilih bulan terlebih dahulu untuk menampilkan data surat tugas.</div>
      ) : (
        <div className="table-responsive border rounded mt-4 table-sticky-wrapper">
          <table className="table table-bordered align-middle mb-0 table-sticky">
            <thead className="table-light">
              <tr>
                <th className="text-center" style={{ width: 120 }}>
                  HARI
                </th>
                <th className="text-center text-nowrap" style={{ width: 140 }}>
                  TANGGAL
                </th>
                {sesiHeaders.map((header) => (
                  <th key={header} className="text-center text-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center text-muted py-4">
                    Memuat data surat tugas...
                  </td>
                </tr>
              ) : (
                dayRows.flatMap((row) =>
                  row.dates.map((slot, slotIndex) => {
                    const dateRecords = shouldShowSessions ? recordsByDate.get(slot.date) ?? [] : [];
                    return (
                      <tr key={`${row.dayLabel}-${slot.date}`} className={slotIndex === 0 ? "surat-day-separator" : ""}>
                        <td className="fw-semibold">{slotIndex === 0 ? row.dayLabel : ""}</td>
                        <td>{slot.label}</td>
                        {sesiHeaders.map((sessionHeader) => {
                          const sessionValues = dateRecords
                            .map((record) => (record[sessionHeader] || "").trim())
                            .filter(Boolean);
                          return (
                            <td key={`${slot.date}-${sessionHeader}`}>
                              {!shouldShowSessions ? null : sessionValues.length === 0 ? (
                                <span className="text-muted">-</span>
                              ) : (
                                <div className="session-cell">
                                  {sessionValues.map((sessionValue, valueIndex) => {
                                    const sessionParts = formatSessionParts(sessionValue);
                                    return (
                                      <div key={`${sessionHeader}-${valueIndex}`} className="session-entry">
                                        {sessionParts.length > 0
                                          ? sessionParts.map((part, partIndex) => (
                                              <div key={`${sessionHeader}-${valueIndex}-${partIndex}`}>{part}</div>
                                            ))
                                          : <div>{sessionValue}</div>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}