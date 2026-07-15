export async function generate(projectConfig) {
  const omo = {
    $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/oh-my-opencode.schema.json",
    model_fallback: true,
    runtime_fallback: projectConfig.runtime_fallback || {
      enabled: true,
      retry_on_errors: [400, 429, 503, 529],
      max_fallback_attempts: 3,
      cooldown_seconds: 60,
      timeout_seconds: 30,
      notify_on_fallback: true
    },
    hashline_edit: true,
    agents: {},
    categories: {},
    background_task: projectConfig.background_task || {
      defaultConcurrency: 5,
      staleTimeoutMs: 180000
    }
  };

  // Populate agents
  const ANTHROPIC_MODELS = ['minimax-m3', 'minimax-m2.7', 'minimax-m2.5', 'qwen3.7-max', 'qwen3.7-plus', 'qwen3.6-plus'];
  const CLAUDE_MODELS = ['claude-haiku-4-5', 'claude-haiku-4-5-20251001', 'claude-opus-4-5', 'claude-opus-4-5-20251101', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8', 'claude-sonnet-4-5-20250929', 'claude-sonnet-4-6'];
  const resolveSource = (source, model) => {
    // OpenCode GO: ciertos modelos usan API Anthropic, necesitan sufijo -anthropic
    if (source && source.startsWith('opencode-go') && ANTHROPIC_MODELS.includes(model)) {
      return `${source}-anthropic`;
    }
    // Cavoti: modelos Claude usan API key separada, necesitan sufijo -claude
    // EXCEPTO si la cuenta ya es de tipo Claude (keyType=claude en el projectConfig)
    const sourceAcc = findAccountById(projectConfig, source);
    if (source && source.startsWith('cavoti') && CLAUDE_MODELS.includes(model) && sourceAcc?.keyType !== 'claude') {
      return `${source}-claude`;
    }
    return source;
  };

  // Helper: buscar una cuenta por id en todos los proveedores del projectConfig
  function findAccountById(cfg, accId) {
    for (const prov of Object.keys(cfg.accounts || {})) {
      for (const acc of cfg.accounts[prov] || []) {
        if (acc.id === accId) return acc;
      }
    }
    return null;
  }

  for (const [agentId, agentConfig] of Object.entries(projectConfig.agents || {})) {
    const fallbacks = (agentConfig.fallbacks || []).map(fb => {
      if (typeof fb === 'object' && fb.source && fb.model) {
        return `${resolveSource(fb.source, fb.model)}/${fb.model}`;
      }
      return fb; // Si ya es un string
    });

    omo.agents[agentId] = {
      model: `${resolveSource(agentConfig.source, agentConfig.model)}/${agentConfig.model}`,
      fallback_models: fallbacks
    };
    
    // Si tiene prompt custom (para agentes personalizados)
    if (agentConfig.prompt_append) {
      omo.agents[agentId].prompt_append = agentConfig.prompt_append;
    }
  }

  return JSON.stringify(omo, null, 2);
}
