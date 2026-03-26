type PenempatanPengajarViewProps = {
  canManage: boolean;
  loading: boolean;
  records: Record<string, string>[];
  query: string;
  onAdd: () => void;
  onEdit: (record: Record<string, string>) => void;
  onDelete: (record: Record<string, string>) => void;
};

const placementHeaders = [
  "Kode Pengajar",
  "Nama Pengajar",
  "Domisili",
  "Hari",
  "Jam Mulai",
  "Jam Selesai",
  "Cabang Penempatan",
];

export function PenempatanPengajarView({
  canManage,
  loading,
  records,
  query,
  onAdd,
  onEdit,
  onDelete,
}: PenempatanPengajarViewProps) {
  const lowered = query.trim().toLowerCase();
  const filtered = !lowered
    ? records
    : records.filter((record) =>
        placementHeaders.some((header) => (record[header] || "").toLowerCase().includes(lowered))
      );

  return (
    <>
      {canManage ? (
        <div className="d-flex justify-content-end mb-3 mt-4">
          <button
            type="button"
            onClick={onAdd}
            className="btn btn-primary btn-sm d-flex align-items-center gap-2"
          >
            <i className="bi bi-plus-lg" />
            Tambah Penempatan
          </button>
        </div>
      ) : null}

      <div className="table-responsive border rounded table-sticky-wrapper">
        <table className="table table-bordered align-middle mb-0 table-sticky">
          <thead className="table-light">
            <tr>
              {canManage ? (
                <th className="text-center" style={{ width: 90 }}>
                  Aksi
                </th>
              ) : null}
              {placementHeaders.map((header) => (
                <th key={header} className="text-center text-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={placementHeaders.length + (canManage ? 1 : 0)} className="text-center text-muted py-4">
                  Memuat data penempatan pengajar...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={placementHeaders.length + (canManage ? 1 : 0)} className="text-center text-muted py-4">
                  Belum ada data penempatan pengajar.
                </td>
              </tr>
            ) : (
              filtered.map((record, index) => (
                <tr key={`penempatan-${index}`}>
                  {canManage ? (
                    <td className="text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="btn btn-outline-secondary btn-sm btn-icon"
                          aria-label="Edit penempatan"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(record)}
                          className="btn btn-outline-danger btn-sm btn-icon"
                          aria-label="Hapus penempatan"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                  {placementHeaders.map((header) => (
                    <td key={`${index}-${header}`}>{record[header] || "-"}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}