import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Download, Upload, CheckCircle2, XCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChemContext } from '../store/ChemContext';
import type { HoaChat, ZDHCLevel } from '../types';
import { asArray, csvObjects, mapHoaChatCsv, readFileText } from '../utils/dataPortability';
import { toast } from 'sonner';

const ZDHC_LEVELS: ZDHCLevel[] = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Not Listed'];
const NHOM_HC = ['Cao su', 'Chất độn', 'Chất xúc tiến', 'Chất lưu hóa', 'Màu', 'Dầu', 'Hóa chất phụ', 'Dung môi', 'Khác'];
const DON_VI = ['KG', 'L', 'Tấn', 'Thùng', 'Can', 'Túi'];

const LEVEL_BADGE: Record<ZDHCLevel, string> = {
  'Level 0': 'bg-green-100 text-green-700',
  'Level 1': 'bg-blue-100 text-blue-700',
  'Level 2': 'bg-purple-100 text-purple-700',
  'Level 3': 'bg-orange-100 text-orange-700',
  'Not Listed': 'bg-gray-100 text-gray-600',
};

const emptyForm: Omit<HoaChat, 'id'> = {
  maVatTu: '',
  tenHoaChat: '',
  tenHoaChatEN: '',
  nhaCC: '',
  casNo: '',
  nhomHoaChat: 'Cao su',
  donViTinh: 'KG',
  zdhcMrslStatus: 'Not Listed',
  sdsCo: false,
  sdsNgayCapNhat: '',
  mrlsCo: false,
  certCompliance: '',
  ghiChu: '',
  active: true,
};

export function DanhMucHoaChat() {
  const { hoaChat, addHoaChat, updateHoaChat, deleteHoaChat, importHoaChat } = useChemContext();
  const [search, setSearch] = useState('');
  const [filterNhom, setFilterNhom] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<HoaChat, 'id'>>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<keyof HoaChat>('maVatTu');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    let list = hoaChat;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        h =>
          h.maVatTu.toLowerCase().includes(q) ||
          h.tenHoaChat.toLowerCase().includes(q) ||
          h.nhaCC.toLowerCase().includes(q) ||
          h.casNo.toLowerCase().includes(q)
      );
    }
    if (filterNhom) list = list.filter(h => h.nhomHoaChat === filterNhom);
    if (filterLevel) list = list.filter(h => h.zdhcMrslStatus === filterLevel);
    list = [...list].sort((a, b) => {
      const av = String(a[sortCol] ?? '');
      const bv = String(b[sortCol] ?? '');
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [hoaChat, search, filterNhom, filterLevel, sortCol, sortAsc]);

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowDialog(true);
  }

  function openEdit(h: HoaChat) {
    setForm({ ...h });
    setEditId(h.id);
    setShowDialog(true);
  }

  function save() {
    if (!form.maVatTu || !form.tenHoaChat) return;
    if (editId) {
      updateHoaChat(editId, form);
    } else {
      addHoaChat(form);
    }
    setShowDialog(false);
  }

  function handleSort(col: keyof HoaChat) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
  }

  function exportCSV() {
    const headers = ['Mã VT', 'Tên hóa chất', 'Tên EN', 'Nhà CC', 'CAS No', 'Nhóm HC', 'ĐVT', 'ZDHC MRSL', 'SDS', 'MRLS', 'Cert', 'Ghi chú'];
    const rows = filtered.map(h => [
      h.maVatTu, h.tenHoaChat, h.tenHoaChatEN, h.nhaCC, h.casNo, h.nhomHoaChat, h.donViTinh,
      h.zdhcMrslStatus, h.sdsCo ? 'Có' : 'Không', h.mrlsCo ? 'Có' : 'Không', h.certCompliance, h.ghiChu,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'danh_muc_hoa_chat.csv'; a.click();
  }

  async function importFile(file: File | null) {
    if (!file) return;
    try {
      const text = await readFileText(file);
      const items = file.name.toLowerCase().endsWith('.json')
        ? asArray<HoaChat>(JSON.parse(text), 'hoaChat')
        : csvObjects(text).map(mapHoaChatCsv);
      importHoaChat(items);
      toast.success(`Imported ${items.length} chemical rows`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    }
  }

  const SortIcon = ({ col }: { col: keyof HoaChat }) =>
    sortCol === col ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Tìm theo mã, tên, nhà CC, CAS No..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 border rounded-md px-2 text-sm text-gray-600 bg-white"
          value={filterNhom}
          onChange={e => setFilterNhom(e.target.value)}
        >
          <option value="">Tất cả nhóm HC</option>
          {NHOM_HC.map(n => <option key={n}>{n}</option>)}
        </select>
        <select
          className="h-9 border rounded-md px-2 text-sm text-gray-600 bg-white"
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
        >
          <option value="">Tất cả ZDHC level</option>
          {ZDHC_LEVELS.map(l => <option key={l}>{l}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download size={14} /> Xuất CSV
        </Button>
        <input id="import-hoa-chat" type="file" accept=".csv,.json" className="hidden" onChange={e => importFile(e.target.files?.[0] ?? null)} />
        <Button size="sm" variant="outline" onClick={() => document.getElementById('import-hoa-chat')?.click()}>
          <Upload size={14} /> Import
        </Button>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} /> Thêm hóa chất
        </Button>
      </div>

      <div className="text-xs text-gray-400">{filtered.length} / {hoaChat.length} hóa chất</div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>
                {[
                  { col: 'maVatTu' as keyof HoaChat, label: 'Mã VT' },
                  { col: 'tenHoaChat' as keyof HoaChat, label: 'Tên hóa chất' },
                  { col: 'nhaCC' as keyof HoaChat, label: 'Nhà cung cấp' },
                  { col: 'casNo' as keyof HoaChat, label: 'CAS No' },
                  { col: 'nhomHoaChat' as keyof HoaChat, label: 'Nhóm HC' },
                  { col: 'donViTinh' as keyof HoaChat, label: 'ĐVT' },
                  { col: 'zdhcMrslStatus' as keyof HoaChat, label: 'ZDHC MRSL' },
                ].map(({ col, label }) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort(col)}
                  >
                    <span className="flex items-center gap-1">
                      {label} <SortIcon col={col} />
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center">SDS</th>
                <th className="px-3 py-2.5 text-center">MRLS</th>
                <th className="px-3 py-2.5 text-left">Cert</th>
                <th className="px-3 py-2.5 text-center">Trạng thái</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h, i) => (
                <tr key={h.id} className={`border-t border-gray-50 hover:bg-gray-50 ${!h.active ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 font-mono text-gray-700">{h.maVatTu}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[200px]">
                    <div className="truncate">{h.tenHoaChat}</div>
                    {h.tenHoaChatEN && <div className="text-[10px] text-gray-400 truncate">{h.tenHoaChatEN}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{h.nhaCC}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{h.casNo}</td>
                  <td className="px-3 py-2 text-gray-600">{h.nhomHoaChat}</td>
                  <td className="px-3 py-2 text-gray-600">{h.donViTinh}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${LEVEL_BADGE[h.zdhcMrslStatus]}`}>
                      {h.zdhcMrslStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {h.sdsCo ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <XCircle size={14} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {h.mrlsCo ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <XCircle size={14} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">{h.certCompliance}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${h.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {h.active ? 'Hoạt động' : 'Ngừng'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(h)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteId(h.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={13} className="px-4 py-8 text-center text-gray-400">Không tìm thấy hóa chất</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-gray-800">{editId ? 'Cập nhật hóa chất' : 'Thêm hóa chất mới'}</h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <Field label="Mã vật tư *">
                <Input value={form.maVatTu} onChange={e => setForm(f => ({ ...f, maVatTu: e.target.value }))} placeholder="CAS000000001" />
              </Field>
              <Field label="Tên hóa chất (VN) *">
                <Input value={form.tenHoaChat} onChange={e => setForm(f => ({ ...f, tenHoaChat: e.target.value }))} />
              </Field>
              <Field label="Tên hóa chất (EN)">
                <Input value={form.tenHoaChatEN} onChange={e => setForm(f => ({ ...f, tenHoaChatEN: e.target.value }))} />
              </Field>
              <Field label="Nhà cung cấp">
                <Input value={form.nhaCC} onChange={e => setForm(f => ({ ...f, nhaCC: e.target.value }))} />
              </Field>
              <Field label="CAS No">
                <Input value={form.casNo} onChange={e => setForm(f => ({ ...f, casNo: e.target.value }))} placeholder="7631-86-9" />
              </Field>
              <Field label="Nhóm hóa chất">
                <select className="w-full h-9 border rounded-md px-2 text-sm" value={form.nhomHoaChat} onChange={e => setForm(f => ({ ...f, nhomHoaChat: e.target.value }))}>
                  {NHOM_HC.map(n => <option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Đơn vị tính">
                <select className="w-full h-9 border rounded-md px-2 text-sm" value={form.donViTinh} onChange={e => setForm(f => ({ ...f, donViTinh: e.target.value }))}>
                  {DON_VI.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="ZDHC MRSL Status">
                <select className="w-full h-9 border rounded-md px-2 text-sm" value={form.zdhcMrslStatus} onChange={e => setForm(f => ({ ...f, zdhcMrslStatus: e.target.value as ZDHCLevel }))}>
                  {ZDHC_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Số chứng nhận (Cert)">
                <Input value={form.certCompliance} onChange={e => setForm(f => ({ ...f, certCompliance: e.target.value }))} />
              </Field>
              <Field label="Ngày cập nhật SDS">
                <Input type="date" value={form.sdsNgayCapNhat} onChange={e => setForm(f => ({ ...f, sdsNgayCapNhat: e.target.value }))} />
              </Field>
              <div className="col-span-2 flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.sdsCo} onChange={e => setForm(f => ({ ...f, sdsCo: e.target.checked }))} className="w-4 h-4" />
                  Có SDS
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.mrlsCo} onChange={e => setForm(f => ({ ...f, mrlsCo: e.target.checked }))} className="w-4 h-4" />
                  Có MRLS/Cert compliance
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4" />
                  Hoạt động
                </label>
              </div>
              <Field label="Ghi chú" className="col-span-2">
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm resize-none"
                  rows={2}
                  value={form.ghiChu}
                  onChange={e => setForm(f => ({ ...f, ghiChu: e.target.value }))}
                />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>Hủy</Button>
              <Button size="sm" onClick={save} disabled={!form.maVatTu || !form.tenHoaChat}>
                {editId ? 'Cập nhật' : 'Thêm mới'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-gray-800 mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-gray-500 mb-4">Bạn có chắc muốn xóa hóa chất này? Thao tác không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Hủy</Button>
              <Button variant="destructive" size="sm" onClick={() => { deleteHoaChat(deleteId); setDeleteId(null); }}>Xóa</Button>
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
