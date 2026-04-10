import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { fetchProfile } from '@store/slices/authSlice';
import { fetchCurrentCompany } from '@store/slices/companySlice';
import { UserRole } from '../types/auth.types';

interface AppInitializerProps {
  children: React.ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();
  const currentCompany = useAppSelector((state) => state.company.currentCompany);
  const [initialized, setInitialized] = useState(false);
  const initStarted = React.useRef(false);

  useEffect(() => {
    // Guard against React StrictMode double-invoke
    if (initStarted.current) return;
    initStarted.current = true;

    const init = async () => {
      if (!isAuthenticated) {
        setInitialized(true);
        return;
      }

      let resolvedUser = user;

      // Step 1: Hydrate user profile if token exists but store has no user
      if (!resolvedUser) {
        try {
          resolvedUser = await dispatch(fetchProfile()).unwrap();
        } catch {
          // Token is invalid — axios interceptor will redirect to /login
          setInitialized(true);
          return;
        }
      }

      // Step 2: Fetch company data once for non-super users
      if (resolvedUser.role !== UserRole.SUPER_USER && !currentCompany) {
        try {
          await dispatch(fetchCurrentCompany()).unwrap();
        } catch {
          // Non-critical — app works without company data
        }
      }

      setInitialized(true);
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once on mount

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2EFE8]">
        <div className="w-10 h-10 border-4 border-[#0d9158] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AppInitializer;
