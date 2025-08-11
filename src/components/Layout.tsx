import React, { useState } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  onSettingsClick: () => void;
}

export type TabType = 'chat' | 'settings';

interface Tab {
  type: TabType;
  label: string;
  icon: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  onSettingsClick,
}) => {
  return (
    <div className="flex flex-col h-screen max-w-sm mx-auto bg-chrome-bg">
      {/* Header */}
      <Header onSettingsClick={onSettingsClick} />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {children}
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

  return <div className={`h-full ${className}`}>{children}</div>;
};
