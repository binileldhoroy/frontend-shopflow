import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppSelector } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { UserRole } from '@types/auth.types';
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
};

const Sidebar: React.FC = () => {
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
    <aside
      className={`fixed left-0 top-0 h-screen bg-white shadow-lg transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
      }`}
    >
      <div className="flex flex-col h-full pt-20">
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-primary-600 text-dark font-semibold shadow-md'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                    } ${!sidebarOpen && 'lg:justify-center'}`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span
                    className={`font-medium ${
                      !sidebarOpen && 'lg:hidden'
                    } ${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
