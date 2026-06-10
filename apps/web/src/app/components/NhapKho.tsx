import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Download, Upload, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChemContext } from '../store/ChemContext';
import type { PhieuNhap } from '../types';
import { toast } from 'sonner';
import { asArray, csvObjects, mapPhieuNhapCsv, readFileText } from '../utils/dataPortability';
import { ChemicalQuickSelect } from './ChemicalQuickSelect';

const KHO_OPTIONS = ['Kho phụ liệu', 'Kho hóa chất', 'Kho thành phẩm', 'Kho vật tư'];
const NGUON_NHAP = ['Nhập khẩu', 'Nội địa', 'Trả về từ sản xuất', 'Khác'];

type NhapHeader = Pick<PhieuNhap, 'ngayNhap' | 'soPhieuNhap' | 'khoNhap' | 'nguonNhap' | 'nguoiNhap' | 'ghiChu'>;
type NhapLine = Pick<PhieuNhap, 'maVatTu' | 'tenHoaChat' | 'nhaCC' | 'lotNo' | 'soLuong' | 'donViTinh' | 'hsd' | 'donGia'>;

function today() {
  return new Date().toISOString().split('T')[0];
}

function genSoPhieu(prefix: string) {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}${y}${m}${day}${seq}`;
}

const emptyHeader = (): NhapHeader => ({
  ngayNhap: today(),
  soPhieuNhap: genSoPhieu('YNK'),
  khoNhap: 'Kho phụ liệu',
  nguonNhap: 'Nội địa',
  nguoiNhap: '',
  ghiChu: '',
});

const emptyLine = (): NhapLine => ({
  maVatTu: '',
  tenHoaChat: '',
  nhaCC: '',
  lotNo: '',
  soLuong: 0,
  donViTinh: 'KG',
  hsd: '',
  donGia: 0,
});

export function NhapKho() {
  const { hoaChat, phieuNhap, addManyPhieuNhap, deletePhieuNhap, importPhieuNhap, settings } = useChemContext();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [header, setHeader] = useState<NhapHeader>(emptyHeader());
  const [line, setLine] = useState<NhapLine>(emptyLine());
  const [lines, setLines] = useState<NhapLine[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState('');

  const filtered = useMemo(() => {
    let list = [...phieuNhap].sort((a, b) => b.ngayNhap.localeCompare(a.ngayNhap));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.soPhieuNhap.toLowerCase().includes(q) ||
        p.maVatTu.toLowerCase().includes(q) ||
        p.tenHoaChat.toLowerCase().includes(q) ||
        p.lotNo.toLowerCase().includes(q)
      );
    }
    if (filterMonth) {
      list = list.filter(p => p.ngayNhap.startsWith(filterMonth));
    }
    return list;
  }, [phieuNhap, search, filterMonth]);

  function openCreate() {
    setHeader(emptyHeader());
    setLine(emptyLine());
    setLines([]);
    setShowForm(true);
  }

  function selectChemical(maVatTu: string) {
    const hc = hoaChat.find(h => h.maVatTu === maVatTu);
    setLine(f => ({
      ...f,
      maVatTu,
      tenHoaChat: hc?.tenHoaChat ?? '',
      nhaCC: hc?.nhaCC ?? '',
      donViTinh: hc?.donViTinh ?? 'KG',
    }));
  }

  function addLine() {
    if (!line.maVatTu || !line.lotNo || line.soLuong <= 0 || !line.hsd) {
      toast.error('Vui lòng điền đủ mã VT, Lot No, số lượng và HSD cho dòng hàng');
      return;
    }
    setLines(prev => [...prev, line]);
    setLine(emptyLine());
  }

  function submit() {
    if (!header.ngayNhap || !header.soPhieuNhap || !header.khoNhap) {
      toast.error('Vui lòng điền đủ thông tin phiếu nhập');
      return;
    }
    if (lines.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 mặt hàng vào phiếu');
      return;
    }
    const items: Array<Omit<PhieuNhap, 'id'>> = lines.map(item => ({
      ...header,
      ...item,
      nguoiNhap: header.nguoiNhap || settings.nguoiLap,
    }));
    addManyPhieuNhap(items);
    toast.success(`Đã lưu phiếu nhập ${header.soPhieuNhap} với ${items.length} mặt hàng`);
    setHeader(emptyHeader());
    setLine(emptyLine());
    setLines([]);
    setShowForm(false);
  }

  function exportCSV() {
    const headers = ['Ngày nhập', 'Số phiếu', 'Kho', 'Mã VT', 'Tên HC', 'Nhà CC', 'Lot No', 'Số lượng', 'ĐVT', 'HSD', 'Đơn giá', 'Nguồn', 'Người nhập', 'Ghi chú'];
    const rows = filtered.map(p => [
      p.ngayNhap, p.soPhieuNhap, p.khoNhap, p.maVatTu, p.tenHoaChat, p.nhaCC, p.lotNo,
      p.soLuong, p.donViTinh, p.hsd, p.donGia, p.nguonNhap, p.nguoiNhap, p.ghiChu,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'phieu_nhap_kho.csv'; a.click();
  }

  async function importFile(file: File | null) {
    if (!file) return;
    try {
      const text = await readFileText(file);
      const items = file.name.toLowerCase().endsWith('.json')
        ? asArray<PhieuNhap>(JSON.parse(text), 'phieuNhap')
        : csvObjects(text).map(mapPhieuNhapCsv);
      importPhieuNhap(items);
      toast.success(`Imported ${items.length} receipt rows`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    }
  }

  const totalKG = filtered.reduce((s, p) => s + p.soLuong, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Tìm phiếu, mã VT, tên HC, lot..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input
          type="month"
          className="h-9 border rounded-md px-2 text-sm text-gray-600 bg-white"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={exportCSV}><Download size={14} /> Xuất CSV</Button>
        <input id="import-phieu-nhap" type="file" accept=".csv,.json" className="hidden" onChange={e => importFile(e.target.files?.[0] ?? null)} />
        <Button size="sm" variant="outline" onClick={() => document.getElementById('import-phieu-nhap')?.click()}><Upload size={14} /> Import</Button>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Tạo phiếu nhập
        </Button>
      </div>

      <div className="flex gap-4 text-sm text-gray-500">
        <span><span className="text-gray-800">{filtered.length}</span> dòng nhập</span>
        <span>Tổng: <span className="text-gray-800">{totalKG.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span> KG</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2.5 text-left">Ngày nhập</th>
                <th className="px-3 py-2.5 text-left">Số phiếu</th>
                <th className="px-3 py-2.5 text-left">Kho</th>
                <th className="px-3 py-2.5 text-left">Mã VT</th>
                <th className="px-3 py-2.5 text-left">Tên hóa chất</th>
                <th className="px-3 py-2.5 text-left">Nhà CC</th>
                <th className="px-3 py-2.5 text-left">Lot No</th>
                <th className="px-3 py-2.5 text-right">Số lượng</th>
                <th className="px-3 py-2.5 text-left">ĐVT</th>
                <th className="px-3 py-2.5 text-left">HSD</th>
                <th className="px-3 py-2.5 text-left">Nguồn</th>
                <th className="px-3 py-2.5 text-left">Người nhập</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">{new Date(p.ngayNhap).toLocaleDateString('vi-VN')}</td>
                  <td className="px-3 py-2 font-mono text-blue-600">{p.soPhieuNhap}</td>
                  <td className="px-3 py-2 text-gray-600">{p.khoNhap}</td>
                  <td className="px-3 py-2 font-mono text-gray-700">{p.maVatTu}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[160px] truncate">{p.tenHoaChat}</td>
                  <td className="px-3 py-2 text-gray-600">{p.nhaCC}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{p.lotNo}</td>
                  <td className="px-3 py-2 text-right text-gray-800">{p.soLuong.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                  <td className="px-3 py-2 text-gray-500">{p.donViTinh}</td>
                  <td className="px-3 py-2 text-gray-600">{new Date(p.hsd).toLocaleDateString('vi-VN')}</td>
                  <td className="px-3 py-2 text-gray-500">{p.nguonNhap}</td>
                  <td className="px-3 py-2 text-gray-500">{p.nguoiNhap}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDeleteId(p.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400">Không có phiếu nhập nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package size={16} className="text-blue-600" />
              </div>
              <h2 className="text-gray-800">Tạo phiếu nhập kho</h2>
              <button onClick={() => setShowForm(false)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Ngày nhập *">
                  <Input type="date" value={header.ngayNhap} onChange={e => setHeader(f => ({ ...f, ngayNhap: e.target.value }))} />
                </Field>
                <Field label="Số phiếu nhập">
                  <Input value={header.soPhieuNhap} onChange={e => setHeader(f => ({ ...f, soPhieuNhap: e.target.value }))} />
                </Field>
                <Field label="Kho nhập">
                  <select className="w-full h-9 border rounded-md px-2 text-sm" value={header.khoNhap} onChange={e => setHeader(f => ({ ...f, khoNhap: e.target.value }))}>
                    {KHO_OPTIONS.map(k => <option key={k}>{k}</option>)}
                  </select>
                </Field>
                <Field label="Nguồn nhập">
                  <select className="w-full h-9 border rounded-md px-2 text-sm" value={header.nguonNhap} onChange={e => setHeader(f => ({ ...f, nguonNhap: e.target.value }))}>
                    {NGUON_NHAP.map(n => <option key={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Người nhập">
                  <Input value={header.nguoiNhap} onChange={e => setHeader(f => ({ ...f, nguoiNhap: e.target.value }))} placeholder={settings.nguoiLap} />
                </Field>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="text-sm text-gray-700">Thêm mặt hàng vào phiếu</div>
                <div className="grid grid-cols-2 gap-4">
                  <ChemicalQuickSelect
                    chemicals={hoaChat.filter(h => h.active)}
                    maVatTu={line.maVatTu}
                    tenHoaChat={line.tenHoaChat}
                    onSelect={chemical => selectChemical(chemical.maVatTu)}
                  />
                  {line.tenHoaChat && (
                    <div className="self-end bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                      <strong>{line.tenHoaChat}</strong> | Nhà CC: {line.nhaCC} | ĐVT: {line.donViTinh}
                    </div>
                  )}
                  <Field label="Lot No *">
                    <Input value={line.lotNo} onChange={e => setLine(f => ({ ...f, lotNo: e.target.value }))} placeholder="VD: 2606195100-015-E" />
                  </Field>
                  <Field label="Số lượng nhập *">
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={line.soLuong || ''}
                      onChange={e => setLine(f => ({ ...f, soLuong: parseFloat(e.target.value) || 0 }))}
                    />
                  </Field>
                  <Field label="Ngày hết hạn (HSD) *">
                    <Input type="date" value={line.hsd} onChange={e => setLine(f => ({ ...f, hsd: e.target.value }))} />
                  </Field>
                  <Field label="Đơn giá (VNĐ/ĐVT)">
                    <Input
                      type="number"
                      min="0"
                      value={line.donGia || ''}
                      onChange={e => setLine(f => ({ ...f, donGia: parseFloat(e.target.value) || 0 }))}
                    />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={addLine}><Plus size={14} /> Thêm mặt hàng</Button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 text-sm text-gray-700">Danh sách mặt hàng ({lines.length})</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Mã VT</th>
                        <th className="px-3 py-2 text-left">Tên hóa chất</th>
                        <th className="px-3 py-2 text-left">Lot No</th>
                        <th className="px-3 py-2 text-right">Số lượng</th>
                        <th className="px-3 py-2 text-left">ĐVT</th>
                        <th className="px-3 py-2 text-left">HSD</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((item, index) => (
                        <tr key={`${item.maVatTu}-${item.lotNo}-${index}`} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-mono">{item.maVatTu}</td>
                          <td className="px-3 py-2">{item.tenHoaChat}</td>
                          <td className="px-3 py-2 font-mono">{item.lotNo}</td>
                          <td className="px-3 py-2 text-right">{item.soLuong.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                          <td className="px-3 py-2">{item.donViTinh}</td>
                          <td className="px-3 py-2">{new Date(item.hsd).toLocaleDateString('vi-VN')}</td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => setLines(prev => prev.filter((_, i) => i !== index))} className="p-1 text-gray-400 hover:text-red-500 rounded">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {lines.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Chưa có mặt hàng trong phiếu</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <Field label="Ghi chú">
                <textarea className="w-full border rounded-md px-3 py-2 text-sm resize-none" rows={2} value={header.ghiChu} onChange={e => setHeader(f => ({ ...f, ghiChu: e.target.value }))} />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Hủy</Button>
              <Button size="sm" onClick={submit}>Lưu phiếu nhập</Button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-gray-800 mb-2">Xác nhận xóa dòng nhập</h3>
            <p className="text-sm text-gray-500 mb-4">Thao tác này sẽ xóa một dòng hàng của phiếu nhập và ảnh hưởng đến tồn kho.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Hủy</Button>
              <Button variant="destructive" size="sm" onClick={() => { deletePhieuNhap(deleteId); setDeleteId(null); toast.success('Đã xóa dòng nhập'); }}>Xóa</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
