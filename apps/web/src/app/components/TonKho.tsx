import React, { useState, useMemo } from 'react';
import { Search, Download, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChemContext } from '../store/ChemContext';

const STATUS_ROW: Record<string, string> = {
  EXPIRED: 'bg-red-50',
  CRITICAL: 'bg-red-50',
  WARNING: 'bg-yellow-50',
  VALID: '',
};
const STATUS_BADGE: Record<string, string> = {
  EXPIRED: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-100 text-red-700',
  WARNING: 'bg-yellow-100 text-yellow-700',
  VALID: 'bg-green-100 text-green-700',
};

export function TonKho() {
  const { getTonKhoByLot } = useChemContext();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKho, setFilterKho] = useState('');
  const [showZeroStock, setShowZeroStock] = useState(false);

  const tonKho = useMemo(() => getTonKhoByLot(), [getTonKhoByLot]);

  const khoOptions = useMemo(() => Array.from(new Set(tonKho.map(t => t.khoNhap))), [tonKho]);

  const filtered = useMemo(() => {
    let list = tonKho;
    if (!showZeroStock) list = list.filter(t => t.tonLo > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.maVatTu.toLowerCase().includes(q) ||
        t.tenHoaChat.toLowerCase().includes(q) ||
        t.lotNo.toLowerCase().includes(q)
      );
    }
    if (filterStatus) list = list.filter(t => t.trangThaiHSD === filterStatus);
    if (filterKho) list = list.filter(t => t.khoNhap === filterKho);
    return list;
  }, [tonKho, search, filterStatus, filterKho, showZeroStock]);

  const summary = useMemo(() => {
    const active = tonKho.filter(t => t.tonLo > 0);
    return {
      expired: active.filter(t => t.trangThaiHSD === 'EXPIRED').length,
      critical: active.filter(t => t.trangThaiHSD === 'CRITICAL').length,
      warning: active.filter(t => t.trangThaiHSD === 'WARNING').length,
      valid: active.filter(t => t.trangThaiHSD === 'VALID').length,
      total: active.length,
    };
  }, [tonKho]);

  function exportCSV() {
    const headers = ['Mã VT', 'Tên hóa chất', 'ĐVT', 'Lot No', 'HSD', 'Kho', 'Tổng nhập', 'Tổng xuất', 'Tồn lô', 'Trạng thái HSD', 'Ngày còn lại', 'Cảnh báo'];
    const rows = filtered.map(t => [
      t.maVatTu, t.tenHoaChat, t.donViTinh, t.lotNo,
      t.hsd, t.khoNhap, t.tongNhap, t.tongXuat, t.tonLo.toFixed(3),
      t.trangThaiHSD, t.soNgayConLai, t.canhBao,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'ton_kho_lot.csv'; a.click();
  }

  return (
    <div className="space-y-4">
      {/* Status summary */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Lô hết hạn', count: summary.expired, cls: 'border-red-200 bg-red-50', icon: <XCircle size={16} className="text-red-500" />, filter: 'EXPIRED' },
          { label: 'Cảnh báo <=30 ngày', count: summary.critical, cls: 'border-red-200 bg-red-50', icon: <AlertTriangle size={16} className="text-red-500" />, filter: 'CRITICAL' },
          { label: 'Cảnh báo <=15 ngày', count: summary.warning, cls: 'border-yellow-200 bg-yellow-50', icon: <AlertTriangle size={16} className="text-yellow-500" />, filter: 'WARNING' },
          { label: 'Lô còn hạn', count: summary.valid, cls: 'border-green-200 bg-green-50', icon: <CheckCircle2 size={16} className="text-green-500" />, filter: 'VALID' },
          { label: 'Tổng lô tồn', count: summary.total, cls: 'border-gray-200 bg-gray-50', icon: <Search size={16} className="text-gray-400" />, filter: '' },
        ].map(card => (
          <button
            key={card.filter}
            onClick={() => setFilterStatus(filterStatus === card.filter ? '' : card.filter)}
            className={`border rounded-xl p-3 text-left transition-all hover:shadow-sm ${card.cls} ${filterStatus === card.filter ? 'ring-2 ring-offset-1 ring-teal-400' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              {card.icon}
              <span className="text-xl text-gray-800">{card.count}</span>
            </div>
            <div className="text-xs text-gray-500">{card.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Tìm mã VT, tên HC, lot..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="h-9 border rounded-md px-2 text-sm text-gray-600 bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="EXPIRED">HẾT HẠN</option>
          <option value="CRITICAL">Cảnh báo &lt;=30 ngày</option>
          <option value="WARNING">Cảnh báo &lt;=15 ngày</option>
          <option value="VALID">CÒN HẠN</option>
        </select>
        <select className="h-9 border rounded-md px-2 text-sm text-gray-600 bg-white" value={filterKho} onChange={e => setFilterKho(e.target.value)}>
          <option value="">Tất cả kho</option>
          {khoOptions.map(k => <option key={k}>{k}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showZeroStock} onChange={e => setShowZeroStock(e.target.checked)} className="w-4 h-4" />
          Hiển thị lô hết tồn
        </label>
        <Button size="sm" variant="outline" onClick={exportCSV}><Download size={14} /> Xuất CSV</Button>
      </div>

      <div className="text-xs text-gray-400">{filtered.length} lô</div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>
                <th className="px-3 py-2.5 text-left">Mã VT</th>
                <th className="px-3 py-2.5 text-left">Tên hóa chất</th>
                <th className="px-3 py-2.5 text-left">ĐVT</th>
                <th className="px-3 py-2.5 text-left">Lot No</th>
                <th className="px-3 py-2.5 text-left">Kho</th>
                <th className="px-3 py-2.5 text-left">HSD</th>
                <th className="px-3 py-2.5 text-right">Tổng nhập</th>
                <th className="px-3 py-2.5 text-right">Tổng xuất</th>
                <th className="px-3 py-2.5 text-right">Tồn lô</th>
                <th className="px-3 py-2.5 text-center">Ngày còn lại</th>
                <th className="px-3 py-2.5 text-center">Trạng thái HSD</th>
                <th className="px-3 py-2.5 text-left">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={i} className={`border-t border-gray-100 ${STATUS_ROW[t.trangThaiHSD]}`}>
                  <td className="px-3 py-2 font-mono text-gray-700">{t.maVatTu}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[160px] truncate">{t.tenHoaChat}</td>
                  <td className="px-3 py-2 text-gray-500">{t.donViTinh}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{t.lotNo}</td>
                  <td className="px-3 py-2 text-gray-600">{t.khoNhap}</td>
                  <td className="px-3 py-2 text-gray-600">{new Date(t.hsd).toLocaleDateString('vi-VN')}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{t.tongNhap.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{t.tongXuat.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                  <td className="px-3 py-2 text-right text-gray-800">{t.tonLo.toFixed(3)}</td>
                  <td className="px-3 py-2 text-center">
                    {t.trangThaiHSD === 'EXPIRED'
                      ? <span className="text-red-600">-{Math.abs(t.soNgayConLai)}</span>
                      : <span className={t.trangThaiHSD === 'CRITICAL' ? 'text-red-600' : t.trangThaiHSD === 'WARNING' ? 'text-yellow-600' : 'text-gray-600'}>{t.soNgayConLai}</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${STATUS_BADGE[t.trangThaiHSD]}`}>
                      {t.trangThaiHSD === 'EXPIRED' ? <XCircle size={11} /> : t.trangThaiHSD === 'WARNING' || t.trangThaiHSD === 'CRITICAL' ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                      {t.trangThaiHSD}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-[150px]">{t.canhBao}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">Không tìm thấy dữ liệu</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

