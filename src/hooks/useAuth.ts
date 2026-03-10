import { useAppSelector } from './useRedux';
import { UserRole } from '../types/auth.types';

export const useAuth = () => {
  const { user, isAuthenticated, loading, error } = useAppSelector((state) => state.auth);

  const isSuperUser = user?.role === UserRole.SUPER_USER;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isManager = user?.role === UserRole.MANAGER;
  const isCashier = user?.role === UserRole.CASHIER;
  const isInventoryStaff = user?.role === UserRole.INVENTORY_STAFF;

  const hasRole = (roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    isSuperUser,
    isAdmin,
    isManager,
    isCashier,
    isInventoryStaff,
    hasRole,
  };
};
