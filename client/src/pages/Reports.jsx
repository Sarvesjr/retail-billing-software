import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { BarChart3, TrendingUp, TrendingDown, IndianRupee, Printer, Calendar, RefreshCw, Layers } from 'lucide-react';

export function Reports() {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.getReportsSummary();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 text-gray-500 text-xs">
        Loading business reports from MySQL...
      </div>
    );
  }

  const { sales, salesByMode, purchases, expenses, inventory, outstanding, profitAndLoss } = data;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-sm text-gray-900">
            {lang === 'ta' ? 'வணிக அறிக்கைகள் & லாப நஷ்ட அறிக்கை (Reports & P&L)' : 'Financial Reports & Profit & Loss'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report (Z-Report)</span>
          </button>
          <button onClick={loadReport} className="btn-secondary text-xs p-1.5" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Reports Grid */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white p-3 border border-gray-300 rounded shadow-xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">Today&apos;s Sales (இன்றைய விற்பனை)</div>
            <div className="text-2xl font-black font-mono text-blue-900 mt-1">
              ₹{Number(sales.today_sales).toFixed(2)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">{sales.today_bills_count} bills generated today</div>
          </div>

          <div className="bg-white p-3 border border-gray-300 rounded shadow-xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">GST Tax Collected (ஜிஎஸ்டி வரி)</div>
            <div className="text-2xl font-black font-mono text-indigo-700 mt-1">
              ₹{Number(sales.total_gst_collected).toFixed(2)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Included in sales bills</div>
          </div>

          <div className="bg-white p-3 border border-gray-300 rounded shadow-xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">Total Expenses (கடை செலவுகள்)</div>
            <div className="text-2xl font-black font-mono text-rose-700 mt-1">
              ₹{Number(expenses.total_expenses).toFixed(2)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Tea, rent, electricity, wages</div>
          </div>

          <div className="bg-white p-3 border border-gray-300 rounded shadow-xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">Customer Udhar (கடன் பாக்கி)</div>
            <div className="text-2xl font-black font-mono text-amber-700 mt-1">
              ₹{Number(outstanding.total_customer_udhar).toFixed(2)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Total pending customer collections</div>
          </div>
        </div>

        {/* Profit and Loss Statement */}
        <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
          <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Store Profit &amp; Loss Statement (லாப நஷ்ட கணக்கு)
              </h3>
            </div>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-mono">
              Margin: {profitAndLoss.profitMarginPercent}%
            </span>
          </div>
          <div className="p-4">
            <table className="excel-table text-xs">
              <tbody>
                <tr>
                  <td className="font-bold text-gray-700">Gross Sales Revenue (மொத்த விற்பனை வரவு)</td>
                  <td className="num-cell font-mono font-bold text-base text-gray-900">
                    + ₹{Number(profitAndLoss.totalSales).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="text-gray-600 pl-4">
                    Less: Cost of Goods Sold / COGS (கொள்முதல் அடக்க விலை)
                  </td>
                  <td className="num-cell font-mono text-rose-700 font-semibold">
                    - ₹{Number(profitAndLoss.cogs).toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-gray-50 font-bold border-t border-b border-gray-300">
                  <td className="text-blue-950">GROSS PROFIT (மொத்த வர்த்தக லாபம்)</td>
                  <td className="num-cell font-mono text-base text-blue-900">
                    ₹{Number(profitAndLoss.grossProfit).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="text-gray-600 pl-4">Less: Operating Expenses (கடை பராமரிப்பு செலவுகள்)</td>
                  <td className="num-cell font-mono text-rose-700 font-semibold">
                    - ₹{Number(profitAndLoss.totalExpenses).toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-emerald-50 border-t-2 border-emerald-500 text-emerald-950 font-black">
                  <td className="text-sm">NET ESTIMATED PROFIT (நிகர லாபம்)</td>
                  <td className="num-cell font-mono text-xl text-emerald-800">
                    ₹{Number(profitAndLoss.netProfit).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Two Column Section: Payment Mode Breakdown & Stock Valuation */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sales By Payment Mode */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-gray-800 text-white px-3 py-2 text-xs font-bold uppercase">
              Sales by Payment Mode (பணம் செலுத்திய விபரம்)
            </div>
            <table className="excel-table text-xs">
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th className="text-center">Bills</th>
                  <th className="text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {salesByMode.map((m, idx) => (
                  <tr key={idx}>
                    <td className="font-bold text-gray-900">{m.payment_mode}</td>
                    <td className="text-center font-mono">{m.bill_count}</td>
                    <td className="num-cell font-mono font-bold text-blue-900">
                      ₹{Number(m.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Balance Sheet Outstanding */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-gray-800 text-white px-3 py-2 text-xs font-bold uppercase">
              Store Liabilities &amp; Assets (இருப்பு &amp; பாக்கி விபரம்)
            </div>
            <table className="excel-table text-xs">
              <tbody>
                <tr>
                  <td className="font-bold text-gray-700">Total Stock in Store (Retail Value)</td>
                  <td className="num-cell font-mono font-bold text-emerald-700">
                    ₹{Number(inventory.total_inventory_retail).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="font-bold text-gray-700">Stock Inventory (Cost Value)</td>
                  <td className="num-cell font-mono font-bold text-blue-900">
                    ₹{Number(inventory.total_inventory_cost).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="font-bold text-gray-700">Pending Customer Udhar to Collect</td>
                  <td className="num-cell font-mono font-bold text-amber-700">
                    ₹{Number(outstanding.total_customer_udhar).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="font-bold text-gray-700">Payable to Suppliers / Distributors</td>
                  <td className="num-cell font-mono font-bold text-rose-700">
                    ₹{Number(outstanding.total_supplier_payable).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

