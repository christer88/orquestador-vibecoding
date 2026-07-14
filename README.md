# 🚀 Orquestador VibeCoding

![Orquestador VibeCoding Dashboard](assets/dashboard.png)
Este orquestador es una aplicación local con interfaz web (SPA) diseñada para configurar, gestionar y desplegar entornos de desarrollo de IA coding multi-proveedor basados en **Oh My OpenAgent + OpenCode GO**, con soporte para múltiples fuentes de modelos y portabilidad total.

Genera automáticamente archivos de ruteo (`oh-my-openagent.json`), configuración de proveedores (`opencode.json`), variables de entorno (`.env`), scripts de despliegue automatizados y documentación de referencia.

---

## ✨ Características Principales

*   **Multi-Proveedor & Multi-Cuenta**: Configura múltiples proveedores (OpenCode Go, OpenRouter, Xiaomi MiMo, CommandCode, DeepSeek API, etc.) y múltiples cuentas/suscripciones por proveedor (ej. `opencode-go-1`, `opencode-go-2`) para duplicar o triplicar tus límites (Rate Limits).
*   **Proxy Reverso & Conteo de Tokens**: Todas las llamadas de los agentes se enrutan automáticamente a través de un proxy local transparente. Soporta lectura y parseo de eventos de **streaming (SSE)** para llevar un conteo exacto de tokens de entrada (prompt) y salida (completions).
*   **Gestor de Gastos y Costos Financieros**: Calcula automáticamente el costo monetario en USD de cada llamada de IA basándose en las tarifas del catálogo de modelos.
*   **Dashboard Visual Premium**: Panel interactivo ("Métricas y Gastos") con gráficos estadísticos (Chart.js) que desglosa el consumo acumulado de tokens por modelo y el gasto por cuenta de proveedor utilizada (ej. diferenciando entre *Xiaomi Token Plan* y *Xiaomi API Credits*).
*   **Gestor de Cuentas con Test Inteligente**: Administra visualmente tus claves. El botón de probar conexión conmuta dinámicamente el endpoint para validar llaves de subscripción (`tp-xxx`) o saldo por consumo (`sk-xxx`) sin falsos negativos.
*   **Motor de Fallbacks Avanzado**: Ruteo inteligente y conmutación automática entre cuentas del mismo proveedor y entre proveedores de respaldo (ej. `opencode-go-1` ➡️ `opencode-go-2` ➡️ `openrouter`).
*   **Módulo de Ayuda y Documentación Integrada**: Accede directamente desde la interfaz web a los manuales del sistema y las guías descriptivas de agentes generadas para cada uno de tus proyectos, con enlaces rápidos al repositorio de GitHub.
*   **Catálogo de Agentes OmO**: Configura los 11 agentes de Oh My OpenAgent sugiriendo modelos y tiers óptimos para cada tarea (razonamiento, utilidades, orquestación, etc.).
*   **Integración con Ollama Cloud**: Soporte nativo para Ollama Cloud con gestión de llaves, proxy transparente y selección directa de modelos como Qwen 3 Coder, Kimi K2.7, y DeepSeek V4 Flash.
*   **Skills Avanzados (VibeCoding)**: Integración con utilidades como UI/UX Pro Max, Ponytail, Codebase-Memory, Engram y Spec-Kit configurables desde el Wizard de proyectos, con detección proactiva de conflictos (ej. combinar agentes minimalistas con diseñadores ricos).
*   **Gestión de Backups Segura**: Opción de exportar e importar copias de seguridad en `.zip` que empaquetan localmente tus perfiles (`accounts.json`), variables de entorno (`.env`) y todas tus plantillas personalizadas para migrar o respaldar sin comprometer la seguridad.

---

## 🛠️ Tecnologías Utilizadas

El proyecto está construido con un enfoque premium, sin dependencias pesadas innecesarias y maximizando el rendimiento local:

1.  **Frontend (SPA)**:
    *   **Core**: HTML5 semántico y Vanilla JavaScript estructurado en componentes modulares reusables.
    *   **Estilo**: Vanilla CSS estructurado con variables globales CSS, glassmorphism, filtros de desenfoque y micro-animaciones premium con curvas bezier dinámicas.
    *   **Ruteo**: Enrutador nativo basado en `hashchange` para una experiencia SPA (Single Page Application) instantánea.
    *   **Formatos**: Renderizador personalizado de Markdown integrado nativamente para visualización fluida de guías de ayuda.
2.  **Backend (API Server)**:
    *   **Runtime**: Node.js (v20+).
    *   **Framework**: Express.js para la API REST local.
    *   **Utilidades**: `archiver` para la exportación de proyectos en formato ZIP, `dotenv` para gestión de configuraciones y `uuid` para identificadores únicos.

---

## 📖 Índice
1. [Instalar el Orquestador en tu VM (Linux)](#1-instalar-el-orquestador-en-tu-vm-linux)
2. [Cómo utilizar la Interfaz Web](#2-cómo-utilizar-la-interfaz-web)
3. [Flujo de Trabajo (VibeCoding)](#3-flujo-de-trabajo-vibecoding)
4. [Actualizar el Orquestador](#4-actualizar-el-orquestador)
5. [Solución de Problemas (Troubleshooting)](#5-solución-de-problemas-troubleshooting)

---

## 1. Instalar el Orquestador en tu VM (Linux)

Cuando levantes una nueva Máquina Virtual (Ubuntu o Debian), sigue estos pasos para instalar y ejecutar el Orquestador:

### Paso A: Clonar el Repositorio
Ingresa a tu máquina virtual por SSH y clona tu repositorio:
```bash
# Actualiza los repositorios de Linux e instala git/curl si no están disponibles
sudo apt update && sudo apt install -y git curl

# Clona tu proyecto (te pedirá tu token de GitHub ghp_... si es privado)
git clone https://github.com/christer88/orquestador-vibecoding.git
cd orquestador-vibecoding
```

### Paso B: Instalar Node.js
El Orquestador necesita Node.js versión 20+. Si tu Linux no lo tiene instalado, puedes instalarlo con:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs
```

### Paso C: Arrancar el Servidor (Modo Producción con PM2)
Instala las dependencias y utiliza PM2 para que el servidor corra en segundo plano permanentemente, incluso si cierras la consola SSH.

```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Instalar PM2 globalmente (si no lo tienes)
sudo npm install -g pm2

# 3. Levantar el servidor sin modo "watch" (para evitar reinicios bruscos al guardar)
npx pm2 start server.js --name orquestador

# 4. Guardar la lista de procesos para que arranquen solos al reiniciar la VM
npx pm2 save
npx pm2 startup
```

Verás en la consola que el servidor está escuchando en el puerto `3847`. Si estás en una VM remota y quieres acceder a la interfaz web desde tu computadora, asegúrate de habilitar el puerto `3847` en el firewall de tu proveedor de nube (AWS, DigitalOcean, etc.) o usa un túnel SSH.

Para ver los logs en cualquier momento o reiniciar el sistema:
```bash
# Ver los logs en vivo
npx pm2 logs orquestador

# Reiniciar el sistema para aplicar nuevas variables de entorno
npx pm2 restart orquestador --update-env
```
---

## 2. Cómo utilizar la Interfaz Web

Una vez que el servidor esté corriendo, abre tu navegador y visita `http://localhost:3847`.

### 🛠️ Paso a Paso para Generar Configuraciones:
1.  **Gestor de Cuentas**: Haz clic en **Cuentas y Claves** en la barra lateral. Agrega tus API Keys para los proveedores que desees usar y prueba la conexión. Estas llaves se guardarán de manera local y segura en `src/data/accounts.json` (excluido en Git).
2.  **Dashboard Inicial**: Verás la lista de tus proyectos y plantillas predefinidas. Haz clic en **"✨ Nuevo Proyecto"**.
3.  **Wizard de Configuración**:
    *   Asigna un nombre a tu proyecto.
    *   Selecciona las fuentes/cuentas activas y asigna qué modelo y proveedor ejecutará cada uno de los 11 agentes de Oh My OpenAgent.
    *   Configura la cadena de fallbacks (orden de respaldo si una cuenta o proveedor falla).
4.  **Desplegar Proyecto**: Con el botón **"🚀 Desplegar"** puedes instalar y configurar el proyecto directamente en una carpeta local de la máquina virtual (crea la carpeta, inyecta credenciales y ejecuta el script de instalación en segundo plano).
5.  **Actualizar Configuración**: Con el botón **"🔄 Actualizar"** puedes aplicar de forma inmediata y silenciosa cualquier cambio de configuración (ej. cambio de modelo, proveedor o permisos de `hashline_edit` para que los agentes delegados apliquen cambios) directamente a la carpeta de tu proyecto sin necesidad de reinstalar dependencias.
6.  **Generar & Descargar**: En la tarjeta de tu proyecto también puedes presionar **"📦 Descargar ZIP"** si prefieres llevarte los archivos a otra máquina.
7.  **Módulo de Ayuda**: Visita la sección **Ayuda** en la barra lateral para revisar el manual de usuario o consultar el `AGENTS-README.md` generado en tiempo real de cualquiera de tus proyectos activos.
8.  **Exportar Backup Global**: Haz clic en el botón superior de "Descargar Respaldo" para crear un ZIP que contiene todas tus cuentas locales, tokens y plantillas maestras.

### ¿Qué contiene el archivo ZIP del proyecto?
*   `oh-my-openagent.json`: Reglas de ruteo y conmutación de agentes.
*   `opencode.json`: Declaración de proveedores, configurando `baseURL` y la compatibilidad con endpoints custom (ej. `opencode-go` ruteado a `https://opencode.ai/zen/go/v1`).
*   `.env`: Declaración de las API Keys y variables del entorno del proyecto.
*   `setup-ubuntu.sh`: Script auto-ejecutable que configura la VM destino instalando dependencias (Go, Bun), herramientas de VibeCoding (`opencode`, `oh-my-opencode`), inicializa archivos de configuración y copia las variables de entorno.
*   `AGENTS-README.md`: Guía que detalla el rol, el tier recomendado y el modelo asignado de cada agente.

---

## 3. Flujo de Trabajo (VibeCoding)

Para desplegar la configuración en la carpeta de trabajo de tu nuevo entorno:
1.  Extrae los archivos del ZIP en tu carpeta de proyecto.
2.  Completa las API Keys en el archivo `.env`.
3.  Ejecuta el script de preparación:
    ```bash
    bash setup-ubuntu.sh
    ```
4.  Lanza tus agentes y empieza a programar:
    ```bash
    bunx oh-my-opencode
    ```

---

## 4. Actualizar el Orquestador

Si ya tienes el sistema instalado y he subido nuevas versiones a tu repositorio de GitHub (nuevas plantillas, modelos o funcionalidades como la migración de backups), puedes actualizar tu servidor en cualquier momento sin perder tus cuentas, proyectos ni configuraciones privadas:

```bash
# 1. Ingresa a la carpeta del orquestador
cd ~/orquestador-vibecoding

# 2. Descarga la versión más reciente (Forzando sincronización limpia)
git fetch origin
git reset --hard origin/main

# 3. Instala posibles dependencias nuevas de Node (como multer, unzipper, etc.)
npm install

# 4. Reinicia el sistema limpiamente para recargar el entorno
npx pm2 delete orquestador
npx pm2 start server.js --name orquestador
npx pm2 save
```
Tus archivos `.env` y de base de datos (`accounts.json`) no se verán afectados, ya que están estrictamente protegidos por el `.gitignore`.

**⚠️ Importante después de actualizar:**
Si la actualización incluyó nuevos modelos en el catálogo (ej. nuevos DeepSeek, MiniMax o GLM) o correcciones en el proxy, es recomendable que entres a la interfaz web (`http://localhost:3847`) y presiones el botón **"🔄 Actualizar"** en las tarjetas de tus proyectos activos. Esto forzará la regeneración de los archivos `opencode.json` y `oh-my-openagent.json` inyectando las nuevas mejoras y catálogos en tu entorno de trabajo actual.

---

## 5. Solución de Problemas (Troubleshooting)

### 🔴 Error HTTP 401 (Key Incorrecta) al probar conexión tras restaurar un backup o cambiar llaves
Si al hacer clic en "Probar Conexión" en la interfaz web obtienes un error 401 Unauthorized, pero estás seguro de que tu clave es válida y está correctamente guardada en el archivo `.env`, el problema puede ser la memoria caché de PM2.

**¿Qué está pasando?**
PM2 (el gestor de procesos) puede guardar en caché una versión antigua o inválida de tus variables de entorno (como `CAVOTI_GPT_KEY`). Dado que Node.js por defecto no sobrescribe variables que ya existen en la memoria del sistema, el orquestador sigue intentando conectarse usando la clave vieja (residual) en lugar de leer la nueva desde tu archivo `.env`.

**Solución:**
En lugar de un simple reinicio, debes eliminar el proceso de PM2 de la memoria y volver a iniciarlo desde cero para forzar una lectura limpia de tu archivo `.env`:

```bash
npx pm2 delete orquestador
npx pm2 start server.js --name orquestador
npx pm2 save
```
Una vez ejecutado, vuelve a la interfaz web y presiona "Probar Conexión". Debería devolver `Conexión exitosa (HTTP 200)`.
