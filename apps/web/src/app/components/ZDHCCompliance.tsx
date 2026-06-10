import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, FileText, Award, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useChemContext } from '../store/ChemContext';
import type { ZDHCLevel } from '../types';

const LEVEL_COLORS: Record<ZDHCLevel, string> = {
  'Level 0': '#10b981',
  'Level 1': '#3b82f6',
  'Level 2': '#8b5cf6',
  'Level 3': '#f59e0b',
  'Not Listed': '#6b7280',
};

const LEVEL_DESC: Record<ZDHCLevel, string> = {
  'Level 0': 'Cơ bản — Tuân thủ các quy định pháp lý tối thiểu',
  'Level 1': 'Nâng cao — Có kiểm soát bổ sung ngoài yêu cầu pháp lý',
  'Level 2': 'Khát vọng — Tiến tới loại bỏ các chất nguy hiểm',
  'Level 3': 'Xuất sắc — Đáp ứng tiêu chuẩn cao nhất ZDHC',
  'Not Listed': 'Chưa xếp loại — Không nằm trong ZDHC MRSL',
};

export function ZDHCCompliance() {
  const { hoaChat, settings } = useChemContext();

  const active = useMemo(() => hoaChat.filter(h => h.active), [hoaChat]);

  const stats = useMemo(() => {
    const total = active.length;
    const withSDS = active.filter(h => h.sdsCo).length;
    const withMRLS = active.filter(h => h.mrlsCo).length;
    const compliant = active.filter(h => h.zdhcMrslStatus !== 'Not Listed').length;
    const byCertLevel = Object.entries(
      active.reduce<Record<string, number>>((acc, h) => {
        acc[h.zdhcMrslStatus] = (acc[h.zdhcMrslStatus] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    return { total, withSDS, withMRLS, compliant, byCertLevel };
  }, [active]);

  const barData = useMemo(() => {
    const nhomMap = new Map<string, { nhom: string; Listed: number; NotListed: number }>();
    active.forEach(h => {
      if (!nhomMap.has(h.nhomHoaChat)) nhomMap.set(h.nhomHoaChat, { nhom: h.nhomHoaChat, Listed: 0, NotListed: 0 });
      const entry = nhomMap.get(h.nhomHoaChat)!;
      if (h.zdhcMrslStatus === 'Not Listed') entry.NotListed++;
      else entry.Listed++;
    });
    return Array.from(nhomMap.values());
  }, [active]);

  const sdsScore = stats.total ? Math.round((stats.withSDS / stats.total) * 100) : 0;
  const mrslScore = stats.total ? Math.round((stats.withMRLS / stats.total) * 100) : 0;
  const complianceScore = stats.total ? Math.round((stats.compliant / stats.total) * 100) : 0;
  const overallScore = Math.round((sdsScore + mrslScore + complianceScore) / 3);

  const issues = active.filter(h => !h.sdsCo || !h.mrlsCo || h.zdhcMrslStatus === 'Not Listed');

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="bg-gradient-to-r from-[#0f1c2e] to-[#1a3a5c] rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={18} className="text-teal-400" />
              <span className="text-white/60 text-sm">Tuân thủ tiêu chuẩn</span>
            </div>
            <h2 className="text-2xl text-white">{settings.mrslVersion}</h2>
            <p className="text-white/50 text-xs mt-1">{settings.tenNhaMay} — {settings.zdhcSupplierId}</p>
          </div>
          <div className="text-right">
            <div className="text-5xl text-teal-400">{overallScore}%</div>
            <div className="text-white/50 text-xs">Điểm tổng thể</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5">
          <ScoreCard label="Tỷ lệ có SDS" value={sdsScore} count={stats.withSDS} total={stats.total} />
          <ScoreCard label="Tỷ lệ có Cert/MRLS" value={mrslScore} count={stats.withMRLS} total={stats.total} />
          <ScoreCard label="Tỷ lệ trong ZDHC MRSL" value={complianceScore} count={stats.compliant} total={stats.total} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart by MRSL level */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 text-gray-700">
            <Award size={16} className="text-teal-500" />
            <span>Phân bố theo ZDHC MRSL Level</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={stats.byCertLevel} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {stats.byCertLevel.map((entry, i) => (
                    <Cell key={i} fill={LEVEL_COLORS[entry.name as ZDHCLevel] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {stats.byCertLevel.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: LEVEL_COLORS[d.name as ZDHCLevel] }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-gray-800">{d.value} ({stats.total ? Math.round(d.value / stats.total * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart by group */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 text-gray-700">
            <FileText size={16} className="text-teal-500" />
            <span>ZDHC MRSL theo nhóm hóa chất</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="nhom" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Listed" name="Trong MRSL" stackId="a" fill="#10b981" radius={[0, 3, 3, 0]} />
                <Bar dataKey="NotListed" name="Not Listed" stackId="a" fill="#6b7280" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* MRSL Level descriptions */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 text-gray-700">
          <ShieldCheck size={16} className="text-teal-500" />
          <span>Các cấp độ ZDHC MRSL</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(LEVEL_COLORS) as [ZDHCLevel, string][]).map(([level, color]) => (
            <div key={level} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
              <div>
                <div className="text-sm text-gray-800">{level}</div>
                <div className="text-xs text-gray-500 mt-0.5">{LEVEL_DESC[level]}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {stats.byCertLevel.find(b => b.name === level)?.value ?? 0} hóa chất
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues / Non-compliant chemicals */}
      {issues.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-orange-100 text-orange-700">
            <ShieldAlert size={16} />
            <span>Hóa chất cần hoàn thiện hồ sơ ({issues.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-orange-50 text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 text-left">Mã VT</th>
                  <th className="px-3 py-2.5 text-left">Tên hóa chất</th>
                  <th className="px-3 py-2.5 text-left">Nhà CC</th>
                  <th className="px-3 py-2.5 text-center">ZDHC MRSL</th>
                  <th className="px-3 py-2.5 text-center">SDS</th>
                  <th className="px-3 py-2.5 text-center">Cert/MRLS</th>
                  <th className="px-3 py-2.5 text-left">Hành động cần làm</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(h => {
                  const actions: string[] = [];
                  if (!h.sdsCo) actions.push('Bổ sung SDS');
                  if (!h.mrlsCo) actions.push('Lấy chứng nhận MRLS/Cert');
                  if (h.zdhcMrslStatus === 'Not Listed') actions.push('Kiểm tra ZDHC Gateway');
                  return (
                    <tr key={h.id} className="border-t border-orange-50 hover:bg-orange-50/50">
                      <td className="px-3 py-2 font-mono text-gray-700">{h.maVatTu}</td>
                      <td className="px-3 py-2 text-gray-800 max-w-[160px] truncate">{h.tenHoaChat}</td>
                      <td className="px-3 py-2 text-gray-600">{h.nhaCC}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: LEVEL_COLORS[h.zdhcMrslStatus] + '20', color: LEVEL_COLORS[h.zdhcMrslStatus] }}>
                          {h.zdhcMrslStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {h.sdsCo ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <XCircle size={14} className="text-red-400 mx-auto" />}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {h.mrlsCo ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <XCircle size={14} className="text-red-400 mx-auto" />}
                      </td>
                      <td className="px-3 py-2">
                        {actions.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 mr-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px]">
                            <AlertTriangle size={10} /> {a}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full chemical compliance table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 text-gray-700">
          <FileText size={16} className="text-teal-500" />
          <span>Danh sách hóa chất — Trạng thái tuân thủ ZDHC ({active.length} loại)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2.5 text-left">Mã VT</th>
                <th className="px-3 py-2.5 text-left">Tên hóa chất</th>
                <th className="px-3 py-2.5 text-left">CAS No</th>
                <th className="px-3 py-2.5 text-left">Nhà CC</th>
                <th className="px-3 py-2.5 text-left">Nhóm HC</th>
                <th className="px-3 py-2.5 text-center">ZDHC MRSL</th>
                <th className="px-3 py-2.5 text-center">SDS</th>
                <th className="px-3 py-2.5 text-center">Cert/MRLS</th>
                <th className="px-3 py-2.5 text-left">Số Cert</th>
                <th className="px-3 py-2.5 text-left">Ngày SDS</th>
              </tr>
            </thead>
            <tbody>
              {active.map(h => (
                <tr key={h.id} className={`border-t border-gray-50 ${!h.sdsCo || !h.mrlsCo ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-3 py-2 font-mono text-gray-700">{h.maVatTu}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[160px] truncate">{h.tenHoaChat}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{h.casNo}</td>
                  <td className="px-3 py-2 text-gray-600">{h.nhaCC}</td>
                  <td className="px-3 py-2 text-gray-600">{h.nhomHoaChat}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: LEVEL_COLORS[h.zdhcMrslStatus] + '20', color: LEVEL_COLORS[h.zdhcMrslStatus] }}>
                      {h.zdhcMrslStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {h.sdsCo ? <CheckCircle2 size={13} className="text-green-500 mx-auto" /> : <XCircle size={13} className="text-red-400 mx-auto" />}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {h.mrlsCo ? <CheckCircle2 size={13} className="text-green-500 mx-auto" /> : <XCircle size={13} className="text-red-400 mx-auto" />}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{h.certCompliance}</td>
                  <td className="px-3 py-2 text-gray-500">{h.sdsNgayCapNhat ? new Date(h.sdsNgayCapNhat).toLocaleDateString('vi-VN') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, count, total }: { label: string; value: number; count: number; total: number }) {
  return (
    <div className="bg-white/10 rounded-xl p-3">
      <div className="text-2xl text-teal-400">{value}%</div>
      <div className="text-white/60 text-xs mt-1">{label}</div>
      <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-teal-400 rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
      <div className="text-white/40 text-[10px] mt-1">{count}/{total} hóa chất</div>
    </div>
  );
}
