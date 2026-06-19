# 🚀 Orquestador VibeCoding

Este orquestador es una aplicación local con interfaz web (SPA) diseñada para configurar, gestionar y desplegar entornos de desarrollo de IA coding multi-proveedor basados en **Oh My OpenAgent + OpenCode GO**, con soporte para múltiples fuentes de modelos y portabilidad total.

Genera automáticamente archivos de ruteo (`oh-my-openagent.json`), configuración de proveedores (`opencode.json`), variables de entorno (`.env`), scripts de despliegue automatizados y documentación de referencia.

---

## ✨ Características Principales

*   **Multi-Proveedor & Multi-Cuenta**: Configura múltiples proveedores (OpenCode Go, OpenRouter, Xiaomi MiMo, CommandCode, DeepSeek API, etc.) y múltiples cuentas/suscripciones por proveedor (ej. `opencode-go-1`, `opencode-go-2`) para duplicar o triplicar tus límites (Rate Limits).
*   **Gestor de Cuentas Integrado**: Administra visualmente tus API Keys y credenciales directamente desde la interfaz web. Incluye pruebas de conectividad en tiempo real para verificar si una llave está activa.
*   **Motor de Fallbacks Avanzado**: Ruteo inteligente y conmutación automática entre cuentas del mismo proveedor y entre proveedores de respaldo (ej. `opencode-go-1` ➡️ `opencode-go-2` ➡️ `openrouter`).
*   **Monitor y Estimador de Costos**: Calcula presupuestos de consumo estimados por horas y nivel de intensidad de sesión, ayudando a determinar el punto de equilibrio económico entre suscripciones y pago por uso.
*   **Catálogo de Agentes OmO**: Configura los 11 agentes de Oh My OpenAgent sugiriendo modelos y tiers óptimos para cada tarea (razonamiento, utilidades, orquestación, etc.).

---

## 📖 Índice
1. [Instalar el Orquestador en tu VM (Linux)](#1-instalar-el-orquestador-en-tu-vm-linux)
2. [Cómo utilizar la Interfaz Web](#2-cómo-utilizar-la-interfaz-web)
3. [Flujo de Trabajo (VibeCoding)](#3-flujo-de-trabajo-vibecoding)

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

### Paso C: Iniciar el Servidor
Instala las dependencias y arranca el servidor en modo desarrollo:
```bash
# Instalar dependencias
npm install

# Levantar el servidor de desarrollo
npm run dev
```
Verás en la consola que el servidor está escuchando en el puerto `3847`. Si estás en una VM remota y quieres acceder a la interfaz, asegúrate de habilitar el puerto `3847` en el firewall de tu proveedor de nube o crea un túnel SSH.

---

## 2. Cómo utilizar la Interfaz Web

Una vez que el servidor esté corriendo, abre tu navegador y visita `http://localhost:3847`.

### 🛠️ Paso a Paso para Generar Configuraciones:
1.  **Gestor de Cuentas**: Haz clic en el botón de **Llaves/Cuentas** en la barra superior. Agrega tus API Keys para los proveedores que desees usar y prueba la conexión. Estas llaves se guardarán de manera local y segura en `src/data/accounts.json` (excluido en Git).
2.  **Dashboard Inicial**: Verás la lista de tus proyectos y plantillas predefinidas. Haz clic en **"✨ Nuevo Proyecto"**.
3.  **Wizard de Configuración**:
    *   Asigna un nombre a tu proyecto.
    *   Selecciona las fuentes/cuentas activas y asigna qué modelo y proveedor ejecutará cada uno de los 11 agentes de Oh My OpenAgent.
    *   Configura la cadena de fallbacks (orden de respaldo si una cuenta o proveedor falla).
7.  **Desplegar Proyecto**: Con el botón **"🚀 Desplegar"** puedes instalar y configurar el proyecto directamente en una carpeta local de la máquina virtual (crea la carpeta, inyecta credenciales y ejecuta el script de instalación en segundo plano).
8.  **Actualizar Configuración**: Con el botón **"🔄 Actualizar"** puedes aplicar de forma inmediata y silenciosa cualquier cambio de configuración (ej. cambio de modelo, proveedor o permisos de `hashline_edit` para que los agentes delegados apliquen cambios) directamente a la carpeta de tu proyecto sin necesidad de reinstalar dependencias.
9.  **Generar & Descargar**: En la tarjeta de tu proyecto también puedes presionar **"📦 Descargar ZIP"** si prefieres llevarte los archivos a otra máquina.

### ¿Qué contiene el archivo ZIP del proyecto?
*   `oh-my-openagent.json`: Reglas de ruteo y conmutación de agentes.
*   `opencode.json`: Declaración de proveedores, configurando `baseURL` y la compatibilidad con endpoints custom (ej. `opencode-go` ruteado a `https://opencode.ai/zen/go/v1`).
*   `.env`: Declaración de las API Keys y variables del entorno del proyecto.
*   `setup-ubuntu.sh`: Script auto-ejecutable que configura la VM destino instalando dependencias (Go, Bun), herramientas de VibeCoding (`opencode`, `command-code`, `oh-my-opencode`), inicializa archivos de configuración y copia las variables de entorno.
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
