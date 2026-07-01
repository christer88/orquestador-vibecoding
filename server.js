/**
 * ═══════════════════════════════════════════════════════════════
 * ORQUESTADOR VIBECODING — Servidor Express Principal
 * ═══════════════════════════════════════════════════════════════
 * 
 * API REST completa para gestión de proyectos, proveedores,
 * cuentas, costos y agentes personalizados.
 * 
 * Puerto: 3847
 * Módulos: ES Modules (import/export)
 * 
 * @module server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import archiver from 'archiver';
import multer from 'multer';
import unzipper from 'unzipper';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
// ─── Configuración de rutas base ──────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const PORT = process.env.PORT || 3847;
const app = express();

// ─── Directorios del proyecto ─────────────────────────────────
const DIRS = {
  projects: path.join(__dirname, 'projects'),
  templates: path.join(__dirname, 'templates'),
  data: path.join(__dirname, 'src', 'data'),
  generators: path.join(__dirname, 'src', 'generators'),
  public: path.join(__dirname, 'public'),
};

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

/**
 * Asegura que un directorio exista, creándolo si es necesario
 * @param {string} dirPath - Ruta del directorio
 */
async function asegurarDirectorio(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignorar si ya existe
    if (error.code !== 'EEXIST') throw error;
  }
}

/**
 * Lee un archivo JSON de forma segura, devuelve null si no existe
 * @param {string} filePath - Ruta del archivo JSON
 * @returns {Promise<object|null>}
 */
async function leerJSON(filePath) {
  try {
    const contenido = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(contenido);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Error al leer JSON en ${filePath}: ${error.message}`);
  }
}

/**
 * Escribe un objeto como JSON formateado
 * @param {string} filePath - Ruta destino
 * @param {object} data - Datos a escribir
 */
async function escribirJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Wrapper para rutas async — captura errores y los envía como JSON
 * @param {Function} fn - Función async del handler
 * @returns {Function}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde public/
app.use(express.static(DIRS.public));

// ═══════════════════════════════════════════════════════════════
// SISTEMA Y METADATOS
// ═══════════════════════════════════════════════════════════════

app.get('/api/system/version', asyncHandler(async (req, res) => {
  try {
    const { stdout } = await execAsync('git rev-list --count HEAD', { cwd: __dirname });
    let count = parseInt(stdout.trim(), 10) || 0;
    // Base inicial (count 27 -> v1.11 -> offset 84)
    count += 84; 
    const major = Math.floor(count / 100);
    const minor = count % 100;
    const version = `v${major}.${minor}`;
    res.json({ ok: true, version });
  } catch (err) {
    console.error('Error obteniendo versión de Git:', err);
    res.json({ ok: true, version: 'v1.1' });
  }
}));

// ═══════════════════════════════════════════════════════════════
// CATÁLOGOS DE DATOS (cargados bajo demanda)
// ═══════════════════════════════════════════════════════════════

/**
 * Carga un catálogo de datos desde src/data/
 * Si el archivo no existe, devuelve un array vacío o un objeto vacío
 * @param {string} nombre - Nombre del archivo (sin extensión)
 * @returns {Promise<object|Array>}
 */
async function cargarCatalogo(nombre) {
  const ruta = path.join(DIRS.data, `${nombre}.json`);
  const datos = await leerJSON(ruta);
  if (datos === null) {
    console.warn(`⚠️  Catálogo '${nombre}.json' no encontrado en src/data/ — devolviendo estructura vacía`);
    return [];
  }
  return datos;
}

// ═══════════════════════════════════════════════════════════════
// GENERADORES (importados dinámicamente)
// ═══════════════════════════════════════════════════════════════

/**
 * Resuelve las cuentas de marcador de posición (placeholder) a cuentas reales registradas.
 */
async function resolverProyecto(proyecto) {
  const accountsFile = path.join(DIRS.data, 'accounts.json');
  let registeredAccounts = [];
  try {
    const content = await fs.readFile(accountsFile, 'utf-8');
    registeredAccounts = JSON.parse(content);
  } catch (e) {
    console.warn("⚠️ Error leyendo accounts.json:", e.message);
  }

  // Clonar para no mutar el original
  const resuelto = JSON.parse(JSON.stringify(proyecto));
  const placeholderMap = {};

  // Mapear marcadores de posición a la cuenta limpia indexada
  for (const providerId of resuelto.providers || []) {
    const projAccounts = resuelto.accounts?.[providerId] || [];
    const regAccounts = registeredAccounts.filter(a => a.provider === providerId && a.active !== false);

    projAccounts.forEach((projAcc, idx) => {
      // Intentar mapear al índice activo disponible
      const activeIdx = idx < regAccounts.length ? idx : 0;
      if (regAccounts.length > 0) {
        // Mapear el ID original al ID limpio indexado (por ejemplo, xiaomi-1 -> xiaomi-1)
        placeholderMap[projAcc.id] = `${providerId}-${activeIdx + 1}`;
      } else {
        // Si no hay registradas, mantener el mismo ID
        placeholderMap[projAcc.id] = projAcc.id;
      }
    });
  }

  // Reemplazar la lista de cuentas del proyecto con las reales activas pero con IDs limpios
  if (!resuelto.accounts) resuelto.accounts = {};
  for (const providerId of resuelto.providers || []) {
    const regAccounts = registeredAccounts.filter(a => a.provider === providerId && a.active !== false);
    if (regAccounts.length > 0) {
      resuelto.accounts[providerId] = regAccounts.map((a, idx) => ({
        id: `${providerId}-${idx + 1}`,
        label: a.label,
        envKey: a.envKey,
        active: a.active
      }));
    } else {
      // Si no hay registradas, usar las del proyecto o por defecto
      const projAccounts = resuelto.accounts[providerId] || [];
      if (projAccounts.length === 0) {
        projAccounts.push({
          id: `${providerId}-1`,
          label: 'Cuenta Principal',
          envKey: `${providerId.toUpperCase().replace(/-/g, '_')}_1_API_KEY`
        });
      }
      resuelto.accounts[providerId] = projAccounts;
    }
  }

  // Reemplazar en agents
  if (resuelto.agents) {
    for (const [agentId, agentConfig] of Object.entries(resuelto.agents)) {
      const resolveSrc = (src) => {
        if (!src) return src;
        if (placeholderMap[src]) return placeholderMap[src];
        const regAcc = registeredAccounts.find(a => a.id === src);
        if (regAcc) {
          const activeRegs = registeredAccounts.filter(a => a.provider === regAcc.provider && a.active !== false);
          const activeIdx = activeRegs.findIndex(a => a.id === regAcc.id);
          const idxToUse = activeIdx !== -1 ? activeIdx : 0;
          return `${regAcc.provider}-${idxToUse + 1}`;
        }
        return src;
      };

      agentConfig.source = resolveSrc(agentConfig.source);

      // También resolver los sources dentro de los fallbacks (si están en el nuevo formato objeto)
      if (agentConfig.fallbacks && Array.isArray(agentConfig.fallbacks)) {
        agentConfig.fallbacks = agentConfig.fallbacks.map(fb => {
          if (typeof fb === 'object' && fb.source) {
            return { ...fb, source: resolveSrc(fb.source) };
          }
          return fb;
        });
      }
    }
  }

  return resuelto;
}

/**
 * Importa y ejecuta los generadores de configuración para un proyecto
 * @param {object} proyecto - Datos del proyecto
 * @returns {Promise<object>} Archivos generados
 */
async function ejecutarGeneradores(proyecto) {
  const archivosGenerados = {};

  try {
    const proyectoResuelto = await resolverProyecto(proyecto);
    const configEnginePath = path.join(__dirname, 'src', 'core', 'config-engine.js');
    
    try {
      await fs.access(configEnginePath);
    } catch {
      return {
        _aviso: 'Los generadores aún no están implementados en src/core/config-engine.js',
        proyecto_id: proyecto.id,
      };
    }

    const generador = await import(pathToFileURL(configEnginePath).href);
    
    if (typeof generador.generateAllConfigs === 'function') {
      const resultado = await generador.generateAllConfigs(proyectoResuelto);
      Object.assign(archivosGenerados, resultado);
    } else {
      archivosGenerados._aviso = 'El generador no exporta la función generateAllConfigs()';
    }
  } catch (error) {
    archivosGenerados._error = `Error ejecutando generadores: ${error.message}`;
  }

  return archivosGenerados;
}

// ═══════════════════════════════════════════════════════════════
// RUTAS: PROYECTOS (/api/projects)
// ═══════════════════════════════════════════════════════════════

// ─── Lógica Compartida de Actualización a Oh My OpenCode ──────────
async function pushUpdateToDeployAndOpenCode(proyecto) {
  const generados = await ejecutarGeneradores(proyecto);
  if (generados._error) return { ok: false, error: generados._error };

  const nombreCarpeta = `proyecto-${proyecto.name.replace(/\s+/g, '-').toLowerCase()}`;
  const targetDir = path.join(__dirname, nombreCarpeta);
  await fs.mkdir(targetDir, { recursive: true });

  const archivosActualizados = [];
  for (const [nombre, contenido] of Object.entries(generados)) {
    if (nombre.startsWith('_')) continue;
    const rutaArchivo = path.join(targetDir, nombre);
    const contenidoStr = typeof contenido === 'string' ? contenido : JSON.stringify(contenido, null, 2);
    await fs.writeFile(rutaArchivo, contenidoStr, 'utf-8');
    archivosActualizados.push(nombre);
  }

  let keysInyectadas = 0;
  try {
    const envFilePath = path.join(targetDir, '.env');
    const opencodeJsonPath = path.join(targetDir, 'opencode.json');
    let envVars = {};
    try {
      const envContent = await fs.readFile(path.join(__dirname, '.env'), 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
        }
      }
    } catch (e) {}

    try {
      let opencodeContent = await fs.readFile(opencodeJsonPath, 'utf-8');
      opencodeContent = opencodeContent.replace(/\{env:([A-Za-z0-9_]+)\}/g, (match, varName) => {
        const val = envVars[varName] || process.env[varName];
        if (val) {
          keysInyectadas++;
          return val;
        }
        return match;
      });
      
      opencodeContent = opencodeContent.replace(/\{mimoUrl:([A-Za-z0-9_]+)\}/g, (match, varName) => {
        const val = envVars[varName] || process.env[varName] || '';
        if (val.startsWith('sk-')) {
          return 'https://api.xiaomimimo.com/v1';
        } else {
          return 'https://token-plan-sgp.xiaomimimo.com/v1';
        }
      });
      
      await fs.writeFile(opencodeJsonPath, opencodeContent, 'utf-8');
      
      const globalConfigDir = path.join(process.env.HOME || '/home/srvdes', '.config', 'opencode');
      await fs.mkdir(globalConfigDir, { recursive: true });
      await fs.writeFile(path.join(globalConfigDir, 'opencode.json'), opencodeContent, 'utf-8');
      
      try {
        const agentConfigPath = path.join(targetDir, 'oh-my-openagent.json');
        const agentContent = await fs.readFile(agentConfigPath, 'utf-8');
        await fs.writeFile(path.join(globalConfigDir, 'oh-my-openagent.json'), agentContent, 'utf-8');
      } catch(e) {}
    } catch (e) {}
  } catch (envErr) {}

  await escribirJSON(path.join(targetDir, 'project.json'), proyecto);
  return { ok: true, targetDir, archivos: archivosActualizados, keysInyectadas };
}
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/projects — Listar todos los proyectos
 */
app.get('/api/projects', asyncHandler(async (req, res) => {
  await asegurarDirectorio(DIRS.projects);
  const archivos = await fs.readdir(DIRS.projects);
  const proyectos = [];

  for (const archivo of archivos) {
    if (!archivo.endsWith('.json')) continue;
    const datos = await leerJSON(path.join(DIRS.projects, archivo));
    if (datos) proyectos.push(datos);
  }

  // Ordenar por fecha de creación (más reciente primero)
  proyectos.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  res.json({ ok: true, count: proyectos.length, projects: proyectos });
}));

/**
 * GET /api/projects/:id — Obtener detalle de un proyecto
 */
app.get('/api/projects/:id', asyncHandler(async (req, res) => {
  const proyecto = await leerJSON(path.join(DIRS.projects, `${req.params.id}.json`));
  
  if (!proyecto) {
    return res.status(404).json({ ok: false, error: `Proyecto '${req.params.id}' no encontrado` });
  }

  res.json({ ok: true, project: proyecto });
}));

/**
 * POST /api/projects — Crear un nuevo proyecto
 * Body: { name, description, template?, providers?, agents?, accounts? }
 */
app.post('/api/projects', asyncHandler(async (req, res) => {
  await asegurarDirectorio(DIRS.projects);

  const id = uuidv4();
  const ahora = new Date().toISOString();

  // Si se especifica una plantilla, cargar sus datos automáticamente
  let templateData = null;
  if (req.body.template) {
    const templateFilename = `${req.body.template.toLowerCase().replace(/\s+/g, '-')}.json`;
    templateData = await leerJSON(path.join(DIRS.templates, templateFilename));
  }

  const proyecto = {
    id,
    name: req.body.name || 'Proyecto sin nombre',
    description: req.body.description || '',
    template: req.body.template || null,
    // Usar datos del body si existen, si no usar los de la plantilla, si no usar defaults
    providers: req.body.providers?.length ? req.body.providers : (templateData?.providers || []),
    accounts: (req.body.accounts && Object.keys(req.body.accounts).length) ? req.body.accounts : (templateData?.accounts || {}),
    agents: (req.body.agents && Object.keys(req.body.agents).length) ? req.body.agents : (templateData?.agents || {}),
    runtime_fallback: req.body.runtime_fallback || templateData?.runtime_fallback || {
      enabled: true,
      retry_on_errors: [400, 429, 503, 529],
      max_fallback_attempts: 3,
      cooldown_seconds: 60,
      timeout_seconds: 30,
      notify_on_fallback: true,
    },
    background_task: req.body.background_task || templateData?.background_task || {
      defaultConcurrency: 5,
      staleTimeoutMs: 180000,
    },
    cacheOptimization: req.body.cacheOptimization === undefined ? true : req.body.cacheOptimization,
    custom_agents: req.body.custom_agents || [],
    createdAt: ahora,
    updatedAt: ahora,
  };

  await escribirJSON(path.join(DIRS.projects, `${id}.json`), proyecto);

  // Auto-push a la carpeta y al config global
  await pushUpdateToDeployAndOpenCode(proyecto);

  res.status(201).json({ ok: true, project: proyecto });
}));

/**
 * PUT /api/projects/:id — Actualizar un proyecto existente
 */
app.put('/api/projects/:id', asyncHandler(async (req, res) => {
  const rutaProyecto = path.join(DIRS.projects, `${req.params.id}.json`);
  const existente = await leerJSON(rutaProyecto);

  if (!existente) {
    return res.status(404).json({ ok: false, error: `Proyecto '${req.params.id}' no encontrado` });
  }

  // Mezclar datos existentes con los nuevos (preservar id y createdAt)
  const actualizado = {
    ...existente,
    ...req.body,
    id: existente.id,
    createdAt: existente.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await escribirJSON(rutaProyecto, actualizado);

  // Auto-push a la carpeta y al config global de Oh My OpenCode
  try {
    const pushRes = await pushUpdateToDeployAndOpenCode(actualizado);
    if (!pushRes.ok) throw new Error(pushRes.error);
    console.log(`♻️  Proyecto '${actualizado.name}' actualizado y configs inyectadas globalmente.`);
    res.json({ ok: true, project: actualizado, generated: pushRes.archivos });
  } catch (genErr) {
    console.error(`⚠️  Error regenerando configs para '${actualizado.name}':`, genErr.message);
    res.json({ ok: true, project: actualizado });
  }
}));

/**
 * DELETE /api/projects/:id — Eliminar un proyecto
 */
app.delete('/api/projects/:id', asyncHandler(async (req, res) => {
  const rutaProyecto = path.join(DIRS.projects, `${req.params.id}.json`);

  try {
    await fs.access(rutaProyecto);
  } catch {
    return res.status(404).json({ ok: false, error: `Proyecto '${req.params.id}' no encontrado` });
  }

  await fs.unlink(rutaProyecto);
  res.json({ ok: true, message: `Proyecto '${req.params.id}' eliminado` });
}));

/**
 * POST /api/projects/:id/generate — Generar archivos de configuración
 */
app.post('/api/projects/:id/generate', asyncHandler(async (req, res) => {
  const proyecto = await leerJSON(path.join(DIRS.projects, `${req.params.id}.json`));

  if (!proyecto) {
    return res.status(404).json({ ok: false, error: `Proyecto '${req.params.id}' no encontrado` });
  }

  const archivosGenerados = await ejecutarGeneradores(proyecto);

  res.json({
    ok: true,
    project_id: req.params.id,
    generated: archivosGenerados,
  });
}));

/**
 * GET /api/projects/:id/export — Exportar proyecto como ZIP
 */
app.get('/api/projects/:id/export', asyncHandler(async (req, res) => {
  const proyecto = await leerJSON(path.join(DIRS.projects, `${req.params.id}.json`));

  if (!proyecto) {
    return res.status(404).json({ ok: false, error: `Proyecto '${req.params.id}' no encontrado` });
  }

  // Configurar headers para descarga de ZIP
  const nombreArchivo = `orquestador-${proyecto.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  // Manejar errores del archiver
  archive.on('error', (err) => {
    console.error('❌ Error al crear ZIP:', err);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: 'Error al crear archivo ZIP' });
    }
  });

  // Pipe al response
  archive.pipe(res);

  // Agregar el proyecto como JSON
  archive.append(JSON.stringify(proyecto, null, 2), { name: 'project.json' });

  // Intentar generar archivos de configuración e incluirlos
  try {
    const generados = await ejecutarGeneradores(proyecto);
    for (const [nombre, contenido] of Object.entries(generados)) {
      if (nombre.startsWith('_')) continue; // Saltar metadatos internos
      const contenidoStr = typeof contenido === 'string' ? contenido : JSON.stringify(contenido, null, 2);
      archive.append(contenidoStr, { name: nombre });
    }
  } catch (error) {
    // Si los generadores fallan, incluir solo el proyecto base
    console.warn('⚠️  Generadores no disponibles para exportación:', error.message);
  }

  await archive.finalize();
}));

/**
 * POST /api/projects/:id/deploy — Desplegar proyecto directamente en el servidor
 */
app.post('/api/projects/:id/deploy', asyncHandler(async (req, res) => {
  const proyecto = await leerJSON(path.join(DIRS.projects, `${req.params.id}.json`));

  if (!proyecto) {
    return res.status(404).json({ ok: false, error: `Proyecto '${req.params.id}' no encontrado` });
  }

  // Generar todos los archivos
  const generados = await ejecutarGeneradores(proyecto);
  if (generados._error) {
    return res.status(500).json({ ok: false, error: generados._error });
  }

  // Determinar ruta de destino
  const nombreCarpeta = `proyecto-${proyecto.name.replace(/\s+/g, '-').toLowerCase()}`;
  const targetDir = (req.body && req.body.targetDir) || path.join(__dirname, nombreCarpeta);

  // Asegurar que el directorio de destino existe
  await fs.mkdir(targetDir, { recursive: true });

  // Escribir los archivos generados
  for (const [nombre, contenido] of Object.entries(generados)) {
    if (nombre.startsWith('_')) continue;
    const rutaArchivo = path.join(targetDir, nombre);
    const contenidoStr = typeof contenido === 'string' ? contenido : JSON.stringify(contenido, null, 2);
    await fs.writeFile(rutaArchivo, contenidoStr, 'utf-8');
  }

  // ─── Inyectar keys reales en opencode.json del proyecto ───────────────────
  // OpenCode carga el opencode.json del CWD, por lo que los placeholders {env:X}
  // deben ser reemplazados con los valores reales ANTES de que el usuario ejecute opencode.
  try {
    const envFilePath = path.join(targetDir, '.env');
    const opencodeJsonPath = path.join(targetDir, 'opencode.json');
    
    // Parsear las variables del .env generado
    const envContent = await fs.readFile(envFilePath, 'utf-8');
    const envVars = {};
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim();
          envVars[k] = v;
        }
      }
    }
    
    // Reemplazar placeholders {env:VAR} en opencode.json con los valores reales
    let opencodeContent = await fs.readFile(opencodeJsonPath, 'utf-8');
    let injectedCount = 0;
    opencodeContent = opencodeContent.replace(/\{env:([A-Za-z0-9_]+)\}/g, (match, varName) => {
      const val = envVars[varName] || process.env[varName];
      if (val) {
        injectedCount++;
        return val;
      }
      return match; // Dejar el placeholder si no se encuentra la variable
    });
    await fs.writeFile(opencodeJsonPath, opencodeContent, 'utf-8');
    console.log(`✅ Deploy: ${injectedCount} API keys inyectadas en opencode.json del proyecto`);

    // También actualizar el opencode.json global (~/.config/opencode/opencode.json)
    const globalOpencodePath = path.join(process.env.HOME || '/home/srvdes', '.config', 'opencode', 'opencode.json');
    try {
      await fs.mkdir(path.dirname(globalOpencodePath), { recursive: true });
      await fs.writeFile(globalOpencodePath, opencodeContent, 'utf-8');
      console.log(`✅ Deploy: opencode.json global actualizado con el opencode.json del proyecto`);
    } catch (ge) {
      console.warn(`⚠️ No se pudo actualizar opencode.json global: ${ge.message}`);
    }
  } catch (envErr) {
    console.warn(`⚠️ No se pudo inyectar keys en opencode.json: ${envErr.message}`);
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Guardar proyecto.json original en el destino
  await escribirJSON(path.join(targetDir, 'project.json'), proyecto);

  // Dar permisos de ejecución a los setup scripts
  const scriptPath = path.join(targetDir, 'setup-ubuntu.sh');
  try {
    await fs.chmod(scriptPath, 0o755);
  } catch (e) {
    console.warn("⚠️ No se pudo dar permisos de ejecución a setup-ubuntu.sh:", e.message);
  }

  // Ejecutar el script setup-ubuntu.sh en segundo plano
  const logFile = path.join(targetDir, 'deploy.log');
  const logStream = await fs.open(logFile, 'w');

  const { spawn } = await import('child_process');
  
  // Ejecutar en bash, pasar variables de entorno
  const subprocess = spawn('bash', ['setup-ubuntu.sh'], {
    cwd: targetDir,
    detached: true,
    stdio: ['ignore', logStream.fd, logStream.fd],
    env: {
      ...process.env,
      PATH: `${process.env.PATH}:${process.env.HOME || '/home/srvdes'}/.npm-global/bin:${process.env.HOME || '/home/srvdes'}/.go/bin:${process.env.HOME || '/home/srvdes'}/.bun/bin:${process.env.HOME || '/home/srvdes'}/.opencode/bin`
    }
  });

  // Desasociar el subproceso para que siga corriendo independientemente
  subprocess.unref();
  logStream.close();

  res.json({
    ok: true,
    message: 'Despliegue e instalación iniciados con éxito en segundo plano',
    targetDir,
    logFile,
  });
}));

/**
 * GET /api/projects/:id/deploy/status — Obtener el estado y los logs del último despliegue
 */
app.get('/api/projects/:id/deploy/status', asyncHandler(async (req, res) => {
  const proyecto = await leerJSON(path.join(DIRS.projects, `${req.params.id}.json`));
  if (!proyecto) {
    return res.status(404).json({ ok: false, error: `Proyecto '${req.params.id}' no encontrado` });
  }

  const nombreCarpeta = `proyecto-${proyecto.name.replace(/\s+/g, '-').toLowerCase()}`;
  const targetDir = path.join(__dirname, nombreCarpeta);
  const logFile = path.join(targetDir, 'deploy.log');

  let logs = '';
  try {
    logs = await fs.readFile(logFile, 'utf-8');
  } catch (e) {
    logs = 'No hay logs de despliegue disponibles todavía.';
  }

  const terminado = logs.includes('Setup completo!') || logs.includes('Error') || logs.includes('❌');

  res.json({
    ok: true,
    targetDir,
    logs,
    completed: terminado
  });
}));

/**
 * POST /api/projects/:id/update — Actualizar configuración de un proyecto sin reinstalar dependencias
 */
app.post('/api/projects/:id/update', asyncHandler(async (req, res) => {
  const proyecto = await leerJSON(path.join(DIRS.projects, `${req.params.id}.json`));

  if (!proyecto) {
    return res.status(404).json({ ok: false, error: `Proyecto '${req.params.id}' no encontrado` });
  }
  const pushRes = await pushUpdateToDeployAndOpenCode(proyecto);
  if (!pushRes.ok) {
    return res.status(500).json({ ok: false, error: pushRes.error });
  }

  res.json({
    ok: true,
    message: 'Archivos de configuración actualizados con éxito',
    targetDir: pushRes.targetDir,
    archivos: pushRes.archivos,
    keysInyectadas: pushRes.keysInyectadas
  });
}));

// ═══════════════════════════════════════════════════════════════
// RUTAS: DATOS (/api/providers, /api/models, /api/agents, /api/templates)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/providers — Catálogo de proveedores
 */
app.get('/api/providers', asyncHandler(async (req, res) => {
  const datos = await cargarCatalogo('providers-catalog');
  res.json({ ok: true, providers: datos });
}));

/**
 * POST /api/providers/custom — Añadir proveedor personalizado
 */
app.post('/api/providers/custom', asyncHandler(async (req, res) => {
  const { name, endpoint, models } = req.body;
  if (!name || !endpoint) {
    return res.status(400).json({ ok: false, error: 'Faltan campos requeridos (name, endpoint)' });
  }

  const providerId = `custom-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const envKey = `${providerId.toUpperCase().replace(/-/g, '_')}_{N}_API_KEY`;

  const providersPath = path.join(DIRS.data, 'providers-catalog.json');
  const providersData = await leerJSON(providersPath);
  if (!providersData || !providersData.providers) {
    return res.status(500).json({ ok: false, error: 'Error cargando catálogo de proveedores' });
  }

  if (providersData.providers.find(p => p.id === providerId)) {
    return res.status(400).json({ ok: false, error: 'El proveedor ya existe' });
  }

  const newModels = (models || '').split(',').map(m => m.trim()).filter(m => m);

  providersData.providers.push({
    id: providerId,
    name: name,
    description: "Proveedor personalizado añadido manualmente",
    type: "api",
    endpoint: endpoint,
    testEndpoint: `${endpoint}/models`,
    auth: {
      method: "env_variable",
      env_key_pattern: envKey,
      auth_type: "bearer_token"
    },
    multi_account: true,
    max_accounts: 5,
    supported_models: newModels,
    custom: true
  });

  await escribirJSON(providersPath, providersData);

  const modelsPath = path.join(DIRS.data, 'models-catalog.json');
  const modelsData = await leerJSON(modelsPath);
  if (modelsData && modelsData.models) {
    for (const modelName of newModels) {
      const modelExists = modelsData.models.find(m => m.id === modelName);
      if (modelExists) {
        if (!modelExists.available_sources.includes(providerId)) {
          modelExists.available_sources.push(providerId);
        }
      } else {
        modelsData.models.push({
          id: modelName,
          name: modelName,
          provider_origin: providerId,
          tier: 2,
          available_sources: [providerId],
          context_window: 32768,
          custom: true
        });
      }
    }
    await escribirJSON(modelsPath, modelsData);
  }

  res.status(201).json({ ok: true, provider: providerId });
}));

/**
 * GET /api/models — Catálogo de modelos
 */
app.get('/api/models', asyncHandler(async (req, res) => {
  const datos = await cargarCatalogo('models-catalog');
  res.json({ ok: true, models: datos });
}));

/**
 * POST /api/models/sync-free — Detectar modelos gratuitos
 */
app.post('/api/models/sync-free', asyncHandler(async (req, res) => {
  const modelsPath = path.join(DIRS.data, 'models-catalog.json');
  const modelsData = await leerJSON(modelsPath);
  if (!modelsData || !modelsData.models) {
    return res.status(500).json({ ok: false, error: 'Catálogo de modelos no disponible' });
  }

  let freeModelIds = [];
  let freeOpenRouterBaseIds = [];

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/models');
    if (orRes.ok) {
      const orData = await orRes.json();
      const orFree = orData.data.filter(m => m.pricing.prompt === '0' && m.pricing.completion === '0');
      freeModelIds = freeModelIds.concat(orFree.map(m => m.id));
      freeOpenRouterBaseIds = orFree.map(m => m.id.replace(':free', ''));
    }
  } catch (e) {
    console.error('Error fetching OpenRouter models:', e);
  }

  try {
    const nvRes = await fetch('https://integrate.api.nvidia.com/v1/models');
    if (nvRes.ok) {
      const nvData = await nvRes.json();
      freeModelIds = freeModelIds.concat(nvData.data.map(m => m.id));
    }
  } catch (e) {
    console.error('Error fetching NVIDIA models:', e);
  }

  let totalFreeModels = 0;
  modelsData.models = modelsData.models.map(m => {
    const isNvidia = m.provider_origin === 'nvidia' || (m.available_sources && m.available_sources.includes('nvidia'));
    const isLocalFree = m.pricing && m.pricing.input_per_million === 0 && m.pricing.output_per_million === 0;
    
    const isOpenRouterFree = freeModelIds.includes(m.openrouter_id) || freeOpenRouterBaseIds.includes(m.openrouter_id);

    const isActuallyFree = freeModelIds.includes(m.id) || isOpenRouterFree || isNvidia || isLocalFree;
    
    m.is_free = !!isActuallyFree;
    if (m.is_free) {
      totalFreeModels++;
    }
    return m;
  });

  await escribirJSON(modelsPath, modelsData);
  res.json({ ok: true, message: `Sincronización completada. Se detectaron ${totalFreeModels} modelos gratuitos reales (basado en OpenRouter, NVIDIA y catálogo) y se marcaron con la etiqueta.` });
}));

/**
 * GET /api/agents — Catálogo de agentes
 */
app.get('/api/agents', asyncHandler(async (req, res) => {
  const datos = await cargarCatalogo('agents-catalog');
  res.json({ ok: true, agents: datos });
}));

/**
 * GET /api/templates — Listar plantillas disponibles
 */
app.get('/api/templates', asyncHandler(async (req, res) => {
  await asegurarDirectorio(DIRS.templates);
  const archivos = await fs.readdir(DIRS.templates);
  const plantillas = [];

  for (const archivo of archivos) {
    if (!archivo.endsWith('.json')) continue;
    const datos = await leerJSON(path.join(DIRS.templates, archivo));
    if (datos) {
      plantillas.push({
        filename: archivo,
        name: datos.name || archivo,
        description: datos.description || '',
        providers: datos.providers || [],
      });
    }
  }

  res.json({ ok: true, count: plantillas.length, templates: plantillas });
}));

/**
 * GET /api/templates/:name — Obtener una plantilla específica
 */
app.get('/api/templates/:name', asyncHandler(async (req, res) => {
  // Asegurar extensión .json
  const nombre = req.params.name.endsWith('.json') ? req.params.name : `${req.params.name}.json`;
  const datos = await leerJSON(path.join(DIRS.templates, nombre));

  if (!datos) {
    return res.status(404).json({ ok: false, error: `Plantilla '${nombre}' no encontrada` });
  }

  res.json({ ok: true, template: datos });
}));

/**
 * POST /api/templates — Crear o guardar una plantilla
 */
app.post('/api/templates', asyncHandler(async (req, res) => {
  await asegurarDirectorio(DIRS.templates);
  const { name, description, providers, accounts, agents, runtime_fallback, background_task } = req.body;
  
  if (!name) {
    return res.status(400).json({ ok: false, error: 'Se requiere el nombre de la plantilla' });
  }
  
  const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
  const templateData = {
    name,
    description: description || '',
    providers: providers || [],
    accounts: accounts || {},
    agents: agents || {},
    runtime_fallback: runtime_fallback || {
      enabled: true,
      retry_on_errors: [400, 429, 503, 529],
      max_fallback_attempts: 3,
      cooldown_seconds: 60,
      timeout_seconds: 30,
      notify_on_fallback: true
    },
    background_task: background_task || {
      defaultConcurrency: 5,
      staleTimeoutMs: 180000
    }
  };
  
  await escribirJSON(path.join(DIRS.templates, filename), templateData);

  // Sincronizar cambios a los proyectos existentes que usan esta plantilla
  try {
    const archivosProyectos = await fs.readdir(DIRS.projects);
    let proyectosActualizados = 0;
    
    for (const archivo of archivosProyectos) {
      if (!archivo.endsWith('.json')) continue;
      const rutaProyecto = path.join(DIRS.projects, archivo);
      const proyecto = await leerJSON(rutaProyecto);
      
      // Si el proyecto usa esta plantilla, sincronizamos sus configuraciones
      if (proyecto && proyecto.template === name) {
        proyecto.providers = providers || [];
        proyecto.accounts = accounts || {};
        proyecto.agents = agents || {};
        // Opcionalmente actualizar runtime_fallback y background_task si no se personalizaron
        proyecto.runtime_fallback = templateData.runtime_fallback;
        proyecto.background_task = templateData.background_task;
        proyecto.updatedAt = new Date().toISOString();
        
        await escribirJSON(rutaProyecto, proyecto);
        proyectosActualizados++;

        // Regenerar archivos y hacer auto-push global a Oh My OpenCode de inmediato
        try {
          await pushUpdateToDeployAndOpenCode(proyecto);
          console.log(`  ♻️  Configs inyectadas globalmente para proyecto '${proyecto.name}'`);
        } catch (genErr) {
          console.error(`  ⚠️  Error regenerando configs para '${proyecto.name}':`, genErr.message);
        }
      }
    }
    console.log(`✅ Plantilla '${name}' guardada. Se actualizaron ${proyectosActualizados} proyectos asociados.`);
  } catch (error) {
    console.error(`⚠️ Error al sincronizar proyectos con la plantilla '${name}':`, error);
  }

  res.status(201).json({ ok: true, template: templateData, filename });
}));

/**
 * DELETE /api/templates/:filename — Eliminar una plantilla
 */
app.delete('/api/templates/:filename', asyncHandler(async (req, res) => {
  let filename = req.params.filename;
  if (!filename.endsWith('.json')) {
    filename += '.json';
  }
  
  const rutaPlantilla = path.join(DIRS.templates, filename);
  try {
    await fs.access(rutaPlantilla);
  } catch {
    return res.status(404).json({ ok: false, error: `Plantilla '${filename}' no encontrada` });
  }
  
  await fs.unlink(rutaPlantilla);
  res.json({ ok: true, message: `Plantilla '${filename}' eliminada correctamente` });
}));

// ═══════════════════════════════════════════════════════════════
// RUTAS: CUENTAS (/api/accounts)
// ═══════════════════════════════════════════════════════════════

/**
 * Archivo de configuración de cuentas
 * Las cuentas se almacenan en src/data/accounts.json
 */
const ACCOUNTS_FILE = path.join(DIRS.data, 'accounts.json');

/**
 * Lee las cuentas desde el archivo de configuración
 * @returns {Promise<Array>}
 */
async function leerCuentas() {
  await asegurarDirectorio(DIRS.data);
  const datos = await leerJSON(ACCOUNTS_FILE);
  return datos || [];
}

/**
 * GET /api/accounts — Listar todas las cuentas
 */
app.get('/api/accounts', asyncHandler(async (req, res) => {
  const cuentas = await leerCuentas();
  res.json({ ok: true, count: cuentas.length, accounts: cuentas });
}));

/**
 * Guarda una variable de entorno en el archivo .env del servidor y en memoria
 */
async function guardarVariableEntorno(envKey, valor) {
  const rutaEnv = path.join(__dirname, '.env');
  let contenido = '';
  try {
    contenido = await fs.readFile(rutaEnv, 'utf-8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const lineas = contenido.split('\n');
  let encontrada = false;
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i].trim();
    if (l.startsWith(`${envKey}=`)) {
      lineas[i] = `${envKey}=${valor}`;
      encontrada = true;
      break;
    }
  }

  if (!encontrada) {
    lineas.push(`${envKey}=${valor}`);
  }

  await fs.writeFile(rutaEnv, lineas.join('\n'), 'utf-8');
  process.env[envKey] = valor;
}

/**
 * POST /api/accounts — Agregar una nueva cuenta
 * Body: { provider, label, envKey?, apiKey?, config? }
 */
app.post('/api/accounts', asyncHandler(async (req, res) => {
  const cuentas = await leerCuentas();
  const { provider, label, envKey, apiKey, config } = req.body;

  if (envKey && apiKey) {
    await guardarVariableEntorno(envKey, apiKey);
  }

  const nueva = {
    id: uuidv4(),
    provider: provider || 'unknown',
    label: label || 'Cuenta nueva',
    envKey: envKey || null,
    config: config || {},
    active: req.body.active ?? true,
    createdAt: new Date().toISOString(),
  };

  cuentas.push(nueva);
  await escribirJSON(ACCOUNTS_FILE, cuentas);

  res.status(201).json({ ok: true, account: nueva });
}));

/**
 * PUT /api/accounts/:id — Actualizar una cuenta
 */
app.put('/api/accounts/:id', asyncHandler(async (req, res) => {
  const cuentas = await leerCuentas();
  const indice = cuentas.findIndex(c => c.id === req.params.id);

  if (indice === -1) {
    return res.status(404).json({ ok: false, error: `Cuenta '${req.params.id}' no encontrada` });
  }

  // Actualizar campos (preservar id y createdAt)
  cuentas[indice] = {
    ...cuentas[indice],
    ...req.body,
    id: cuentas[indice].id,
    createdAt: cuentas[indice].createdAt,
    updatedAt: new Date().toISOString(),
  };

  await escribirJSON(ACCOUNTS_FILE, cuentas);
  res.json({ ok: true, account: cuentas[indice] });
}));

/**
 * DELETE /api/accounts/:id — Eliminar una cuenta
 */
app.delete('/api/accounts/:id', asyncHandler(async (req, res) => {
  let cuentas = await leerCuentas();
  const existe = cuentas.some(c => c.id === req.params.id);

  if (!existe) {
    return res.status(404).json({ ok: false, error: `Cuenta '${req.params.id}' no encontrada` });
  }

  cuentas = cuentas.filter(c => c.id !== req.params.id);
  await escribirJSON(ACCOUNTS_FILE, cuentas);

  res.json({ ok: true, message: `Cuenta '${req.params.id}' eliminada` });
}));

/**
 * POST /api/accounts/:id/test — Probar conexión de una cuenta
 * Realiza una petición HTTP al endpoint del proveedor para verificar la API key
 */
app.post('/api/accounts/:id/test', asyncHandler(async (req, res) => {
  const cuentas = await leerCuentas();
  const cuenta = cuentas.find(c => c.id === req.params.id);

  if (!cuenta) {
    return res.status(404).json({ ok: false, error: `Cuenta '${req.params.id}' no encontrada` });
  }

  // Cargar catálogo de proveedores para obtener endpoint de prueba
  const proveedoresCatalog = await cargarCatalogo('providers-catalog');
  const proveedores = proveedoresCatalog.providers || [];
  const proveedor = proveedores.find(p => p.id === cuenta.provider);

  if (!proveedor || !proveedor.testEndpoint) {
    return res.json({
      ok: true,
      status: 'no_test',
      message: `No hay endpoint de prueba configurado para el proveedor '${cuenta.provider}'`,
    });
  }

  // Obtener la API key desde variables de entorno
  const apiKey = cuenta.envKey ? process.env[cuenta.envKey] : null;

  if (!apiKey) {
    return res.json({
      ok: true,
      status: 'no_key',
      message: `Variable de entorno '${cuenta.envKey}' no configurada`,
    });
  }

  // Realizar petición de prueba al proveedor
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let testEndpoint = proveedor.testEndpoint;
    if (cuenta.provider === 'xiaomi') {
      if (apiKey.startsWith('sk-')) {
        testEndpoint = 'https://api.xiaomimimo.com/v1/models';
      } else {
        testEndpoint = 'https://token-plan-sgp.xiaomimimo.com/v1/models';
      }
    }

    const respuesta = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    res.json({
      ok: true,
      status: respuesta.ok ? 'connected' : 'error',
      httpStatus: respuesta.status,
      message: respuesta.ok
        ? `Conexión exitosa a ${cuenta.provider}`
        : `Error HTTP ${respuesta.status} al conectar con ${cuenta.provider}`,
    });
  } catch (error) {
    res.json({
      ok: true,
      status: 'unreachable',
      message: `No se pudo conectar con ${cuenta.provider}: ${error.message}`,
    });
  }
}));

/**
 * PUT /api/accounts/switch — Cambiar la cuenta activa
 * Body: { accountId }
 */
app.put('/api/accounts/switch', asyncHandler(async (req, res) => {
  const { accountId } = req.body;

  if (!accountId) {
    return res.status(400).json({ ok: false, error: 'Se requiere accountId en el body' });
  }

  const cuentas = await leerCuentas();
  const cuenta = cuentas.find(c => c.id === accountId);

  if (!cuenta) {
    return res.status(404).json({ ok: false, error: `Cuenta '${accountId}' no encontrada` });
  }

  // Desactivar todas las cuentas del mismo proveedor, activar la seleccionada
  for (const c of cuentas) {
    if (c.provider === cuenta.provider) {
      c.active = (c.id === accountId);
    }
  }

  await escribirJSON(ACCOUNTS_FILE, cuentas);

  res.json({
    ok: true,
    message: `Cuenta activa cambiada a '${cuenta.label}' para proveedor '${cuenta.provider}'`,
    activeAccount: cuenta,
  });
}));

// ═══════════════════════════════════════════════════════════════
// RUTAS: AYUDA (/api/help)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/help/system-readme — Obtener el README general del sistema
 */
app.get('/api/help/system-readme', asyncHandler(async (req, res) => {
  try {
    const readmePath = path.join(__dirname, 'README.md');
    const content = await fs.readFile(readmePath, 'utf-8');
    res.json({ ok: true, content });
  } catch (err) {
    res.status(500).json({ ok: false, error: `Error leyendo el README general: ${err.message}` });
  }
}));

/**
 * GET /api/help/agents-readme — Obtener el README de agentes (dinámico para un proyecto)
 */
app.get('/api/help/agents-readme', asyncHandler(async (req, res) => {
  try {
    const { projectId } = req.query;
    let content = '';

    if (projectId) {
      const proyecto = await leerJSON(path.join(DIRS.projects, `${projectId}.json`));
      if (proyecto) {
        const readmeGen = await import('./src/generators/readme-generator.js');
        content = await readmeGen.generate(proyecto);
      }
    }

    // Fallback si no hay proyecto o no se pudo generar
    if (!content) {
      const proyectos = await fs.readdir(DIRS.projects);
      for (const p of proyectos) {
        if (p.endsWith('.json')) {
          const proyecto = await leerJSON(path.join(DIRS.projects, p));
          if (proyecto) {
            const readmeGen = await import('./src/generators/readme-generator.js');
            content = await readmeGen.generate(proyecto);
            break;
          }
        }
      }
    }

    if (!content) {
      content = `# 🤖 Guía de Agentes\n\nNo hay proyectos creados aún. Crea un proyecto nuevo para ver la lista detallada y configuración de tus agentes.`;
    }

    res.json({ ok: true, content });
  } catch (err) {
    res.status(500).json({ ok: false, error: `Error generando/leyendo el README de agentes: ${err.message}` });
  }
}));

// ═══════════════════════════════════════════════════════════════
// RUTAS: AGENTES PERSONALIZADOS (/api/custom-agents)
// ═══════════════════════════════════════════════════════════════

/**
 * Archivo de agentes personalizados
 */
const CUSTOM_AGENTS_FILE = path.join(DIRS.data, 'custom-agents.json');

/**
 * Lee los agentes personalizados
 * @returns {Promise<Array>}
 */
async function leerAgentesPersonalizados() {
  await asegurarDirectorio(DIRS.data);
  const datos = await leerJSON(CUSTOM_AGENTS_FILE);
  return datos || [];
}

/**
 * GET /api/custom-agents — Listar agentes personalizados
 */
app.get('/api/custom-agents', asyncHandler(async (req, res) => {
  const agentes = await leerAgentesPersonalizados();
  res.json({ ok: true, count: agentes.length, customAgents: agentes });
}));

/**
 * POST /api/custom-agents — Crear un agente personalizado
 * Body: { name, role, model, source, systemPrompt?, fallbacks?, tools? }
 */
app.post('/api/custom-agents', asyncHandler(async (req, res) => {
  const agentes = await leerAgentesPersonalizados();

  const nuevo = {
    id: uuidv4(),
    name: req.body.name || 'agente-nuevo',
    role: req.body.role || 'general',
    model: req.body.model || 'deepseek-v4-flash',
    source: req.body.source || 'opencode-go-1',
    systemPrompt: req.body.systemPrompt || '',
    fallbacks: req.body.fallbacks || [],
    tools: req.body.tools || [],
    createdAt: new Date().toISOString(),
  };

  agentes.push(nuevo);
  await escribirJSON(CUSTOM_AGENTS_FILE, agentes);

  res.status(201).json({ ok: true, customAgent: nuevo });
}));

/**
 * PUT /api/custom-agents/:id — Actualizar un agente personalizado
 */
app.put('/api/custom-agents/:id', asyncHandler(async (req, res) => {
  const agentes = await leerAgentesPersonalizados();
  const indice = agentes.findIndex(a => a.id === req.params.id);

  if (indice === -1) {
    return res.status(404).json({ ok: false, error: `Agente personalizado '${req.params.id}' no encontrado` });
  }

  agentes[indice] = {
    ...agentes[indice],
    ...req.body,
    id: agentes[indice].id,
    createdAt: agentes[indice].createdAt,
    updatedAt: new Date().toISOString(),
  };

  await escribirJSON(CUSTOM_AGENTS_FILE, agentes);
  res.json({ ok: true, customAgent: agentes[indice] });
}));

/**
 * DELETE /api/custom-agents/:id — Eliminar un agente personalizado
 */
app.delete('/api/custom-agents/:id', asyncHandler(async (req, res) => {
  let agentes = await leerAgentesPersonalizados();
  const existe = agentes.some(a => a.id === req.params.id);

  if (!existe) {
    return res.status(404).json({ ok: false, error: `Agente personalizado '${req.params.id}' no encontrado` });
  }

  agentes = agentes.filter(a => a.id !== req.params.id);
  await escribirJSON(CUSTOM_AGENTS_FILE, agentes);

  res.json({ ok: true, message: `Agente personalizado '${req.params.id}' eliminado` });
}));

// ═══════════════════════════════════════════════════════════════
// RESPALDO Y RESTAURACIÓN
// ═══════════════════════════════════════════════════════════════

app.get('/api/backup/export', asyncHandler(async (req, res) => {
  const zipName = `respaldo-orquestador-${Date.now()}.zip`;
  res.attachment(zipName);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { throw err; });
  archive.pipe(res);

  const accountsPath = path.join(DIRS.data, 'accounts.json');
  try {
    await fs.access(accountsPath);
    archive.file(accountsPath, { name: 'accounts.json' });
  } catch (e) { /* ignorar */ }

  const envPath = path.join(__dirname, '.env');
  try {
    await fs.access(envPath);
    archive.file(envPath, { name: '.env' });
  } catch (e) { /* ignorar */ }

  try {
    await fs.access(DIRS.templates);
    archive.directory(DIRS.templates, 'templates');
  } catch (e) { /* ignorar */ }

  await archive.finalize();
}));

const upload = multer({ dest: path.join(__dirname, 'temp_uploads') });

app.post('/api/backup/import', upload.single('backup'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const zipPath = req.file.path;
  const extractDir = path.join(__dirname, `temp_extract_${Date.now()}`);

  try {
    await fs.mkdir(extractDir, { recursive: true });
    
    await new Promise((resolve, reject) => {
      createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .on('close', resolve)
        .on('error', reject);
    });

    const files = await fs.readdir(extractDir);
    for (const file of files) {
      const srcPath = path.join(extractDir, file);
      if (file === 'accounts.json') {
        await asegurarDirectorio(DIRS.data);
        await fs.copyFile(srcPath, path.join(DIRS.data, 'accounts.json'));
      } else if (file === '.env') {
        await fs.copyFile(srcPath, path.join(__dirname, '.env'));
      } else if (file === 'templates') {
        const templatesFiles = await fs.readdir(srcPath);
        await asegurarDirectorio(DIRS.templates);
        for (const tFile of templatesFiles) {
          await fs.copyFile(path.join(srcPath, tFile), path.join(DIRS.templates, tFile));
        }
      }
    }

    await fs.rm(extractDir, { recursive: true, force: true });
    await fs.rm(zipPath, { force: true });

    res.json({ ok: true, message: 'Respaldo importado y restaurado correctamente.' });
    
    // Intentar reiniciar PM2 en segundo plano
    import('child_process').then(({ exec }) => {
      exec('npx pm2 restart orquestador --update-env', { cwd: __dirname });
    }).catch(() => {});

  } catch (error) {
    await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(zipPath, { force: true }).catch(() => {});
    throw error;
  }
}));

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE DE ERRORES GLOBAL
// ═══════════════════════════════════════════════════════════════

/**
 * Manejador global de errores — devuelve JSON en lugar de HTML
 */
app.use((err, req, res, _next) => {
  console.error('❌ Error no manejado:', err.message);
  console.error(err.stack);

  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ═══════════════════════════════════════════════════════════════
// PROXY DE APIS Y REGISTRO DE CONSUMOS (Métricas y Gastos)
// ═══════════════════════════════════════════════════════════════

/**
 * Resuelve las credenciales y URL real de una cuenta específica
 */
async function getAccountRealConfig(accountId) {
  // Manejo especial para Cavoti (separa claves GPT y Claude basándose en el sufijo del ID de cuenta de OpenCode)
  if (accountId.startsWith('cavoti')) {
    const isClaude = accountId.endsWith('-claude');
    const apiKey = isClaude ? process.env.CAVOTI_CLAUDE_KEY : process.env.CAVOTI_GPT_KEY;
    return {
      apiKey,
      baseURL: 'https://cavoti.com/v1',
      provider: 'cavoti',
      label: isClaude ? 'Cavoti Claude (Respaldo)' : 'Cavoti GPT (Principal)'
    };
  }

  const accounts = await leerJSON(path.join(DIRS.data, 'accounts.json')) || [];
  
  let acc = null;
  
  // Analizar si accountId es de la forma "proveedor-secuencia" (ej: xiaomi-1, opencode-go-2)
  const lastHyphenIndex = accountId.lastIndexOf('-');
  if (lastHyphenIndex !== -1) {
    const providerId = accountId.substring(0, lastHyphenIndex);
    const seqStr = accountId.substring(lastHyphenIndex + 1);
    const seqNum = parseInt(seqStr, 10);
    
    if (!isNaN(seqNum)) {
      // Filtrar las cuentas activas para este proveedor
      const providerAccounts = accounts.filter(a => a.provider === providerId && a.active !== false);
      const idx = seqNum - 1;
      if (idx >= 0 && idx < providerAccounts.length) {
        acc = providerAccounts[idx];
      }
    }
  }
  
  // Fallback si no coincide con el patrón secuencial, buscar por ID directo (UUID)
  if (!acc) {
    acc = accounts.find(a => a.id === accountId);
  }
  
  if (!acc) return null;
  
  const apiKey = acc.envKey ? process.env[acc.envKey] : null;
  let baseURL = '';
  
  if (acc.provider === 'openrouter') {
    baseURL = 'https://openrouter.ai/api/v1';
  } else if (acc.provider === 'deepseek-api') {
    baseURL = 'https://api.deepseek.com';
  } else if (acc.provider === 'moonshot') {
    baseURL = 'https://api.moonshot.ai/v1';
  } else if (acc.provider === 'xiaomi') {
    if (apiKey && apiKey.startsWith('sk-')) {
      baseURL = 'https://api.xiaomimimo.com/v1';
    } else {
      baseURL = 'https://token-plan-sgp.xiaomimimo.com/v1';
    }
  } else if (acc.provider === 'cavoti') {
    baseURL = 'https://cavoti.com/v1';
  } else if (acc.provider === 'nvidia') {
    baseURL = 'https://integrate.api.nvidia.com/v1';
  } else if (acc.provider === 'opencode-go') {
    baseURL = 'https://opencode.ai/zen/go/v1';
  } else {
    baseURL = 'https://api.openai.com/v1';
  }
  
  return { apiKey, baseURL, provider: acc.provider, label: acc.label };
}

/**
 * Guarda el registro de tokens consumidos calculando el costo financiero
 */
async function logTokenUsage(projectId, provider, accountId, accountLabel, model, promptTokens, completionTokens) {
  const logFile = path.join(DIRS.data, 'token-logs.json');
  await asegurarDirectorio(DIRS.data);
  
  let logs = await leerJSON(logFile);
  if (!logs || !Array.isArray(logs)) {
    logs = [];
  }
  
  let cost = 0;
  try {
    const modelsCatalog = await leerJSON(path.join(DIRS.data, 'models-catalog.json'));
    const models = modelsCatalog?.models || [];
    // Buscar coincidencia de modelo en catálogo
    const modelMeta = models.find(m => m.id === model || m.openrouter_id === model || m.opencode_go_id === model);
    if (modelMeta && modelMeta.pricing) {
      const inputCost = (promptTokens / 1000000) * (modelMeta.pricing.input_per_million || 0);
      const outputCost = (completionTokens / 1000000) * (modelMeta.pricing.output_per_million || 0);
      cost = inputCost + outputCost;
    }
  } catch (e) {
    console.error('Error al calcular costo del modelo:', e.message);
  }
  
  let projectName = projectId;
  try {
    const projectFile = path.join(DIRS.projects, projectId, 'project.json');
    const projData = await leerJSON(projectFile);
    if (projData && projData.name) {
      projectName = projData.name;
    }
  } catch (e) {}

  logs.push({
    timestamp: new Date().toISOString(),
    projectId,
    projectName,
    provider,
    accountId,
    accountLabel,
    model,
    promptTokens,
    completionTokens,
    cost
  });
  
  // Limitar logs a un máximo de 5000 entradas para evitar archivos pesados
  if (logs.length > 5000) {
    logs.shift();
  }
  
  await escribirJSON(logFile, logs);
}

/**
 * Proxy reverso transparente para capturar las peticiones API y contar tokens
 */
app.post('/api/proxy/:projectId/:accountId/chat/completions', asyncHandler(async (req, res) => {
  const { projectId, accountId } = req.params;
  const config = await getAccountRealConfig(accountId);
  
  if (!config) {
    return res.status(404).json({ error: `La cuenta ${accountId} no existe en el sistema` });
  }
  
  const { apiKey, baseURL } = config;
  const targetUrl = `${baseURL}/chat/completions`;
  
  // Filtrar cabeceras para evitar duplicados y conflictos de autorización/contenido
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey !== 'host' && 
        lowerKey !== 'content-length' && 
        lowerKey !== 'authorization' && 
        lowerKey !== 'content-type') {
      headers[key] = value;
    }
  }
  headers['authorization'] = `Bearer ${apiKey}`;
  headers['content-type'] = 'application/json';
  
  const isStream = req.body.stream === true;
  const body = JSON.stringify(req.body);
  
  try {
    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });
    
    res.status(apiRes.status);
    for (const [key, val] of apiRes.headers.entries()) {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        res.setHeader(key, val);
      }
    }
    
    if (isStream) {
      const reader = apiRes.body.getReader();
      const decoder = new TextDecoder();
      
      let fullResponseText = '';
      let detectedUsage = null;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          res.write(value);
          
          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.usage) {
                  detectedUsage = parsed.usage;
                }
                if (parsed.choices?.[0]?.delta?.content) {
                  fullResponseText += parsed.choices[0].delta.content;
                }
              } catch (e) {
                // Fragmentos de JSON incompletos en el stream
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      res.end();
      
      // Registrar log de stream asíncronamente
      try {
        const modelName = req.body.model;
        let promptTokens = 0;
        let completionTokens = 0;
        
        if (detectedUsage) {
          promptTokens = detectedUsage.prompt_tokens;
          completionTokens = detectedUsage.completion_tokens;
        } else {
          // Estimación robusta (1 token ~= 4 caracteres aprox)
          const inputPrompt = req.body.messages?.map(m => m.content || '').join('\n') || '';
          promptTokens = Math.ceil(inputPrompt.length / 4);
          completionTokens = Math.ceil(fullResponseText.length / 4);
        }
        
        await logTokenUsage(projectId, config.provider, accountId, config.label, modelName, promptTokens, completionTokens);
      } catch (err) {
        console.error('Error al registrar logs en streaming proxy:', err);
      }
      
    } else {
      const json = await apiRes.json();
      res.json(json);
      
      // Registrar log JSON asíncronamente
      try {
        const modelName = req.body.model;
        const promptTokens = json.usage?.prompt_tokens || 0;
        const completionTokens = json.usage?.completion_tokens || 0;
        await logTokenUsage(projectId, config.provider, accountId, config.label, modelName, promptTokens, completionTokens);
      } catch (err) {
        console.error('Error al registrar logs en JSON proxy:', err);
      }
    }
  } catch (error) {
    console.error('Fallo en petición al proxy reverso:', error);
    res.status(500).json({ error: `Fallo en el proxy del Orquestador: ${error.message}` });
  }
}));

/**
 * GET /api/stats/token-logs — Obtener todos los consumos
 */
app.get('/api/stats/token-logs', asyncHandler(async (req, res) => {
  const logFile = path.join(DIRS.data, 'token-logs.json');
  const logs = await leerJSON(logFile) || [];
  res.json({ ok: true, logs });
}));



/**
 * Ruta catch-all para 404 en la API
 */
app.use('/api', (req, res) => {
  res.status(404).json({
    ok: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ═══════════════════════════════════════════════════════════════
// INICIO DEL SERVIDOR
// ═══════════════════════════════════════════════════════════════

/**
 * Inicializa directorios necesarios y arranca el servidor
 */
async function iniciarServidor() {
  // Crear directorios necesarios si no existen
  await Promise.all([
    asegurarDirectorio(DIRS.projects),
    asegurarDirectorio(DIRS.templates),
    asegurarDirectorio(DIRS.data),
    asegurarDirectorio(DIRS.public),
  ]);

  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  🎯 ORQUESTADOR VIBECODING — Servidor API');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  📡 Puerto:    http://localhost:${PORT}`);
    console.log(`  📂 Público:   ${DIRS.public}`);
    console.log(`  📁 Proyectos: ${DIRS.projects}`);
    console.log('');
    console.log('  📋 Rutas disponibles:');
    console.log('  ─────────────────────────────────────────────────────');
    console.log('  PROYECTOS:');
    console.log('    GET    /api/projects');
    console.log('    GET    /api/projects/:id');
    console.log('    POST   /api/projects');
    console.log('    PUT    /api/projects/:id');
    console.log('    DELETE /api/projects/:id');
    console.log('    POST   /api/projects/:id/generate');
    console.log('    GET    /api/projects/:id/export');
    console.log('');
    console.log('  DATOS:');
    console.log('    GET    /api/providers');
    console.log('    GET    /api/models');
    console.log('    GET    /api/agents');
    console.log('    GET    /api/templates');
    console.log('    GET    /api/templates/:name');
    console.log('');
    console.log('  CUENTAS:');
    console.log('    GET    /api/accounts');
    console.log('    POST   /api/accounts');
    console.log('    PUT    /api/accounts/:id');
    console.log('    DELETE /api/accounts/:id');
    console.log('    POST   /api/accounts/:id/test');
    console.log('    PUT    /api/accounts/switch');
    console.log('');
    console.log('  AYUDA:');
    console.log('    GET    /api/help/system-readme');
    console.log('    GET    /api/help/agents-readme?projectId=<uuid>');
    console.log('');
    console.log('  AGENTES PERSONALIZADOS:');
    console.log('    GET    /api/custom-agents');
    console.log('    POST   /api/custom-agents');
    console.log('    PUT    /api/custom-agents/:id');
    console.log('    DELETE /api/custom-agents/:id');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  });
}

// Arrancar el servidor
iniciarServidor().catch((error) => {
  console.error('💥 Error fatal al iniciar el servidor:', error);
  process.exit(1);
});

export default app;
// Touch to restart watch
