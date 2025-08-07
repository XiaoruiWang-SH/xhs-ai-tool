import React, { useState, useEffect } from 'react';

interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    baseUrl: 'https://api.openai.com/v1'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 加载现有配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await chrome.storage.sync.get(['aiConfig']);
      if (result.aiConfig) {
        setConfig(result.aiConfig);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      await chrome.storage.sync.set({ aiConfig: config });
      alert('配置已保存！');
      onClose();
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存失败: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof AIConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div className="p-5">加载配置中...</div>;
  }

  return (
    <div className="bg-surface p-5 max-w-md">
      <div className="flex justify-between items-center mb-5">
        <h2 className="m-0 text-text">AI设置</h2>
        <button 
          onClick={onClose}
          className="bg-none border-none text-lg cursor-pointer text-text hover:text-text-muted"
        >
          ✕
        </button>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-bold text-text">
          提供商:
        </label>
        <select 
          value={config.provider}
          onChange={(e) => handleInputChange('provider', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded bg-surface text-text focus:border-primary focus:outline-none"
        >
          <option value="openai">OpenAI</option>
          <option value="claude">Claude (Anthropic)</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-bold text-text">
          API密钥:
        </label>
        <input 
          type="password"
          value={config.apiKey}
          onChange={(e) => handleInputChange('apiKey', e.target.value)}
          placeholder="输入你的API密钥..."
          className="w-full p-2 border border-gray-300 rounded bg-surface text-text focus:border-primary focus:outline-none"
        />
        <small className="text-text-muted text-xs">
          密钥将安全存储在本地，不会上传到服务器
        </small>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-bold text-text">
          模型:
        </label>
        <input 
          type="text"
          value={config.model}
          onChange={(e) => handleInputChange('model', e.target.value)}
          placeholder="例: gpt-3.5-turbo"
          className="w-full p-2 border border-gray-300 rounded bg-surface text-text focus:border-primary focus:outline-none"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-bold text-text">
          API地址:
        </label>
        <input 
          type="text"
          value={config.baseUrl}
          onChange={(e) => handleInputChange('baseUrl', e.target.value)}
          placeholder="例: https://api.openai.com/v1"
          className="w-full p-2 border border-gray-300 rounded bg-surface text-text focus:border-primary focus:outline-none"
        />
      </div>

      <div className="mt-5">
        <button 
          onClick={saveConfig}
          disabled={isSaving || !config.apiKey.trim()}
          className="w-full p-2.5 bg-primary text-white border-none rounded cursor-pointer text-base hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="mt-4 p-2.5 bg-surface rounded">
        <h4 className="m-0 mb-2.5 text-sm text-text">获取API密钥:</h4>
        <ul className="m-0 pl-5 text-xs text-text-muted">
          <li><strong>OpenAI:</strong> 访问 platform.openai.com</li>
          <li><strong>Claude:</strong> 访问 console.anthropic.com</li>
          <li><strong>国内替代:</strong> 可使用兼容的API服务</li>
        </ul>
      </div>
    </div>
  );
};