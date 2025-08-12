import { createContext, useContext } from 'react';
import type { AIConfig } from '../components/SettingsPanel';
import type { AIConfigAction } from './aiConfigTypes';

export const AIConfigContext = createContext<AIConfig | null>(null);
export const AIConfigDispatchContext = createContext<React.Dispatch<AIConfigAction> | null>(null);

export function useAIConfig() {
  const context = useContext(AIConfigContext);
  if (context === null) {
    throw new Error('useAIConfig must be used within an AIConfigProvider');
  }
  return context;
}

export function useAIConfigDispatch() {
  const context = useContext(AIConfigDispatchContext);
  if (context === null) {
    throw new Error('useAIConfigDispatch must be used within an AIConfigProvider');
  }
  return context;
}