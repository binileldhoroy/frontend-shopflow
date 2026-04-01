import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { useCompany } from '@hooks/useCompany';
import { logout } from '@store/slices/authSlice';
import { toggleSidebar } from '@store/slices/uiSlice';
import { Menu, ChevronDown, ChevronUp, User, Settings, LogOut } from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user?.username?.[0]?.toUpperCase() || 'U';
  };

  return (
    <header className="bg-[#0F1F18] sticky top-0 z-50 border-b border-white/[0.07]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            className="p-2 min-h-[44px] min-w-[44px] hover:bg-white/10 rounded-lg transition-colors duration-200 flex items-center justify-center"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>

          {currentCompany && (
            <div className="flex items-center gap-3">
              {currentCompany.logo && (
                <img
                  src={currentCompany.logo}
                  alt={currentCompany.company_name}
                  className="h-10 w-10 object-contain rounded ring-2 ring-white/20"
                />
              )}
              <h1 className="text-xl font-bold text-white hidden md:block">
                {currentCompany.company_name}
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-3 px-3 py-2 min-h-[44px] hover:bg-white/10 rounded-lg transition-colors duration-200"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                {getUserInitials()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white">
                  {user?.first_name || user?.username}
                </p>
                <p className="text-xs text-slate-300 capitalize">
                  {user?.role.replace('_', ' ')}
                </p>
              </div>
              {showUserMenu ? (
                <ChevronUp className="w-4 h-4 text-slate-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fadeIn">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                  onClick={() => {
                    setShowUserMenu(false);
                    navigate('/settings');
                  }}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors duration-150"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
