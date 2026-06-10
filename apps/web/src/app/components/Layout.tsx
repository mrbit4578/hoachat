import React, { useState } from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  PackagePlus,
  PackageMinus,
  Boxes,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  FileText,
  TrendingUp,
} from 'lucide-react';
import type { PageType } from '../types';
import { useChemContext } from '../store/ChemContext';

interface NavItem {
  id: PageType;
  label: string;
  icon: React.ReactNode;
  group?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Tổng quan', icon: <LayoutDashboard size={18} />, group: 'main' },
  { id: 'danh-muc', label: 'Danh mục hóa chất', icon: <FlaskConical size={18} />, group: 'main' },
  { id: 'nhap-kho', label: 'Nhập kho', icon: <PackagePlus size={18} />, group: 'transaction' },
  { id: 'xuat-kho', label: 'Xuất kho', icon: <PackageMinus size={18} />, group: 'transaction' },
  { id: 'ton-kho', label: 'Tồn kho theo lô', icon: <Boxes size={18} />, group: 'transaction' },
  { id: 'bao-cao-lot', label: 'Báo cáo XNT theo lô', icon: <BarChart3 size={18} />, group: 'report' },
  { id: 'bao-cao-vat-tu', label: 'Báo cáo XNT theo VT', icon: <TrendingUp size={18} />, group: 'report' },
  { id: 'compliance', label: 'ZDHC Compliance', icon: <ShieldCheck size={18} />, group: 'report' },
  { id: 'settings', label: 'Cài đặt', icon: <Settings size={18} />, group: 'system' },
];

const groups: { id: string; label: string }[] = [
  { id: 'main', label: 'QUẢN LÝ' },
  { id: 'transaction', label: 'GIAO DỊCH KHO' },
  { id: 'report', label: 'BÁO CÁO & TUÂN THỦ' },
  { id: 'system', label: 'HỆ THỐNG' },
];

interface LayoutProps {
  currentPage: PageType;
  setPage: (p: PageType) => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, setPage, children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { getSummary, settings } = useChemContext();
  const summary = getSummary();
  const alertCount = summary.expired + summary.critical + summary.warning;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-[#0f1c2e] text-white transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-60'
        } flex-shrink-0`}
      >
        {/* Logo / Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center flex-shrink-0">
                <FlaskConical size={14} className="text-white" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-white/70 truncate">ZDHC Chemical</div>
                <div className="text-sm text-white truncate">{settings.mrslVersion}</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded bg-teal-500 flex items-center justify-center mx-auto">
              <FlaskConical size={14} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-white/50 hover:text-white transition-colors ml-auto"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {groups.map(group => {
            const items = navItems.filter(n => n.group === group.id);
            return (
              <div key={group.id} className="mb-2">
                {!collapsed && (
                  <div className="px-4 py-2 text-[10px] text-white/40 tracking-wider">{group.label}</div>
                )}
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      currentPage === item.id
                        ? 'bg-teal-600/30 text-teal-300 border-r-2 border-teal-400'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-white/10">
            <div className="text-[10px] text-white/40 truncate">{settings.tenNhaMay}</div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-gray-800">
              {navItems.find(n => n.id === currentPage)?.label ?? 'Tổng quan'}
            </h1>
            <p className="text-xs text-gray-400">
              {settings.tenNhaMay} — {settings.mrslVersion}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {alertCount > 0 && (
              <button
                onClick={() => setPage('ton-kho')}
                className="relative flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs hover:bg-red-100 transition-colors"
              >
                <Bell size={14} />
                <span>{alertCount} cảnh báo lô hóa chất</span>
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText size={14} />
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
