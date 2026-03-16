import { formatScheduleLabelWithDay } from "../../utils/schedule";
import type { EditingSlot, RecordItem, ScheduleDayGroup, ScheduleGroup, ScheduleSlotDate } from "../../types/app";

type ScheduleTableViewProps = {
  isJadwalTambahanMenu: boolean;
  activeScheduleDates: ScheduleSlotDate[];
  activeDayGroups: ScheduleDayGroup[];
  activeDayStartIndexes: Set<number>;
  monthScheduleGroups: ScheduleGroup[];
  editingSlot: EditingSlot | null;
  onDeleteClass: (group: ScheduleGroup) => void;
  onSelectSlot: (group: ScheduleGroup, slot: ScheduleSlotDate, item?: RecordItem) => void;
  onOpenClassModal: () => void;
};

export function ScheduleTableView({
  isJadwalTambahanMenu,
  activeScheduleDates,
  activeDayGroups,
  activeDayStartIndexes,
  monthScheduleGroups,
  editingSlot,
  onDeleteClass,
  onSelectSlot,
  onOpenClassModal,
}: ScheduleTableViewProps) {
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
                  </td>
                  <td className="fw-semibold col-kelas sticky-col-kelas">
                    <div>{group.kelas}</div>
                    {isJadwalTambahanMenu && group.sekolah ? <div className="text-muted text-xxs">{group.sekolah}</div> : null}
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
                        onClick={() => onSelectSlot(group, slot)}
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
                                    onSelectSlot(group, slot, item);
                                  }}
                                >
                                  <div className="fw-semibold text-xxs">{item.mapel || `Sesi ${itemIndex + 1}`}</div>
                                  <div className="text-muted text-xxs">{item.pengajar || "-"}</div>
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
                <button
                  type="button"
                  onClick={onOpenClassModal}
                  className="btn btn-outline-primary btn-sm btn-icon"
                  aria-label="Tambah kelas"
                >
                  <i className="bi bi-plus-lg" />
                </button>
              </td>
              <td colSpan={activeScheduleDates.length} />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="alert alert-info mt-3 text-xs mb-0">Klik salah satu sel pada tabel jadwal untuk menambah atau mengedit data.</div>
    </>
  );
}