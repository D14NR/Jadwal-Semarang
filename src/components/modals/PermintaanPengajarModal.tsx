import Select from "react-select";
import type { SelectOption } from "../../types/app";

export type PermintaanDraft = {
  id: string;
  kodePengajar: string;
  namaPengajar: string;
  cabangPeminta: string;
  cabangTujuan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  tanggalList: string[];
  tanggalInput: string;
  hariList: string[];
  jamMulai: string;
  jamSelesai: string;
  catatan: string;
};

type PermintaanPengajarModalProps = {
  isOpen: boolean;
  loading: boolean;
  error: string;
  isAdmin: boolean;
  draft: PermintaanDraft;
  pengajarOptions: SelectOption[];
  onClose: () => void;
  onSave: () => void;
  onDraftChange: (next: PermintaanDraft) => void;
  onAddTanggalKhusus: () => void;
  onRemoveTanggalKhusus: (tanggal: string) => void;
};

const dayOptions = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export function PermintaanPengajarModal({
  isOpen,
  loading,
  error,
  isAdmin,
  draft,
  pengajarOptions,
  onClose,
  onSave,
  onDraftChange,
  onAddTanggalKhusus,
  onRemoveTanggalKhusus,
}: PermintaanPengajarModalProps) {
  if (!isOpen) {
    return null;
  }

  const allDaysChecked = dayOptions.every((day) => draft.hariList.includes(day));

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow p-4 w-100"
        style={{ maxWidth: 680 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5 className="mb-1">Permintaan Pengajar Antar Cabang</h5>
            <div className="text-muted small">Buat permintaan, lalu tunggu persetujuan cabang domisili.</div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-12 col-md-7">
            <label className="form-label small fw-semibold">Pengajar</label>
            <Select
              value={
                draft.kodePengajar
                  ? pengajarOptions.find((option) => option.value === draft.kodePengajar) || null
                  : null
              }
              options={pengajarOptions}
              isSearchable
              placeholder="Pilih pengajar"
              onChange={(option) => {
                const selected = option?.value || "";
                const selectedLabel = option?.label || "";
                const parts = selectedLabel.split(" - ");
                const nama = parts.slice(1).join(" - ") || "";
                const domisili = parts.length > 2 ? parts[parts.length - 1] : draft.cabangTujuan;
                onDraftChange({
                  ...draft,
                  kodePengajar: selected,
                  namaPengajar: nama,
                  cabangTujuan: domisili,
                });
              }}
              classNamePrefix="react-select"
              menuPortalTarget={typeof document !== "undefined" ? document.body : null}
              menuPosition="absolute"
              styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
              noOptionsMessage={() => "Data pengajar tidak ditemukan"}
            />
          </div>

          <div className="col-12 col-md-5">
            <label className="form-label small fw-semibold">Cabang Peminta</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.cabangPeminta}
              readOnly={!isAdmin}
              onChange={(event) => onDraftChange({ ...draft, cabangPeminta: event.target.value })}
            />
          </div>

          <div className="col-12 col-md-5">
            <label className="form-label small fw-semibold">Cabang Domisili</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.cabangTujuan}
              readOnly
            />
          </div>

          <div className="col-12 col-md-7">
            <label className="form-label small fw-semibold">Hari Diminta</label>
            <div className="d-flex flex-wrap gap-2 border rounded p-2">
              <label className="form-check form-check-inline m-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={allDaysChecked}
                  onChange={(event) => {
                    onDraftChange({
                      ...draft,
                      hariList: event.target.checked ? [...dayOptions] : [],
                    });
                  }}
                />
                <span className="form-check-label fw-semibold">Semua Hari</span>
              </label>
              {dayOptions.map((day) => {
                const checked = draft.hariList.includes(day);
                return (
                  <label key={day} className="form-check form-check-inline m-0">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={checked}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...draft.hariList, day]
                          : draft.hariList.filter((item) => item !== day);
                        onDraftChange({ ...draft, hariList: Array.from(new Set(next)) });
                      }}
                    />
                    <span className="form-check-label">{day}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold">Tanggal Mulai</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.tanggalMulai}
              onChange={(event) => onDraftChange({ ...draft, tanggalMulai: event.target.value })}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold">Tanggal Selesai</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={draft.tanggalSelesai}
              onChange={(event) => onDraftChange({ ...draft, tanggalSelesai: event.target.value })}
            />
          </div>

          <div className="col-12">
            <label className="form-label small fw-semibold mb-1">Tanggal Khusus (opsional)</label>
            <div className="d-flex gap-2">
              <input
                type="date"
                className="form-control form-control-sm"
                value={draft.tanggalInput}
                onChange={(event) => onDraftChange({ ...draft, tanggalInput: event.target.value })}
              />
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={onAddTanggalKhusus}>
                Tambah Tanggal
              </button>
            </div>
            {draft.tanggalList.length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {draft.tanggalList.map((tanggal) => (
                  <span key={tanggal} className="badge rounded-pill text-bg-light border">
                    {tanggal}
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger p-0 ms-2"
                      onClick={() => onRemoveTanggalKhusus(tanggal)}
                      aria-label={`Hapus ${tanggal}`}
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="form-text">
              Gunakan jika permintaan hanya untuk beberapa tanggal tertentu (tidak berurutan).
            </div>
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold">Jam Mulai</label>
            <input
              type="time"
              className="form-control form-control-sm"
              value={draft.jamMulai}
              onChange={(event) => onDraftChange({ ...draft, jamMulai: event.target.value })}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold">Jam Selesai</label>
            <input
              type="time"
              className="form-control form-control-sm"
              value={draft.jamSelesai}
              onChange={(event) => onDraftChange({ ...draft, jamSelesai: event.target.value })}
            />
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small fw-semibold">Catatan</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.catatan}
              placeholder="Opsional"
              onChange={(event) => onDraftChange({ ...draft, catatan: event.target.value })}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">
            {error}
          </div>
        )}

        <div className="mt-4 d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Permintaan"}
          </button>
        </div>
      </div>
    </div>
  );
}