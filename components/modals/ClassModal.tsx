type ClassModalProps = {
  isOpen: boolean;
  classDraft: { cabang: string; kelas: string; sekolah: string };
  fixedCabang?: string;
  showSekolahField?: boolean;
  classError: string;
  onClose: () => void;
  onDraftChange: (field: "cabang" | "kelas" | "sekolah", value: string) => void;
  onSave: () => void;
};

export function ClassModal({
  isOpen,
  classDraft,
  fixedCabang,
  showSekolahField,
  classError,
  onClose,
  onDraftChange,
  onSave,
}: ClassModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow p-4 w-100"
        style={{ maxWidth: 460 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h5 className="mb-1">Tambah Kelas</h5>
            <div className="text-muted small">
              {showSekolahField
                ? "Tambahkan kelas dan sekolah agar tampil di Jadwal Tambahan & Pelayanan."
                : "Tambahkan cabang dan kelas baru agar tampil di tabel jadwal."}
            </div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold">Cabang</label>
          {fixedCabang ? (
            <input value={fixedCabang} className="form-control form-control-sm" disabled />
          ) : (
            <input
              value={classDraft.cabang}
              onChange={(event) => onDraftChange("cabang", event.target.value)}
              placeholder="Semarang 1"
              className="form-control form-control-sm"
            />
          )}
          <label className="form-label small fw-semibold mt-3">Kelas</label>
          <input
            value={classDraft.kelas}
            onChange={(event) => onDraftChange("kelas", event.target.value)}
            placeholder="PIKPU-1"
            className="form-control form-control-sm"
          />
          {showSekolahField && (
            <>
              <label className="form-label small fw-semibold mt-3">Sekolah</label>
              <input
                value={classDraft.sekolah}
                onChange={(event) => onDraftChange("sekolah", event.target.value)}
                placeholder="SMA N1 Semarang"
                className="form-control form-control-sm"
              />
            </>
          )}
          {classError && (
            <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
              {classError}
            </div>
          )}
        </div>
        <div className="mt-4 d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave}>
            Simpan Kelas
          </button>
        </div>
      </div>
    </div>
  );
}