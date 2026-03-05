-- Financial Forecast Data Import
-- Generated from: Boxing News Forecast Updated 221225.xlsx
-- Sheet: Summary M1 Digital

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-01', 3131.40, 3535.27, 1029.20, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3131.40,
  forecast_gross_profit = 3535.27,
  forecast_other_op_costs = 1029.20,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-02', 3725.40, 5024.60, 1029.20, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3725.40,
  forecast_gross_profit = 5024.60,
  forecast_other_op_costs = 1029.20,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-03', 3131.40, 5618.60, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3131.40,
  forecast_gross_profit = 5618.60,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-04', 2887.90, 5862.10, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2887.90,
  forecast_gross_profit = 5862.10,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-05', 2739.40, 6010.60, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2739.40,
  forecast_gross_profit = 6010.60,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-06', 2739.40, 6010.60, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2739.40,
  forecast_gross_profit = 6010.60,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-07', 2739.40, 6010.60, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2739.40,
  forecast_gross_profit = 6010.60,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-08', 2739.40, 6010.60, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2739.40,
  forecast_gross_profit = 6010.60,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-09', 2739.40, 6010.60, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2739.40,
  forecast_gross_profit = 6010.60,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('facebook', '2026-10', 2739.40, 6010.60, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2739.40,
  forecast_gross_profit = 6010.60,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-01', 2481.83, 16418.17, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2481.83,
  forecast_gross_profit = 16418.17,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-02', 2481.83, 518.17, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2481.83,
  forecast_gross_profit = 518.17,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-03', 1763.19, 1236.81, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1763.19,
  forecast_gross_profit = 1236.81,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-04', 0.00, 3000.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 3000.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-05', 0.00, 3000.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 3000.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-06', 0.00, 3000.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 3000.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-07', 0.00, 3000.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 3000.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-08', 0.00, 3000.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 3000.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-09', 0.00, 3000.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 3000.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('website', '2026-10', 0.00, 3000.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 3000.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-01', 4251.73, -3251.73, 1029.20, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 4251.73,
  forecast_gross_profit = -3251.73,
  forecast_other_op_costs = 1029.20,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-02', 4845.73, -3845.73, 1029.20, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 4845.73,
  forecast_gross_profit = -3845.73,
  forecast_other_op_costs = 1029.20,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-03', 4251.73, -3251.73, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 4251.73,
  forecast_gross_profit = -3251.73,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-04', 4103.23, -3103.23, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 4103.23,
  forecast_gross_profit = -3103.23,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-05', 3954.73, -2954.73, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3954.73,
  forecast_gross_profit = -2954.73,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-06', 3954.73, -2954.73, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3954.73,
  forecast_gross_profit = -2954.73,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-07', 3954.73, -2954.73, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3954.73,
  forecast_gross_profit = -2954.73,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-08', 3954.73, -2954.73, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3954.73,
  forecast_gross_profit = -2954.73,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-09', 3954.73, -2954.73, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3954.73,
  forecast_gross_profit = -2954.73,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('youtube', '2026-10', 3954.73, -2954.73, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3954.73,
  forecast_gross_profit = -2954.73,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-01', 2643.82, -2643.82, 1029.20, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2643.82,
  forecast_gross_profit = -2643.82,
  forecast_other_op_costs = 1029.20,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-02', 3237.82, -1154.49, 1029.20, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 3237.82,
  forecast_gross_profit = -1154.49,
  forecast_other_op_costs = 1029.20,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-03', 2643.82, -560.49, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2643.82,
  forecast_gross_profit = -560.49,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-04', 2400.32, -316.99, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2400.32,
  forecast_gross_profit = -316.99,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-05', 2251.82, -168.49, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2251.82,
  forecast_gross_profit = -168.49,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-06', 2251.82, -168.49, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2251.82,
  forecast_gross_profit = -168.49,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-07', 2251.82, -168.49, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2251.82,
  forecast_gross_profit = -168.49,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-08', 2251.82, -168.49, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2251.82,
  forecast_gross_profit = -168.49,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-09', 2251.82, -168.49, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2251.82,
  forecast_gross_profit = -168.49,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('instagram', '2026-10', 2251.82, -168.49, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2251.82,
  forecast_gross_profit = -168.49,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-01', 1724.76, -1724.76, 1029.20, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1724.76,
  forecast_gross_profit = -1724.76,
  forecast_other_op_costs = 1029.20,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-02', 1843.56, -1843.56, 1029.20, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1843.56,
  forecast_gross_profit = -1843.56,
  forecast_other_op_costs = 1029.20,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-03', 1724.76, -1724.76, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1724.76,
  forecast_gross_profit = -1724.76,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-04', 1481.26, -1481.26, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1481.26,
  forecast_gross_profit = -1481.26,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-05', 1332.76, -1332.76, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1332.76,
  forecast_gross_profit = -1332.76,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-06', 1332.76, -1332.76, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1332.76,
  forecast_gross_profit = -1332.76,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-07', 1332.76, -1332.76, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1332.76,
  forecast_gross_profit = -1332.76,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-08', 1332.76, -1332.76, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1332.76,
  forecast_gross_profit = -1332.76,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-09', 1332.76, -1332.76, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1332.76,
  forecast_gross_profit = -1332.76,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('tiktok', '2026-10', 1332.76, -1332.76, 862.53, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1332.76,
  forecast_gross_profit = -1332.76,
  forecast_other_op_costs = 862.53,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-01', 930.28, -930.28, 851.60, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 930.28,
  forecast_gross_profit = -930.28,
  forecast_other_op_costs = 851.60,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-02', 1167.88, -1167.88, 851.60, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1167.88,
  forecast_gross_profit = -1167.88,
  forecast_other_op_costs = 851.60,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-03', 930.28, -930.28, 684.93, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 930.28,
  forecast_gross_profit = -930.28,
  forecast_other_op_costs = 684.93,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-04', 781.78, -781.78, 684.93, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 781.78,
  forecast_gross_profit = -781.78,
  forecast_other_op_costs = 684.93,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-05', 633.28, -633.28, 684.93, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 633.28,
  forecast_gross_profit = -633.28,
  forecast_other_op_costs = 684.93,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-06', 633.28, -633.28, 684.93, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 633.28,
  forecast_gross_profit = -633.28,
  forecast_other_op_costs = 684.93,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-07', 633.28, -633.28, 684.93, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 633.28,
  forecast_gross_profit = -633.28,
  forecast_other_op_costs = 684.93,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-08', 633.28, -633.28, 684.93, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 633.28,
  forecast_gross_profit = -633.28,
  forecast_other_op_costs = 684.93,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-09', 633.28, -633.28, 684.93, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 633.28,
  forecast_gross_profit = -633.28,
  forecast_other_op_costs = 684.93,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('x', '2026-10', 633.28, -633.28, 684.93, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 633.28,
  forecast_gross_profit = -633.28,
  forecast_other_op_costs = 684.93,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-01', 2200.83, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2200.83,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-02', 2200.83, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 2200.83,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-03', 1650.63, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 1650.63,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-04', 0.00, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-05', 0.00, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-06', 0.00, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-07', 0.00, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-08', 0.00, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-09', 0.00, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('recharge', '2026-10', 0.00, 0.00, 0.00, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 0.00,
  forecast_gross_profit = 0.00,
  forecast_other_op_costs = 0.00,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-01', 12963.00, 13603.67, 4968.40, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 12963.00,
  forecast_gross_profit = 13603.67,
  forecast_other_op_costs = 4968.40,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-02', 15101.40, -268.06, 4968.40, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 15101.40,
  forecast_gross_profit = -268.06,
  forecast_other_op_costs = 4968.40,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-03', 12794.56, 2038.77, 4135.07, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 12794.56,
  forecast_gross_profit = 2038.77,
  forecast_other_op_costs = 4135.07,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-04', 11654.50, 3178.83, 4135.07, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 11654.50,
  forecast_gross_profit = 3178.83,
  forecast_other_op_costs = 4135.07,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-05', 10912.00, 3921.33, 4135.07, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 10912.00,
  forecast_gross_profit = 3921.33,
  forecast_other_op_costs = 4135.07,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-06', 10912.00, 3921.33, 4135.07, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 10912.00,
  forecast_gross_profit = 3921.33,
  forecast_other_op_costs = 4135.07,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-07', 10912.00, 3921.33, 4135.07, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 10912.00,
  forecast_gross_profit = 3921.33,
  forecast_other_op_costs = 4135.07,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-08', 10912.00, 3921.33, 4135.07, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 10912.00,
  forecast_gross_profit = 3921.33,
  forecast_other_op_costs = 4135.07,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-09', 10912.00, 3921.33, 4135.07, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 10912.00,
  forecast_gross_profit = 3921.33,
  forecast_other_op_costs = 4135.07,
  updated_at = NOW();

INSERT INTO financial_forecast (platform, metric_month, forecast_cost_of_sales, forecast_gross_profit, forecast_other_op_costs, actual_cost_of_sales, actual_gross_profit, actual_other_op_costs, updated_at)
VALUES ('total', '2026-10', 10912.00, 3921.33, 4135.07, 0, 0, 0, NOW())
ON CONFLICT (platform, metric_month) DO UPDATE SET
  forecast_cost_of_sales = 10912.00,
  forecast_gross_profit = 3921.33,
  forecast_other_op_costs = 4135.07,
  updated_at = NOW();

-- Total records: 80
