import React from 'react';

interface HeaderProps {
  connectionStatus: 'connected' | 'connecting' | 'error';
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  connectionStatus, 
  onSettingsClick 
}) => {
  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border-b-chrome-border">
      <div className="flex items-center gap-2">
        <div className="text-xhs-red text-lg">🔴</div>
        <h1 className="text-title text-neutral-900 m-0">小红书 AI</h1>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs" title={getStatusText()}>
            {getStatusIndicator()}
          </span>
        </div>
      </div>
      
      {onSettingsClick && (
        <button
          onClick={onSettingsClick}
          className="bg-transparent border-neutral-300 rounded-full w-7 h-7 cursor-pointer flex items-center justify-center hover:bg-neutral-50 transition-colors"
          title="Settings"
          aria-label="Open settings"
        >
          <span className="text-xs">⚙️</span>
        </button>
      )}
    </div>
  );
};