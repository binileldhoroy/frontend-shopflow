import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { useCompanyFeatures } from '@hooks/useCompanyFeatures';
import { UserRole } from '../types/auth.types';
import { CompanyFeatures } from '../types/company.types';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  requiredFeature?: keyof Omit<CompanyFeatures, 'max_users'>;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children, allowedRoles, requiredFeature }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { isFeatureEnabled } = useCompanyFeatures();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2EFE8]">
        <div className="w-10 h-10 border-4 border-[#0d9158] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredFeature && !isFeatureEnabled(requiredFeature)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
