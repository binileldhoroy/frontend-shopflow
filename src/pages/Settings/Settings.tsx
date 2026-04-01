import React, { useState } from 'react';
import { User, Building2, Tag } from 'lucide-react';
import ProfileSettings from '../../components/features/settings/ProfileSettings';
import CompanySettings from '../../components/features/settings/CompanySettings';
import PriceTiersSettings from '../../components/features/settings/PriceTiersSettings';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'tiers'>('profile');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-icon">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1>Settings</h1>
            <p>Manage your account and company preferences</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        {([
          { key: 'profile', label: 'Profile', icon: User },
          { key: 'company', label: 'Company', icon: Building2 },
          { key: 'tiers', label: 'Price Tiers', icon: Tag },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'tiers' && <PriceTiersSettings />}
      </div>
    </div>
  );
};

export default Settings;
