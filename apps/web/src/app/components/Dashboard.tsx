import React from 'react';
import {
  FlaskConical,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  PackagePlus,
  PackageMinus,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useChemContext } from '../store/ChemContext';
import type { PageType } from '../types';

interface DashboardProps {
  setPage: (p: PageType) => void;
}

const ZDHC_COLORS: Record<string, string> = {
  'Level 0': '#10b981',
  'Level 1': '#3b82f6',
  'Level 2': '#8b5cf6',
  'Level 3': '#f59e0b',
  'Not Listed': '#6b7280',
};

export function Dashboard({ setPage }: DashboardProps) {
  const { getSummary, getTonKhoByLot, hoaChat, phieuNhap, phieuXuat } = useChemContext();
  const summary = getSummary();
  const tonKho = getTonKhoByLot();

  // Alerts: lots with stock > 0 and EXPIRED or WARNING
  const alerts = tonKho
    .filter(t => t.tonLo > 0 && t.trangThaiHSD !== 'VALID')
    .sort((a, b) => a.soNgayConLai - b.soNgayConLai)
    .slice(0, 8);

  // ZDHC level chart data
  const zdhcData = Object.entries(
    hoaChat.filter(h => h.active).reduce<Record<string, number>>((acc, h) => {
      acc[h.zdhcMrslStatus] = (acc[h.zdhcMrslStatus] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Recent 6 months receipt/issue trend
  const now = new Date();
  const months: { month: string; nhap: number; xuat: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' });
    const m = d.getMonth();
    const y = d.getFullYear();
    months.push({
      month: label,
      nhap: phieuNhap.filter(p => {
        const pd = new Date(p.ngayNhap);
        return pd.getMonth() === m && pd.getFullYear() === y;
      }).reduce((s, p) => s + p.soLuong, 0),
      xuat: phieuXuat.filter(p => {
        const pd = new Date(p.ngayXuat);
        return pd.getMonth() === m && pd.getFullYear() === y;
      }).reduce((s, p) => s + p.soLuong, 0),
    });
  }

  const cards = [
    {
      title: 'Tá»•ng hÃ³a cháº¥t',
      value: summary.totalChemicals,
      sub: `${summary.totalLots} lÃ´ Ä‘ang tá»“n`,
      icon: <FlaskConical size={20} />,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-200',
      action: () => setPage('danh-muc'),
    },
    {
      title: 'LÃ´ háº¿t háº¡n (cÃ²n tá»“n)',
      value: summary.expired,
      sub: 'Cáº§n xá»­ lÃ½ ngay',
      icon: <XCircle size={20} />,
      color: 'bg-red-50 text-red-600',
      border: 'border-red-200',
      action: () => setPage('ton-kho'),
    },
    {
      title: 'Cảnh báo <=30 ngày',
      value: summary.critical,
      sub: 'Theo dõi màu đỏ',
      icon: <AlertTriangle size={20} />,
      color: 'bg-red-50 text-red-600',
      border: 'border-red-200',
      action: () => setPage('ton-kho'),
    },
    {
      title: 'Cảnh báo <=15 ngày',
      value: summary.warning,
      sub: 'Theo dõi màu vàng',
      icon: <AlertTriangle size={20} />,
      color: 'bg-yellow-50 text-yellow-600',
      border: 'border-yellow-200',
      action: () => setPage('ton-kho'),
    },
    {
      title: 'LÃ´ cÃ²n háº¡n',
      value: summary.valid,
      sub: 'Tráº¡ng thÃ¡i tá»‘t',
      icon: <CheckCircle2 size={20} />,
      color: 'bg-green-50 text-green-600',
      border: 'border-green-200',
      action: () => setPage('ton-kho'),
    },
    {
      title: 'Phiáº¿u nháº­p thÃ¡ng nÃ y',
      value: summary.totalNhapThang,
      sub: 'phiáº¿u nháº­p kho',
      icon: <PackagePlus size={20} />,
      color: 'bg-indigo-50 text-indigo-600',
      border: 'border-indigo-200',
      action: () => setPage('nhap-kho'),
    },
    {
      title: 'Phiáº¿u xuáº¥t thÃ¡ng nÃ y',
      value: summary.totalXuatThang,
      sub: 'phiáº¿u xuáº¥t kho',
      icon: <PackageMinus size={20} />,
      color: 'bg-purple-50 text-purple-600',
      border: 'border-purple-200',
      action: () => setPage('xuat-kho'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {cards.map(card => (
          <button
            key={card.title}
            onClick={card.action}
            className={`bg-white rounded-xl border ${card.border} p-4 text-left hover:shadow-md transition-shadow`}
          >
            <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <div className="text-2xl text-gray-800">{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.sub}</div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">{card.title}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-700">
              <ShieldAlert size={16} className="text-red-500" />
              <span>Cáº£nh bÃ¡o lÃ´ hÃ³a cháº¥t</span>
            </div>
            <button
              onClick={() => setPage('ton-kho')}
              className="text-xs text-teal-600 hover:underline"
            >
              Xem táº¥t cáº£
            </button>
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <CheckCircle2 size={32} className="text-green-400 mb-2" />
              <span className="text-sm">KhÃ´ng cÃ³ cáº£nh bÃ¡o nÃ o</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="px-4 py-2 text-left">MÃ£ VT</th>
                    <th className="px-4 py-2 text-left">TÃªn hÃ³a cháº¥t</th>
                    <th className="px-4 py-2 text-left">LÃ´ No</th>
                    <th className="px-4 py-2 text-right">Tá»“n lÃ´</th>
                    <th className="px-4 py-2 text-left">HSD</th>
                    <th className="px-4 py-2 text-left">Tráº¡ng thÃ¡i</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <tr
                      key={i}
                      className={`border-t border-gray-50 ${
                        a.trangThaiHSD === 'EXPIRED' || a.trangThaiHSD === 'CRITICAL'
                          ? 'bg-red-50'
                          : 'bg-yellow-50'
                      }`}
                    >
                      <td className="px-4 py-2 font-mono text-gray-600">{a.maVatTu}</td>
                      <td className="px-4 py-2 text-gray-700 max-w-[160px] truncate">{a.tenHoaChat}</td>
                      <td className="px-4 py-2 font-mono text-gray-600">{a.lotNo}</td>
                      <td className="px-4 py-2 text-right">
                        {a.tonLo.toFixed(2)} {a.donViTinh}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(a.hsd).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                            a.trangThaiHSD === 'EXPIRED' || a.trangThaiHSD === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {a.trangThaiHSD === 'EXPIRED'
                            ? `Háº¿t háº¡n ${Math.abs(a.soNgayConLai)} ngÃ y`
                            : `CÃ²n ${a.soNgayConLai} ngÃ y`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ZDHC Level Pie */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 text-gray-700">
            <TrendingUp size={16} className="text-teal-500" />
            <span>HÃ³a cháº¥t theo ZDHC MRSL</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={zdhcData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {zdhcData.map((entry, i) => (
                    <Cell key={i} fill={ZDHC_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {zdhcData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ZDHC_COLORS[d.name] ?? '#94a3b8' }}
                    />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="text-gray-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 text-gray-700">
          <BarChart3 size={16} className="text-teal-500" />
          <span>Xu hÆ°á»›ng xuáº¥t nháº­p kho 6 thÃ¡ng (KG)</span>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={months} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="nhap" name="Nháº­p kho (KG)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="xuat" name="Xuáº¥t kho (KG)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function BarChart3({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

