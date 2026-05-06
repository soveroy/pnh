const XLSX = require('xlsx');

// Check 1: What date range exists in raw data?
const rawWb = XLSX.readFile('D:\\PNH\\NHGP ATTENDANCE SUBMISSION-RAW DATA.xlsx');
const rawWs = rawWb.Sheets['EmployeeAttendance'];
const rawData = XLSX.utils.sheet_to_json(rawWs, { header: 1, raw: true });
const hdr = rawData[0];
const dateIdx = hdr.indexOf('Date');
const codeIdx = hdr.indexOf('Employee Code');

const allDates = new Set();
rawData.slice(1).forEach(row => {
    const v = row[dateIdx];
    if (v) allDates.add(String(v));
});
console.log('=== ALL DATES in RAW DATA ===');
const sortedDates = Array.from(allDates).sort();
console.log(sortedDates);

// Parse all dates to YYYY-MM-DD
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
function toDateStr(d) {
    const adjusted = new Date(d.getTime() + 12 * 60 * 60 * 1000);
    return adjusted.toISOString().split('T')[0];
}

const parsedDates = new Set();
rawData.slice(1).forEach(row => {
    const d = excelDateToJSDate(row[dateIdx]);
    if (d) parsedDates.add(toDateStr(d));
});
console.log('\n=== PARSED YYYY-MM-DD DATES in RAW DATA ===');
console.log(Array.from(parsedDates).sort());

// Check 2: What dates does Sheet 2 expect?
const tplWb = XLSX.readFile('D:\\PNH\\NHGP ATTENDANCE SUBMISSION-TEMPLETE.xlsx');
const ws2 = tplWb.Sheets['Staff Attendance (2)'];
const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1, raw: true });
const dateRow2 = data2[3] || [];
console.log('\n=== DATE COLUMNS in Sheet 2 (raw values) ===');
for (let c = 5; c < dateRow2.length; c++) {
    const v = dateRow2[c];
    if (v !== undefined && v !== null && v !== '') {
        const d = excelDateToJSDate(v);
        const dStr = d ? toDateStr(d) : 'PARSE_FAIL';
        console.log(`  col${c}: raw=${v} -> ${dStr}`);
        c++; // skip OUT col
    }
}

// Check 3: Sample employee G05901 - what dates does she have in raw data?
console.log('\n=== G05901 (NOR HAMIZA) dates in RAW DATA ===');
rawData.slice(1).forEach(row => {
    if (String(row[codeIdx] || '').trim() === 'G05901') {
        const d = excelDateToJSDate(row[dateIdx]);
        const dStr = d ? toDateStr(d) : 'FAIL';
        console.log(`  raw="${row[dateIdx]}" -> "${dStr}" | IN=${row[hdr.indexOf('Time In')]} | OUT=${row[hdr.indexOf('Time Out')]}`);
    }
});

// Check 4: Check the converted file's Sheet 2 for G05901
const convWb = XLSX.readFile('D:\\PNH\\NHGP_Converted_2026-05-05 (1).xlsx');
const convWs2 = convWb.Sheets['Staff Attendance (2)'];
const convData2 = XLSX.utils.sheet_to_json(convWs2, { header: 1, raw: true });
console.log('\n=== G05901 ROW in CONVERTED Sheet 2 ===');
convData2.forEach((row, r) => {
    if (String(row[2] || '').trim() === 'G05901') {
        console.log(`  Row ${r}: Code=${row[2]} | Name=${row[3]}`);
        // Print all non-empty cells from col 5 onwards
        for (let c = 5; c < row.length; c++) {
            if (row[c] !== undefined && row[c] !== null && row[c] !== '') {
                console.log(`    col${c}: "${row[c]}"`);
            }
        }
    }
});
