export async function generate(projectConfig) {
  // Solo generar configuración de MCP para Engram si el skill está habilitado
  if (projectConfig.skills && projectConfig.skills.engram) {
    return {
      mcp: {
        engram: {
          type: 'local',
          command: ['bash', '-c', '$HOME/go/bin/engram mcp --tools=agent']
        }
      }
    };
  }

  // Si no hay skills que usen MCP, no devolvemos configuración
  return null;
}
