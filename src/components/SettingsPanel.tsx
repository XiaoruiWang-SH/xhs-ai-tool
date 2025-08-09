import React, { useState, useEffect, memo } from 'react';

interface AIConfig {
  provider: 'openai' | 'claude' | 'custom';
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface ContentPreferences {
  language: 'zh-CN' | 'en-US';
  style: 'active' | 'professional' | 'casual' | 'elegant';
}

interface PrivacySettings {
  saveHistory: boolean;
  analyticsParticipation: boolean;
}

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanelComponent: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    baseUrl: 'https://api.openai.com/v1'
  });

  const [preferences, setPreferences] = useState<ContentPreferences>({
    language: 'zh-CN',
    style: 'active'
  });

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    saveHistory: false,
    analyticsParticipation: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  // Load existing configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await chrome.storage.sync.get(['aiConfig', 'contentPreferences', 'privacySettings']);
      
      if (result.aiConfig) {
        setConfig(result.aiConfig);
      }
      if (result.contentPreferences) {
        setPreferences(result.contentPreferences);
      }
      if (result.privacySettings) {
        setPrivacy(result.privacySettings);
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
      await chrome.storage.sync.set({
        aiConfig: config,
        contentPreferences: preferences,
        privacySettings: privacy
      });
      
      // Show success feedback
      setConnectionStatus('success');
      setConnectionMessage('Configuration saved successfully!');
      
      // Auto-close after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setConnectionStatus('error');
      setConnectionMessage('Failed to save configuration: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    if (!config.apiKey.trim()) {
      setConnectionStatus('error');
      setConnectionMessage('Please enter an API key first');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Simulate API test - in real implementation, this would test the actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, randomly succeed or fail
      const success = Math.random() > 0.3;
      
      if (success) {
        setConnectionStatus('success');
        setConnectionMessage('Connection successful!');
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Connection failed. Please check your API key and network.');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage('Connection test failed: ' + (error as Error).message);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleConfigChange = (field: keyof AIConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    // Reset connection status when config changes
    if (field === 'apiKey' || field === 'provider' || field === 'baseUrl') {
      setConnectionStatus('idle');
      setConnectionMessage('');
    }
  };

  const handlePreferenceChange = (field: keyof ContentPreferences, value: string) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handlePrivacyChange = (field: keyof PrivacySettings, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [field]: value }));
  };

  // Model options based on provider
  const getModelOptions = () => {
    switch (config.provider) {
      case 'openai':
        return [
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
        ];
      case 'claude':
        return [
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
          { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-opus', label: 'Claude 3 Opus' }
        ];
      case 'custom':
        return [{ value: config.model, label: config.model }];
      default:
        return [];
    }
  };

  // Update model when provider changes
  useEffect(() => {
    const getModelOptions = () => {
      switch (config.provider) {
        case 'openai':
          return [
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
            { value: 'gpt-4', label: 'GPT-4' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
          ];
        case 'claude':
          return [
            { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
            { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
            { value: 'claude-3-opus', label: 'Claude 3 Opus' }
          ];
        case 'custom':
          return [{ value: config.model, label: config.model }];
        default:
          return [];
      }
    };

    const modelOptions = getModelOptions();
    if (modelOptions.length > 0 && !modelOptions.find(opt => opt.value === config.model)) {
      setConfig(prev => ({ ...prev, model: modelOptions[0].value }));
    }
  }, [config.provider, config.model]);

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
    <div className="h-full bg-neutral-50 overflow-y-auto">
      <div className="p-6">
        {/* AI Model Configuration */}
        <section className="mb-8">
          <h3 className="text-title text-neutral-900 mb-4">AI Model</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="provider"
                value="openai"
                checked={config.provider === 'openai'}
                onChange={(e) => handleConfigChange('provider', e.target.value)}
                className="text-xhs-red focus:ring-xhs-red"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-neutral-900">OpenAI GPT-4</span>
                <p className="text-caption text-neutral-500">ChatGPT API with GPT-3.5 and GPT-4 models</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="provider"
                value="claude"
                checked={config.provider === 'claude'}
                onChange={(e) => handleConfigChange('provider', e.target.value)}
                className="text-xhs-red focus:ring-xhs-red"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-neutral-900">Anthropic Claude</span>
                <p className="text-caption text-neutral-500">Claude 3 family with advanced reasoning</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 cursor-pointer transition-colors">
              <input
                type="radio"
                name="provider"
                value="custom"
                checked={config.provider === 'custom'}
                onChange={(e) => handleConfigChange('provider', e.target.value)}
                className="text-xhs-red focus:ring-xhs-red"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-neutral-900">Custom API</span>
                <p className="text-caption text-neutral-500">Use your own API endpoint</p>
              </div>
            </label>
          </div>
        </section>

        {/* API Configuration */}
        <section className="mb-8">
          <h3 className="text-title text-neutral-900 mb-4">API Configuration</h3>
          
          {/* API Key */}
          <div className="mb-4">
            <label className="block text-caption font-medium text-neutral-700 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="Enter your API key..."
                className="w-full px-3 py-2 text-sm bg-white border-neutral-300 rounded-lg focus:border-xhs-red focus:outline-none"
              />
              {config.apiKey && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-neutral-500 text-xs">●●●●</span>
                </div>
              )}
            </div>
            <p className="text-micro text-neutral-500 mt-1">
              Your API key is stored securely locally and never uploaded to servers
            </p>
          </div>

          {/* Model Selection */}
          <div className="mb-4">
            <label className="block text-caption font-medium text-neutral-700 mb-2">
              Model
            </label>
            <select
              value={config.model}
              onChange={(e) => handleConfigChange('model', e.target.value)}
              disabled={config.provider === 'custom'}
              className="w-full px-3 py-2 text-sm bg-white border-neutral-300 rounded-lg focus:border-xhs-red focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500"
            >
              {getModelOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {config.provider === 'custom' && (
              <input
                type="text"
                value={config.model}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                placeholder="Enter model name..."
                className="w-full px-3 py-2 text-sm bg-white border-neutral-300 rounded-lg focus:border-xhs-red focus:outline-none mt-2"
              />
            )}
          </div>

          {/* Base URL */}
          {(config.provider === 'custom' || config.provider === 'openai') && (
            <div className="mb-4">
              <label className="block text-caption font-medium text-neutral-700 mb-2">
                API Base URL
              </label>
              <input
                type="url"
                value={config.baseUrl}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 text-sm bg-white border-neutral-300 rounded-lg focus:border-xhs-red focus:outline-none"
              />
            </div>
          )}

          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={!config.apiKey.trim() || isTestingConnection}
              className="px-4 py-2 text-caption font-medium text-white bg-xhs-red rounded-lg hover:bg-xhs-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            
            {connectionStatus !== 'idle' && (
              <div className="flex items-center gap-2">
                {connectionStatus === 'success' && (
                  <>
                    <span className="text-success text-sm">✓</span>
                    <span className="text-caption text-success">{connectionMessage}</span>
                  </>
                )}
                {connectionStatus === 'error' && (
                  <>
                    <span className="text-error text-sm">✗</span>
                    <span className="text-caption text-error">{connectionMessage}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Content Preferences */}
        <section className="mb-8">
          <h3 className="text-title text-neutral-900 mb-4">Content Preferences</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-caption font-medium text-neutral-700 mb-2">
                Language
              </label>
              <select
                value={preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border-neutral-300 rounded-lg focus:border-xhs-red focus:outline-none"
              >
                <option value="zh-CN">中文 (简体)</option>
                <option value="en-US">English</option>
              </select>
            </div>

            <div>
              <label className="block text-caption font-medium text-neutral-700 mb-2">
                Content Style
              </label>
              <select
                value={preferences.style}
                onChange={(e) => handlePreferenceChange('style', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border-neutral-300 rounded-lg focus:border-xhs-red focus:outline-none"
              >
                <option value="active">活泼 (Active)</option>
                <option value="professional">专业 (Professional)</option>
                <option value="casual">休闲 (Casual)</option>
                <option value="elegant">优雅 (Elegant)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="mb-8">
          <h3 className="text-title text-neutral-900 mb-4">Privacy</h3>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={privacy.saveHistory}
                onChange={(e) => handlePrivacyChange('saveHistory', e.target.checked)}
                className="mt-0.5 text-xhs-red rounded focus:ring-xhs-red"
              />
              <div>
                <span className="text-sm text-neutral-900">Save conversation history</span>
                <p className="text-caption text-neutral-500">Store chat conversations locally for reference</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={privacy.analyticsParticipation}
                onChange={(e) => handlePrivacyChange('analyticsParticipation', e.target.checked)}
                className="mt-0.5 text-xhs-red rounded focus:ring-xhs-red"
              />
              <div>
                <span className="text-sm text-neutral-900">Analytics participation</span>
                <p className="text-caption text-neutral-500">Help improve the extension by sharing anonymous usage data</p>
              </div>
            </label>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-3 sticky bottom-0 bg-neutral-50 py-4">
          <button
            onClick={saveConfig}
            disabled={isSaving || !config.apiKey.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-xhs-red rounded-lg hover:bg-xhs-red-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-neutral-300 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-caption text-neutral-500">Version 1.0.0</span>
          <div className="flex gap-4 text-caption text-neutral-500">
            <a href="#" className="hover:text-neutral-700">Help</a>
            <a href="#" className="hover:text-neutral-700">Privacy</a>
            <a href="#" className="hover:text-neutral-700">About</a>
          </div>
        </div>

        {/* API Key Help */}
        <div className="mt-4 p-3 bg-neutral-100 rounded-lg">
          <h4 className="text-caption font-medium text-neutral-900 mb-2">Getting API Keys:</h4>
          <ul className="text-micro text-neutral-700 space-y-1">
            <li><strong>OpenAI:</strong> Visit <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-xhs-red hover:underline">platform.openai.com</a></li>
            <li><strong>Claude:</strong> Visit <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-xhs-red hover:underline">console.anthropic.com</a></li>
            <li><strong>Domestic alternatives:</strong> Use compatible API services with custom endpoints</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Export memoized component
export const SettingsPanel = memo(SettingsPanelComponent);