import React from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n';
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Barcode,
  FolderTree,
  ScanBarcode,
  Truck,
  Users2,
  UserCheck,
  Boxes,
  RotateCcw,
  ArrowLeftRight,
  CreditCard,
  Wallet,
  BarChart3,
  UserCog,
  Settings
} from 'lucide-react';

export function Sidebar() {
  const { t, lang } = useI18n();

  const navItems = [
    { to: '/', label: t('dashboard'), icon: LayoutDashboard, shortcut: 'F1' },
    { to: '/billing', label: t('billing'), icon: ReceiptText, shortcut: 'F2', highlight: true },
    { to: '/products', label: t('products'), icon: Package, shortcut: 'F3' },
    { to: '/diagnostic', label: t('barcodeDiagnostic'), icon: ScanBarcode, shortcut: 'F4', badge: 'Test' },
    { to: '/categories', label: t('categories'), icon: FolderTree },
    { to: '/barcodes', label: t('barcodeManagement'), icon: Barcode },
    { to: '/purchases', label: t('purchases'), icon: Truck },
    { to: '/suppliers', label: t('suppliers'), icon: Users2 },
    { to: '/customers', label: t('customers'), icon: UserCheck },
    { to: '/inventory', label: t('inventory'), icon: Boxes },
    { to: '/sales-returns', label: t('salesReturns'), icon: RotateCcw },
    { to: '/purchase-returns', label: t('purchaseReturns'), icon: ArrowLeftRight },
    { to: '/outstanding', label: t('outstanding'), icon: CreditCard },
    { to: '/expenses', label: t('expenses'), icon: Wallet },
    { to: '/reports', label: t('reports'), icon: BarChart3 },
    { to: '/users', label: t('users'), icon: UserCog },
    { to: '/settings', label: t('settings'), icon: Settings }
  ];

  return (
    <aside className="w-56 bg-gray-800 text-gray-200 flex flex-col border-r border-gray-700 select-none overflow-y-auto">
      <div className="p-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase bg-gray-900 border-b border-gray-700">
        {lang === 'ta' ? 'முதன்மை மெனு' : 'MAIN MENU'}
      </div>
      <nav className="flex-1 py-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-1.5 text-xs transition ${
                  isActive
                    ? 'bg-blue-700 text-white font-bold'
                    : item.highlight
                    ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 font-semibold'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {item.badge && (
                  <span className="bg-yellow-500 text-black px-1 rounded text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
                {item.shortcut && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    {item.shortcut}
                  </span>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>
      <div className="p-2 border-t border-gray-700 bg-gray-900 text-[11px] text-gray-400">
        <div>{t('singlePcNotice')}</div>
        <div className="text-gray-500 font-mono text-[10px]">v1.0.0-phase1</div>
      </div>
    </aside>
  );
}
