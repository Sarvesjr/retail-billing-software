import { getPool } from '../config/db.js';

export async function getDashboardAndReportsSummary() {
  const pool = getPool();

  // 1. Sales Summary (Today & All time)
  const [salesSummary] = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN grand_total ELSE 0 END), 0) AS today_sales,
      COALESCE(COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN id ELSE NULL END), 0) AS today_bills_count,
      COALESCE(SUM(grand_total), 0) AS total_sales,
      COALESCE(SUM(tax_total), 0) AS total_gst_collected,
      COUNT(id) AS total_bills
    FROM sales
    WHERE status = 'COMPLETED'
  `);

  // 2. Sales by Payment Mode
  const [paymentModeSummary] = await pool.query(`
    SELECT 
      payment_mode,
      COUNT(id) AS bill_count,
      COALESCE(SUM(grand_total), 0) AS total_amount
    FROM sales
    WHERE status = 'COMPLETED'
    GROUP BY payment_mode
  `);

  // 3. Purchase Summary
  const [purchaseSummary] = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN DATE(purchase_date) = CURDATE() THEN grand_total ELSE 0 END), 0) AS today_purchases,
      COALESCE(SUM(grand_total), 0) AS total_purchases,
      COUNT(id) AS total_purchase_bills
    FROM purchases
    WHERE status = 'RECEIVED'
  `);

  // 4. Expenses Summary
  const [expenseSummary] = await pool.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN expense_date = CURDATE() THEN amount ELSE 0 END), 0) AS today_expenses,
      COALESCE(SUM(amount), 0) AS total_expenses,
      COUNT(id) AS total_expense_entries
    FROM expenses
  `);

  // 5. Stock Valuation & Alert Counts
  const [stockSummary] = await pool.query(`
    SELECT 
      COUNT(p.id) AS total_products,
      COALESCE(SUM(ps.current_stock), 0) AS total_stock_qty,
      COALESCE(SUM(ps.current_stock * p.purchase_price), 0) AS total_inventory_cost,
      COALESCE(SUM(ps.current_stock * p.selling_price), 0) AS total_inventory_retail,
      COUNT(CASE WHEN ps.current_stock <= p.min_stock_level THEN 1 ELSE NULL END) AS low_stock_count
    FROM products p
    LEFT JOIN product_stock ps ON p.id = ps.product_id
    WHERE p.is_active = TRUE
  `);

  // 6. Outstanding Khata (Customer Udhar vs Supplier Payable)
  const [outstandingSummary] = await pool.query(`
    SELECT 
      (SELECT COALESCE(SUM(current_balance), 0) FROM customers WHERE is_active = TRUE) AS total_customer_udhar,
      (SELECT COALESCE(SUM(current_balance), 0) FROM suppliers WHERE is_active = TRUE) AS total_supplier_payable
  `);

  // 7. Cost of Goods Sold (COGS) for accurate Profit & Loss calculation
  const [cogsRows] = await pool.query(`
    SELECT COALESCE(SUM(si.quantity * p.purchase_price), 0) AS total_cogs
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status = 'COMPLETED'
  `);

  const totalSales = Number(salesSummary[0].total_sales);
  const totalCogs = Number(cogsRows[0].total_cogs);
  const totalExpenses = Number(expenseSummary[0].total_expenses);
  const grossProfit = totalSales - totalCogs;
  const netProfit = grossProfit - totalExpenses;

  return {
    sales: salesSummary[0],
    salesByMode: paymentModeSummary,
    purchases: purchaseSummary[0],
    expenses: expenseSummary[0],
    inventory: stockSummary[0],
    outstanding: outstandingSummary[0],
    profitAndLoss: {
      totalSales,
      cogs: totalCogs,
      grossProfit,
      totalExpenses,
      netProfit,
      profitMarginPercent: totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0
    }
  };
}

