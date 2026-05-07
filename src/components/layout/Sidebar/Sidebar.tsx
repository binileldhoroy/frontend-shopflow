import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { useCompanyFeatures } from '@hooks/useCompanyFeatures';
import { useBranch } from '@hooks/useBranch';
import { setSidebarOpen } from '@store/slices/uiSlice';
import { UserRole } from '../../../types/auth.types';
import { CompanyFeatures } from '../../../types/company.types';
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
  Store,
  MessageSquare,
  GitBranch,
} from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  roles: UserRole[];
  feature?: keyof Omit<CompanyFeatures, 'max_users' | 'max_branches'>;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      {
        path: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.INVENTORY_STAFF],
      },
      {
        path: '/companies',
        icon: Building2,
        label: 'Companies',
        roles: [UserRole.SUPER_USER],
      },
    ],
  },
  {
    label: 'Sales',
    items: [
      {
        path: '/pos',
        icon: Calculator,
        label: 'POS',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
        feature: 'sales_enabled',
      },
      {
        path: '/quick-sale',
        icon: Zap,
        label: 'Quick Sale',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
        feature: 'sales_enabled',
      },
      {
        path: '/sales',
        icon: ShoppingCart,
        label: 'Sales',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
        feature: 'sales_enabled',
      },
      {
        path: '/register-sessions',
        icon: Wallet,
        label: 'Daily Balances',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
        feature: 'sales_enabled',
      },
      {
        path: '/customers',
        icon: Users,
        label: 'Customers',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
      },
    ],
  },
  {
    label: 'Inventory',
    items: [
      {
        path: '/products',
        icon: Package,
        label: 'Products',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
        feature: 'inventory_enabled',
      },
      {
        path: '/categories',
        icon: Tags,
        label: 'Categories',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
        feature: 'inventory_enabled',
      },
      {
        path: '/inventory',
        icon: Boxes,
        label: 'Inventory',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
        feature: 'inventory_enabled',
      },
    ],
  },
  {
    label: 'Purchases',
    items: [
      {
        path: '/purchases',
        icon: ShoppingBag,
        label: 'Purchases',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
        feature: 'purchases_enabled',
      },
      {
        path: '/suppliers',
        icon: Truck,
        label: 'Suppliers',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF],
        feature: 'purchases_enabled',
      },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        path: '/invoices',
        icon: FileText,
        label: 'Invoices',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
        feature: 'finance_enabled',
      },
      {
        path: '/payments',
        icon: CreditCard,
        label: 'Payments',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
        feature: 'finance_enabled',
      },
      {
        path: '/advance-invoices',
        icon: FileClock,
        label: 'Advance Invoices',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER],
        feature: 'advance_invoice_enabled',
      },
    ],
  },
  {
    label: 'AI',
    items: [
      {
        path: '/chat',
        icon: MessageSquare,
        label: 'ShopBot',
        roles: [UserRole.ADMIN, UserRole.MANAGER],
        feature: 'shopbot_enabled',
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        path: '/reports',
        icon: TrendingUp,
        label: 'Reports',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
        feature: 'reports_enabled',
      },
      {
        path: '/users',
        icon: UserCog,
        label: 'Users',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN, UserRole.MANAGER],
      },
      {
        path: '/branches',
        icon: GitBranch,
        label: 'Branches',
        roles: [UserRole.ADMIN],
        feature: 'branches_enabled' as const,
      },
      {
        path: '/settings',
        icon: Settings,
        label: 'Settings',
        roles: [UserRole.SUPER_USER, UserRole.ADMIN],
      },
    ],
  },
];

const POS_PATHS = ['/pos', '/quick-sale'];

const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { hasRole } = useAuth();
  const { isFeatureEnabled } = useCompanyFeatures();
  const { isOverviewMode } = useBranch();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300
          border-r border-white/[0.07]
          ${sidebarOpen
            ? 'w-64 bg-[#0F1F18]'
            : 'w-0 overflow-hidden md:w-[60px] md:overflow-visible bg-[#0F1F18]'
          }`}
      >
        {/* Logo / Brand */}
        <div
          className={`flex items-center h-[60px] border-b border-white/[0.07] flex-shrink-0 px-3.5
            ${!sidebarOpen ? 'md:justify-center' : ''}`}
        >
          <div className="w-8 h-8 bg-[#0d9158] rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-900/30">
            <Store className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="ml-3 overflow-hidden">
              <span className="text-white font-semibold text-[15px] tracking-tight whitespace-nowrap">
                ShopFlow
              </span>
              <span className="block text-[10px] font-medium text-[#4a8a6a] tracking-widest uppercase whitespace-nowrap">
                POS System
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => hasRole(item.roles) && (!item.feature || isFeatureEnabled(item.feature))
            );
            if (!visibleItems.length) return null;

            return (
              <div key={group.label ?? '__main'} className={group.label ? 'mt-4' : ''}>
                {/* Section label */}
                {group.label && sidebarOpen && (
                  <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4a7060] select-none">
                    {group.label}
                  </p>
                )}
                {group.label && !sidebarOpen && (
                  <div className="hidden md:block mx-auto w-6 h-px bg-white/10 mb-2" />
                )}

                {visibleItems.map((item) => {
                  const isPosDisabled = isOverviewMode && POS_PATHS.includes(item.path);

                  if (isPosDisabled) {
                    return (
                      <div
                        key={item.path}
                        title="Select a branch to use POS"
                        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 opacity-40 cursor-not-allowed
                          text-[#8aab96] ${!sidebarOpen ? 'md:justify-center md:px-0' : ''}`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {sidebarOpen && (
                          <span className="text-[13.5px] font-medium leading-none whitespace-nowrap">
                            {item.label}
                          </span>
                        )}
                        {!sidebarOpen && (
                          <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0F1F18] border border-white/10 text-white text-xs rounded-lg opacity-0 hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 hidden md:block pointer-events-none shadow-2xl">
                            {item.label} — Select a branch first
                          </span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-all duration-150 group
                        ${isActive
                          ? 'bg-[#1a3d2b] text-[#4ade80]'
                          : 'text-[#8aab96] hover:bg-white/[0.07] hover:text-white'
                        }
                        ${!sidebarOpen ? 'md:justify-center md:px-0' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#4ade80] rounded-r-full" />
                          )}
                          <item.icon
                            className={`w-4 h-4 flex-shrink-0 transition-colors duration-150
                              ${isActive ? 'text-[#4ade80]' : 'text-[#8aab96] group-hover:text-white'}`}
                          />
                          {sidebarOpen && (
                            <span className="text-[13.5px] font-medium leading-none whitespace-nowrap">
                              {item.label}
                            </span>
                          )}
                          {!sidebarOpen && (
                            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#0F1F18] border border-white/10 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 hidden md:block pointer-events-none shadow-2xl">
                              {item.label}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
