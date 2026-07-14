import * as omoGen from '../generators/omo-config.js';
import * as opencodeGen from '../generators/opencode-config.js';
import * as envGen from '../generators/env-generator.js';
import * as readmeGen from '../generators/readme-generator.js';
import * as setupGen from '../generators/setup-script.js';
import * as mcpGen from '../generators/mcp-config.js';
import { autoGenerateFallbacks } from './fallback-router.js';

export async function validateConfig(config) {
  const errors = [];
  if (!config.name) errors.push("Falta nombre del proyecto");
  if (!config.providers || config.providers.length === 0) errors.push("Debe seleccionar al menos un proveedor");
  return { isValid: errors.length === 0, errors };
}

export async function generateAllConfigs(projectConfig) {
  const validation = await validateConfig(projectConfig);
  if (!validation.isValid) {
    throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
  }

  // Filtrar cuentas que no pertenecen a proveedores activos para evitar fallbacks inválidos
  const activeProviders = projectConfig.providers || [];
  const cleanedAccounts = {};
  for (const provider of activeProviders) {
    if (projectConfig.accounts && projectConfig.accounts[provider]) {
      cleanedAccounts[provider] = projectConfig.accounts[provider];
    }
  }
  projectConfig.accounts = cleanedAccounts;

  const configWithFallbacks = autoGenerateFallbacks(projectConfig);

  const results = {
    'oh-my-openagent.json': await omoGen.generate(configWithFallbacks),
    'opencode.json': await opencodeGen.generate(configWithFallbacks),
    '.env': await envGen.generate(configWithFallbacks),
    'AGENTS-README.md': await readmeGen.generate(projectConfig),
    'setup-ubuntu.sh': await setupGen.generateUbuntu(projectConfig),
    'setup-debian.sh': await setupGen.generateDebian(projectConfig)
  };

  const mcpConfig = await mcpGen.generate(projectConfig);
  if (mcpConfig) {
    results['.opencode/mcp.json'] = mcpConfig;
  }
  
  return results;
}
