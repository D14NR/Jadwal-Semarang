import Select from "react-select";
import type { SelectOption } from "../../types/app";

export type PenempatanDraft = {
  kodePengajar: string;
  namaPengajar: string;
  domisili: string;
  availabilityList: {
    hari: string;
    enabled: boolean;
    jamMulai: string;
    jamSelesai: string;
    cabangList: string[];
  }[];
};

type PenempatanPengajarModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  loading: boolean;
  error: string;
  draft: PenempatanDraft;
  pengajarOptions: SelectOption[];
  cabangOptions: string[];
  isDomisiliLocked: boolean;
  onClose: () => void;
  onDraftChange: (next: PenempatanDraft) => void;
  onSave: () => void;
};

const hariOptions = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

const enabledDayCount = (draft: PenempatanDraft) =>
  draft.availabilityList.filter((item) => item.enabled).length;

export function PenempatanPengajarModal({
  isOpen,
  isEditing,
  loading,
  error,
  draft,
  pengajarOptions,
  cabangOptions,
  isDomisiliLocked,
  onClose,
  onDraftChange,
  onSave,
}: PenempatanPengajarModalProps) {
  if (!isOpen) {
    return null;
  }

  const allDaysSelected = enabledDayCount(draft) === hariOptions.length;
  const selectedAvailabilities = draft.availabilityList.filter((item) => item.enabled);
  const isAllDayTime =
    selectedAvailabilities.length > 0 &&
    selectedAvailabilities.every((item) => item.jamMulai === "00:00" && item.jamSelesai === "23:59");

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center modal-backdrop-custom p-3"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3 shadow p-4 w-100"
        style={{ maxWidth: 760, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5 className="mb-1">{isEditing ? "Edit" : "Tambah"} Penempatan Pengajar</h5>
            <div className="text-muted small">Atur ketersediaan hari, jam, dan cabang mengajar.</div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-12 col-md-8">
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
                onDraftChange({
                  ...draft,
                  kodePengajar: selected,
                  namaPengajar: selected ? draft.namaPengajar : "",
                  domisili: selected ? draft.domisili : "",
                });
              }}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label small fw-semibold">Domisili</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={draft.domisili}
              readOnly={isDomisiliLocked}
              onChange={(event) => onDraftChange({ ...draft, domisili: event.target.value })}
            />
          </div>

          <div className="col-12">
            <label className="form-label small fw-semibold">Hari Tersedia</label>
            <div className="mb-2 d-flex flex-wrap gap-3 align-items-center">
              <label className="form-check form-check-inline m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={allDaysSelected}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    onDraftChange({
                      ...draft,
                      availabilityList: draft.availabilityList.map((item) => ({
                        ...item,
                        enabled: checked,
                      })),
                    });
                  }}
                />
                <span className="form-check-label fw-semibold">Semua Hari</span>
              </label>

              <label className="form-check form-check-inline m-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={isAllDayTime}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onDraftChange({
                        ...draft,
                        availabilityList: draft.availabilityList.map((entry) =>
                          entry.enabled ? { ...entry, jamMulai: "00:00", jamSelesai: "23:59" } : entry
                        ),
                      });
                    } else {
                      onDraftChange({
                        ...draft,
                        availabilityList: draft.availabilityList.map((entry) =>
                          entry.enabled ? { ...entry, jamMulai: "", jamSelesai: "" } : entry
                        ),
                      });
                    }
                  }}
                />
                <span className="form-check-label fw-semibold">Semua Jam</span>
              </label>
            </div>
            <div className="table-responsive border rounded">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 90 }}>Pilih</th>
                    <th>Hari</th>
                    <th style={{ width: 160 }}>Jam Mulai</th>
                    <th style={{ width: 160 }}>Jam Selesai</th>
                    <th style={{ minWidth: 260 }}>Cabang Penempatan</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.availabilityList.map((item) => (
                    <tr key={item.hari}>
                      <td>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(event) => {
                            const nextAvailability = draft.availabilityList.map((entry) =>
                              entry.hari === item.hari
                                ? { ...entry, enabled: event.target.checked }
                                : entry
                            );
                            onDraftChange({ ...draft, availabilityList: nextAvailability });
                          }}
                        />
                      </td>
                      <td>{item.hari}</td>
                      <td>
                        <input
                          type="time"
                          step={60}
                          className="form-control form-control-sm"
                          value={item.jamMulai}
                          disabled={!item.enabled}
                          onChange={(event) => {
                            const nextAvailability = draft.availabilityList.map((entry) =>
                              entry.hari === item.hari
                                ? { ...entry, jamMulai: event.target.value }
                                : entry
                            );
                            onDraftChange({ ...draft, availabilityList: nextAvailability });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          step={60}
                          className="form-control form-control-sm"
                          value={item.jamSelesai}
                          disabled={!item.enabled}
                          onChange={(event) => {
                            const nextAvailability = draft.availabilityList.map((entry) =>
                              entry.hari === item.hari
                                ? { ...entry, jamSelesai: event.target.value }
                                : entry
                            );
                            onDraftChange({ ...draft, availabilityList: nextAvailability });
                          }}
                        />
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {cabangOptions.map((cabang) => {
                            const checked = item.cabangList.includes(cabang);
                            return (
                              <label key={`${item.hari}-${cabang}`} className="form-check form-check-inline m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!item.enabled}
                                  onChange={(event) => {
                                    const nextAvailability = draft.availabilityList.map((entry) => {
                                      if (entry.hari !== item.hari) {
                                        return entry;
                                      }
                                      const nextCabang = event.target.checked
                                        ? Array.from(new Set([...entry.cabangList, cabang]))
                                        : entry.cabangList.filter((entryCabang) => entryCabang !== cabang);
                                      return {
                                        ...entry,
                                        cabangList: nextCabang,
                                      };
                                    });
                                    onDraftChange({ ...draft, availabilityList: nextAvailability });
                                  }}
                                />
                                <span className="form-check-label">{cabang}</span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-muted small mt-1">
              Gunakan format jam HH:MM, contoh 13:15.
            </div>
          </div>

          <div className="col-12">
            <div className="text-muted small">Pilih cabang penempatan pada setiap baris hari yang diaktifkan.</div>
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
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}