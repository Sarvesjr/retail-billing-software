import { getPool, withTransaction } from '../config/db.js';

export async function getAllSettings() {
  const pool = getPool();
  const [rows] = await pool.query('SELECT `key`, `value` FROM app_settings');
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }

  // Ensure sensible Indian retail defaults if empty
  return {
    shop_name: settings.shop_name || 'Retail Billing System',
    shop_tamil_name: settings.shop_tamil_name || 'சில்லறை பில்லிங் நிலையம்',
    shop_phone: settings.shop_phone || '+91 98765 43210',
    shop_address: settings.shop_address || 'No. 12, Bazaar Street, Main Market',
    shop_gstin: settings.shop_gstin || '33AAAAA0000A1Z5',
    shop_fssai: settings.shop_fssai || '12423001000123',
    receipt_footer: settings.receipt_footer || 'Thank you for your visit! / வருகைக்கு நன்றி! மீண்டும் வருக!',
    thermal_width: settings.thermal_width || '80mm',
    enable_gst: settings.enable_gst || 'true',
    currency_symbol: settings.currency_symbol || '₹'
  };
}

export async function updateSettings(settingsData) {
  const pool = getPool();
  for (const [key, value] of Object.entries(settingsData)) {
    await pool.query(
      `INSERT INTO app_settings (\`key\`, \`value\`) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
      [key, String(value ?? '')]
    );
  }
  return getAllSettings();
}

// Reset Fabricated / Demo Data Tool (Wipes transactions, resets stocks, prepares for real shop use)
export async function resetFabricatedData({ wipeProducts = false } = {}) {
  return await withTransaction(async (conn) => {
    // 1. Wipe all test sales, returns, and payments
    await conn.query('DELETE FROM sale_payments');
    await conn.query('DELETE FROM sale_items');
    await conn.query('DELETE FROM sales');
    await conn.query('DELETE FROM sales_return_items');
    await conn.query('DELETE FROM sales_returns');

    // 2. Wipe test purchases & returns
    await conn.query('DELETE FROM purchase_items');
    await conn.query('DELETE FROM purchase_returns');
    await conn.query('DELETE FROM purchase_return_items');
    await conn.query('DELETE FROM purchases');

    // 3. Wipe test payments & expenses & logs
    await conn.query('DELETE FROM customer_payments');
    await conn.query('DELETE FROM supplier_payments');
    await conn.query('DELETE FROM expenses');
    await conn.query('DELETE FROM scanner_logs');
    await conn.query('DELETE FROM stock_movements');

    // 4. Reset customer and supplier balances to 0
    await conn.query('UPDATE customers SET current_balance = 0.00');
    await conn.query('UPDATE suppliers SET current_balance = 0.00');

    // 5. Optionally wipe sample products or reset stock to 0
    if (wipeProducts) {
      await conn.query('DELETE FROM product_barcodes');
      await conn.query('DELETE FROM product_stock');
      await conn.query('DELETE FROM products');
    } else {
      await conn.query('UPDATE product_stock SET current_stock = 0.000');
    }

    return {
      success: true,
      message: wipeProducts
        ? 'All test transactions, logs, and sample products wiped. Database is 100% clean for your store!'
        : 'All test sales, purchases, and expenses cleared. Stock balances reset to 0.'
    };
  });
}

export async function generateSqlBackup() {
  const pool = getPool();
  const tables = [
    'app_settings',
    'units',
    'categories',
    'products',
    'product_barcodes',
    'product_stock',
    'stock_movements',
    'suppliers',
    'purchases',
    'purchase_items',
    'purchase_returns',
    'customers',
    'customer_payments',
    'sales',
    'sale_items',
    'sale_payments',
    'sales_returns',
    'sales_return_items',
    'expense_categories',
    'expenses',
    'users',
    'scanner_logs'
  ];

  let sqlDump = `-- ========================================================\n`;
  sqlDump += `-- RETAIL BILLING SYSTEM DATABASE BACKUP\n`;
  sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
  sqlDump += `-- Database: retailbilling\n`;
  sqlDump += `-- ========================================================\n\n`;
  sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  for (const table of tables) {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        sqlDump += `-- Table data: ${table} (${rows.length} rows)\n`;
        const columns = Object.keys(rows[0]);
        const colsSql = columns.map(c => `\`${c}\``).join(', ');

        for (const row of rows) {
          const vals = columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            return `'${String(val).replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
              switch (char) {
                case "\0": return "\\0";
                case "\x08": return "\\b";
                case "\x09": return "\\t";
                case "\x1a": return "\\z";
                case "\n": return "\\n";
                case "\r": return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%": return "\\" + char;
                default: return char;
              }
            })}'`;
          }).join(', ');

          sqlDump += `INSERT INTO \`${table}\` (${colsSql}) VALUES (${vals});\n`;
        }
        sqlDump += `\n`;
      }
    } catch (_) {}
  }

  sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  sqlDump += `-- ================= END OF BACKUP =================\n`;
  return sqlDump;
}

