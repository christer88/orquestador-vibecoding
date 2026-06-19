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
  for (const [agentId, agentConfig] of Object.entries(projectConfig.agents || {})) {
    const fallbacks = (agentConfig.fallbacks || []).map(fb => {
      if (typeof fb === 'object' && fb.source && fb.model) {
        return `${fb.source}/${fb.model}`;
      }
      return fb; // Si ya es un string
    });

    omo.agents[agentId] = {
      model: `${agentConfig.source}/${agentConfig.model}`,
      fallback_models: fallbacks
    };
    
    // Si tiene prompt custom (para agentes personalizados)
    if (agentConfig.prompt_append) {
      omo.agents[agentId].prompt_append = agentConfig.prompt_append;
    }
  }

  return JSON.stringify(omo, null, 2);
}
