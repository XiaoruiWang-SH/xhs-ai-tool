import React, { useReducer } from 'react';
import { AIConfigContext, AIConfigDispatchContext } from './aiConfigHooks';
import { aiConfigReducer, getInitialAIConfig } from './aiConfigTypes';

export function AIConfigProvider({ children }: { children: React.ReactNode }) {
  const [aiConfig, dispatch] = useReducer(aiConfigReducer, getInitialAIConfig());

  return (
    <AIConfigContext.Provider value={aiConfig}>
      <AIConfigDispatchContext.Provider value={dispatch}>
        {children}
      </AIConfigDispatchContext.Provider>
    </AIConfigContext.Provider>
  );
}