export async function generate(projectConfig) {
  let rules = "";

  if (projectConfig.skills && projectConfig.skills.codebaseMemory) {
    rules += `
# Auto-Index Codebase
Como agente, si ves que la herramienta \`index_repository\` está disponible, en tu PRIMER turno debes ejecutar \`index_repository(repo_path=".", mode="full")\` para asegurar que el repositorio esté indexado, a menos que sepas que ya lo está. Esto poblará la base de datos de Codebase-Memory-MCP.
`;
  }

  if (rules.trim() === "") {
    return null;
  }

  return rules.trim();
}
