import { useState } from "react";
import { formatScheduleLabelWithDay } from "../../utils/schedule";
import { getTagStyle } from "../../utils/tagColor";
import type { EditingSlot, RecordItem, ScheduleDayGroup, ScheduleGroup, ScheduleSlotDate } from "../../types/app";

type ScheduleTableViewProps = {
  isJadwalTambahanMenu: boolean;
  readOnly: boolean;
  activeScheduleDates: ScheduleSlotDate[];
  activeDayGroups: ScheduleDayGroup[];
  activeDayStartIndexes: Set<number>;
  monthScheduleGroups: ScheduleGroup[];
  editingSlot: EditingSlot | null;
  saving: boolean;
  onInlineSaveClass: (group: ScheduleGroup, kelas: string, sekolah: string) => Promise<boolean>;
  onDeleteClass: (group: ScheduleGroup) => void;
  onSelectSlot: (group: ScheduleGroup, slot: ScheduleSlotDate, item?: RecordItem) => void;
  onOpenClassModal: () => void;
};

export function ScheduleTableView({
  isJadwalTambahanMenu,
  readOnly,
  activeScheduleDates,
  activeDayGroups,
  activeDayStartIndexes,
  monthScheduleGroups,
  editingSlot,
  saving,
  onInlineSaveClass,
  onDeleteClass,
  onSelectSlot,
  onOpenClassModal,
}: ScheduleTableViewProps) {
  const [editingClassKey, setEditingClassKey] = useState<string | null>(null);
  const [kelasDraft, setKelasDraft] = useState("");
  const [sekolahDraft, setSekolahDraft] = useState("");

  const startClassEdit = (group: ScheduleGroup) => {
    const key = `${group.cabang}||${group.kelas}||${group.sekolah || ""}`;
    setEditingClassKey(key);
    setKelasDraft(group.kelas || "");
    setSekolahDraft(group.sekolah || "");
  };

  const cancelClassEdit = () => {
    setEditingClassKey(null);
    setKelasDraft("");
    setSekolahDraft("");
  };

  const submitClassEdit = async (group: ScheduleGroup) => {
    const success = await onInlineSaveClass(group, kelasDraft, sekolahDraft);
    if (success) {
      cancelClassEdit();
    }
  };

  return (
    <>
      <div className="table-responsive border rounded mt-4 table-sticky-wrapper">
        <table className="table table-bordered align-middle schedule-table mb-0 table-sticky">
          <thead className="table-light">
            {isJadwalTambahanMenu ? (
              <tr>
                <th className="text-center col-aksi sticky-col-aksi">Aksi</th>
                <th className="text-center col-kelas sticky-col-kelas">Kelas</th>
                {activeScheduleDates.map((slot) => {
                  const [year, month, day] = slot.date.split("-").map(Number);
                  const slotDate = new Date(year, month - 1, day);
                  return <th key={slot.date}>{formatScheduleLabelWithDay(slotDate)}</th>;
                })}
              </tr>
            ) : (
              <>
                <tr>
                  <th rowSpan={2} className="text-center col-aksi sticky-col-aksi">
                    Aksi
                  </th>
                  <th rowSpan={2} className="text-center col-kelas sticky-col-kelas">
                    Kelas
                  </th>
                  {activeDayGroups.map((group, groupIndex) => (
                    <th key={group.label} colSpan={group.count} className={`text-center ${groupIndex > 0 ? "day-divider" : ""}`}>
                      {group.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {activeScheduleDates.map((slot, index) => (
                    <th key={slot.date} className={activeDayStartIndexes.has(index) && index !== 0 ? "day-divider" : ""}>
                      {slot.label}
                    </th>
                  ))}
                </tr>
              </>
            )}
          </thead>
          <tbody>
            {monthScheduleGroups.length === 0 ? (
              <tr>
                <td colSpan={activeScheduleDates.length + 2} className="text-center text-muted py-4">
                  {isJadwalTambahanMenu
                    ? "Belum ada jadwal tambahan dan pelayanan 30 hari ke depan."
                    : "Belum ada jadwal bulan ini."}
                </td>
              </tr>
            ) : (
              monthScheduleGroups.map((group) => (
                <tr key={`${group.cabang}-${group.kelas}-${group.sekolah || ""}`}>
                  <td className="text-center col-aksi sticky-col-aksi">
                    {readOnly ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteClass(group);
                        }}
                        className="btn btn-outline-danger btn-sm btn-icon"
                        aria-label="Hapus kelas"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    )}
                  </td>
                  <td className="fw-semibold col-kelas sticky-col-kelas">
                    {!readOnly && editingClassKey === `${group.cabang}||${group.kelas}||${group.sekolah || ""}` ? (
                      <div className="class-inline-editor" onClick={(event) => event.stopPropagation()}>
                        <input
                          value={kelasDraft}
                          onChange={(event) => setKelasDraft(event.target.value)}
                          className="form-control form-control-sm class-inline-input"
                          placeholder="Nama kelas"
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void submitClassEdit(group);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelClassEdit();
                            }
                          }}
                        />
                        {isJadwalTambahanMenu ? (
                          <input
                            value={sekolahDraft}
                            onChange={(event) => setSekolahDraft(event.target.value)}
                            className="form-control form-control-sm class-inline-input mt-1"
                            placeholder="Nama sekolah"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void submitClassEdit(group);
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelClassEdit();
                              }
                            }}
                          />
                        ) : null}
                        <div className="d-flex gap-1 mt-1">
                          <button
                            type="button"
                            className="btn btn-success btn-sm btn-icon"
                            onClick={() => {
                              void submitClassEdit(group);
                            }}
                            disabled={saving}
                            aria-label="Simpan kelas"
                          >
                            <i className="bi bi-check-lg" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm btn-icon"
                            onClick={cancelClassEdit}
                            disabled={saving}
                            aria-label="Batal edit kelas"
                          >
                            <i className="bi bi-x-lg" />
                          </button>
                        </div>
                      </div>
                    ) : readOnly ? (
                      <div>
                        <div className="schedule-class-main">{group.kelas}</div>
                        {isJadwalTambahanMenu && group.sekolah ? (
                          <div className="schedule-class-sub">{group.sekolah}</div>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-link text-start text-decoration-none text-reset p-0 w-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          startClassEdit(group);
                        }}
                        aria-label="Edit nama kelas"
                      >
                        <div className="schedule-class-main">{group.kelas}</div>
                        {isJadwalTambahanMenu && group.sekolah ? (
                          <div className="schedule-class-sub">{group.sekolah}</div>
                        ) : null}
                      </button>
                    )}
                  </td>
                  {activeScheduleDates.map((slot, index) => {
                    const entries = group.entriesByDate[slot.date] ?? [];
                    const isEditingCell =
                      editingSlot?.cabang === group.cabang &&
                      editingSlot?.kelas === group.kelas &&
                      (editingSlot?.sekolah || "") === (group.sekolah || "") &&
                      editingSlot?.tanggal === slot.date;
                    return (
                      <td
                        key={slot.date}
                        onClick={() => {
                          if (!readOnly) {
                            onSelectSlot(group, slot);
                          }
                        }}
                        className={`schedule-cell ${
                          activeDayStartIndexes.has(index) && index !== 0 ? "day-divider" : ""
                        } ${isEditingCell && !editingSlot?.entryId ? "is-editing" : ""}`}
                      >
                        {entries.length === 0 ? (
                          <span className="text-muted text-xxs">-</span>
                        ) : (
                          <div className="d-flex flex-column gap-1">
                            {entries.map((item, itemIndex) => {
                              const isEditingEntry = editingSlot?.entryId === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`btn btn-outline-secondary text-start p-1 schedule-entry-btn ${
                                    isEditingEntry ? "active" : ""
                                  }`}
                                   onClick={(event) => {
                                     event.stopPropagation();
                                     if (!readOnly) {
                                       onSelectSlot(group, slot, item);
                                     }
                                   }}
                                   disabled={readOnly}
                                >
                                  <div className="fw-semibold text-xxs">
                                    <span className="name-chip" style={getTagStyle(item.mapel || `Sesi ${itemIndex + 1}`, "mapel")}>
                                      {item.mapel || `Sesi ${itemIndex + 1}`}
                                    </span>
                                  </div>
                                  <div className="text-xxs mt-1">
                                    {item.pengajar ? (
                                      <span className="name-chip" style={getTagStyle(item.pengajar, "pengajar")}>
                                        {item.pengajar}
                                      </span>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </div>
                                  <div className="text-muted text-xxs">{item.waktu || "-"}</div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="col-aksi sticky-col-aksi" />
              <td className="col-kelas sticky-col-kelas">
                {readOnly ? null : (
                  <button
                    type="button"
                    onClick={onOpenClassModal}
                    className="btn btn-outline-primary btn-sm btn-icon"
                    aria-label="Tambah kelas"
                  >
                    <i className="bi bi-plus-lg" />
                  </button>
                )}
              </td>
              <td colSpan={activeScheduleDates.length} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="alert alert-info mt-3 text-xs mb-0">
        {readOnly
          ? "Mode lihat cabang lain aktif. Anda hanya dapat melihat jadwal tanpa mengubah data."
          : "Klik salah satu sel pada tabel jadwal untuk menambah atau mengedit data."}
      </div>
    </>
  );
}