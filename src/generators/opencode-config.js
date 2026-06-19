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
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'kimi-k2.6': 'Kimi K2.6',
    'kimi-k2.7': 'Kimi K2.7 Code',
    'glm-5.1': 'GLM-5.1',
    'glm-5.2': 'GLM-5.2',
    'qwen3.6-plus': 'Qwen 3.6 Plus',
    'qwen3.7-plus': 'Qwen 3.7 Plus',
    'mimo-v2.5-pro': 'MiMo V2.5 Pro',
    'minimax-m3': 'MiniMax M3'
  },
  'nvidia': {
    'nvidia/nemotron-3-super-120b-a12b': 'Nemotron-3 Super 120B',
    'nvidia/nemotron-3-ultra-550b-a55b': 'Nemotron-3 Ultra 550B',
    'nvidia/nemotron-3-nano-30b-a3b': 'Nemotron-3 Nano 30B',
    'nvidia/llama-3.1-nemotron-nano-vl-8b-v1': 'Llama 3.1 Nemotron Nano VL 8B',
    'z-ai/glm-5.1': 'Z.ai GLM-5.1'
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
        // NOTA: requiere plan Provider en commandcode.ai/billing
        // Los IDs de modelo deben tener prefijo: deepseek/deepseek-v4-pro, moonshotai/Kimi-K2.6, etc.
        providerConfig.options.baseURL = "https://api.commandcode.ai/provider/v1";
      } else if (providerId === 'opencode-go') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://opencode.ai/zen/go/v1";
      } else if (providerId === 'nvidia') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://integrate.api.nvidia.com/v1";
      } else if (providerId.startsWith('custom-')) {
        // Fallback dinámico si se requiere
        providerConfig.api = 'openai';
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
        } else if (providerId === 'commandcode') {
          // CommandCode requiere IDs con prefijo del proveedor original
          if (modelId === 'deepseek-v4-pro') realModelId = 'deepseek/deepseek-v4-pro';
          else if (modelId === 'deepseek-v4-flash') realModelId = 'deepseek/deepseek-v4-flash';
          else if (modelId === 'kimi-k2.6') realModelId = 'moonshotai/Kimi-K2.6';
          else if (modelId === 'kimi-k2.7') realModelId = 'moonshotai/Kimi-K2.7-Code';
          else if (modelId === 'glm-5.1') realModelId = 'zai-org/GLM-5.1';
          else if (modelId === 'glm-5.2') realModelId = 'zai-org/GLM-5.2';
          else if (modelId === 'qwen3.6-plus') realModelId = 'Qwen/Qwen3.6-Plus';
          else if (modelId === 'qwen3.7-plus') realModelId = 'Qwen/Qwen3.7-Plus';
          else if (modelId === 'mimo-v2.5-pro') realModelId = 'xiaomi/mimo-v2.5-pro';
          else if (modelId === 'minimax-m3') realModelId = 'MiniMaxAI/MiniMax-M3';
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
