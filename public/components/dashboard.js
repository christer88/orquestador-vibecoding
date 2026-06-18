export default {
  render(container) {
    container.innerHTML = `
      <div class="dashboard-view">
        <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6);">
          <h2 class="main-content__title">Tus Proyectos</h2>
          <button class="btn btn--primary" onclick="window.location.hash='#wizard'">✨ Nuevo Proyecto</button>
        </div>
        <div class="cards-grid" id="projects-list">
          <div class="loading">Cargando proyectos...</div>
        </div>
      </div>
    `;
    
    this.loadProjects();
  },
  
  async loadProjects() {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      const projects = data.projects || [];
      
      const list = document.getElementById('projects-list');
      if (projects.length === 0) {
        list.innerHTML = `
          <div class="empty-state card" style="text-align: center; padding: var(--space-10);">
            <h3>No tienes proyectos aún</h3>
            <p class="text-secondary" style="margin-top: var(--space-2); margin-bottom: var(--space-4);">Comienza creando tu primer entorno VibeCoding con configuración multi-proveedor.</p>
            <button class="btn btn--primary" onclick="window.location.hash='#wizard'">Crear mi primer proyecto</button>
          </div>
        `;
        return;
      }
      
      list.innerHTML = projects.map(p => `
        <div class="card card--project" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 220px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2);">
              <h3 class="card__title" style="margin: 0; font-size: var(--text-lg); font-weight: 600;">${p.name || 'Sin nombre'}</h3>
              <span class="badge badge--tier-1" style="flex-shrink: 0;">${p.providers?.length || 0} Fuentes</span>
            </div>
            <p class="card__description" style="margin-bottom: var(--space-4);">${p.description || 'Sin descripción'}</p>
          </div>
          <div class="card__actions" style="display: flex; gap: var(--space-3); margin-top: auto; padding-top: var(--space-4); border-top: 1px solid var(--border); justify-content: flex-end; align-items: center; flex-wrap: nowrap; overflow: visible;">
            <button class="btn btn--secondary btn--sm" onclick="window.location.hash='#wizard?id=${p.id}'">✏️ Editar</button>
            <button class="btn btn--success btn--sm" onclick="window.deployProject('${p.id}')">🚀 Desplegar</button>
            <a href="/api/projects/${p.id}/export" class="btn btn--primary btn--sm" style="text-decoration: none;">📦 Descargar ZIP</a>
          </div>
        </div>
      `).join('');
    } catch (e) {
      document.getElementById('projects-list').innerHTML = `<div class="error">Error: ${e.message}</div>`;
    }
  }
};

window.deployProject = async function(id) {
  // Crear el modal de logs
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" style="max-width: 700px; display: flex; flex-direction: column;">
      <div class="modal__header">
        <h3 class="modal__title">🚀 Despliegue Directo de Proyecto</h3>
        <button class="modal__close" onclick="this.closest('.modal-backdrop').remove()">&times;</button>
      </div>
      <div class="modal__body" style="flex: 1; overflow-y: auto;">
        <div id="deploy-message" class="text-info" style="margin-bottom: var(--space-4); display: flex; align-items: center; gap: 8px;">
          <span class="loading-spinner"></span> Iniciando despliegue en servidor local...
        </div>
        <div style="background: rgba(0,0,0,0.6); border-radius: var(--radius-lg); padding: var(--space-4); border: 1px solid var(--border); font-family: monospace; white-space: pre-wrap; font-size: var(--text-sm); height: 300px; overflow-y: auto; color: #a6e22e; line-height: 1.5;" id="deploy-logs">
          Esperando respuesta del servidor...
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" onclick="this.closest('.modal-backdrop').remove()">Cerrar</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  try {
    const res = await fetch(`/api/projects/${id}/deploy`, { method: 'POST' });
    const data = await res.json();
    if (!data.ok) {
      document.getElementById('deploy-message').innerHTML = `❌ Error: ${data.error}`;
      document.getElementById('deploy-logs').innerText = 'El despliegue falló antes de iniciar.';
      document.getElementById('deploy-logs').style.color = '#f92672';
      return;
    }

    document.getElementById('deploy-message').innerHTML = `
      <span class="badge badge--tier-1" style="background: var(--accent); color: white;">En proceso ⚡</span> 
      Desplegando en: <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${data.targetDir}</code>
    `;

    // Empezar polling de logs
    const logsEl = document.getElementById('deploy-logs');
    let interval = setInterval(async () => {
      // Si el modal ya fue cerrado/removido, parar polling
      if (!document.body.contains(backdrop)) {
        clearInterval(interval);
        return;
      }

      try {
        const statusRes = await fetch(`/api/projects/${id}/deploy/status`);
        const statusData = await statusRes.json();
        
        logsEl.textContent = statusData.logs || 'Cargando logs...';
        logsEl.scrollTop = logsEl.scrollHeight; // Auto scroll to bottom

        if (statusData.completed) {
          clearInterval(interval);
          document.getElementById('deploy-message').innerHTML = `
            <span class="badge badge--success">Completado ✨</span> 
            Instalado en: <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${statusData.targetDir}</code>
          `;
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
  } catch (e) {
    document.getElementById('deploy-message').innerText = `❌ Error de red: ${e.message}`;
    document.getElementById('deploy-logs').style.color = '#f92672';
  }
};
