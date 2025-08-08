import React, { useState } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  defaultTab?: 'chat' | 'settings';
  connectionStatus?: 'connected' | 'connecting' | 'error';
  onTabChange?: (tab: 'chat' | 'settings') => void;
}

export type TabType = 'chat' | 'settings';

interface Tab {
  type: TabType;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { type: 'chat', label: 'Chat', icon: '💬' },
  { type: 'settings', label: 'Settings', icon: '⚙️' },
];

export const Layout: React.FC<LayoutProps> = ({
  children,
  defaultTab = 'chat',
  connectionStatus = 'connected',
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <div className="flex flex-col h-screen max-w-sm mx-auto bg-chrome-bg">
      {/* Header */}
      <Header 
        connectionStatus={connectionStatus}
        onSettingsClick={() => handleTabChange('settings')}
      />
      
      {/* Tab Navigation */}
      <div className="flex border-b-chrome-border bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => handleTabChange(tab.type)}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
              activeTab === tab.type
                ? 'text-xhs-red border-b-xhs-red font-semibold'
                : 'text-neutral-500 border-b-transparent hover:text-neutral-700 hover:bg-neutral-50'
            }`}
            aria-pressed={activeTab === tab.type}
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-sm">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.props && typeof child.props === 'object' && 'tabType' in child.props) {
            return React.cloneElement(child, { 
              isActive: (child.props as any).tabType === activeTab,
              activeTab 
            } as any);
          }
          return child;
        })}
      </div>
    </div>
  );
};

// Tab Content Wrapper Component
export const TabContent: React.FC<{
  tabType: TabType;
  isActive?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ isActive = false, children, className = '' }) => {
  if (!isActive) return null;

  return (
    <div className={`h-full ${className}`}>
      {children}
    </div>
  );
};