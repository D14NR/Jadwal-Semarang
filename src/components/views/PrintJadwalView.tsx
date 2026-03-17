import { Fragment, useEffect, useMemo, useState } from "react";
import { buildMonthScheduleDates, formatScheduleLabelWithDay, parseFlexibleDate } from "../../utils/schedule";
import { getTagStyle } from "../../utils/tagColor";
import type { RecordItem, ScheduleDayGroup, ScheduleGroup, ScheduleSlotDate } from "../../types/app";

type PrintJadwalViewProps = {
  monthOptions: Array<{ value: string; label: string }>;
  selectedMonthKey: string;
  onMonthChange: (value: string) => void;
  regulerDates: ScheduleSlotDate[];
  regulerDayGroups: ScheduleDayGroup[];
  regulerGroups: ScheduleGroup[];
  tambahanGroups: ScheduleGroup[];
  mapelNameByKode: Record<string, string>;
};

type RegularDayColumn = {
  label: string;
  dates: ScheduleSlotDate[];
};

type ScheduleType = "reguler" | "tambahan";
type PrintOrientation = "landscape" | "portrait";

const hasScheduleContent = (entry: RecordItem) =>
  Boolean((entry.mapel || "").trim() || (entry.pengajar || "").trim() || (entry.waktu || "").trim());

const getDisplayMapel = (value: string, mapelNameByKode: Record<string, string>) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "-";
  }
  return mapelNameByKode[trimmed.toLowerCase()] || trimmed;
};

const getClassLabelHtml = (kelas: string, sekolah?: string) => {
  const safeKelas = escapeHtml(kelas || "-");
  const safeSekolah = escapeHtml((sekolah || "").trim());
  if (!safeSekolah) {
    return safeKelas;
  }
  return `${safeKelas}<br/><span class="muted">${safeSekolah}</span>`;
};

const getFilteredRegularDayColumns = (
  dates: ScheduleSlotDate[],
  dayGroups: ScheduleDayGroup[],
  selectedGroup: ScheduleGroup | null
) => {
  const result: RegularDayColumn[] = [];
  let offset = 0;

  dayGroups.forEach((day) => {
    const dayDates = dates.slice(offset, offset + day.count);
    offset += day.count;
    const visibleDates = dayDates.filter((slot) =>
      (selectedGroup?.entriesByDate[slot.date] ?? []).some(hasScheduleContent)
    );
    if (visibleDates.length > 0) {
      result.push({ label: day.label.toUpperCase(), dates: visibleDates });
    }
  });

  return result;
};

const toCellLines = (
  entries: RecordItem[],
  key: "mapel" | "waktu",
  mapelNameByKode: Record<string, string>
) => {
  if (!entries.length) {
    return "";
  }
  return entries
    .filter(hasScheduleContent)
    .map((entry) =>
      key === "mapel"
        ? getDisplayMapel(entry.mapel || "", mapelNameByKode)
        : (entry[key] || "-").trim() || "-"
    )
    .join("<br/>");
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getCellHtml = (entries: RecordItem[], mapelNameByKode: Record<string, string>) => {
  if (entries.length === 0) {
    return '<span class="cell-empty">-</span>';
  }
  return entries
    .map(
      (entry, index) =>
        `<div class="session-item"><div class="session-mapel">${getDisplayMapel(
          entry.mapel || `Sesi ${index + 1}`,
          mapelNameByKode
        )}</div><div class="session-pengajar">${entry.pengajar || "-"}</div><div class="session-waktu">${
          entry.waktu || "-"
        }</div></div>`
    )
    .join("<hr/>");
};

const getRegularTableHtml = (
  dayColumns: RegularDayColumn[],
  groups: ScheduleGroup[],
  mapelNameByKode: Record<string, string>
) => {
  const dayHeader = dayColumns
    .map((day) => `<th colspan="3">${escapeHtml(day.label)}</th>`)
    .join("");

  const dayColGroup = dayColumns
    .map(() => '<col class="date-col" /><col class="mapel-col" /><col class="time-col" />')
    .join("");

  const bodyRows = groups
    .map((group) => {
      const rowCount = Math.max(...dayColumns.map((day) => day.dates.length), 1);
      const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
        const classCell =
          rowIndex === 0
            ? `<td class="kelas-cell" rowspan="${rowCount}">${getClassLabelHtml(group.kelas, group.sekolah)}</td>`
            : "";

        const dayCells = dayColumns
          .map((day) => {
            const slot = day.dates[rowIndex];
            if (!slot) {
              return "<td></td><td></td><td></td>";
            }
            const entries = (group.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);
            return [
              `<td class="date-col">${escapeHtml(slot.label)}</td>`,
              `<td class="mapel-col">${toCellLines(entries, "mapel", mapelNameByKode) || ""}</td>`,
              `<td class="time-col">${toCellLines(entries, "waktu", mapelNameByKode) || ""}</td>`,
            ].join("");
          })
          .join("");

        const rowClass = rowIndex === 0 ? "class-group-start" : "";
        return `<tr class="${rowClass}">${classCell}${dayCells}</tr>`;
      }).join("");

      return rows;
    })
    .join("");

  const columnCount = dayColumns.length * 3 + 1;
  return `
    <table class="regular-print-table">
      <colgroup>
        <col class="kelas-col" />
        ${dayColGroup}
      </colgroup>
      <thead>
        <tr>
          <th rowspan="2">KELAS</th>
          <th colspan="${dayColumns.length * 3}">HARI & MATA PELAJARAN</th>
        </tr>
        <tr>${dayHeader}</tr>
      </thead>
      <tbody>${bodyRows || `<tr><td colspan="${columnCount}">Belum ada data.</td></tr>`}</tbody>
    </table>
  `;
};

const getTambahanTableHtml = (
  dates: ScheduleSlotDate[],
  groups: ScheduleGroup[],
  mapelNameByKode: Record<string, string>
) => {
  const dateHeader = dates
    .map((slot) => {
      const [year, month, day] = slot.date.split("-").map(Number);
      return `<th>${formatScheduleLabelWithDay(new Date(year, month - 1, day))}</th>`;
    })
    .join("");

  const bodyRows = groups
    .map((group) => {
      const kelasLabel = getClassLabelHtml(group.kelas, group.sekolah);
      const rowCells = dates
        .map((slot) => `<td>${getCellHtml(group.entriesByDate[slot.date] ?? [], mapelNameByKode)}</td>`)
        .join("");
      return `<tr><td class="kelas-cell">${kelasLabel}</td>${rowCells}</tr>`;
    })
    .join("");

  return `
    <table class="tambahan-print-table">
      <colgroup>
        <col class="kelas-col" />
        ${dates.map(() => '<col class="tambahan-day-col" />').join("")}
      </colgroup>
      <thead>
        <tr><th>Kelas</th>${dateHeader}</tr>
      </thead>
      <tbody>${bodyRows || `<tr><td colspan="${dates.length + 1}">Belum ada data.</td></tr>`}</tbody>
    </table>
  `;
};

const printHtmlDocument = (
  title: string,
  content: string,
  copies = 5,
  orientation: PrintOrientation = "landscape"
) => {
  // Avoid noopener/noreferrer here because some browsers keep the new tab at about:blank
  // and block document.write access for the opener context.
  const printWindow = window.open("about:blank", "_blank", "width=1440,height=900");
  if (!printWindow) {
    return {
      success: false,
      message: "Popup diblokir browser. Izinkan popup untuk halaman ini lalu coba lagi.",
    };
  }
  const printedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const duplicatedContent = Array.from({ length: copies }, (_, index) => {
    const separatorClass = index < copies - 1 ? "copy-block with-separator" : "copy-block";
    return `<section class="${separatorClass}">${content}<div class="print-footer-meta">Dicetak ${printedAt}</div></section>`;
  }).join("");

  const isPortrait = orientation === "portrait";
  const kelasWidth = isPortrait ? 44 : 52;
  const dateWidth = isPortrait ? 46 : 52;
  const mapelWidth = isPortrait ? 56 : 70;
  const timeWidth = isPortrait ? 40 : 46;
  const tambahanDayWidth = isPortrait ? 64 : 80;

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: A4 ${orientation}; margin: 5mm; }
          * { box-sizing: border-box; }
          body {
            font-family: "Inter", "Segoe UI", Arial, sans-serif;
            margin: 0;
            font-size: 8px;
            color: #0f172a;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-sheet { display: flex; flex-direction: column; gap: 3px; height: 100%; }
          .copy-block {
            flex: 1 1 0;
            overflow: hidden;
            padding: 3px 4px;
            border: 1px solid #bfc9d8;
            border-radius: 8px;
            background: #ffffff;
          }
          .copy-block.with-separator { border-bottom: 1px dashed #9aa9bc; }
          .print-title-block {
            margin: 0 0 4px;
            text-align: left;
            padding: 3px 6px;
            border: 1px solid #d5deea;
            border-left: 4px solid #1d4ed8;
            border-radius: 6px;
            background: #f8fbff;
          }
          .print-title-line { font-size: 9px; font-weight: 700; line-height: 1.2; letter-spacing: 0.02em; }
          .muted { color: #64748b; }
          table {
            border-collapse: separate;
            border-spacing: 0;
            width: 100%;
            margin-top: 3px;
            border: 1px solid #94a3b8;
            border-radius: 6px;
            overflow: hidden;
          }
          th, td {
            border-right: 1px solid #c8d1df;
            border-bottom: 1px solid #c8d1df;
            padding: 2px 3px;
            vertical-align: top;
          }
          th:last-child, td:last-child { border-right: 0; }
          tr:last-child td { border-bottom: 0; }
          th {
            background: #e9eff9;
            color: #0f172a;
            font-size: 7px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            text-align: center;
          }
          td { font-size: 7px; line-height: 1.25; background: #ffffff; }
          .regular-print-table { table-layout: fixed; }
          .regular-print-table .kelas-col { width: ${kelasWidth}px; }
          .regular-print-table .kelas-cell {
            font-weight: 700;
            width: ${kelasWidth}px;
            max-width: ${kelasWidth}px;
            text-align: center;
            vertical-align: middle;
            background: #f7f9fc;
          }
          .regular-print-table .date-col { width: ${dateWidth}px; white-space: nowrap; }
          .regular-print-table .mapel-col { width: ${mapelWidth}px; max-width: ${mapelWidth}px; word-break: break-word; }
          .regular-print-table .time-col { width: ${timeWidth}px; white-space: nowrap; }
          .regular-print-table .class-group-start td { border-top: 2px solid #64748b; }
          .tambahan-print-table { table-layout: fixed; }
          .tambahan-print-table .kelas-cell {
            text-align: center;
            vertical-align: middle;
            font-weight: 700;
            background: #f7f9fc;
          }
          .tambahan-print-table .tambahan-day-col { width: ${tambahanDayWidth}px; }
          .session-item + .session-item { margin-top: 2px; }
          .session-mapel { font-weight: 700; color: #0b3b99; }
          .session-pengajar { color: #334155; }
          .session-waktu { color: #0f172a; }
          .cell-empty { color: #64748b; }
          hr { border: 0; border-top: 1px dashed #cbd5e1; margin: 2px 0; }
          .print-footer-meta {
            margin-top: 2px;
            padding-top: 2px;
            border-top: 1px dashed #cbd5e1;
            text-align: right;
            font-size: 6px;
            color: #64748b;
          }
          @media print {
            html, body { height: 100%; }
            .print-sheet { height: 100%; }
          }
        </style>
      </head>
      <body>
        <main class="print-sheet">
          ${duplicatedContent}
        </main>
      </body>
    </html>
  `;

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
    return { success: true };
  } catch (_error) {
    printWindow.close();
    return {
      success: false,
      message: "Gagal membuka preview print. Coba izinkan popup dan ulangi lagi.",
    };
  }
};

const getSchedulePrintTitle = (scheduleType: ScheduleType) =>
  scheduleType === "reguler" ? "JADWAL REGULER" : "JADWAL TAMBAHAN & PELAYANAN";

const getPrintHeaderHtml = (titleSchedule: string, titleCabang: string) => `
  <div class="print-title-block">
    <div class="print-title-line">${titleSchedule}</div>
    <div class="print-title-line">NEUTRON YOGYAKARTA</div>
    <div class="print-title-line">${titleCabang || "CABANG -"}</div>
  </div>
`;

export function PrintJadwalView({
  monthOptions,
  selectedMonthKey,
  onMonthChange,
  regulerDates,
  regulerDayGroups,
  regulerGroups,
  tambahanGroups,
  mapelNameByKode,
}: PrintJadwalViewProps) {
  const [selectedScheduleType, setSelectedScheduleType] = useState<ScheduleType>("reguler");
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [printCopies, setPrintCopies] = useState(5);
  const [printError, setPrintError] = useState("");
  const [printOrientation, setPrintOrientation] = useState<PrintOrientation>("landscape");

  const selectedMonthDate = useMemo(() => {
    const [year, month] = selectedMonthKey.split("-").map(Number);
    return new Date(year, Math.max(0, (month || 1) - 1), 1);
  }, [selectedMonthKey]);

  const monthDateKeys = useMemo(() => {
    const { scheduleDates } = buildMonthScheduleDates(selectedMonthDate);
    return new Set(scheduleDates.map((slot) => slot.date));
  }, [selectedMonthDate]);

  const filteredTambahanGroups = useMemo(() => {
    return tambahanGroups
      .map((group) => {
        const filteredEntriesByDate: Record<string, RecordItem[]> = {};
        Object.entries(group.entriesByDate).forEach(([dateKey, entries]) => {
          if (monthDateKeys.has(dateKey)) {
            filteredEntriesByDate[dateKey] = entries;
          }
        });
        return {
          ...group,
          entriesByDate: filteredEntriesByDate,
        };
      })
      .filter((group) => Object.keys(group.entriesByDate).length > 0);
  }, [monthDateKeys, tambahanGroups]);

  const activeDates = selectedScheduleType === "reguler" ? regulerDates : regulerDates;
  const activeDayGroups = selectedScheduleType === "reguler" ? regulerDayGroups : regulerDayGroups;
  const activeGroups = selectedScheduleType === "reguler" ? regulerGroups : filteredTambahanGroups;

  const classOptions = useMemo(
    () =>
      activeGroups.map((group) => {
        const key = `${group.cabang}||${group.kelas}||${group.sekolah || ""}`;
        const label = group.sekolah
          ? `${group.kelas} - ${group.sekolah} (${group.cabang})`
          : `${group.kelas} (${group.cabang})`;
        return { value: key, label };
      }),
    [activeGroups]
  );

  useEffect(() => {
    setSelectedClassKey("");
    setPrintError("");
  }, [selectedScheduleType, selectedMonthKey]);

  const selectedClassGroup = useMemo(
    () =>
      activeGroups.find(
        (group) => `${group.cabang}||${group.kelas}||${group.sekolah || ""}` === selectedClassKey
      ) || null,
    [activeGroups, selectedClassKey]
  );

  const previewGroups = useMemo(() => (selectedClassGroup ? [selectedClassGroup] : []), [selectedClassGroup]);
  const titleSchedule = getSchedulePrintTitle(selectedScheduleType);
  const titleCabang = selectedClassGroup?.cabang ? `CABANG ${selectedClassGroup.cabang.toUpperCase()}` : "";

  const regularDayColumns = useMemo(
    () => getFilteredRegularDayColumns(activeDates, activeDayGroups, selectedClassGroup),
    [activeDates, activeDayGroups, selectedClassGroup]
  );
  const tambahanVisibleDates = useMemo(() => {
    if (!selectedClassGroup) {
      return [] as ScheduleSlotDate[];
    }
    return regulerDates.filter((slot) =>
      (selectedClassGroup.entriesByDate[slot.date] ?? []).some(hasScheduleContent)
    );
  }, [regulerDates, selectedClassGroup]);
  const maxRegularRows = useMemo(
    () => Math.max(...regularDayColumns.map((day) => day.dates.length), 1),
    [regularDayColumns]
  );
  const canPrint =
    Boolean(selectedClassGroup) &&
    (selectedScheduleType === "reguler"
      ? regularDayColumns.length > 0
      : tambahanVisibleDates.length > 0);

  const handlePrint = () => {
    setPrintError("");
    if (!selectedClassGroup) {
      return;
    }
    if (!canPrint) {
      return;
    }
    if (selectedScheduleType === "reguler") {
      const tableHtml = getRegularTableHtml(regularDayColumns, [selectedClassGroup], mapelNameByKode);
      const result = printHtmlDocument(
        "Print Jadwal Reguler",
        `${getPrintHeaderHtml(titleSchedule, titleCabang)}
         ${tableHtml}`,
        printCopies,
        printOrientation
      );
      if (!result.success) {
        setPrintError(result.message || "Gagal membuka preview print.");
      }
      return;
    }
    const tableHtml = getTambahanTableHtml(tambahanVisibleDates, [selectedClassGroup], mapelNameByKode);
    const result = printHtmlDocument(
      "Print Jadwal Tambahan & Pelayanan",
      `${getPrintHeaderHtml(titleSchedule, titleCabang)}
       ${tableHtml}`,
      printCopies,
      printOrientation
    );
    if (!result.success) {
      setPrintError(result.message || "Gagal membuka preview print.");
    }
  };

  return (
    <div className="mt-4">
      <div className="print-controls-panel mb-3">
        <div className="d-flex flex-wrap align-items-end gap-2">
        <div>
          <label className="form-label mb-1">Pilih Jadwal</label>
          <select
            className="form-select form-select-sm"
            value={selectedScheduleType}
            onChange={(event) => setSelectedScheduleType(event.target.value as ScheduleType)}
          >
            <option value="reguler">Jadwal Reguler</option>
            <option value="tambahan">Jadwal Tambahan & Pelayanan</option>
          </select>
        </div>
        <div>
          <label className="form-label mb-1">Pilih Bulan</label>
          <select
            className="form-select form-select-sm"
            value={selectedMonthKey}
            onChange={(event) => onMonthChange(event.target.value)}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label mb-1">Pilih Kelas</label>
          <select
            className="form-select form-select-sm"
            value={selectedClassKey}
            onChange={(event) => setSelectedClassKey(event.target.value)}
          >
            <option value="">Pilih kelas</option>
            {classOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label mb-1">Jumlah Salinan</label>
          <select
            className="form-select form-select-sm"
            value={printCopies}
            onChange={(event) => setPrintCopies(Number(event.target.value))}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((copy) => (
              <option key={copy} value={copy}>
                {copy} salinan
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label mb-1">Orientasi</label>
          <select
            className="form-select form-select-sm"
            value={printOrientation}
            onChange={(event) => setPrintOrientation(event.target.value as PrintOrientation)}
          >
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm px-3"
          onClick={handlePrint}
          disabled={!canPrint}
        >
          <i className="bi bi-printer me-1" /> Print Jadwal
        </button>
        </div>
      </div>
      {printError ? <div className="alert alert-danger py-2 mb-3">{printError}</div> : null}
      {!selectedClassGroup ? (
        <div className="alert alert-info py-2 mb-0">Pilih jadwal, bulan, dan kelas untuk menampilkan jadwal print.</div>
      ) : !canPrint ? (
        <div className="alert alert-warning py-2 mb-0">
          Tidak ada tanggal dengan mapel dan jam terisi pada bulan yang dipilih.
        </div>
      ) : (
      <>
      <div className="mb-2 text-start print-title-stack">
        <div className="fw-bold">{titleSchedule}</div>
        <div className="fw-bold">NEUTRON YOGYAKARTA</div>
        <div className="fw-bold">{titleCabang || "CABANG -"}</div>
      </div>
      <div className="print-preview-meta mb-2">
        <span className="badge text-bg-light border">Kelas: {selectedClassGroup.kelas}</span>
        <span className="badge text-bg-light border">Bulan: {monthOptions.find((item) => item.value === selectedMonthKey)?.label || "-"}</span>
        <span className="badge text-bg-light border">Orientasi: {printOrientation === "landscape" ? "Landscape" : "Portrait"}</span>
      </div>
      <div
        className={`table-responsive border rounded print-preview-shell print-paper-preview ${
          printOrientation === "portrait" ? "print-preview-portrait" : "print-preview-landscape"
        }`}
      >
        {selectedScheduleType === "reguler" ? (
        <table className="table table-sm table-bordered align-middle mb-0 print-preview-table print-preview-table-modern">
          <colgroup>
            <col className="print-kelas-col" />
            {regularDayColumns.map((day) => (
              <Fragment key={`col-${day.label}`}>
                <col className="print-date-col" />
                <col className="print-mapel-col" />
                <col className="print-time-col" />
              </Fragment>
            ))}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} className="text-center align-middle print-kelas-col">
                KELAS
              </th>
              <th colSpan={regularDayColumns.length * 3} className="text-center align-middle">
                HARI & MATA PELAJARAN
              </th>
            </tr>
            <tr>
              {regularDayColumns.map((day) => (
                <th key={day.label} colSpan={3} className="text-center">
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewGroups.length === 0 ? (
              <tr>
                <td colSpan={regularDayColumns.length * 3 + 1} className="text-center text-muted py-3">
                  Belum ada data jadwal.
                </td>
              </tr>
            ) : (
              previewGroups.flatMap((group) =>
                Array.from({ length: maxRegularRows }, (_, rowIndex) => {
                  const rowKey = `${group.cabang}-${group.kelas}-${rowIndex}`;
                  return (
                    <tr key={rowKey} className={rowIndex === 0 ? "class-group-start" : ""}>
                      {rowIndex === 0 && (
                        <td rowSpan={maxRegularRows} className="align-middle text-center fw-semibold print-kelas-col">
                          <div>{group.kelas}</div>
                          {group.sekolah ? <div className="text-muted">{group.sekolah}</div> : null}
                        </td>
                      )}
                      {regularDayColumns.map((day) => {
                        const slot = day.dates[rowIndex];
                        if (!slot) {
                          return (
                            <Fragment key={`${rowKey}-${day.label}-empty`}>
                              <td key={`${rowKey}-${day.label}-tanggal`} />
                              <td key={`${rowKey}-${day.label}-mapel`} />
                              <td key={`${rowKey}-${day.label}-waktu`} />
                            </Fragment>
                          );
                        }
                        const entries = (group.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);
                        return (
                          <Fragment key={`${rowKey}-${slot.date}`}>
                            <td key={`${rowKey}-${slot.date}-tanggal`} className="text-nowrap">
                              {slot.label}
                            </td>
                             <td key={`${rowKey}-${slot.date}-mapel`} className="print-mapel-col">
                              {entries.map((entry, idx) => (
                                 <div key={`${entry.id}-${idx}`} className="session-item">
                                  <span className="name-chip" style={getTagStyle(getDisplayMapel(entry.mapel || "", mapelNameByKode), "mapel")}>
                                    {getDisplayMapel(entry.mapel || "", mapelNameByKode)}
                                  </span>
                                </div>
                              ))}
                            </td>
                            <td key={`${rowKey}-${slot.date}-waktu`} className="text-nowrap print-time-col">
                              {entries.map((entry, idx) => (
                                <div key={`${entry.id}-${idx}`}>{entry.waktu || "-"}</div>
                              ))}
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  );
                })
              )
            )}
          </tbody>
        </table>
        ) : (
        <table className="table table-sm table-bordered align-middle mb-0 print-preview-table print-preview-table-modern">
          <thead>
            <tr>
              <th className="text-center align-middle print-kelas-col">KELAS</th>
              {tambahanVisibleDates.map((slot) => (
                <th key={slot.date} className="text-nowrap">
                  {formatScheduleLabelWithDay(parseFlexibleDate(slot.date) || new Date(slot.date))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="align-middle text-center fw-semibold print-kelas-col">
                <div>{selectedClassGroup.kelas}</div>
                {selectedClassGroup.sekolah ? <div className="text-muted">{selectedClassGroup.sekolah}</div> : null}
              </td>
              {tambahanVisibleDates.map((slot) => {
                const entries = (selectedClassGroup.entriesByDate[slot.date] ?? []).filter(hasScheduleContent);
                return (
                  <td key={`tambahan-${slot.date}`}>
                    {entries.map((entry, idx) => (
                      <div key={`${entry.id}-${idx}`}>
                        <span className="name-chip" style={getTagStyle(getDisplayMapel(entry.mapel || "", mapelNameByKode), "mapel")}>
                          {getDisplayMapel(entry.mapel || "", mapelNameByKode)}
                        </span>
                        <br />
                        {entry.waktu || "-"}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
        )}
      </div>
      </>
      )}
    </div>
  );
}