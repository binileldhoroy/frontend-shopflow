import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@hooks/useRedux';
import { useAuth } from '@hooks/useAuth';
import { useCompany } from '@hooks/useCompany';
import { logout } from '@store/slices/authSlice';
import { toggleSidebar } from '@store/slices/uiSlice';
import { Menu, User, Settings, LogOut, ChevronDown } from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const getRoleLabel = () => {
    return (user?.role || '').replace(/_/g, ' ');
  };

  return (
    <header className="bg-[#0F1F18] sticky top-0 z-50 border-b border-white/[0.07] h-[60px]">
      <div className="flex items-center justify-between h-full px-3 md:px-4">

        {/* Left: hamburger + company */}
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {currentCompany && (
            <div className="flex items-center gap-2.5">
              {currentCompany.logo && (
                <img
                  src={currentCompany.logo}
                  alt={currentCompany.company_name}
                  className="h-8 w-8 object-contain rounded-md ring-1 ring-white/10"
                />
              )}
              <span className="text-[15px] font-semibold text-white hidden sm:block tracking-tight">
                {currentCompany.company_name}
              </span>
            </div>
          )}
        </div>

        {/* Right: user menu */}
        <div className="flex items-center gap-2" ref={dropdownRef}>
          <div className="relative">
            <button
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-all duration-150 group"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#0d9158] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getUserInitials()}
              </div>

              {/* Name + role */}
              <div className="hidden md:block text-left">
                <p className="text-[13px] font-semibold text-white leading-none mb-0.5">
                  {user?.first_name || user?.username}
                </p>
                <p className="text-[11px] text-slate-300 capitalize leading-none">
                  {getRoleLabel()}
                </p>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-[#5E6D8A] transition-transform duration-200 hidden md:block ${
                  showUserMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 animate-fadeIn overflow-hidden">
                {/* User info header */}
                <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
                  <p className="text-[13px] font-semibold text-gray-900">
                    {user?.first_name
                      ? `${user.first_name} ${user.last_name || ''}`
                      : user?.username}
                  </p>
                  <p className="text-[11px] text-gray-500 capitalize mt-0.5">{getRoleLabel()}</p>
                </div>

                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors duration-100"
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors duration-100"
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                <div className="border-t border-gray-200 my-1" />

                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-danger-600 hover:bg-danger-50 transition-colors duration-100"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
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
