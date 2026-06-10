import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Download, Upload, Zap, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChemContext } from '../store/ChemContext';
import type { PhieuXuat, TonKhoLot } from '../types';
import { toast } from 'sonner';
import { asArray, csvObjects, mapPhieuXuatCsv, readFileText } from '../utils/dataPortability';
import { ChemicalQuickSelect } from './ChemicalQuickSelect';

const KHO_OPTIONS = ['Kho phụ liệu', 'Kho hóa chất', 'Kho thành phẩm', 'Kho vật tư'];
const BO_PHAN = ['Phòng hóa chất', 'Xưởng sản xuất', 'Phòng thí nghiệm', 'Bảo trì', 'Khác'];
const LY_DO = ['Triển khai sản xuất', 'Cấp cho sản xuất', 'Xuất trả nhà CC', 'Mẫu thử nghiệm', 'Tiêu hao', 'Khác'];

type XuatHeader = Pick<PhieuXuat, 'ngayXuat' | 'soPhieuXuat' | 'boPhanXuat' | 'lyDo' | 'khoXuat' | 'donHangMaHang' | 'maMau' | 'lenhSX' | 'nguoiXuat' | 'ghiChu'>;
type XuatLine = Pick<PhieuXuat, 'maVatTu' | 'tenHoaChat' | 'lotNo' | 'soLuong' | 'donViTinh' | 'hsd'>;

function today() {
  return new Date().toISOString().split('T')[0];
}

function genSoPhieu() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `YXK${y}${m}${day}${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

const emptyHeader = (): XuatHeader => ({
  ngayXuat: today(),
  soPhieuXuat: genSoPhieu(),
  boPhanXuat: 'Phòng hóa chất',
  lyDo: 'Triển khai sản xuất',
  khoXuat: 'Kho phụ liệu',
  donHangMaHang: '',
  maMau: '',
  lenhSX: '',
  nguoiXuat: '',
  ghiChu: '',
});

const emptyLine = (): XuatLine => ({
  maVatTu: '',
  tenHoaChat: '',
  lotNo: '',
  soLuong: 0,
  donViTinh: 'KG',
  hsd: '',
});

const STATUS_CONFIG = {
  VALID: { label: 'VALID', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={12} /> },
  WARNING: { label: 'WARNING', cls: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle size={12} /> },
  CRITICAL: { label: 'CRITICAL', cls: 'bg-red-100 text-red-700', icon: <AlertTriangle size={12} /> },
  EXPIRED: { label: 'EXPIRED', cls: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
};

export function XuatKho() {
  const { hoaChat, phieuXuat, addManyPhieuXuat, deletePhieuXuat, importPhieuXuat, getFefoSuggestions, getTonKhoByLot, settings } = useChemContext();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [header, setHeader] = useState<XuatHeader>(emptyHeader());
  const [line, setLine] = useState<XuatLine>(emptyLine());
  const [lines, setLines] = useState<XuatLine[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [selectedLot, setSelectedLot] = useState<TonKhoLot | null>(null);

  const tonKhoByLot = useMemo(() => getTonKhoByLot(), [getTonKhoByLot]);

  const fefoSuggestions = useMemo(() => {
    if (!line.maVatTu) return [];
    return getFefoSuggestions(line.maVatTu).filter(lot => lot.tonLo - pendingQty(lot.maVatTu, lot.lotNo) > 0);
  }, [line.maVatTu, getFefoSuggestions, lines]);

  const currentLotTon = useMemo(() => {
    if (!line.maVatTu || !line.lotNo) return null;
    return tonKhoByLot.find(t => t.maVatTu === line.maVatTu && t.lotNo === line.lotNo) ?? null;
  }, [line.maVatTu, line.lotNo, tonKhoByLot]);

  const currentAvailable = currentLotTon ? currentLotTon.tonLo - pendingQty(currentLotTon.maVatTu, currentLotTon.lotNo) : 0;

  const filtered = useMemo(() => {
    let list = [...phieuXuat].sort((a, b) => b.ngayXuat.localeCompare(a.ngayXuat));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.soPhieuXuat.toLowerCase().includes(q) ||
        p.maVatTu.toLowerCase().includes(q) ||
        p.tenHoaChat.toLowerCase().includes(q) ||
        p.lotNo.toLowerCase().includes(q) ||
        p.donHangMaHang.toLowerCase().includes(q)
      );
    }
    if (filterMonth) list = list.filter(p => p.ngayXuat.startsWith(filterMonth));
    return list;
  }, [phieuXuat, search, filterMonth]);

  function pendingQty(maVatTu: string, lotNo: string) {
    return lines
      .filter(item => item.maVatTu === maVatTu && item.lotNo === lotNo)
      .reduce((sum, item) => sum + item.soLuong, 0);
  }

  function openCreate() {
    setHeader(emptyHeader());
    setLine(emptyLine());
    setLines([]);
    setSelectedLot(null);
    setShowForm(true);
  }

  function selectChemical(maVatTu: string) {
    const hc = hoaChat.find(h => h.maVatTu === maVatTu);
    setLine(f => ({
      ...f,
      maVatTu,
      tenHoaChat: hc?.tenHoaChat ?? '',
      donViTinh: hc?.donViTinh ?? 'KG',
      lotNo: '',
      hsd: '',
    }));
    setSelectedLot(null);
  }

  function selectLot(lot: TonKhoLot) {
    setSelectedLot(lot);
    setLine(f => ({ ...f, lotNo: lot.lotNo, hsd: lot.hsd, donViTinh: lot.donViTinh }));
  }

  function applyFEFO() {
    if (fefoSuggestions.length > 0) {
      selectLot(fefoSuggestions[0]);
      toast.success(`Gợi ý FEFO: Lô ${fefoSuggestions[0].lotNo} (HSD sớm nhất)`);
    }
  }

  function addLine() {
    if (!line.maVatTu || !line.lotNo || line.soLuong <= 0) {
      toast.error('Vui lòng chọn hóa chất, lô và nhập số lượng');
      return;
    }
    if (!currentLotTon) {
      toast.error('Lot No chưa có tồn kho hoặc không thuộc hóa chất đã chọn');
      return;
    }
    if (line.soLuong > currentAvailable) {
      toast.error(`Số lượng xuất (${line.soLuong}) vượt quá tồn khả dụng của lô (${currentAvailable.toFixed(3)})`);
      return;
    }
    if (currentLotTon.trangThaiHSD === 'EXPIRED') {
      if (!window.confirm(`Lô ${line.lotNo} đã HẾT HẠN. Bạn có chắc muốn xuất kho không?`)) return;
    }
    setLines(prev => [...prev, line]);
    setLine(emptyLine());
    setSelectedLot(null);
  }

  function submit() {
    if (!header.ngayXuat || !header.soPhieuXuat || !header.khoXuat) {
      toast.error('Vui lòng điền đủ thông tin phiếu xuất');
      return;
    }
    if (lines.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 mặt hàng vào phiếu');
      return;
    }
    const items: Array<Omit<PhieuXuat, 'id'>> = lines.map(item => ({
      ...header,
      ...item,
      nguoiXuat: header.nguoiXuat || settings.nguoiLap,
    }));
    addManyPhieuXuat(items);
    toast.success(`Đã lưu phiếu xuất ${header.soPhieuXuat} với ${items.length} mặt hàng`);
    setHeader(emptyHeader());
    setLine(emptyLine());
    setLines([]);
    setSelectedLot(null);
    setShowForm(false);
  }

  function exportCSV() {
    const headers = ['Ngày xuất', 'Số phiếu', 'Bộ phận', 'Lý do', 'Kho', 'Mã VT', 'Tên HC', 'Lot No', 'Số lượng', 'ĐVT', 'HSD', 'Đơn hàng', 'Màu', 'Lệnh SX', 'Người xuất'];
    const rows = filtered.map(p => [p.ngayXuat, p.soPhieuXuat, p.boPhanXuat, p.lyDo, p.khoXuat, p.maVatTu, p.tenHoaChat, p.lotNo, p.soLuong, p.donViTinh, p.hsd, p.donHangMaHang, p.maMau, p.lenhSX, p.nguoiXuat]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'phieu_xuat_kho.csv'; a.click();
  }

  async function importFile(file: File | null) {
    if (!file) return;
    try {
      const text = await readFileText(file);
      const items = file.name.toLowerCase().endsWith('.json')
        ? asArray<PhieuXuat>(JSON.parse(text), 'phieuXuat')
        : csvObjects(text).map(mapPhieuXuatCsv);
      importPhieuXuat(items);
      toast.success(`Imported ${items.length} issue rows`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Tìm phiếu, mã VT, tên HC, lot, đơn hàng..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="month" className="h-9 border rounded-md px-2 text-sm text-gray-600 bg-white" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        <Button size="sm" variant="outline" onClick={exportCSV}><Download size={14} /> Xuất CSV</Button>
        <input id="import-phieu-xuat" type="file" accept=".csv,.json" className="hidden" onChange={e => importFile(e.target.files?.[0] ?? null)} />
        <Button size="sm" variant="outline" onClick={() => document.getElementById('import-phieu-xuat')?.click()}><Upload size={14} /> Import</Button>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Tạo phiếu xuất
        </Button>
      </div>

      <div className="flex gap-4 text-sm text-gray-500">
        <span><span className="text-gray-800">{filtered.length}</span> dòng xuất</span>
        <span>Tổng: <span className="text-gray-800">{filtered.reduce((s, p) => s + p.soLuong, 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span> KG</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2.5 text-left">Ngày xuất</th>
                <th className="px-3 py-2.5 text-left">Số phiếu</th>
                <th className="px-3 py-2.5 text-left">Bộ phận</th>
                <th className="px-3 py-2.5 text-left">Lý do</th>
                <th className="px-3 py-2.5 text-left">Mã VT</th>
                <th className="px-3 py-2.5 text-left">Tên hóa chất</th>
                <th className="px-3 py-2.5 text-left">Lot No</th>
                <th className="px-3 py-2.5 text-right">Số lượng</th>
                <th className="px-3 py-2.5 text-left">ĐVT</th>
                <th className="px-3 py-2.5 text-left">HSD</th>
                <th className="px-3 py-2.5 text-left">Đơn hàng</th>
                <th className="px-3 py-2.5 text-left">Màu/LSX</th>
                <th className="px-3 py-2.5 text-left">Người xuất</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-600">{new Date(p.ngayXuat).toLocaleDateString('vi-VN')}</td>
                  <td className="px-3 py-2 font-mono text-orange-600">{p.soPhieuXuat}</td>
                  <td className="px-3 py-2 text-gray-600">{p.boPhanXuat}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[100px] truncate">{p.lyDo}</td>
                  <td className="px-3 py-2 font-mono text-gray-700">{p.maVatTu}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[150px] truncate">{p.tenHoaChat}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{p.lotNo}</td>
                  <td className="px-3 py-2 text-right text-gray-800">{p.soLuong.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}</td>
                  <td className="px-3 py-2 text-gray-500">{p.donViTinh}</td>
                  <td className="px-3 py-2 text-gray-600">{p.hsd ? new Date(p.hsd).toLocaleDateString('vi-VN') : ''}</td>
                  <td className="px-3 py-2 text-gray-500">{p.donHangMaHang}</td>
                  <td className="px-3 py-2 text-gray-500">{p.maMau}</td>
                  <td className="px-3 py-2 text-gray-500">{p.nguoiXuat}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDeleteId(p.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={14} className="px-4 py-8 text-center text-gray-400">Không có phiếu xuất nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Zap size={16} className="text-orange-600" />
              </div>
              <h2 className="text-gray-800">Tạo phiếu xuất kho</h2>
              <button onClick={() => setShowForm(false)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Ngày xuất *">
                  <Input type="date" value={header.ngayXuat} onChange={e => setHeader(f => ({ ...f, ngayXuat: e.target.value }))} />
                </Field>
                <Field label="Số phiếu xuất">
                  <Input value={header.soPhieuXuat} onChange={e => setHeader(f => ({ ...f, soPhieuXuat: e.target.value }))} />
                </Field>
                <Field label="Kho xuất">
                  <select className="w-full h-9 border rounded-md px-2 text-sm" value={header.khoXuat} onChange={e => setHeader(f => ({ ...f, khoXuat: e.target.value }))}>
                    {KHO_OPTIONS.map(k => <option key={k}>{k}</option>)}
                  </select>
                </Field>
                <Field label="Bộ phận xuất">
                  <select className="w-full h-9 border rounded-md px-2 text-sm" value={header.boPhanXuat} onChange={e => setHeader(f => ({ ...f, boPhanXuat: e.target.value }))}>
                    {BO_PHAN.map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Lý do xuất">
                  <select className="w-full h-9 border rounded-md px-2 text-sm" value={header.lyDo} onChange={e => setHeader(f => ({ ...f, lyDo: e.target.value }))}>
                    {LY_DO.map(l => <option key={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Người xuất">
                  <Input value={header.nguoiXuat} onChange={e => setHeader(f => ({ ...f, nguoiXuat: e.target.value }))} placeholder={settings.nguoiLap} />
                </Field>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Info size={14} className="text-blue-500" />
                  Chọn hóa chất và lô xuất, sau đó thêm vào danh sách mặt hàng
                </div>
                <ChemicalQuickSelect
                  chemicals={hoaChat.filter(h => h.active)}
                  maVatTu={line.maVatTu}
                  tenHoaChat={line.tenHoaChat}
                  onSelect={chemical => selectChemical(chemical.maVatTu)}
                />

                {line.maVatTu && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Gợi ý FEFO - lô theo thứ tự HSD sớm nhất</span>
                      {fefoSuggestions.length > 0 && (
                        <Button size="sm" variant="outline" onClick={applyFEFO} className="text-teal-600 border-teal-300 hover:bg-teal-50 h-7 text-xs">
                          <Zap size={12} /> Áp dụng FEFO
                        </Button>
                      )}
                    </div>
                    {fefoSuggestions.length === 0 ? (
                      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-center">
                        Không có lô nào còn tồn khả dụng cho hóa chất này
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 text-gray-500">
                            <tr>
                              <th className="px-3 py-2 text-left">Lot No</th>
                              <th className="px-3 py-2 text-left">HSD</th>
                              <th className="px-3 py-2 text-right">Tồn khả dụng</th>
                              <th className="px-3 py-2 text-center">Ngày còn lại</th>
                              <th className="px-3 py-2 text-center">Trạng thái</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {fefoSuggestions.map((lot, i) => {
                              const cfg = STATUS_CONFIG[lot.trangThaiHSD];
                              const isSelected = line.lotNo === lot.lotNo;
                              const available = lot.tonLo - pendingQty(lot.maVatTu, lot.lotNo);
                              return (
                                <tr
                                  key={lot.lotNo}
                                  className={`border-t border-gray-100 cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-teal-50 border-l-2 border-l-teal-500'
                                      : lot.trangThaiHSD === 'EXPIRED'
                                      ? 'bg-red-50 hover:bg-red-100'
                                      : lot.trangThaiHSD === 'WARNING'
                                      ? 'bg-yellow-50 hover:bg-yellow-100'
                                      : lot.trangThaiHSD === 'CRITICAL'
                                      ? 'bg-red-50 hover:bg-red-100'
                                      : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => selectLot(lot)}
                                >
                                  <td className="px-3 py-2 font-mono text-gray-700">
                                    {i === 0 && <span className="mr-1 text-teal-500 text-[10px]">FEFO</span>}
                                    {lot.lotNo}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">{new Date(lot.hsd).toLocaleDateString('vi-VN')}</td>
                                  <td className="px-3 py-2 text-right text-gray-800">{available.toFixed(3)} {lot.donViTinh}</td>
                                  <td className="px-3 py-2 text-center">
                                    {lot.trangThaiHSD === 'EXPIRED'
                                      ? <span className="text-red-600">Quá hạn {Math.abs(lot.soNgayConLai)}d</span>
                                      : <span>{lot.soNgayConLai} ngày</span>
                                    }
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.cls}`}>
                                      {cfg.icon} {cfg.label}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); selectLot(lot); }}
                                      className={`px-2 py-1 rounded text-[10px] ${isSelected ? 'bg-teal-500 text-white' : 'bg-gray-100 hover:bg-teal-100 text-gray-600'}`}
                                    >
                                      {isSelected ? 'Đã chọn' : 'Chọn'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Lot No đã chọn">
                    <Input
                      value={line.lotNo}
                      onChange={e => setLine(f => ({ ...f, lotNo: e.target.value }))}
                      placeholder="Chọn từ bảng FEFO hoặc nhập trực tiếp"
                    />
                  </Field>
                  <Field label={`Số lượng xuất (tối đa: ${currentLotTon ? currentAvailable.toFixed(3) : '-'} ${line.donViTinh})`}>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={line.soLuong || ''}
                      onChange={e => setLine(f => ({ ...f, soLuong: parseFloat(e.target.value) || 0 }))}
                      className={currentLotTon && line.soLuong > currentAvailable ? 'border-red-400' : ''}
                    />
                    {currentLotTon && line.soLuong > currentAvailable && (
                      <p className="text-[10px] text-red-500 mt-1">Vượt quá tồn khả dụng của lô.</p>
                    )}
                  </Field>
                </div>

                {currentLotTon && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                    currentLotTon.trangThaiHSD === 'EXPIRED' ? 'bg-red-50 text-red-700' :
                    currentLotTon.trangThaiHSD === 'WARNING' ? 'bg-yellow-50 text-yellow-700' :
                    currentLotTon.trangThaiHSD === 'CRITICAL' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {currentLotTon.trangThaiHSD === 'EXPIRED' ? <XCircle size={13} /> : currentLotTon.trangThaiHSD === 'WARNING' || currentLotTon.trangThaiHSD === 'CRITICAL' ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                    <span>
                      Lô <strong>{currentLotTon.lotNo}</strong> - HSD: {new Date(currentLotTon.hsd).toLocaleDateString('vi-VN')} - Tồn khả dụng: {currentAvailable.toFixed(3)} {currentLotTon.donViTinh} - {currentLotTon.trangThaiHSD}
                      {currentLotTon.trangThaiHSD === 'EXPIRED' && <strong className="ml-1">ĐÃ HẾT HẠN</strong>}
                    </span>
                  </div>
                )}

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
                          <td className="px-3 py-2">{item.hsd ? new Date(item.hsd).toLocaleDateString('vi-VN') : ''}</td>
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

              <div className="grid grid-cols-3 gap-4">
                <Field label="Đơn hàng / Mã hàng">
                  <Input value={header.donHangMaHang} onChange={e => setHeader(f => ({ ...f, donHangMaHang: e.target.value }))} placeholder="FLEXOSLIP" />
                </Field>
                <Field label="Mã màu">
                  <Input value={header.maMau} onChange={e => setHeader(f => ({ ...f, maMau: e.target.value }))} placeholder="LSX-1219" />
                </Field>
                <Field label="Lệnh sản xuất">
                  <Input value={header.lenhSX} onChange={e => setHeader(f => ({ ...f, lenhSX: e.target.value }))} />
                </Field>
              </div>
              <Field label="Ghi chú">
                <textarea className="w-full border rounded-md px-3 py-2 text-sm resize-none" rows={2} value={header.ghiChu} onChange={e => setHeader(f => ({ ...f, ghiChu: e.target.value }))} />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Hủy</Button>
              <Button size="sm" onClick={submit}>Lưu phiếu xuất</Button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-gray-800 mb-2">Xác nhận xóa dòng xuất</h3>
            <p className="text-sm text-gray-500 mb-4">Thao tác này sẽ xóa một dòng hàng của phiếu xuất và ảnh hưởng đến tồn kho.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Hủy</Button>
              <Button variant="destructive" size="sm" onClick={() => { deletePhieuXuat(deleteId); setDeleteId(null); toast.success('Đã xóa dòng xuất'); }}>Xóa</Button>
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
