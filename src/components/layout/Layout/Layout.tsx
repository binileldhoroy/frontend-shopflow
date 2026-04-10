import React from 'react';
import { useAppSelector } from '@hooks/useRedux';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import ToastNotification from '@components/common/ToastNotification/ToastNotification';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen } = useAppSelector((state) => state.ui);

  return (
    <div className="h-screen overflow-hidden bg-[#F2EFE8] flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main
          className={`flex-1 min-h-0 overflow-hidden transition-all duration-300 ${
            sidebarOpen ? 'md:ml-64' : 'md:ml-[60px]'
          }`}
        >
          <div className="h-full px-4 md:px-6 pt-4 pb-2 overflow-y-auto">{children}</div>
        </main>
      </div>
      <ToastNotification />
    </div>
  );
};

export default Layout;
