import Select from "react-select";
import type { EditingSlot, SelectOption } from "../../types/app";

type EditScheduleModalProps = {
  editingSlot: EditingSlot | null;
  dateLabel: string;
  draft: {
    mapel: string;
    pengajar: string;
    waktuMulai: string;
    waktuSelesai: string;
  };
  mapelOptions: SelectOption[];
  pengajarOptions: SelectOption[];
  copyDateOptions: SelectOption[];
  selectedCopyDates: string[];
  pengajarAvailabilityWarning: string;
  pengajarAvailableDateLabels: string[];
  conflictError: string;
  saving: boolean;
  onClose: () => void;
  onDraftChange: (field: "mapel" | "pengajar" | "waktuMulai" | "waktuSelesai", value: string) => void;
  onCopyDatesChange: (values: string[]) => void;
  onDelete: () => void;
  onSave: () => void;
};

const compactSelectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: "31px",
    height: "31px",
    fontSize: "0.875rem",
  }),
  valueContainer: (base: any) => ({
    ...base,
    height: "31px",
    padding: "0 8px",
  }),
  input: (base: any) => ({
    ...base,
    margin: "0",
    padding: "0",
  }),
  indicatorsContainer: (base: any) => ({
    ...base,
    height: "31px",
  }),
};

export function EditScheduleModal({
  editingSlot,
  dateLabel,
  draft,
  mapelOptions,
  pengajarOptions,
  copyDateOptions,
  selectedCopyDates,
  pengajarAvailabilityWarning,
  pengajarAvailableDateLabels,
  conflictError,
  saving,
  onClose,
  onDraftChange,
  onCopyDatesChange,
  onDelete,
  onSave,
}: EditScheduleModalProps) {
  if (!editingSlot) {
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
            <h5 className="mb-1">Edit Jadwal</h5>
            <div className="text-muted small">
              {editingSlot.cabang} • {editingSlot.kelas}
              {editingSlot.sekolah ? ` • ${editingSlot.sekolah}` : ""} • {dateLabel}
            </div>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="mt-3">
          <label className="form-label small fw-semibold">Mata Pelajaran</label>
          <Select
            value={
              draft.mapel
                ? (mapelOptions.find((opt) => opt.value === draft.mapel) || {
                    value: draft.mapel,
                    label: draft.mapel,
                  })
                : null
            }
            onChange={(option) => onDraftChange("mapel", option?.value || "")}
            options={mapelOptions}
            placeholder="Pilih atau cari mapel..."
            isClearable
            isSearchable
            styles={compactSelectStyles}
          />
          <label className="form-label small fw-semibold mt-3">Pengajar</label>
          <Select
            value={
              draft.pengajar
                ? (pengajarOptions.find((opt) => opt.value === draft.pengajar) || {
                    value: draft.pengajar,
                    label: draft.pengajar,
                  })
                : null
            }
            onChange={(option) => onDraftChange("pengajar", option?.value || "")}
            options={pengajarOptions}
            placeholder="Pilih atau cari pengajar..."
            isClearable
            isSearchable
            isDisabled={!draft.mapel}
            noOptionsMessage={() =>
              draft.mapel
                ? "Tidak ada pengajar sesuai mapel"
                : "Pilih mata pelajaran terlebih dulu"
            }
            styles={compactSelectStyles}
          />
          <div className="row g-2 mt-3">
            <div className="col-6">
              <label className="form-label small fw-semibold">Jam Mulai</label>
              <input
                type="time"
                value={draft.waktuMulai}
                onChange={(event) => onDraftChange("waktuMulai", event.target.value)}
                className="form-control form-control-sm"
              />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold">Jam Selesai</label>
              <input
                type="time"
                value={draft.waktuSelesai}
                onChange={(event) => onDraftChange("waktuSelesai", event.target.value)}
                className="form-control form-control-sm"
              />
            </div>
          </div>
          <label className="form-label small fw-semibold mt-3">Salin ke Tanggal Lain</label>
          <Select
            value={copyDateOptions.filter((option) => selectedCopyDates.includes(option.value))}
            onChange={(options) =>
              onCopyDatesChange((options || []).map((option) => option.value))
            }
            options={copyDateOptions}
            placeholder="Pilih satu atau beberapa tanggal..."
            isMulti
            isSearchable
            closeMenuOnSelect={false}
            styles={compactSelectStyles}
          />
          <div className="text-muted small mt-1">
            Jadwal yang disimpan akan otomatis disalin ke tanggal terpilih.
          </div>
          {draft.pengajar && (
            <div className="text-muted small mt-2">
              Keterangan: pengajar kosong pada tanggal {pengajarAvailableDateLabels.length > 0
                ? pengajarAvailableDateLabels.join(", ")
                : "-"}.
            </div>
          )}
          {pengajarAvailabilityWarning && (
            <div className="alert alert-warning py-2 text-xs mt-3" role="alert">
              {pengajarAvailabilityWarning}
            </div>
          )}
          {conflictError && (
            <div className="alert alert-danger py-2 text-xs mt-3" role="alert">
              {conflictError}
            </div>
          )}
        </div>
        <div className="mt-4 d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={onDelete}>
            {editingSlot.entryId ? "Hapus" : "Batal"}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}