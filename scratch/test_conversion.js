const XLSX = require('xlsx');
const fs = require('fs');

function excelDateToJSDate(val) {
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
  if (typeof val === 'string') {
    const s = val.trim();
    const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  }
  return null;
}

function toDateString(d) {
  if (!d) return null;
  const adjusted = new Date(d.getTime() + 12 * 60 * 60 * 1000);
  return adjusted.toISOString().split('T')[0];
}

function formatTime(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  if (typeof val === 'string') {
    const clean = val.replace(';', ':').trim();
    if (/^\d{1,2}:\d{2}$/.test(clean)) return clean;
  }
  return null;
}

async function runTest() {
  const rawDataPath = 'D:\\PNH\\NHGP ATTENDANCE SUBMISSION-RAW DATA.xlsx';
  const templatePath = 'D:\\PNH\\NHGP ATTENDANCE SUBMISSION-TEMPLETE.xlsx';
  const outputPath = 'D:\\PNH\\NHGP_Converted_TEST.xlsx';

  const srcWb = XLSX.readFile(rawDataPath, { cellDates: true });
  const tplWb = XLSX.readFile(templatePath, { cellDates: true });

  const srcWs = srcWb.Sheets['EmployeeAttendance'];
  const srcData = XLSX.utils.sheet_to_json(srcWs, { header: 1, raw: true });

  const headerRow = srcData[0];
  const colIdx = {
    code: headerRow.indexOf('Employee Code'),
    name: headerRow.indexOf('Employee Name'),
    date: headerRow.indexOf('Date'),
    activity: headerRow.indexOf('Activity'),
    in: headerRow.indexOf('Time In'),
    out: headerRow.indexOf('Time Out'),
    group: headerRow.indexOf('Working Group')
  };

  const attendanceRecords = new Map();
  for (let i = 1; i < srcData.length; i++) {
    const row = srcData[i];
    const code = String(row[colIdx.code] || '').trim().toUpperCase();
    if (!code || code === 'NULL' || code === 'EMPLOYEE CODE') continue;

    const date = excelDateToJSDate(row[colIdx.date]);
    if (!date) continue;
    const dStr = date.toISOString().split('T')[0];

    const inTime = formatTime(row[colIdx.in]);
    const outTime = formatTime(row[colIdx.out]);
    const activity = String(row[colIdx.activity] || '').trim();

    if (!attendanceRecords.has(code)) {
      attendanceRecords.set(code, { 
          name: String(row[colIdx.name]).trim(),
          workingGroup: String(row[colIdx.group]).trim().toUpperCase(),
          days: new Map() 
      });
    }
    const empData = attendanceRecords.get(code);
    if (!empData.days.has(dStr)) {
        empData.days.set(dStr, { inTime, outTime, leaveCode: activity || null });
    } else {
        const day = empData.days.get(dStr);
        if (inTime && (!day.inTime || inTime < day.inTime)) day.inTime = inTime;
        if (outTime && (!day.outTime || outTime > day.outTime)) day.outTime = outTime;
        if (activity && !day.leaveCode) day.leaveCode = activity;
    }
  }

  console.log(`Parsed ${attendanceRecords.size} employees.`);

  tplWb.SheetNames.forEach(sheetName => {
    if (!sheetName.startsWith('Staff Attendance')) return;
    const ws = tplWb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    
    const dateRow = data[3] || [];
    const colDateMap = new Map();
    for (let c = 5; c < dateRow.length; c++) {
      const v = dateRow[c];
      const d = excelDateToJSDate(v);
      if (d) {
        const dStr = toDateString(d);
        colDateMap.set(c, dStr);
        colDateMap.set(c + 1, dStr);
        c++;
      }
    }

    const groupSections = new Map();
    data.forEach((row, r) => {
        const cellVal = String(row[0] || row[1] || row[2] || '').toUpperCase();
        if (cellVal.includes('NHGP -')) {
            const match = cellVal.match(/NHGP - [^ ]+/);
            groupSections.set(match ? match[0].trim() : cellVal.trim(), r);
        }
    });

    attendanceRecords.forEach((record, empCode) => {
      const sections = Array.from(groupSections.keys());
      const targetSection = sections.find(s => record.workingGroup.includes(s) || s.includes(record.workingGroup));
      let startRow = targetSection ? groupSections.get(targetSection) : 5;
      let endRow = data.length;
      if (targetSection) {
          const nextRow = Array.from(groupSections.values()).filter(r => r > startRow).sort((a,b)=>a-b)[0];
          if (nextRow) endRow = nextRow;
      }

      for (let r = startRow; r < endRow; r++) {
        const row = data[r];
        if (!row) continue;
        const rowEmpCode = String(row[2] || '').trim().toUpperCase();
        if (rowEmpCode === empCode) {
            record.days.forEach((day, dStr) => {
                for (const [c, mappedDStr] of colDateMap) {
                    if (mappedDStr === dStr) {
                        if (day.leaveCode) {
                            ws[XLSX.utils.encode_cell({r, c})] = { t: 's', v: day.leaveCode };
                            ws[XLSX.utils.encode_cell({r, c: c+1})] = { t: 's', v: day.leaveCode };
                        } else {
                            if (day.inTime) ws[XLSX.utils.encode_cell({r, c})] = { t: 's', v: day.inTime };
                            if (day.outTime) ws[XLSX.utils.encode_cell({r, c: c+1})] = { t: 's', v: day.outTime };
                        }
                        break;
                    }
                }
            });
            break;
        }
      }
    });
  });

  XLSX.writeFile(tplWb, outputPath);
  console.log(`Saved to ${outputPath}`);
}

runTest().catch(console.error);
