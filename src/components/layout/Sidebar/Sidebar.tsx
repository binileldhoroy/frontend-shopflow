import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { setSidebarOpen } from '@store/slices/uiSlice';
import { UserRole } from '../../../types/auth.types';
import {
  LayoutDashboard,
  Building2,
  Calculator,
  Package,
  Tags,
  ShoppingCart,
  Users,
  FileText,
  Boxes,
  ShoppingBag,
  Truck,
  CreditCard,
  TrendingUp,
  UserCog,
  Settings,
  Zap,
  Wallet,
  FileClock,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  speedometer2: LayoutDashboard,
  building: Building2,
  calculator: Calculator,
  'box-seam': Package,
  tags: Tags,
  'cart-check': ShoppingCart,
  people: Users,
  'file-earmark-text': FileText,
  boxes: Boxes,
  'bag-plus': ShoppingBag,
  truck: Truck,
  'credit-card': CreditCard,
  'graph-up': TrendingUp,
  'person-badge': UserCog,
  gear: Settings,
  zap: Zap,
  wallet: Wallet,
  'file-clock': FileClock,
};

const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { hasRole } = useAuth();

  const navigationItems = [
    {
      path: '/dashboard',
      icon: 'speedometer2',
      label: 'Dashboard',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.INVENTORY_STAFF],
    },
    {
      path: '/companies',
      icon: 'building',
      label: 'Companies',
      roles: [UserRole.SUPER_USER],
    },
    {
      path: '/pos',
      icon: 'calculator',
      label: 'POS',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
    },
    {
      path: '/quick-sale',
      icon: 'zap',
      label: 'Quick Sale',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
    },
    {
      path: '/products',
      icon: 'box-seam',
      label: 'Products',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
    },
    {
      path: '/categories',
      icon: 'tags',
      label: 'Categories',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
    },
    {
      path: '/sales',
      icon: 'cart-check',
      label: 'Sales',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
    },
    {
      path: '/advance-invoices',
      icon: 'file-clock',
      label: 'Advance Invoices',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
    },
    {
      path: '/register-sessions',
      icon: 'wallet',
      label: 'Daily Balances',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      path: '/customers',
      icon: 'people',
      label: 'Customers',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
    },
    {
      path: '/invoices',
      icon: 'file-earmark-text',
      label: 'Invoices',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      path: '/inventory',
      icon: 'boxes',
      label: 'Inventory',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
    },
    {
      path: '/purchases',
      icon: 'bag-plus',
      label: 'Purchases',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
    },
    {
      path: '/suppliers',
      icon: 'truck',
      label: 'Suppliers',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
    },
    {
      path: '/payments',
      icon: 'credit-card',
      label: 'Payments',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      path: '/reports',
      icon: 'graph-up',
      label: 'Reports',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      path: '/users',
      icon: 'person-badge',
      label: 'Users',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
    },
    {
      path: '/settings',
      icon: 'gear',
      label: 'Settings',
      roles: [UserRole.SUPER_USER, UserRole.ADMIN],
    },
  ];

  const filteredItems = navigationItems.filter((item) =>
    hasRole(item.roles)
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-[#0F1F18] shadow-2xl transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden md:w-20 md:overflow-visible'
        }`}
      >
        {/* Branding strip */}
        <div
          className={`flex items-center gap-3 px-4 border-b border-white/[0.07] h-[64px] ${
            !sidebarOpen ? 'md:justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 bg-[#0d9158] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          {sidebarOpen && (
            <span className="text-white font-semibold text-lg whitespace-nowrap">ShopFlow</span>
          )}
        </div>

        <div className="flex flex-col h-[calc(100%-64px)]">
          <nav className="flex-1 overflow-y-auto px-2.5 py-4">
            <div className="space-y-0.5">
              {filteredItems.map((item) => {
                const Icon = iconMap[item.icon];
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-[#1a3d2b] text-[#4ade80] font-semibold'
                          : 'text-[#8aab96] hover:bg-white/[0.07] hover:text-white'
                      } ${!sidebarOpen ? 'md:justify-center' : ''}`
                    }
                  >
                    <Icon className="w-[1.125rem] h-[1.125rem] flex-shrink-0" />
                    <span
                      className={`text-sm whitespace-nowrap ${
                        sidebarOpen ? 'block' : 'hidden'
                      }`}
                    >
                      {item.label}
                    </span>
                    {/* Tooltip for icon-only collapsed state */}
                    {!sidebarOpen && (
                      <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0F1F18] border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 hidden md:block pointer-events-none shadow-xl">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
