const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, '..', 'Boxing News Forecast Updated 221225.xlsx');
const workbook = XLSX.readFile(filePath);

// Get sheet names
console.log('Sheet names:', workbook.SheetNames);

// Read the "Summary M1 Digital" sheet
const sheetName = 'Summary M1 Digital';
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
  console.log('Sheet not found:', sheetName);
  console.log('Available sheets:', workbook.SheetNames);
  process.exit(1);
}

// Convert to JSON to see structure
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Print all rows to understand structure
console.log('\n=== All rows of data ===\n');
data.forEach((row, idx) => {
  console.log(`Row ${idx}: ${JSON.stringify(row)}`);
});

// Also print the range
console.log('\n=== Sheet Range ===');
console.log(sheet['!ref']);
