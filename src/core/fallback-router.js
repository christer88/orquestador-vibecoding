import { getAccounts } from './account-manager.js';

/**
 * Fallback Router
 * Construye cadenas de fallback multi-proveedor y multi-cuenta.
 */

export function buildFallbackChain(agentId, primaryModel, primarySource, accounts, activeProviders = []) {
  const fallbacks = [];
  
  // Encontrar la cuenta principal seleccionada
  let providerPrefix = '';
  for (const provider of Object.keys(accounts)) {
    if (primarySource.startsWith(provider)) {
      providerPrefix = provider;
      break;
    }
  }
  
  const providerAccounts = providerPrefix ? accounts[providerPrefix] : [];
  
  // Estrategia: Rotar cuentas del MISMO proveedor primero
  if (providerAccounts.length > 1) {
    for (const acc of providerAccounts) {
      if (acc.id !== primarySource) {
        fallbacks.push(`${acc.id}/${primaryModel}`);
      }
    }
  }
  
  // Agregar OpenRouter como safety net si está disponible en la lista de proveedores activos
  if (activeProviders.includes('openrouter') && accounts['openrouter'] && accounts['openrouter'].length > 0) {
    const openRouterAccId = accounts['openrouter'][0].id;
    if (openRouterAccId !== primarySource) {
      fallbacks.push(`${openRouterAccId}/${primaryModel}`);
    }
  }
  
  return fallbacks;
}

export function autoGenerateFallbacks(config) {
  // Lógica para autogenerar fallbacks para cada agente en el config
  // Si no tienen fallbacks definidos, los autogenera basándose en cuentas
  for (const [agentId, agentConfig] of Object.entries(config.agents || {})) {
    if (!agentConfig.fallbacks || agentConfig.fallbacks.length === 0) {
      agentConfig.fallbacks = buildFallbackChain(
        agentId, 
        agentConfig.model, 
        agentConfig.source, 
        config.accounts,
        config.providers || []
      );
    }
  }
  return config;
}
