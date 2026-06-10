import React, { useState, useMemo } from 'react';
import { Download, Calendar, Layers, Package2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChemContext } from '../store/ChemContext';
import { calcHSDStatus } from '../store/chemStore';
import type { HSDStatus } from '../types';

type TabType = 'lot' | 'vattu';

const STATUS_ROW: Record<string, string> = { EXPIRED: 'bg-red-50', CRITICAL: 'bg-red-50', WARNING: 'bg-yellow-50', VALID: '' };
const STATUS_BADGE: Record<string, string> = { EXPIRED: 'bg-red-100 text-red-700', CRITICAL: 'bg-red-100 text-red-700', WARNING: 'bg-yellow-100 text-yellow-700', VALID: 'bg-green-100 text-green-700' };

function getQuarterRange(q: number, year: number) {
  const start = new Date(year, (q - 1) * 3, 1).toISOString().split('T')[0];
  const end = new Date(year, q * 3, 0).toISOString().split('T')[0];
  return { start, end };
}

export function BaoCaoXNT() {
  const { phieuNhap, phieuXuat, getTonKhoByLot, hoaChat } = useChemContext();
  const [tab, setTab] = useState<TabType>('lot');
  const now = new Date();
  const [fromDate, setFromDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(now.toISOString().split('T')[0]);

  function setQuickRange(type: string) {
    const y = now.getFullYear();
    const m = now.getMonth();
    switch (type) {
      case 'thisMonth':
        setFromDate(new Date(y, m, 1).toISOString().split('T')[0]);
        setToDate(new Date(y, m + 1, 0).toISOString().split('T')[0]);
        break;
      case 'lastMonth':
        setFromDate(new Date(y, m - 1, 1).toISOString().split('T')[0]);
        setToDate(new Date(y, m, 0).toISOString().split('T')[0]);
        break;
      case 'q1': { const r = getQuarterRange(1, y); setFromDate(r.start); setToDate(r.end); break; }
      case 'q2': { const r = getQuarterRange(2, y); setFromDate(r.start); setToDate(r.end); break; }
      case 'q3': { const r = getQuarterRange(3, y); setFromDate(r.start); setToDate(r.end); break; }
      case 'q4': { const r = getQuarterRange(4, y); setFromDate(r.start); setToDate(r.end); break; }
      case 'ytd':
        setFromDate(new Date(y, 0, 1).toISOString().split('T')[0]);
        setToDate(now.toISOString().split('T')[0]);
        break;
    }
  }

  // Calculate balance by lot for a period
  const reportByLot = useMemo(() => {
    const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
    const to = new Date(toDate); to.setHours(23, 59, 59, 999);
    const today = new Date();

    type LotKey = string;
    interface LotData {
      maVatTu: string; tenHoaChat: string; donViTinh: string; lotNo: string;
      hsd: string; khoNhap: string; dongDauLo: string;
      tonDauKy: number; nhapTrongKy: number; xuatTrongKy: number; tonCuoiKy: number;
      trangThaiHSD: HSDStatus; canhBao: string;
    }

    const map = new Map<LotKey, LotData>();

    // Process all receipts
    phieuNhap.forEach(p => {
      const key = `${p.maVatTu}|${p.lotNo}`;
      const hcInfo = hoaChat.find(h => h.maVatTu === p.maVatTu);
      if (!map.has(key)) {
        const { status } = calcHSDStatus(p.hsd);
        map.set(key, {
          maVatTu: p.maVatTu, tenHoaChat: hcInfo?.tenHoaChat ?? p.tenHoaChat,
          donViTinh: p.donViTinh, lotNo: p.lotNo, hsd: p.hsd, khoNhap: p.khoNhap,
          dongDauLo: p.ngayNhap, tonDauKy: 0, nhapTrongKy: 0, xuatTrongKy: 0, tonCuoiKy: 0,
          trangThaiHSD: status,
          canhBao: status === 'EXPIRED' ? 'Lô hết hạn còn tồn;' : status === 'WARNING' ? 'Cảnh báo HSD <= 15 ngày;' : status === 'CRITICAL' ? 'Cảnh báo HSD <= 30 ngày;' : '',
        });
      }
      const lot = map.get(key)!;
      const d = new Date(p.ngayNhap);
      if (d < from) lot.tonDauKy += p.soLuong;
      else if (d >= from && d <= to) lot.nhapTrongKy += p.soLuong;
    });

    // Process all issues
    phieuXuat.forEach(p => {
      const key = `${p.maVatTu}|${p.lotNo}`;
      if (!map.has(key)) return;
      const lot = map.get(key)!;
      const d = new Date(p.ngayXuat);
      if (d < from) lot.tonDauKy -= p.soLuong;
      else if (d >= from && d <= to) lot.xuatTrongKy += p.soLuong;
    });

    map.forEach(lot => {
      lot.tonCuoiKy = lot.tonDauKy + lot.nhapTrongKy - lot.xuatTrongKy;
    });

    return Array.from(map.values())
      .filter(l => l.tonDauKy !== 0 || l.nhapTrongKy !== 0 || l.xuatTrongKy !== 0)
      .sort((a, b) => {
        if (a.maVatTu !== b.maVatTu) return a.maVatTu.localeCompare(b.maVatTu);
        return new Date(a.hsd).getTime() - new Date(b.hsd).getTime();
      });
  }, [phieuNhap, phieuXuat, hoaChat, fromDate, toDate]);

  // Aggregate by material
  const reportByVatTu = useMemo(() => {
    const map = new Map<string, { maVatTu: string; tenHoaChat: string; donViTinh: string; tonDauKy: number; nhapTrongKy: number; xuatTrongKy: number; tonCuoiKy: number; soLo: number }>();
    reportByLot.forEach(r => {
      if (!map.has(r.maVatTu)) {
        map.set(r.maVatTu, { maVatTu: r.maVatTu, tenHoaChat: r.tenHoaChat, donViTinh: r.donViTinh, tonDauKy: 0, nhapTrongKy: 0, xuatTrongKy: 0, tonCuoiKy: 0, soLo: 0 });
      }
      const vt = map.get(r.maVatTu)!;
      vt.tonDauKy += r.tonDauKy;
      vt.nhapTrongKy += r.nhapTrongKy;
      vt.xuatTrongKy += r.xuatTrongKy;
      vt.tonCuoiKy += r.tonCuoiKy;
      vt.soLo += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.maVatTu.localeCompare(b.maVatTu));
  }, [reportByLot]);

  function exportCSV() {
    if (tab === 'lot') {
      const headers = ['Mã VT', 'Tên HC', 'ĐVT', 'Lot No', 'HSD', 'Kho', 'Đầu kỳ', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ', 'Trạng thái HSD', 'Cảnh báo'];
      const rows = reportByLot.map(r => [r.maVatTu, r.tenHoaChat, r.donViTinh, r.lotNo, r.hsd, r.khoNhap, r.dongDauLo, r.tonDauKy.toFixed(3), r.nhapTrongKy.toFixed(3), r.xuatTrongKy.toFixed(3), r.tonCuoiKy.toFixed(3), r.trangThaiHSD, r.canhBao]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bao_cao_XNT_lot_${fromDate}_${toDate}.csv`; a.click();
    } else {
      const headers = ['Mã VT', 'Tên HC', 'ĐVT', 'Số lô', 'Tồn đầu kỳ', 'Nhập trong kỳ', 'Xuất trong kỳ', 'Tồn cuối kỳ'];
      const rows = reportByVatTu.map(r => [r.maVatTu, r.tenHoaChat, r.donViTinh, r.soLo, r.tonDauKy.toFixed(3), r.nhapTrongKy.toFixed(3), r.xuatTrongKy.toFixed(3), r.tonCuoiKy.toFixed(3)]);
      const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bao_cao_XNT_vattu_${fromDate}_${toDate}.csv`; a.click();
    }
  }

  return (
    <div className="space-y-4">
      {/* Date range and quick select */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400" />
            <span className="text-sm text-gray-600">Kỳ báo cáo:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Từ</span>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8 text-sm w-36" />
            <span className="text-xs text-gray-400">Đến</span>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8 text-sm w-36" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Tháng này', key: 'thisMonth' },
              { label: 'Tháng trước', key: 'lastMonth' },
              { label: 'Q1', key: 'q1' }, { label: 'Q2', key: 'q2' },
              { label: 'Q3', key: 'q3' }, { label: 'Q4', key: 'q4' },
              { label: 'Năm nay', key: 'ytd' },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setQuickRange(btn.key)}
                className="px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-600 hover:bg-teal-100 hover:text-teal-700 transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={exportCSV} className="ml-auto">
            <Download size={14} /> Xuất CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('lot')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'lot' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Layers size={14} /> Báo cáo theo Lô
        </button>
        <button
          onClick={() => setTab('vattu')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${tab === 'vattu' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Package2 size={14} /> Báo cáo theo Vật tư
        </button>
      </div>

      {/* Summary row */}
      {tab === 'lot' ? (
        <div className="flex gap-4 text-sm text-gray-500">
          <span><span className="text-gray-800">{reportByLot.length}</span> lô</span>
          <span>Tổng nhập kỳ: <span className="text-blue-600">{reportByLot.reduce((s, r) => s + r.nhapTrongKy, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span></span>
          <span>Tổng xuất kỳ: <span className="text-orange-600">{reportByLot.reduce((s, r) => s + r.xuatTrongKy, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span></span>
        </div>
      ) : (
        <div className="flex gap-4 text-sm text-gray-500">
          <span><span className="text-gray-800">{reportByVatTu.length}</span> loại hóa chất</span>
          <span>Tổng nhập kỳ: <span className="text-blue-600">{reportByVatTu.reduce((s, r) => s + r.nhapTrongKy, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span></span>
          <span>Tổng xuất kỳ: <span className="text-orange-600">{reportByVatTu.reduce((s, r) => s + r.xuatTrongKy, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span></span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'lot' ? (
            <table className="w-full text-xs">
              <thead className="bg-[#0f1c2e] text-white">
                <tr>
                  <th className="px-3 py-2.5 text-left">Mã VT</th>
                  <th className="px-3 py-2.5 text-left">Tên hóa chất</th>
                  <th className="px-3 py-2.5 text-left">ĐVT</th>
                  <th className="px-3 py-2.5 text-left">Lot No</th>
                  <th className="px-3 py-2.5 text-left">HSD</th>
                  <th className="px-3 py-2.5 text-left">Kho</th>
                  <th className="px-3 py-2.5 text-left">Đầu lô</th>
                  <th className="px-3 py-2.5 text-right bg-blue-700">Tồn đầu kỳ</th>
                  <th className="px-3 py-2.5 text-right bg-green-700">Nhập trong kỳ</th>
                  <th className="px-3 py-2.5 text-right bg-orange-700">Xuất trong kỳ</th>
                  <th className="px-3 py-2.5 text-right bg-teal-700">Tồn cuối kỳ</th>
                  <th className="px-3 py-2.5 text-center">Trạng thái HSD</th>
                  <th className="px-3 py-2.5 text-left">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {reportByLot.map((r, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${STATUS_ROW[r.trangThaiHSD]}`}>
                    <td className="px-3 py-2 font-mono text-gray-700">{r.maVatTu}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[160px] truncate">{r.tenHoaChat}</td>
                    <td className="px-3 py-2 text-gray-500">{r.donViTinh}</td>
                    <td className="px-3 py-2 font-mono text-gray-600">{r.lotNo}</td>
                    <td className="px-3 py-2 text-gray-600">{new Date(r.hsd).toLocaleDateString('vi-VN')}</td>
                    <td className="px-3 py-2 text-gray-500">{r.khoNhap}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(r.dongDauLo).toLocaleDateString('vi-VN')}</td>
                    <td className="px-3 py-2 text-right text-blue-700">{r.tonDauKy.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-green-700">{r.nhapTrongKy.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{r.xuatTrongKy.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-teal-700">{r.tonCuoiKy.toFixed(3)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${STATUS_BADGE[r.trangThaiHSD]}`}>{r.trangThaiHSD}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-[10px] max-w-[140px]">{r.canhBao}</td>
                  </tr>
                ))}
                {reportByLot.length === 0 && (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400">Không có dữ liệu trong kỳ đã chọn</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[#0f1c2e] text-white">
                <tr>
                  <th className="px-3 py-2.5 text-left">Mã VT</th>
                  <th className="px-3 py-2.5 text-left">Tên hóa chất</th>
                  <th className="px-3 py-2.5 text-left">ĐVT</th>
                  <th className="px-3 py-2.5 text-center">Số lô</th>
                  <th className="px-3 py-2.5 text-right bg-blue-700">Tồn đầu kỳ</th>
                  <th className="px-3 py-2.5 text-right bg-green-700">Nhập trong kỳ</th>
                  <th className="px-3 py-2.5 text-right bg-orange-700">Xuất trong kỳ</th>
                  <th className="px-3 py-2.5 text-right bg-teal-700">Tồn cuối kỳ</th>
                </tr>
              </thead>
              <tbody>
                {reportByVatTu.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-700">{r.maVatTu}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{r.tenHoaChat}</td>
                    <td className="px-3 py-2 text-gray-500">{r.donViTinh}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{r.soLo}</td>
                    <td className="px-3 py-2 text-right text-blue-700">{r.tonDauKy.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-green-700">{r.nhapTrongKy.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{r.xuatTrongKy.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-teal-700">{r.tonCuoiKy.toFixed(3)}</td>
                  </tr>
                ))}
                {reportByVatTu.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Không có dữ liệu trong kỳ đã chọn</td></tr>
                )}
              </tbody>
              {reportByVatTu.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-xs text-gray-600">Tổng cộng ({reportByVatTu.length} loại)</td>
                    <td className="px-3 py-2 text-right text-xs text-blue-700">{reportByVatTu.reduce((s, r) => s + r.tonDauKy, 0).toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-xs text-green-700">{reportByVatTu.reduce((s, r) => s + r.nhapTrongKy, 0).toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-xs text-orange-600">{reportByVatTu.reduce((s, r) => s + r.xuatTrongKy, 0).toFixed(3)}</td>
                    <td className="px-3 py-2 text-right text-xs text-teal-700">{reportByVatTu.reduce((s, r) => s + r.tonCuoiKy, 0).toFixed(3)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
