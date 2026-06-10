import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Download, Upload, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChemContext } from '../store/ChemContext';
import type { PhieuNhap } from '../types';
import { toast } from 'sonner';
import { asArray, csvObjects, mapPhieuNhapCsv, readFileText } from '../utils/dataPortability';
import { ChemicalQuickSelect } from './ChemicalQuickSelect';

const KHO_OPTIONS = ['Kho phá»¥ liá»‡u', 'Kho hÃ³a cháº¥t', 'Kho thÃ nh pháº©m', 'Kho váº­t tÆ°'];
const NGUON_NHAP = ['Nháº­p kháº©u', 'Ná»™i Ä‘á»‹a', 'Tráº£ vá» tá»« sáº£n xuáº¥t', 'KhÃ¡c'];

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

const emptyForm = (): Omit<PhieuNhap, 'id'> => ({
  ngayNhap: today(),
  soPhieuNhap: genSoPhieu('YNK'),
  khoNhap: 'Kho phá»¥ liá»‡u',
  maVatTu: '',
  tenHoaChat: '',
  nhaCC: '',
  lotNo: '',
  soLuong: 0,
  donViTinh: 'KG',
  hsd: '',
  donGia: 0,
  nguonNhap: 'Ná»™i Ä‘á»‹a',
  nguoiNhap: '',
  ghiChu: '',
});

export function NhapKho() {
  const { hoaChat, phieuNhap, addPhieuNhap, deletePhieuNhap, importPhieuNhap, settings } = useChemContext();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<PhieuNhap, 'id'>>(emptyForm());
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

  function selectChemical(maVatTu: string) {
    const hc = hoaChat.find(h => h.maVatTu === maVatTu);
    setForm(f => ({
      ...f,
      maVatTu,
      tenHoaChat: hc?.tenHoaChat ?? '',
      nhaCC: hc?.nhaCC ?? '',
      donViTinh: hc?.donViTinh ?? 'KG',
    }));
  }

  function submit() {
    if (!form.maVatTu || !form.lotNo || form.soLuong <= 0 || !form.hsd) {
      toast.error('Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§: MÃ£ VT, Lot No, Sá»‘ lÆ°á»£ng, HSD');
      return;
    }
    addPhieuNhap({ ...form, nguoiNhap: form.nguoiNhap || settings.nguoiLap });
    toast.success(`ÄÃ£ thÃªm phiáº¿u nháº­p ${form.soPhieuNhap}`);
    setForm(emptyForm());
    setShowForm(false);
  }

  function exportCSV() {
    const headers = ['NgÃ y nháº­p', 'Sá»‘ phiáº¿u', 'Kho', 'MÃ£ VT', 'TÃªn HC', 'NhÃ  CC', 'Lot No', 'Sá»‘ lÆ°á»£ng', 'ÄVT', 'HSD', 'ÄÆ¡n giÃ¡', 'Nguá»“n', 'NgÆ°á»i nháº­p', 'Ghi chÃº'];
    const rows = filtered.map(p => [
      p.ngayNhap, p.soPhieuNhap, p.khoNhap, p.maVatTu, p.tenHoaChat, p.nhaCC, p.lotNo,
      p.soLuong, p.donViTinh, p.hsd, p.donGia, p.nguonNhap, p.nguoiNhap, p.ghiChu,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['ï»¿' + csv], { type: 'text/csv;charset=utf-8;' });
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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="TÃ¬m phiáº¿u, mÃ£ VT, tÃªn HC, lot..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input
          type="month"
          className="h-9 border rounded-md px-2 text-sm text-gray-600 bg-white"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={exportCSV}><Download size={14} /> Xuáº¥t CSV</Button>
        <input id="import-phieu-nhap" type="file" accept=".csv,.json" className="hidden" onChange={e => importFile(e.target.files?.[0] ?? null)} />
        <Button size="sm" variant="outline" onClick={() => document.getElementById('import-phieu-nhap')?.click()}><Upload size={14} /> Import</Button>
        <Button size="sm" onClick={() => { setForm(emptyForm()); setShowForm(true); }}>
          <Plus size={14} /> Táº¡o phiáº¿u nháº­p
        </Button>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-gray-500">
        <span><span className="text-gray-800">{filtered.length}</span> phiáº¿u nháº­p</span>
        <span>Tá»•ng: <span className="text-gray-800">{totalKG.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</span> KG</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2.5 text-left">NgÃ y nháº­p</th>
                <th className="px-3 py-2.5 text-left">Sá»‘ phiáº¿u</th>
                <th className="px-3 py-2.5 text-left">Kho</th>
                <th className="px-3 py-2.5 text-left">MÃ£ VT</th>
                <th className="px-3 py-2.5 text-left">TÃªn hÃ³a cháº¥t</th>
                <th className="px-3 py-2.5 text-left">NhÃ  CC</th>
                <th className="px-3 py-2.5 text-left">Lot No</th>
                <th className="px-3 py-2.5 text-right">Sá»‘ lÆ°á»£ng</th>
                <th className="px-3 py-2.5 text-left">ÄVT</th>
                <th className="px-3 py-2.5 text-left">HSD</th>
                <th className="px-3 py-2.5 text-left">Nguá»“n</th>
                <th className="px-3 py-2.5 text-left">NgÆ°á»i nháº­p</th>
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
                <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400">KhÃ´ng cÃ³ phiáº¿u nháº­p nÃ o</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package size={16} className="text-blue-600" />
              </div>
              <h2 className="text-gray-800">Táº¡o phiáº¿u nháº­p kho</h2>
              <button onClick={() => setShowForm(false)} className="ml-auto text-gray-400 hover:text-gray-600">âœ•</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <Field label="NgÃ y nháº­p *">
                <Input type="date" value={form.ngayNhap} onChange={e => setForm(f => ({ ...f, ngayNhap: e.target.value }))} />
              </Field>
              <Field label="Sá»‘ phiáº¿u nháº­p">
                <Input value={form.soPhieuNhap} onChange={e => setForm(f => ({ ...f, soPhieuNhap: e.target.value }))} />
              </Field>
              <Field label="Kho nháº­p">
                <select className="w-full h-9 border rounded-md px-2 text-sm" value={form.khoNhap} onChange={e => setForm(f => ({ ...f, khoNhap: e.target.value }))}>
                  {KHO_OPTIONS.map(k => <option key={k}>{k}</option>)}
                </select>
              </Field>
              <ChemicalQuickSelect
                chemicals={hoaChat.filter(h => h.active)}
                maVatTu={form.maVatTu}
                tenHoaChat={form.tenHoaChat}
                onSelect={chemical => selectChemical(chemical.maVatTu)}
              />
              {form.tenHoaChat && (
                <div className="col-span-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                  <strong>{form.tenHoaChat}</strong> | NhÃ  CC: {form.nhaCC} | ÄVT: {form.donViTinh}
                </div>
              )}
              <Field label="Lot No *">
                <Input value={form.lotNo} onChange={e => setForm(f => ({ ...f, lotNo: e.target.value }))} placeholder="VD: 2606195100-015-E" />
              </Field>
              <Field label="Sá»‘ lÆ°á»£ng nháº­p *">
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.soLuong || ''}
                  onChange={e => setForm(f => ({ ...f, soLuong: parseFloat(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="NgÃ y háº¿t háº¡n (HSD) *">
                <Input type="date" value={form.hsd} onChange={e => setForm(f => ({ ...f, hsd: e.target.value }))} />
              </Field>
              <Field label="ÄÆ¡n giÃ¡ (VNÄ/ÄVT)">
                <Input
                  type="number"
                  min="0"
                  value={form.donGia || ''}
                  onChange={e => setForm(f => ({ ...f, donGia: parseFloat(e.target.value) || 0 }))}
                />
              </Field>
              <Field label="Nguá»“n nháº­p">
                <select className="w-full h-9 border rounded-md px-2 text-sm" value={form.nguonNhap} onChange={e => setForm(f => ({ ...f, nguonNhap: e.target.value }))}>
                  {NGUON_NHAP.map(n => <option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="NgÆ°á»i nháº­p">
                <Input value={form.nguoiNhap} onChange={e => setForm(f => ({ ...f, nguoiNhap: e.target.value }))} placeholder={settings.nguoiLap} />
              </Field>
              <Field label="Ghi chÃº" className="col-span-2">
                <textarea className="w-full border rounded-md px-3 py-2 text-sm resize-none" rows={2} value={form.ghiChu} onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))} />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Há»§y</Button>
              <Button size="sm" onClick={submit}>LÆ°u phiáº¿u nháº­p</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-gray-800 mb-2">XÃ¡c nháº­n xÃ³a phiáº¿u nháº­p</h3>
            <p className="text-sm text-gray-500 mb-4">Thao tÃ¡c nÃ y sáº½ xÃ³a phiáº¿u nháº­p vÃ  áº£nh hÆ°á»Ÿng Ä‘áº¿n tá»“n kho.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Há»§y</Button>
              <Button variant="destructive" size="sm" onClick={() => { deletePhieuNhap(deleteId); setDeleteId(null); toast.success('ÄÃ£ xÃ³a phiáº¿u nháº­p'); }}>XÃ³a</Button>
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

