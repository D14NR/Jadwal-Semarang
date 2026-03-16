const SHEET_NAME = "Jadwal Bulan ini";
const JADWAL_KHUSUS_SHEET = "Jadwal Khusus";
const SURAT_TUGAS_SHEET = "Surat Tugas Pengajar";
const MATA_PELAJARAN_SHEET = "Mata Pelajaran";
const PERMINTAAN_PENGAJAR_SHEET = "Permintaan Pengajar Antar Cabang";

const REQUIRED_COLUMNS = [
  "Cabang",
  "Kelas",
  "Tanggal",
  "Mapel",
  "Pengajar",
  "Waktu",
];

const OPTIONAL_SCHEDULE_COLUMNS = ["Sekolah"];

const SURAT_TUGAS_HEADERS = [
  "Kode Pengajar",
  "Tanggal",
  "Sesi 1",
  "Sesi 2",
  "Sesi 3",
  "Sesi 4",
  "Sesi 5",
  "Sesi 6",
  "Sesi 7",
  "Sesi 8",
  "Sesi 9",
  "Sesi 10",
];

const normalizeHeader = (value) => String(value || "").trim().toLowerCase();

const normalizeText = (value) => String(value || "").trim();

const normalizeKey = (value) => normalizeText(value).toLowerCase();

const normalizeDateKey = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const dateValue = value instanceof Date ? value : new Date(value);
  if (!isNaN(dateValue.getTime())) {
    const tz = Session.getScriptTimeZone() || "Asia/Jakarta";
    return Utilities.formatDate(dateValue, tz, "yyyy-MM-dd");
  }
  return String(value).trim();
};

const isDateInRange = (dateKey, startKey, endKey) => {
  if (!dateKey) {
    return false;
  }
  const start = startKey || endKey;
  const end = endKey || startKey;
  if (!start && !end) {
    return true;
  }
  const normalizedStart = normalizeDateKey(start);
  const normalizedEnd = normalizeDateKey(end);
  if (!normalizedStart || !normalizedEnd) {
    return true;
  }
  return dateKey >= normalizedStart && dateKey <= normalizedEnd;
};

const getSheetByName = (sheetName, spreadsheetId) => {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);
  }
  return sheet;
};

const getSheet = (spreadsheetId, sheetName) => {
  return getSheetByName(sheetName || SHEET_NAME, spreadsheetId);
};

const getSuratTugasSheet = (spreadsheetId) => {
  const ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SURAT_TUGAS_SHEET);
  if (!sheet) {
    throw new Error(`Sheet "${SURAT_TUGAS_SHEET}" tidak ditemukan.`);
  }
  return sheet;
};

const getHeaderMap = (headers) => {
  const map = {};
  headers.forEach((header, index) => {
    map[normalizeHeader(header)] = index;
  });
  return map;
};

const ensureHeaders = (sheet) => {
  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  const hasRequired = REQUIRED_COLUMNS.every((column) =>
    existing.some((cell) => normalizeHeader(cell) === normalizeHeader(column))
  );
  if (!hasRequired) {
    sheet.clear();
    sheet.appendRow(REQUIRED_COLUMNS);
    return REQUIRED_COLUMNS;
  }
  return existing;
};

const ensureOptionalHeaders = (sheet, headers, optionalHeaders) => {
  const currentHeaders = [...headers];
  const normalizedHeaderSet = new Set(currentHeaders.map((header) => normalizeHeader(header)));
  const missing = optionalHeaders.filter(
    (header) => !normalizedHeaderSet.has(normalizeHeader(header))
  );
  if (missing.length > 0) {
    sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
    return [...currentHeaders, ...missing];
  }
  return currentHeaders;
};

const ensureSuratTugasHeaders = (sheet) => {
  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  const hasRequired = SURAT_TUGAS_HEADERS.every((column) =>
    existing.some((cell) => normalizeHeader(cell) === normalizeHeader(column))
  );
  if (!hasRequired) {
    sheet.clear();
    sheet.appendRow(SURAT_TUGAS_HEADERS);
    return SURAT_TUGAS_HEADERS;
  }
  return existing;
};

const parsePayload = (e) => {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
};

const buildResponse = (data) => {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
};

const parseTimeValue = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(".", ":");
  const parts = normalized.split(":");
  if (parts.length < 2) {
    return null;
  }
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const formatDisplayDateFromKey = (dateKey) => {
  if (!dateKey) {
    return "";
  }
  const parts = String(dateKey).split("-");
  if (parts.length !== 3) {
    return String(dateKey);
  }
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const dateValue = new Date(year, monthIndex, day);
  const tz = Session.getScriptTimeZone() || "Asia/Jakarta";
  return Utilities.formatDate(dateValue, tz, "d MMM yyyy");
};

const formatSessionEntry = (row, headerMap) => {
  const cabang = normalizeText(row[headerMap[normalizeHeader("Cabang")]]);
  const kelas = normalizeText(row[headerMap[normalizeHeader("Kelas")]]);
  const mapel = normalizeText(row[headerMap[normalizeHeader("Mapel")]]);
  const waktu = normalizeText(row[headerMap[normalizeHeader("Waktu")]]);
  const sessionMapel = [mapel, kelas].filter(Boolean).join("-");
  const session = [waktu, sessionMapel, cabang].filter(Boolean).join("/");
  return session.trim();
};

const getScheduleSheetsForSurat = (targetSheetName) => {
  const names = [SHEET_NAME, JADWAL_KHUSUS_SHEET, targetSheetName]
    .map((value) => normalizeText(value))
    .filter((value) => value);
  return Array.from(new Set(names));
};

const syncSuratTugas = (pengajar, tanggalKey, spreadsheetId, jadwalSheetName) => {
  if (!pengajar || !tanggalKey) {
    return;
  }
  const scheduleSheetNames = getScheduleSheetsForSurat(jadwalSheetName);
  const matches = [];

  scheduleSheetNames.forEach((sheetName) => {
    try {
      const jadwalSheet = getSheet(spreadsheetId, sheetName);
      let headers = ensureHeaders(jadwalSheet);
      headers = ensureOptionalHeaders(jadwalSheet, headers, OPTIONAL_SCHEDULE_COLUMNS);
      const headerMap = getHeaderMap(headers);
      const data = jadwalSheet.getDataRange().getValues();
      const rows = data.slice(1);
      rows.forEach((row) => {
        const rowPengajar = normalizeText(row[headerMap[normalizeHeader("Pengajar")]]);
        const rowTanggal = normalizeDateKey(row[headerMap[normalizeHeader("Tanggal")]]);
        if (rowPengajar === pengajar && rowTanggal === tanggalKey) {
          matches.push({ row, headerMap });
        }
      });
    } catch (error) {
      // Skip missing sheet, keep sync running from available schedule sheets.
    }
  });

  const sorted = matches
    .map((entry) => {
      const waktu = normalizeText(entry.row[entry.headerMap[normalizeHeader("Waktu")]]);
      const start = parseTimeValue(String(waktu).split("-")[0] || "");
      return { ...entry, start: start ?? 0 };
    })
    .sort((a, b) => a.start - b.start)
    .map((item) => formatSessionEntry(item.row, item.headerMap));

  const suratSheet = getSuratTugasSheet(spreadsheetId);
  const suratHeaders = ensureSuratTugasHeaders(suratSheet);
  const suratHeaderMap = getHeaderMap(suratHeaders);
  const suratData = suratSheet.getDataRange().getValues();
  const suratRows = suratData.slice(1);
  const rowIndex = suratRows.findIndex((row) => {
    const kode = normalizeText(row[suratHeaderMap[normalizeHeader("Kode Pengajar")]]);
    const tanggal = normalizeDateKey(row[suratHeaderMap[normalizeHeader("Tanggal")]]);
    return kode === pengajar && tanggal === tanggalKey;
  });

  if (sorted.length === 0) {
    if (rowIndex >= 0) {
      suratSheet.deleteRow(rowIndex + 2);
    }
    return;
  }

  const displayTanggal = formatDisplayDateFromKey(tanggalKey);
  const sessionValues = SURAT_TUGAS_HEADERS.map((header) => {
    if (normalizeHeader(header) === normalizeHeader("Kode Pengajar")) {
      return pengajar;
    }
    if (normalizeHeader(header) === normalizeHeader("Tanggal")) {
      return displayTanggal;
    }
    const match = header.match(/Sesi\s+(\d+)/i);
    if (!match) {
      return "";
    }
    const index = Number(match[1]) - 1;
    return sorted[index] || "";
  });

  if (rowIndex >= 0) {
    const sheetRowIndex = rowIndex + 2;
    suratSheet.getRange(sheetRowIndex, 1, 1, sessionValues.length).setValues([sessionValues]);
  } else {
    suratSheet.appendRow(sessionValues);
  }
};

function doGet(e) {
  try {
    const requestedSheet = (e && e.parameter && e.parameter.sheet) || SHEET_NAME;
    const spreadsheetId = (e && e.parameter && e.parameter.spreadsheetId) || null;
    if (requestedSheet === SHEET_NAME) {
      const sheet = getSheet(spreadsheetId);
      const headers = ensureHeaders(sheet);
      const rows = sheet.getDataRange().getValues();
      rows.shift();

      const data = rows
        .filter((row) => row.some((cell) => String(cell).trim() !== ""))
        .map((row) => {
          const entry = {};
          headers.forEach((header, index) => {
            entry[header] = row[index] ?? "";
          });
          entry._row = rows.indexOf(row) + 2;
          return entry;
        });

      return buildResponse({ success: true, data, headers });
    }

    const sheet = getSheetByName(requestedSheet, spreadsheetId);
    const values = sheet.getDataRange().getValues();
    if (values.length === 0) {
      return buildResponse({ success: true, data: [], headers: [] });
    }
    const headers = values[0].map((value) => String(value ?? ""));
    const data = values
      .slice(1)
      .filter((row) => row.some((cell) => String(cell).trim() !== ""))
      .map((row) => {
        const entry = {};
        headers.forEach((header, index) => {
          entry[header] = row[index] ?? "";
        });
        return entry;
      });

    return buildResponse({ success: true, data, headers });
  } catch (error) {
    return buildResponse({ success: false, message: error.message });
  }
}

function doPost(e) {
  try {
    const payload = parsePayload(e);
    const action = payload.action || "upsert";
    const targetSheetName = payload.sheetName || SHEET_NAME;
    const spreadsheetId = payload.spreadsheetId || null;
    
    // Handle Data Pengajar CRUD
    if (targetSheetName === "Data Pengajar") {
      const sheet = getSheetByName("Data Pengajar", spreadsheetId);
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const headers = values[0] || ["Kode Pengajar", "Nama", "Bidang Studi", "Email", "No.WhatsApp", "Domisili", "Username", "Password"];
      const headerMap = getHeaderMap(headers);
      
      const record = payload.record || {};
      const targetKode = normalizeText(record["Kode Pengajar"]);
      
      if (action === "deletePengajar") {
        for (let i = values.length - 1; i >= 1; i--) {
          if (normalizeText(values[i][headerMap[normalizeHeader("Kode Pengajar")]]) === targetKode) {
            sheet.deleteRow(i + 1);
            return buildResponse({ success: true, message: "Pengajar dihapus." });
          }
        }
        return buildResponse({ success: false, message: "Pengajar tidak ditemukan." });
      }
      
      if (action === "savePengajar") {
        const oldKode = normalizeText(payload.oldKode || record["Kode Pengajar"]);
        let rowIndex = -1;
        
        for (let i = 1; i < values.length; i++) {
          if (normalizeText(values[i][headerMap[normalizeHeader("Kode Pengajar")]]) === oldKode) {
            rowIndex = i;
            break;
          }
        }
        
        const newRow = headers.map(h => record[h] !== undefined ? record[h] : "");
        
        if (rowIndex >= 1) {
          sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([newRow]);
          return buildResponse({ success: true, message: "Pengajar diperbarui." });
        } else {
          sheet.appendRow(newRow);
          return buildResponse({ success: true, message: "Pengajar ditambahkan." });
        }
      }
    }

    // Handle Mata Pelajaran CRUD
    if (targetSheetName === MATA_PELAJARAN_SHEET) {
      const sheet = getSheetByName(MATA_PELAJARAN_SHEET, spreadsheetId);
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const headers = values[0] || ["Mapel", "Kode_Mapel"];
      const headerMap = getHeaderMap(headers);
      
      const record = payload.record || {};
      const targetMapel = normalizeText(record.Mapel);
      
      if (action === "deleteMapel") {
        for (let i = values.length - 1; i >= 1; i--) {
          if (normalizeText(values[i][headerMap[normalizeHeader("Mapel")]]) === targetMapel) {
            sheet.deleteRow(i + 1);
            return buildResponse({ success: true, message: "Mata pelajaran dihapus." });
          }
        }
        return buildResponse({ success: false, message: "Mata pelajaran tidak ditemukan." });
      }
      
      if (action === "saveMapel") {
        const oldMapel = normalizeText(payload.oldMapel || record.Mapel);
        let rowIndex = -1;
        
        for (let i = 1; i < values.length; i++) {
          if (normalizeText(values[i][headerMap[normalizeHeader("Mapel")]]) === oldMapel) {
            rowIndex = i;
            break;
          }
        }
        
        const newRow = headers.map(h => record[h] !== undefined ? record[h] : "");
        
        if (rowIndex >= 1) {
          sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([newRow]);
          return buildResponse({ success: true, message: "Mata pelajaran diperbarui." });
        } else {
          sheet.appendRow(newRow);
          return buildResponse({ success: true, message: "Mata pelajaran ditambahkan." });
        }
      }
    }

    if (targetSheetName === "Penempatan Pengajar") {
      const placementHeaders = [
        "Kode Pengajar",
        "Nama Pengajar",
        "Domisili",
        "Hari",
        "Jam Mulai",
        "Jam Selesai",
        "Cabang Penempatan",
      ];
      const sheet = getSheetByName("Penempatan Pengajar", spreadsheetId);
      const lastColumn = Math.max(sheet.getLastColumn(), placementHeaders.length);
      const existingHeaders =
        sheet.getLastRow() > 0
          ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map((value) => String(value || ""))
          : [];

      const finalHeaders = existingHeaders.slice();
      placementHeaders.forEach((header) => {
        if (finalHeaders.indexOf(header) === -1) {
          finalHeaders.push(header);
        }
      });

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(finalHeaders);
      } else if (String(existingHeaders.join("||")) !== String(finalHeaders.join("||"))) {
        sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
      }

      const values = sheet.getDataRange().getValues();
      const headers = values[0] || finalHeaders;
      const headerMap = getHeaderMap(headers);
      const record = payload.record || {};
      const oldRecord = payload.oldRecord || null;

      const buildRow = (source) =>
        headers.map((header) => (source[header] !== undefined ? source[header] : ""));

      const matchRowIndex = (sourceRecord) => {
        if (!sourceRecord) {
          return -1;
        }
        const keyFields = [
          "Kode Pengajar",
          "Hari",
          "Jam Mulai",
          "Jam Selesai",
          "Cabang Penempatan",
        ];
        return values.findIndex((row, index) => {
          if (index === 0) {
            return false;
          }
          return keyFields.every((field) => {
            const columnIndex = headerMap[normalizeHeader(field)];
            if (columnIndex === undefined) {
              return false;
            }
            return normalizeText(row[columnIndex]) === normalizeText(sourceRecord[field]);
          });
        });
      };

      if (action === "deletePenempatanPengajar") {
        const rowIndex = matchRowIndex(record);
        if (rowIndex > 0) {
          sheet.deleteRow(rowIndex + 1);
          return buildResponse({ success: true, message: "Penempatan pengajar dihapus." });
        }
        return buildResponse({ success: false, message: "Penempatan pengajar tidak ditemukan." });
      }

      if (action === "savePenempatanPengajar") {
        const rowIndex = matchRowIndex(oldRecord || record);
        const newRow = buildRow(record);
        if (rowIndex > 0) {
          sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([newRow]);
          return buildResponse({ success: true, message: "Penempatan pengajar diperbarui." });
        }
        sheet.appendRow(newRow);
        return buildResponse({ success: true, message: "Penempatan pengajar ditambahkan." });
      }
    }

    if (targetSheetName === PERMINTAAN_PENGAJAR_SHEET) {
      const requestHeaders = [
        "ID",
        "Kode Pengajar",
        "Nama Pengajar",
        "Cabang Peminta",
        "Cabang Domisili",
        "Tanggal Mulai",
        "Tanggal Selesai",
        "Tanggal Khusus",
        "Hari",
        "Jam Mulai",
        "Jam Selesai",
        "Status",
        "Catatan",
      ];
      const sheet = getSheetByName(PERMINTAAN_PENGAJAR_SHEET, spreadsheetId);
      const lastColumn = Math.max(sheet.getLastColumn(), requestHeaders.length);
      const existingHeaders =
        sheet.getLastRow() > 0
          ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map((value) => String(value || ""))
          : [];

      const finalHeaders = existingHeaders.slice();
      requestHeaders.forEach((header) => {
        if (finalHeaders.indexOf(header) === -1) {
          finalHeaders.push(header);
        }
      });

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(finalHeaders);
      } else if (String(existingHeaders.join("||")) !== String(finalHeaders.join("||"))) {
        sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
      }

      const values = sheet.getDataRange().getValues();
      const headers = values[0] || finalHeaders;
      const headerMap = getHeaderMap(headers);
      const record = payload.record || {};
      const targetId = normalizeText(record.ID || record.Id || record.id);

      const buildRow = (source) => headers.map((header) => (source[header] !== undefined ? source[header] : ""));

      const findRowIndexById = (idValue) => {
        if (!idValue) {
          return -1;
        }
        return values.findIndex((row, index) => {
          if (index === 0) {
            return false;
          }
          const idIndex = headerMap[normalizeHeader("ID")];
          return normalizeText(row[idIndex]) === normalizeText(idValue);
        });
      };

      if (action === "deletePermintaanPengajar") {
        const rowIndex = findRowIndexById(targetId);
        if (rowIndex > 0) {
          const row = values[rowIndex] || [];
          const cabangPemintaIndex = headerMap[normalizeHeader("Cabang Peminta")];
          const kodePengajarIndex = headerMap[normalizeHeader("Kode Pengajar")];
          const tanggalMulaiIndex = headerMap[normalizeHeader("Tanggal Mulai")];
          const tanggalSelesaiIndex = headerMap[normalizeHeader("Tanggal Selesai")];
          const tanggalKhususIndex = headerMap[normalizeHeader("Tanggal Khusus")];
          const cabangPeminta = cabangPemintaIndex === undefined ? "" : normalizeText(row[cabangPemintaIndex]);
          const kodePengajar = kodePengajarIndex === undefined ? "" : normalizeText(row[kodePengajarIndex]);
          const tanggalMulai =
            tanggalMulaiIndex === undefined ? "" : normalizeDateKey(row[tanggalMulaiIndex]);
          const tanggalSelesai =
            tanggalSelesaiIndex === undefined ? "" : normalizeDateKey(row[tanggalSelesaiIndex]);
          const tanggalKhususRaw =
            tanggalKhususIndex === undefined ? "" : normalizeText(row[tanggalKhususIndex]);
          const tanggalKhususSet = new Set(
            String(tanggalKhususRaw || "")
              .split(/[\n,;|]+/)
              .map((item) => normalizeDateKey(item))
              .filter((item) => item)
          );

          sheet.deleteRow(rowIndex + 1);

          if (cabangPeminta && kodePengajar) {
            const affectedPairs = new Set();
            const scheduleSheetNames = [SHEET_NAME, JADWAL_KHUSUS_SHEET];

            scheduleSheetNames.forEach((scheduleName) => {
              try {
                const scheduleSheet = getSheet(spreadsheetId, scheduleName);
                let scheduleHeaders = ensureHeaders(scheduleSheet);
                scheduleHeaders = ensureOptionalHeaders(scheduleSheet, scheduleHeaders, OPTIONAL_SCHEDULE_COLUMNS);
                const scheduleHeaderMap = getHeaderMap(scheduleHeaders);
                const scheduleValues = scheduleSheet.getDataRange().getValues();
                const cabangIndex = scheduleHeaderMap[normalizeHeader("Cabang")];
                const pengajarIndex = scheduleHeaderMap[normalizeHeader("Pengajar")];
                const tanggalIndex = scheduleHeaderMap[normalizeHeader("Tanggal")];

                for (let scheduleRowIndex = scheduleValues.length - 1; scheduleRowIndex >= 1; scheduleRowIndex -= 1) {
                  const scheduleRow = scheduleValues[scheduleRowIndex];
                  const cabangValue = normalizeKey(scheduleRow[cabangIndex]);
                  const pengajarValue = normalizeKey(scheduleRow[pengajarIndex]);
                  if (
                    cabangValue === normalizeKey(cabangPeminta) &&
                    pengajarValue === normalizeKey(kodePengajar)
                  ) {
                    const tanggalKey = normalizeDateKey(scheduleRow[tanggalIndex]);
                    if (tanggalKhususSet.size > 0) {
                      if (!tanggalKhususSet.has(tanggalKey)) {
                        continue;
                      }
                    } else if (!isDateInRange(tanggalKey, tanggalMulai, tanggalSelesai)) {
                      continue;
                    }
                    if (tanggalKey) {
                      affectedPairs.add(`${pengajarValue}||${tanggalKey}`);
                    }
                    scheduleSheet.deleteRow(scheduleRowIndex + 1);
                  }
                }
              } catch (error) {
                // Skip unavailable schedule sheets.
              }
            });

            affectedPairs.forEach((pair) => {
              const [pengajar, tanggalKey] = String(pair).split("||");
              syncSuratTugas(pengajar, tanggalKey, spreadsheetId, SHEET_NAME);
            });
          }

          return buildResponse({ success: true, message: "Permintaan pengajar dihapus." });
        }
        return buildResponse({ success: false, message: "Permintaan pengajar tidak ditemukan." });
      }

      if (action === "updatePermintaanStatus") {
        const rowIndex = findRowIndexById(targetId);
        if (rowIndex <= 0) {
          return buildResponse({ success: false, message: "Permintaan pengajar tidak ditemukan." });
        }
        const statusColumn = headerMap[normalizeHeader("Status")];
        if (statusColumn === undefined) {
          return buildResponse({ success: false, message: "Kolom Status tidak ditemukan." });
        }
        values[rowIndex][statusColumn] = payload.status || "Menunggu";
        sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([values[rowIndex]]);
        return buildResponse({ success: true, message: "Status permintaan diperbarui." });
      }

      if (action === "savePermintaanPengajar") {
        const rowIndex = findRowIndexById(targetId);
        const kodePengajarIndex = headerMap[normalizeHeader("Kode Pengajar")];
        const requestKodePengajar = normalizeKey(record["Kode Pengajar"] || "");

        const findRowIndexesByKodePengajar = (kodePengajar) => {
          if (kodePengajarIndex === undefined || !kodePengajar) {
            return [];
          }
          const key = normalizeKey(kodePengajar);
          const indexes = [];
          for (let index = 1; index < values.length; index += 1) {
            const row = values[index] || [];
            const rowKode = normalizeKey(row[kodePengajarIndex]);
            if (rowKode && rowKode === key) {
              indexes.push(index);
            }
          }
          return indexes;
        };

        const samePengajarIndexes = findRowIndexesByKodePengajar(requestKodePengajar);
        let targetUpdateIndex = rowIndex;
        if (targetUpdateIndex <= 0 && samePengajarIndexes.length > 0) {
          targetUpdateIndex = samePengajarIndexes[0];
        }

        const newRow = buildRow(record);
        if (targetUpdateIndex > 0) {
          sheet.getRange(targetUpdateIndex + 1, 1, 1, headers.length).setValues([newRow]);

          const duplicateIndexes = samePengajarIndexes
            .filter((index) => index !== targetUpdateIndex)
            .sort((a, b) => b - a);

          duplicateIndexes.forEach((index) => {
            sheet.deleteRow(index + 1);
          });

          return buildResponse({
            success: true,
            message:
              duplicateIndexes.length > 0
                ? "Permintaan pengajar diperbarui dan permintaan sebelumnya diganti otomatis."
                : "Permintaan pengajar diperbarui.",
          });
        }
        sheet.appendRow(newRow);
        return buildResponse({ success: true, message: "Permintaan pengajar ditambahkan." });
      }
    }

    const sheet = getSheet(spreadsheetId, targetSheetName);
    let headers = ensureHeaders(sheet);
    headers = ensureOptionalHeaders(sheet, headers, OPTIONAL_SCHEDULE_COLUMNS);
    const headerMap = getHeaderMap(headers);

    const record = payload.record || {};
    REQUIRED_COLUMNS.forEach((column) => {
      if (record[column] === undefined) {
        record[column] = "";
      }
    });

    if (action === "deleteClass") {
      const targetCabang = normalizeText(payload.cabang || record.Cabang);
      const targetKelas = normalizeText(payload.kelas || record.Kelas);
      const targetSekolah = normalizeText(payload.sekolah || record.Sekolah);
      if (!targetCabang || !targetKelas) {
        throw new Error("Cabang dan kelas wajib diisi untuk menghapus.");
      }
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const cabangIndex = headerMap[normalizeHeader("Cabang")];
      const kelasIndex = headerMap[normalizeHeader("Kelas")];
      const sekolahIndex = headerMap[normalizeHeader("Sekolah")];
      const pengajarIndex = headerMap[normalizeHeader("Pengajar")];
      const tanggalIndex = headerMap[normalizeHeader("Tanggal")];
      const affectedPairs = new Set();

      for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex -= 1) {
        const row = values[rowIndex];
        const cabangValue = normalizeText(row[cabangIndex]);
        const kelasValue = normalizeText(row[kelasIndex]);
        const sekolahValue = sekolahIndex === undefined ? "" : normalizeText(row[sekolahIndex]);
        const sekolahMatches = targetSekolah ? sekolahValue === targetSekolah : true;
        if (cabangValue === targetCabang && kelasValue === targetKelas && sekolahMatches) {
          const pengajarValue = normalizeText(row[pengajarIndex]);
          const tanggalKey = normalizeDateKey(row[tanggalIndex]);
          if (pengajarValue && tanggalKey) {
            affectedPairs.add(`${pengajarValue}||${tanggalKey}`);
          }
          sheet.deleteRow(rowIndex + 1);
        }
      }

      affectedPairs.forEach((pair) => {
          const [pengajar, tanggalKey] = String(pair).split("||");
          syncSuratTugas(pengajar, tanggalKey, spreadsheetId, targetSheetName);
      });

      return buildResponse({ success: true, message: "Kelas berhasil dihapus." });
    }

    if (action === "append") {
      const row = headers.map((header) => record[header] ?? "");
      sheet.appendRow(row);
      const targetTanggal = normalizeDateKey(record.Tanggal);
      const targetPengajar = normalizeText(record.Pengajar);
      syncSuratTugas(targetPengajar, targetTanggal, spreadsheetId, targetSheetName);
      return buildResponse({ success: true, message: "Data ditambahkan." });
    }

    const matchRecordRowIndex = (sourceValues, targetRecord) => {
      const targetCabang = normalizeText(targetRecord.Cabang);
      const targetKelas = normalizeText(targetRecord.Kelas);
      const targetSekolah = normalizeText(targetRecord.Sekolah);
      const targetTanggal = normalizeDateKey(targetRecord.Tanggal);
      const targetMapel = normalizeText(targetRecord.Mapel);
      const targetPengajar = normalizeText(targetRecord.Pengajar);
      const targetWaktu = normalizeText(targetRecord.Waktu);

      return sourceValues.findIndex((row, index) => {
        if (index === 0) {
          return false;
        }
        const cabangValue = normalizeText(row[headerMap[normalizeHeader("Cabang")]]);
        const kelasValue = normalizeText(row[headerMap[normalizeHeader("Kelas")]]);
        const sekolahIndex = headerMap[normalizeHeader("Sekolah")];
        const sekolahValue = sekolahIndex === undefined ? "" : normalizeText(row[sekolahIndex]);
        const tanggalValue = normalizeDateKey(row[headerMap[normalizeHeader("Tanggal")]]);
        const mapelValue = normalizeText(row[headerMap[normalizeHeader("Mapel")]]);
        const pengajarValue = normalizeText(row[headerMap[normalizeHeader("Pengajar")]]);
        const waktuValue = normalizeText(row[headerMap[normalizeHeader("Waktu")]]);

        return (
          cabangValue === targetCabang &&
          kelasValue === targetKelas &&
          sekolahValue === targetSekolah &&
          tanggalValue === targetTanggal &&
          mapelValue === targetMapel &&
          pengajarValue === targetPengajar &&
          waktuValue === targetWaktu
        );
      });
    };

    if (action === "deleteSession") {
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const rowIndex = matchRecordRowIndex(values, record);
      if (rowIndex > 0) {
        sheet.deleteRow(rowIndex + 1);
      }
      const targetTanggal = normalizeDateKey(record.Tanggal);
      const targetPengajar = normalizeText(record.Pengajar);
      syncSuratTugas(targetPengajar, targetTanggal, spreadsheetId, targetSheetName);
      return buildResponse({ success: true, message: "Sesi dihapus." });
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const rowIndex = payload.oldRecord
      ? matchRecordRowIndex(values, payload.oldRecord)
      : matchRecordRowIndex(values, record);

    const targetTanggal = normalizeDateKey(record.Tanggal);
    let previousPengajar = "";
    let previousTanggal = "";
    if (rowIndex > 0) {
      previousPengajar = normalizeText(values[rowIndex][headerMap[normalizeHeader("Pengajar")]]);
      previousTanggal = normalizeDateKey(values[rowIndex][headerMap[normalizeHeader("Tanggal")]]);
      headers.forEach((header, index) => {
        values[rowIndex][index] = record[header] ?? "";
      });
      dataRange.setValues(values);
    } else {
      const newRow = headers.map((header) => record[header] ?? "");
      sheet.appendRow(newRow);
    }

    const targetPengajar = normalizeText(record.Pengajar);
    const pengajarSet = new Set([
      previousPengajar,
      targetPengajar,
    ].filter((value) => value));
    pengajarSet.forEach((pengajar) => {
      const tanggalKey = pengajar === previousPengajar ? previousTanggal : targetTanggal;
      syncSuratTugas(pengajar, tanggalKey, spreadsheetId, targetSheetName);
    });

    return buildResponse({ success: true, message: rowIndex > 0 ? "Data diperbarui." : "Data baru ditambahkan." });
  } catch (error) {
    return buildResponse({ success: false, message: error.message });
  }
}
