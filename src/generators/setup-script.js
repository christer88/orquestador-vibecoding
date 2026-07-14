export async function generateUbuntu(projectConfig) {
  return `#!/bin/bash
# === ORQUESTADOR VIBECODING — VM SETUP (Ubuntu) ===
set -e

echo "🚀 Instalando entorno VibeCoding..."

# 1. Configurar directorios locales para evitar requerir sudo
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'

# 2. Definir rutas en el PATH de la sesión actual
export PATH=$PATH:$HOME/.npm-global/bin:$HOME/go/bin:$HOME/.go/bin:$HOME/.bun/bin:$HOME/.opencode/bin

# 3. Hacer persistentes las rutas para futuras sesiones
if ! grep -q ".npm-global/bin" ~/.bashrc; then
  echo 'export PATH=$PATH:$HOME/.npm-global/bin:$HOME/go/bin:$HOME/.go/bin:$HOME/.bun/bin:$HOME/.opencode/bin' >> ~/.bashrc
  echo "✅ Rutas agregadas a ~/.bashrc para persistencia"
fi

if ! grep -q "opencode/.env" ~/.bashrc; then
  echo 'if [ -f ~/.config/opencode/.env ]; then set -a && source ~/.config/opencode/.env && set +a; fi' >> ~/.bashrc
  echo "✅ Carga automática de llaves agregada a ~/.bashrc"
fi

# 3. Prerequisitos
# Intentar instalar herramientas de sistema usando sudo -n (no interactivo) por si acaso, sin fallar si requiere clave
sudo -n apt update && sudo -n apt install -y curl git build-essential || echo "⚠️  No se pudo usar apt con sudo (se asume que curl, git ya existen)"

command -v node || { echo "❌ Node.js no está instalado y no hay sudo para instalarlo. Instálalo primero."; exit 1; }

# Instalar Go localmente
if ! command -v go &> /dev/null; then
  echo "📥 Instalando Go localmente en ~/.go ..."
  wget -q https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
  mkdir -p ~/.go
  tar -xzf go1.22.5.linux-amd64.tar.gz -C ~/.go --strip-components=1
  rm go1.22.5.linux-amd64.tar.gz
  echo "✅ Go instalado"
fi

# Instalar Bun localmente
if ! command -v bun &> /dev/null; then
  echo "📥 Instalando Bun localmente..."
  curl -fsSL https://bun.sh/install | bash
  echo "✅ Bun instalado"
fi

# 4. Herramientas de VibeCoding
echo "📥 Instalando OpenCode CLI..."
curl -fsSL https://opencode.ai/install | bash



# 5. Copiar configs del proyecto ANTES de instalar oh-my-opencode
# (Nuestro opencode.json ya incluye "oh-my-openagent" en el plugin array)
echo "⚙️  Copiando configuración del proyecto..."
mkdir -p ~/.config/opencode
rm -f ~/.config/opencode/opencode.json
cp opencode.json ~/.config/opencode/opencode.json
cp oh-my-openagent.json ~/.config/opencode/oh-my-openagent.json
echo "✅ opencode.json con proveedores copiado a ~/.config/opencode/"

# 6. Variables de entorno — inyectar antes de que oh-my-opencode instale
if [ -f .env ]; then
  cp .env ~/.config/opencode/.env
  set -a && source .env && set +a
  echo "✅ Variables de entorno cargadas desde .env"
  
  # Reemplazar marcadores {env:VAR} con llaves reales directamente en el JSON
  # para que opencode no dependa de que las variables estén en el entorno
  node -e '
    const fs = require("fs");
    const path = require("path");
    const configFile = path.join(process.env.HOME || "/home/srvdes", ".config/opencode/opencode.json");
    if (fs.existsSync(configFile)) {
      let content = fs.readFileSync(configFile, "utf8");
      const replaced = content.replace(/\{env:([A-Za-z0-9_]+)\}/g, (match, p1) => {
        const val = process.env[p1];
        if (val) {
          console.log("  ✔ " + p1 + " → inyectada");
          return val;
        }
        console.warn("  ⚠ " + p1 + " no encontrada en entorno");
        return match;
      });
      fs.writeFileSync(configFile, replaced, "utf8");
      console.log("✅ Llaves de API inyectadas en ~/.config/opencode/opencode.json");
    }
  '
else
  echo "⚠️  No se encontró .env — crea uno con tus API keys"
fi

echo "📥 Inicializando oh-my-opencode (solo instala plugin, no sobreescribe opencode.json)..."
# Asegurarnos de que bun está en PATH para bunx
export PATH=$PATH:$HOME/.bun/bin
# Usamos --skip-opencode si está disponible, si no usamos el normal pero nuestro config ya tiene el plugin
bunx oh-my-opencode install --no-tui --claude=no --gemini=no --copilot=no --opencode-go=yes 2>&1 || true

${!projectConfig.skills || projectConfig.skills.uiPro !== false ? `
echo "📥 Instalando skill UI/UX Pro Max..."
npx -y uipro-cli init --ai opencode
` : ''}

# --- Inyección de Skills Seleccionados ---
${projectConfig.skills && projectConfig.skills.ponytail ? `
echo "📥 Instalando Ponytail..."
npm install -g @dietrichgebert/ponytail
# Para opencode se requiere configurarlo como plugin (si es compatible) o usar Claude Code
` : ''}
${projectConfig.skills && projectConfig.skills.codebaseMemory ? `
echo "📥 Instalando Codebase-Memory-MCP..."
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
` : ''}
${projectConfig.skills && projectConfig.skills.engram ? `
echo "📥 Instalando Engram..."
export PATH=$PATH:$HOME/go/bin:$HOME/.go/bin
    go install github.com/Gentleman-Programming/engram/cmd/engram@latest
engram setup opencode
` : ''}
${projectConfig.skills && projectConfig.skills.specKit ? `
echo "📥 Instalando Spec-Kit..."
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH=$PATH:$HOME/.local/bin
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify init . --integration opencode --force
` : ''}
# ----------------------------------------

# Restaurar nuestro opencode.json con proveedores y plugin ya inyectados por si el installer lo sobreescribió
if [ -f opencode.json ]; then
  # Re-inyectar keys si el .env existe (por si el installer volvió a reemplazar el archivo)
  if [ -f ~/.config/opencode/.env ]; then
    set -a && source ~/.config/opencode/.env && set +a
  fi
  
  # Verificar si el archivo global tiene nuestros providers; si no, restaurar
  if ! grep -q "opencode-go-1" ~/.config/opencode/opencode.json 2>/dev/null; then
    echo "⚠️  El installer sobreescribió opencode.json — restaurando configuración de proveedores..."
    cp opencode.json ~/.config/opencode/opencode.json
    
    # Volver a inyectar keys
    node -e '
      const fs = require("fs");
      const path = require("path");
      const configFile = path.join(process.env.HOME || "/home/srvdes", ".config/opencode/opencode.json");
      if (fs.existsSync(configFile)) {
        let content = fs.readFileSync(configFile, "utf8");
        const replaced = content.replace(/\{env:([A-Za-z0-9_]+)\}/g, (match, p1) => {
          return process.env[p1] || match;
        });
        fs.writeFileSync(configFile, replaced, "utf8");
        console.log("✅ Proveedores y keys restaurados correctamente.");
      }
    '
  else
    echo "✅ opencode.json de proveedores intacto tras instalación."
  fi
fi

# 7. Auth (se omiten comandos interactivos bloqueantes en despliegue automático, pero se listan para el usuario)
echo "🔒 Nota: Ejecuta 'opencode auth login' y 'cmd login' si necesitas autenticarte manualmente."

# 8. Verificar
echo ""
echo "=== VERIFICACIÓN ==="
opencode --version || echo "opencode no disponible en PATH actual"
bunx oh-my-opencode doctor --verbose || echo "doctor falló"
opencode models || echo "no se pudieron listar modelos de opencode"
echo ""
echo "✅ Setup completo! Tu entorno está listo."
echo "📖 Lee AGENTS-README.md para entender cada agente."
`;
}

export async function generateDebian(projectConfig) {
  const ubuntuScript = await generateUbuntu(projectConfig);
  return ubuntuScript.replace('(Ubuntu)', '(Debian)');
}
