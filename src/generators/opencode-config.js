const PROVIDER_MODELS = {
  'opencode-go': {
    'kimi-k2.6': 'Kimi K2.6',
    'kimi-k2.7': 'Kimi K2.7',
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'glm-5.2': 'GLM-5.2',
    'glm-5.2': 'GLM-5.2',
    'qwen3.6-plus': 'Qwen 3.6 Plus',
    'qwen3.7-plus': 'Qwen 3.7 Plus',
    'qwen3.7-max': 'Qwen 3.7 Max',
    'mimo-v2-omni': 'MiMo-V2 Omni',
    'mimo-v2.5': 'MiMo V2.5',
    'mimo-v2.5-pro': 'MiMo-V2.5 Pro',
    'mimo-v2.5-pro-ultraspeed': 'MiMo V2.5 Pro Ultraspeed',
    'minimax-m2.5': 'MiniMax M2.5',
    'minimax-m2.7': 'MiniMax M2.7',
    'minimax-m3': 'MiniMax M3'
  },
  'openrouter': {
    'kimi-k2.6': 'Kimi K2.6',
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'glm-5.2': 'GLM-5.2',
    'qwen3.6-plus': 'Qwen 3.6 Plus',
    'qwen3.5-plus': 'Qwen 3.5 Plus',
    'mimo-v2-omni': 'MiMo-V2 Omni',
    'mimo-v2.5-pro': 'MiMo-V2.5 Pro',
    'mimo-v2.5-pro-ultraspeed': 'MiMo V2.5 Pro Ultraspeed',
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
    'mimo-v2.5-pro-ultraspeed': 'MiMo V2.5 Pro Ultraspeed',
    'mimo-v2-flash': 'MiMo-V2 Flash'
  },
  'minimax': {
    'minimax-m3': 'MiniMax M3'
  },
  'nvidia': {
    'nvidia/nemotron-3-super-120b-a12b': 'Nemotron-3 Super 120B',
    'nvidia/nemotron-3-ultra-550b-a55b': 'Nemotron-3 Ultra 550B',
    'nvidia/nemotron-3-nano-30b-a3b': 'Nemotron-3 Nano 30B',
    'nvidia/llama-3.1-nemotron-nano-vl-8b-v1': 'Llama 3.1 Nemotron Nano VL 8B',
    'openai/gpt-oss-120b': 'GPT OSS 120B',
    'qwen/qwen3-next-80b-a3b-instruct': 'Qwen 3 Next 80B Instruct',
    'z-ai/glm-5.2': 'Z.ai GLM-5.2',
    'minimaxai/minimax-m3': 'MiniMax M3',
    'deepseek-ai/deepseek-v4-pro': 'DeepSeek V4 Pro',
    'minimaxai/minimax-m2.7': 'MiniMax M2.7',
    'moonshotai/kimi-k2.6': 'Kimi K2.6'
  },
  'cavoti': {
    'gpt-5.5': 'GPT-5.5',
    'gpt-5.4': 'GPT-5.4',
    'gpt-5.4-mini': 'GPT-5.4 Mini',
    'codex-auto-review': 'Codex Auto Review',
    'claude-haiku-4-5': 'Claude Haiku 4.5',
    'claude-haiku-4-5-20251001': 'Claude Haiku 4.5 (2025-10-01)',
    'claude-opus-4-5': 'Claude Opus 4.5',
    'claude-opus-4-5-20251101': 'Claude Opus 4.5 (2025-11-01)',
    'claude-opus-4-6': 'Claude Opus 4.6',
    'claude-opus-4-7': 'Claude Opus 4.7',
    'claude-opus-4-8': 'Claude Opus 4.8',
    'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5 (2025-09-29)',
    'claude-sonnet-4-6': 'Claude Sonnet 4.6'
  },
  'ollama-cloud': {
    'deepseek-v4-pro': 'DeepSeek V4 Pro',
    'glm-5.2': 'GLM-5.2',
    'qwen3.5': 'Qwen 3.5',
    'gemma4': 'Gemma 4',
    'glm-5.1': 'GLM 5.1',
    'nemotron-3-super': 'Nemotron 3 Super',
    'glm-5': 'GLM 5',
    'kimi-k2.7-code': 'Kimi K2.7 Code',
    'kimi-k2.5': 'Kimi K2.5',
    'deepseek-v4-flash': 'DeepSeek V4 Flash',
    'qwen3-coder': 'Qwen 3 Coder',
    'kimi-k2.7': 'Kimi K2.7'
  }
};

// ═══ Cavoti Model Metadata (limits, variants, options) ═══
const CAVOTI_MODEL_META = {
  'codex-auto-review': { limit: { context: 200000, output: 64000 }, variants: ['low','medium','high'] },
  'gpt-5.5': { limit: { context: 1050000, output: 128000 }, variants: ['low','medium','high','xhigh'] },
  'gpt-5.4': { limit: { context: 1050000, output: 128000 }, variants: ['low','medium','high','xhigh'] },
  'gpt-5.4-mini': { limit: { context: 400000, output: 128000 }, variants: ['low','medium','high','xhigh'] }
};

export async function generate(projectConfig) {
  const config = {
    $schema: "https://opencode.ai/config.json",
    // Plugin de agentes Oh My OpenAgent — necesario para cargar agentes y herramientas
    plugin: ["oh-my-openagent", "ui-ux-pro-max"],
    model: "minimax-m3", // Modelo default barato
    permission: "allow",
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
        providerConfig.options.baseURL = `{mimoUrl:${envKey}}`;
      } else if (providerId === 'minimax') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://api.minimax.chat/v1";
      } else if (providerId === 'opencode-go') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://opencode.ai/zen/go/v1";

        const ANTHROPIC_MODELS = ['minimax-m3', 'minimax-m2.7', 'minimax-m2.5', 'qwen3.7-max', 'qwen3.7-plus', 'qwen3.6-plus'];
        const hasAnthropic = acc.models && acc.models.some(m => ANTHROPIC_MODELS.includes(m));
        if (hasAnthropic) {
          config.provider[`${acc.id}-anthropic`] = {
            api: 'anthropic',
            options: {
              apiKey: acc.envKey ? process.env[acc.envKey] : undefined,
              baseURL: "https://opencode.ai/zen/go/v1",
              setCacheKey: projectConfig.cacheOptimization || false,
              headers: projectConfig.cacheOptimization ? { "x-session-id": "{env:PROJECT_CACHE_ID}" } : {}
            },
            models: {}
          };
        }
      } else if (providerId === 'nvidia') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://integrate.api.nvidia.com/v1";
      } else if (providerId === 'cavoti') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://cavoti.com/v1";
        // User explicitly requested these keys for Cavoti GPT vs Claude
        providerConfig.options.apiKey = process.env.CAVOTI_GPT_KEY || `{env:CAVOTI_GPT_KEY}`;

        const CLAUDE_MODELS = ['claude-haiku-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-5', 'claude-opus-4-5-20251101', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8', 'claude-sonnet-4-5-20250929', 'claude-sonnet-4-6'];
        // If account specifies models, use that list; otherwise assume all provider models are available
        const accModelList = acc.models && acc.models.length ? acc.models : Object.keys(PROVIDER_MODELS['cavoti'] || {});
        const hasClaude = accModelList.some(m => CLAUDE_MODELS.includes(m));
        if (hasClaude) {
          config.provider[`${acc.id}-claude`] = {
            api: 'openai',
            options: {
              apiKey: process.env.CAVOTI_CLAUDE_KEY || `{env:CAVOTI_CLAUDE_KEY}`,
              baseURL: "https://cavoti.com/v1",
              setCacheKey: projectConfig.cacheOptimization || false,
              headers: projectConfig.cacheOptimization ? { "x-session-id": "{env:PROJECT_CACHE_ID}" } : {}
            },
            models: {}
          };
        }
      } else if (providerId === 'ollama-cloud') {
        providerConfig.api = 'openai';
        providerConfig.options.baseURL = "https://ollama.com/v1";
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
      const ANTHROPIC_MODELS = ['minimax-m3', 'minimax-m2.7', 'minimax-m2.5', 'qwen3.7-max', 'qwen3.7-plus', 'qwen3.6-plus'];
      for (const [modelId, modelName] of Object.entries(modelMap)) {
        let realModelId = modelId;
        if (providerId === 'openrouter') {
          if (modelId === 'kimi-k2.6') realModelId = 'moonshot/kimi-k2.6';
          else if (modelId === 'deepseek-v4-flash') realModelId = 'deepseek/deepseek-v4-flash';
          else if (modelId === 'deepseek-v4-pro') realModelId = 'deepseek/deepseek-v4-pro';
          else if (modelId === 'glm-5.2') realModelId = 'thudm/glm-5.2';
          else if (modelId === 'qwen3.6-plus') realModelId = 'qwen/qwen3.6-plus';
          else if (modelId === 'qwen3.5-plus') realModelId = 'qwen/qwen3.5-plus';
          else if (modelId === 'mimo-v2-omni') realModelId = 'xiaomi/mimo-v2-omni';
          else if (modelId === 'mimo-v2.5-pro') realModelId = 'xiaomi/mimo-v2.5-pro';
          else if (modelId === 'mimo-v2.5-pro-ultraspeed') realModelId = 'xiaomi/mimo-v2.5-pro-ultraspeed';
          else if (modelId === 'mimo-v2-flash') realModelId = 'xiaomi/mimo-v2-flash';
          else if (modelId === 'minimax-m3') realModelId = 'minimax/minimax-m3';
        }
        
        if (providerId === 'opencode-go' && ANTHROPIC_MODELS.includes(modelId)) {
          if (config.provider[`${acc.id}-anthropic`]) {
            config.provider[`${acc.id}-anthropic`].models[modelId] = {
              id: realModelId,
              name: modelName
            };
          }
        } else if (providerId === 'cavoti' && ['claude-haiku-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-5', 'claude-opus-4-5-20251101', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8', 'claude-sonnet-4-5-20250929', 'claude-sonnet-4-6'].includes(modelId)) {
          if (config.provider[`${acc.id}-claude`]) {
            config.provider[`${acc.id}-claude`].models[modelId] = {
              id: realModelId,
              name: modelName
            };
          }
        } else {
          const modelEntry = {
            id: realModelId,
            name: modelName
          };
          // Enriched metadata for Cavoti GPT models (limit, variants, options.store)
          if (providerId === 'cavoti' && CAVOTI_MODEL_META[modelId]) {
            const meta = CAVOTI_MODEL_META[modelId];
            modelEntry.limit = meta.limit;
            modelEntry.options = { store: false };
            const variantObj = {};
            if (meta.variants && Array.isArray(meta.variants)) {
              for (const v of meta.variants) variantObj[v] = {};
            }
            modelEntry.variants = variantObj;
          }
          providerConfig.models[modelId] = modelEntry;
        }
      }
      
      config.provider[acc.id] = providerConfig;
    }
  }

  // Redirigir todas las peticiones OpenAI a través del proxy reverso de CoreVCO para rastreo de gastos
  const proxyBase = process.env.PROXY_BASE_URL || "http://127.0.0.1:3847";
  for (const [providerAccId, pConfig] of Object.entries(config.provider || {})) {
    if (!pConfig.api || pConfig.api === 'openai') {
      pConfig.options.baseURL = `${proxyBase}/api/proxy/${projectConfig.id}/${providerAccId}`;
    }
  }

  // Integración de Skills MCP directamente en opencode.json
  if (projectConfig.skills && projectConfig.skills.engram) {
    config.mcp = {
      engram: {
        type: 'local',
        command: ['bash', '-c', '$HOME/go/bin/engram mcp --tools=agent']
      }
    };
  }

  return JSON.stringify(config, null, 2);
}
