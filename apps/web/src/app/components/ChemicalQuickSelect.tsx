import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from './ui/input';
import type { HoaChat } from '../types';

interface ChemicalQuickSelectProps {
  chemicals: HoaChat[];
  maVatTu: string;
  tenHoaChat: string;
  onSelect: (chemical: HoaChat) => void;
}

export function ChemicalQuickSelect({ chemicals, maVatTu, tenHoaChat, onSelect }: ChemicalQuickSelectProps) {
  const [codeQuery, setCodeQuery] = useState(maVatTu);
  const [nameQuery, setNameQuery] = useState(tenHoaChat);
  const [open, setOpen] = useState(false);

  useEffect(() => setCodeQuery(maVatTu), [maVatTu]);
  useEffect(() => setNameQuery(tenHoaChat), [tenHoaChat]);

  const filtered = useMemo(() => {
    const code = codeQuery.trim().toLowerCase();
    const name = nameQuery.trim().toLowerCase();
    return chemicals
      .filter(h => {
        const byCode = !code || h.maVatTu.toLowerCase().includes(code);
        const byName = !name || h.tenHoaChat.toLowerCase().includes(name);
        return byCode && byName;
      })
      .slice(0, 20);
  }, [chemicals, codeQuery, nameQuery]);

  function selectChemical(chemical: HoaChat) {
    setCodeQuery(chemical.maVatTu);
    setNameQuery(chemical.tenHoaChat);
    setOpen(false);
    onSelect(chemical);
  }

  return (
    <div className="col-span-2 space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mã vật tư *</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-8"
              value={codeQuery}
              onFocus={() => setOpen(true)}
              onChange={e => {
                setCodeQuery(e.target.value);
                setOpen(true);
              }}
              placeholder="Gõ mã vật tư..."
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tên vật tư *</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-8"
              value={nameQuery}
              onFocus={() => setOpen(true)}
              onChange={e => {
                setNameQuery(e.target.value);
                setOpen(true);
              }}
              placeholder="Gõ tên vật tư..."
            />
          </div>
        </div>
      </div>

      {open && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm max-h-60 overflow-y-auto">
          {filtered.map(chemical => {
            const selected = chemical.maVatTu === maVatTu;
            return (
              <button
                type="button"
                key={chemical.id}
                onClick={() => selectChemical(chemical)}
                className={`w-full grid grid-cols-[120px_1fr_90px_28px] gap-3 px-3 py-2 text-left text-xs hover:bg-teal-50 ${selected ? 'bg-teal-50' : ''}`}
              >
                <span className="font-mono text-gray-700">{chemical.maVatTu}</span>
                <span className="text-gray-800 truncate">{chemical.tenHoaChat}</span>
                <span className="text-gray-500 truncate">{chemical.donViTinh}</span>
                <span className="text-teal-600">{selected ? <Check size={14} /> : null}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-gray-400">Không tìm thấy vật tư phù hợp</div>
          )}
        </div>
      )}
    </div>
  );
}
