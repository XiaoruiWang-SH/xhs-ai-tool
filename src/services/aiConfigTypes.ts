import type { AIConfig } from '../components/SettingsPanel';

// Define action types for AI configuration
export type AIConfigAction =
  | { type: 'set'; data: AIConfig }
  | { type: 'update'; data: Partial<AIConfig> }
  | { type: 'reset' };

// Default AI configuration
export const defaultAIConfig: AIConfig = {
  provider: 'chatgpt',
  apiKey: '',
};

// Get initial AI config from localStorage
export function getInitialAIConfig(): AIConfig {
  try {
    const stored = localStorage.getItem('aiConfig');
    if (stored) {
      const parsedConfig = JSON.parse(stored);
      return { ...defaultAIConfig, ...parsedConfig };
    }
  } catch (error) {
    console.error('Failed to parse stored AI config:', error);
  }
  return defaultAIConfig;
}

// Save AI config to localStorage
export function saveAIConfigToStorage(config: AIConfig): void {
  try {
    localStorage.setItem('aiConfig', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save AI config to localStorage:', error);
  }
}

// AI Config reducer
export function aiConfigReducer(
  config: AIConfig,
  action: AIConfigAction
): AIConfig {
  let newConfig: AIConfig;
  
  switch (action.type) {
    case 'set': {
      newConfig = action.data;
      break;
    }
    case 'update': {
      newConfig = { ...config, ...action.data };
      break;
    }
    case 'reset': {
      newConfig = defaultAIConfig;
      break;
    }
    default: {
      throw Error('Unknown action: ' + (action as any).type);
    }
  }
  
  // Save to localStorage whenever config changes
  saveAIConfigToStorage(newConfig);
  return newConfig;
}