import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { fetchCurrentCompany } from '@store/slices/companySlice';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import ToastNotification from '@components/common/ToastNotification/ToastNotification';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { isSuperUser } = useAuth();

  useEffect(() => {
    // Fetch current company for non-super users
    if (!isSuperUser) {
      dispatch(fetchCurrentCompany());
    }
  }, [dispatch, isSuperUser]);

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main
          className={`flex-1 min-h-0 overflow-hidden transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
          }`}
        >
          <div className="h-full px-4 pt-4 pb-2 overflow-hidden">{children}</div>
        </main>
      </div>
      <ToastNotification />
    </div>
  );
};

export default Layout;
