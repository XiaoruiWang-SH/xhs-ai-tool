import React, { useState, useEffect, memo } from 'react';

interface AIConfig {
  provider: 'chatgpt' | 'claude' | 'gemini' | 'tongyi' | 'kimi';
  apiKey: string;
}

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanelComponent: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'chatgpt',
    apiKey: ''
  });

  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Load existing configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = localStorage.getItem('aiConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('aiConfig', JSON.stringify(config));
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setConnectionStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.apiKey.trim()) {
      setConnectionStatus('error');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Simulate API test - in real implementation, this would test the actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, randomly succeed or fail
      const success = Math.random() > 0.3;
      
      setConnectionStatus(success ? 'success' : 'error');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleConfigChange = (field: keyof AIConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    // Reset connection status when config changes
    setConnectionStatus('idle');
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="animate-pulse text-2xl mb-4">⚙️</div>
          <p className="text-neutral-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto m-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700 text-xl font-bold z-10"
        >
          ×
        </button>

        <div className="p-6">
          {/* AI Model Configuration */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">选择大模型</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                AI 模型
              </label>
              <select
                value={config.provider}
                onChange={(e) => handleConfigChange('provider', e.target.value as AIConfig['provider'])}
                className="w-full px-3 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:border-xhs-red focus:outline-none"
              >
                <option value="chatgpt">ChatGPT</option>
                <option value="claude">Claude</option>
                <option value="gemini">Gemini</option>
                <option value="tongyi">通义千问</option>
                <option value="kimi">Kimi</option>
              </select>
            </div>
          </section>

          {/* API Configuration */}
          <section className="mb-6">            
            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={isKeyVisible ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                  placeholder="请输入您的 API Key..."
                  className="w-full px-3 py-2 pr-10 text-sm bg-white border border-neutral-300 rounded-lg focus:border-xhs-red focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsKeyVisible(!isKeyVisible)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                >
                  {isKeyVisible ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={testConnection}
                disabled={!config.apiKey.trim() || isTestingConnection}
                className="px-4 py-2 text-sm font-medium text-white bg-xhs-red rounded-lg hover:bg-xhs-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTestingConnection ? '测试中...' : '测试连通性'}
              </button>
              
              {connectionStatus !== 'idle' && (
                <div className="flex items-center gap-2">
                  {connectionStatus === 'success' && (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600">连接成功</span>
                    </>
                  )}
                  {connectionStatus === 'error' && (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-red-600">连接失败</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>


          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <button
              onClick={saveConfig}
              disabled={isSaving || !config.apiKey.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-xhs-red rounded-lg hover:bg-xhs-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
            
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export memoized component
export const SettingsPanel = memo(SettingsPanelComponent);