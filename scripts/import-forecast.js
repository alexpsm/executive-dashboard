const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, '..', 'Boxing News Forecast Updated 221225.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Summary M1 Digital'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Month mapping (column index to month)
// Column B = Dec 2025 (skip), Column C = Jan 2026, Column D = Feb 2026, etc.
// Excel file has data for Jan-Sep 2026 (columns C through K, indices 2-10)
const MONTHS = {
  2: '2026-01',  // Jan (Column C)
  3: '2026-02',  // Feb (Column D)
  4: '2026-03',  // Mar (Column E)
  5: '2026-04',  // Apr (Column F)
  6: '2026-05',  // May (Column G)
  7: '2026-06',  // Jun (Column H)
  8: '2026-07',  // Jul (Column I)
  9: '2026-08',  // Aug (Column J)
  10: '2026-09', // Sep (Column K)
};

// Platform row mapping (row index where each platform starts)
const PLATFORMS = {
  'facebook': { start: 8, turnover: 9, cosStaff: 10, cosFreelance: 11, gp: 12, otherOp: 13 },
  'website': { start: 25, turnover: 26, cosStaff: 27, cosFreelance: 28, gp: 29, otherOp: 30 },
  'youtube': { start: 34, turnover: 35, cosStaff: 36, cosFreelance: 37, gp: 38, otherOp: 39 },
  'instagram': { start: 43, turnover: 44, cosStaff: 45, cosFreelance: 46, gp: 47, otherOp: 48 },
  'tiktok': { start: 52, turnover: 53, cosStaff: 54, cosFreelance: 55, gp: 56, otherOp: 57 },
  'x': { start: 61, turnover: 62, cosStaff: 63, cosFreelance: 64, gp: 65, otherOp: 66 },
  'recharge': { start: 70, turnover: 71, cosStaff: 72, cosFreelance: 73, gp: 74, otherOp: 75 },
  'total': { start: 78, turnover: 79, cosStaff: 80, cosFreelance: 81, gp: 82, otherOp: 83 },
};

// Helper to get numeric value
const getNum = (row, col) => {
  if (!row || row[col] === undefined || row[col] === null || row[col] === '') return 0;
  return parseFloat(row[col]) || 0;
};

// Generate SQL INSERT statements
const inserts = [];

for (const [platform, rows] of Object.entries(PLATFORMS)) {
  for (const [colIdx, month] of Object.entries(MONTHS)) {
    const col = parseInt(colIdx);

    const turnover = getNum(data[rows.turnover], col);
    const cosStaff = Math.abs(getNum(data[rows.cosStaff], col));
    const cosFreelance = Math.abs(getNum(data[rows.cosFreelance], col));
    const grossProfit = getNum(data[rows.gp], col);
    const otherOpCosts = Math.abs(getNum(data[rows.otherOp], col));

    // Cost of Sales = Staff costs + Freelancer costs
    const costOfSales = cosStaff + cosFreelance;

    inserts.push({
      platform,
      metric_month: month,
      forecast_cost_of_sales: costOfSales.toFixed(2),
      forecast_gross_profit: grossProfit.toFixed(2),
      forecast_other_op_costs: otherOpCosts.toFixed(2),
      actual_cost_of_sales: 0,
      actual_gross_profit: 0,
      actual_other_op_costs: 0,
    });
  }
}

// Output SQL
console.log('-- Financial Forecast Data Import');
console.log('-- Generated from: Boxing News Forecast Updated 221225.xlsx');
console.log('-- Sheet: Summary M1 Digital');
console.log('');

inserts.forEach(row => {
  console.log(`INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('${row.platform}', '${row.metric_month}', ${row.forecast_cost_of_sales}, ${row.forecast_gross_profit}, ${row.forecast_other_op_costs}, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = ${row.forecast_cost_of_sales},
  forecast_gross_profit = ${row.forecast_gross_profit},
  forecast_other_op_costs = ${row.forecast_other_op_costs},
  updated_at = NOW();`);
  console.log('');
});

console.log('-- Total records:', inserts.length);
