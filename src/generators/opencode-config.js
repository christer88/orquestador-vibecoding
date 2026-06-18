const PROVIDER_MODELS = {
  'opencode-go': {
    'kimi-k2.6': 'Kimi K2.6',
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'glm-5.1': 'GLM-5.1',
    'qwen3.6-plus': 'Qwen 3.6 Plus',
    'qwen3.5-plus': 'Qwen 3.5 Plus',
    'mimo-v2-omni': 'MiMo-V2 Omni',
    'mimo-v2.5-pro': 'MiMo-V2.5 Pro'
  },
  'openrouter': {
    'kimi-k2.6': 'Kimi K2.6',
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'glm-5.1': 'GLM-5.1',
    'qwen3.6-plus': 'Qwen 3.6 Plus',
    'qwen3.5-plus': 'Qwen 3.5 Plus',
    'mimo-v2-omni': 'MiMo-V2 Omni',
    'mimo-v2.5-pro': 'MiMo-V2.5 Pro',
    'mimo-v2-flash': 'MiMo-V2 Flash',
    'minimax-m3': 'MiniMax M3'
  },
  'deepseek-api': {
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'deepseek-v4-pro': 'DeepSeek V4 Pro'
  },
  'moonshot': {
    'kimi-k2.6': 'Kimi K2.6'
  },
  'xiaomi': {
    'mimo-v2-omni': 'MiMo-V2 Omni',
    'mimo-v2.5-pro': 'MiMo-V2.5 Pro',
    'mimo-v2-flash': 'MiMo-V2 Flash'
  },
  'minimax': {
    'minimax-m3': 'MiniMax M3'
  },
  'commandcode': {
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'deepseek-v4-flash': 'DeepSeek V4 Flash'
  }
};

export async function generate(projectConfig) {
  const config = {
    $schema: "https://opencode.ai/config.json",
    // Plugin de agentes Oh My OpenAgent — necesario para cargar agentes y herramientas
    plugin: ["oh-my-openagent"],
    model: "deepseek-v4-flash", // Modelo default barato
    provider: {},
    theme: "opencode",
    autoupdate: true
  };

  // Iterar por todos los proveedores y cuentas configuradas
  for (const providerId of projectConfig.providers || []) {
    const accounts = projectConfig.accounts?.[providerId] || [{ id: providerId }];
    
    for (const acc of accounts) {
      let providerConfig = {};
      
      // Mapear ENV variable según el generador de ENV
      const envKey = acc.envKey || `${acc.id.toUpperCase().replace(/-/g, '_')}_API_KEY`;

      providerConfig.options = {
        apiKey: `{env:${envKey}}`
      };

      if (providerId === 'openrouter') {
        providerConfig.options.baseURL = "https://openrouter.ai/api/v1";
      } else if (providerId === 'deepseek-api') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://api.deepseek.com";
      } else if (providerId === 'moonshot') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://api.moonshot.ai/v1";
      } else if (providerId === 'xiaomi') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://token-plan-sgp.xiaomimimo.com/v1";
      } else if (providerId === 'minimax') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://api.minimax.chat/v1";
      } else if (providerId === 'commandcode') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://api.commandcode.ai/provider/v1";
      } else if (providerId === 'opencode-go') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://opencode.ai/zen/go/v1";
      }
      
      if (projectConfig.cacheOptimization) {
        providerConfig.options.setCacheKey = true;
        providerConfig.options.headers = {
          "x-session-id": "{env:PROJECT_CACHE_ID}"
        };
      }

      // Declarar explícitamente los modelos soportados para que OpenCode los considere válidos
      const modelMap = PROVIDER_MODELS[providerId] || {};
      providerConfig.models = {};
      for (const [modelId, modelName] of Object.entries(modelMap)) {
        let realModelId = modelId;
        if (providerId === 'openrouter') {
          if (modelId === 'kimi-k2.6') realModelId = 'moonshot/kimi-k2.6';
          else if (modelId === 'deepseek-v4-flash') realModelId = 'deepseek/deepseek-v4-flash';
          else if (modelId === 'deepseek-v4-pro') realModelId = 'deepseek/deepseek-v4-pro';
          else if (modelId === 'glm-5.1') realModelId = 'thudm/glm-5.1';
          else if (modelId === 'qwen3.6-plus') realModelId = 'qwen/qwen3.6-plus';
          else if (modelId === 'qwen3.5-plus') realModelId = 'qwen/qwen3.5-plus';
          else if (modelId === 'mimo-v2-omni') realModelId = 'xiaomi/mimo-v2-omni';
          else if (modelId === 'mimo-v2.5-pro') realModelId = 'xiaomi/mimo-v2.5-pro';
          else if (modelId === 'mimo-v2-flash') realModelId = 'xiaomi/mimo-v2-flash';
          else if (modelId === 'minimax-m3') realModelId = 'minimax/minimax-m3';
        }
        
        providerConfig.models[modelId] = {
          id: realModelId,
          name: modelName
        };
      }
      
      config.provider[acc.id] = providerConfig;
    }
  }

  return JSON.stringify(config, null, 2);
}
