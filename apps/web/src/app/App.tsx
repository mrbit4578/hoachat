import { useState } from 'react';
import { Toaster } from 'sonner';
import { ChemProvider } from './store/ChemContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DanhMucHoaChat } from './components/DanhMucHoaChat';
import { NhapKho } from './components/NhapKho';
import { XuatKho } from './components/XuatKho';
import { TonKho } from './components/TonKho';
import { BaoCaoXNT } from './components/BaoCaoXNT';
import { ZDHCCompliance } from './components/ZDHCCompliance';
import { Settings } from './components/Settings';
import type { PageType } from './types';

export default function App() {
  const [page, setPage] = useState<PageType>('dashboard');

  return (
    <ChemProvider>
      <Toaster position="top-right" richColors />
      <Layout currentPage={page} setPage={setPage}>
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'danh-muc' && <DanhMucHoaChat />}
        {page === 'nhap-kho' && <NhapKho />}
        {page === 'xuat-kho' && <XuatKho />}
        {page === 'ton-kho' && <TonKho />}
        {(page === 'bao-cao-lot' || page === 'bao-cao-vat-tu') && <BaoCaoXNT />}
        {page === 'compliance' && <ZDHCCompliance />}
        {page === 'settings' && <Settings />}
      </Layout>
    </ChemProvider>
  );
}
