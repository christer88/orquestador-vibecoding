window.addFallbackRow = function(agentId, model = '', source = '') {
  const container = document.getElementById(`fallbacks-${agentId}`);
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'fallback-row';
  row.style.cssText = 'display: grid; grid-template-columns: 1.5fr 1fr auto; gap: 8px; align-items: center; background: rgba(0,0,0,0.1); padding: 4px; border-radius: 4px; border-left: 2px solid var(--primary-start);';
  
  // Clone the model and source selects from the first agent row to get the options
  const modelOptions = document.querySelector('.agent-model').innerHTML;
  const sourceOptions = document.querySelector('.agent-source').innerHTML;

  row.innerHTML = `
    <select class="form-select fallback-model" style="padding: 2px 8px; font-size: 11px;">
      ${modelOptions}
    </select>
    <select class="form-select fallback-source" style="padding: 2px 8px; font-size: 11px;">
      ${sourceOptions}
    </select>
    <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #f92672; cursor: pointer; padding: 0 4px; font-size: 14px;" title="Eliminar respaldo">✖</button>
  `;
  
  if (model) row.querySelector('.fallback-model').value = model;
  if (source) row.querySelector('.fallback-source').value = source;
  
  container.appendChild(row);
};

export default {
  templates: [],
  providers: [],
  models: [],
  agents: [],
  isEditMode: false,
  editFilename: null,

  render(container) {
    this.isEditMode = false;
    this.editFilename = null;

    container.innerHTML = `
      <div class="templates-view" style="max-width: var(--content-max-width); margin: 0 auto;">
        <div class="main-content__header" style="margin-bottom: var(--space-6);">
          <div>
            <h2 class="main-content__title">📋 Configuración de Plantillas</h2>
            <p class="main-content__subtitle">Administra y crea tus plantillas personalizadas para tus proyectos.</p>
          </div>
        </div>

        <div class="grid" style="display: grid; grid-template-columns: 1fr 1.5fr; gap: var(--space-6);">
          <!-- Formulario Agregar/Editar Plantilla -->
          <div class="card">
            <h3 id="tpl-form-title" style="margin-bottom: var(--space-4); border-bottom: 1px solid var(--border); padding-bottom: var(--space-2);">Crear Nueva Plantilla</h3>
            <form id="template-form" onsubmit="event.preventDefault(); window.appTemplatesManager.saveTemplate();">
              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label form-label--required">Nombre de la Plantilla</label>
                <input type="text" id="tpl-name" class="form-input" placeholder="Ej: Mi Setup Especial" required>
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label">Descripción</label>
                <input type="text" id="tpl-desc" class="form-input" placeholder="Ej: 1x OpenCode con agentes optimizados..." required>
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label">Proveedores Soportados</label>
                <div id="tpl-providers-checkboxes" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px;">
                  <!-- Dynamically populated -->
                </div>
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label">Configurar Agentes por Defecto</label>
                <div id="tpl-agents-container" style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: 4px;">
                  <!-- Dynamically loaded list of basic agents -->
                </div>
              </div>

              <div style="display: flex; gap: var(--space-2); margin-top: var(--space-6);">
                <button type="button" id="tpl-cancel-btn" class="btn btn--secondary" style="display: none; flex: 1;" onclick="window.appTemplatesManager.cancelEdit();">Cancelar</button>
                <button type="submit" id="tpl-submit-btn" class="btn btn--primary" style="flex: 2; width: 100%;">Guardar Plantilla 💾</button>
              </div>
            </form>
          </div>

          <!-- Listado de Plantillas -->
          <div class="card">
            <h3 style="margin-bottom: var(--space-4); border-bottom: 1px solid var(--border); padding-bottom: var(--space-2);">Plantillas Disponibles</h3>
            <div id="templates-list-container">
              <div class="loading">Cargando plantillas...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    window.appTemplatesManager = this;
    this.init();
  },

  async init() {
    await this.loadProvidersAndModels();
    await this.loadTemplates();
  },

  async loadProvidersAndModels() {
    try {
      const [pRes, mRes, aRes, accRes] = await Promise.all([
        fetch('/api/providers'),
        fetch('/api/models'),
        fetch('/api/agents'),
        fetch('/api/accounts')
      ]);
      const pData = await pRes.json();
      const mData = await mRes.json();
      const aData = await aRes.json();
      const accData = await accRes.json();

      if (pData.ok && pData.providers) this.providers = pData.providers.providers || [];
      if (mData.ok && mData.models) this.models = mData.models.models || [];
      if (aData.ok && aData.agents) this.agents = aData.agents.agents || [];
      if (accData.ok && accData.accounts) this.userAccounts = accData.accounts || [];

      // Combine user accounts and default fallbacks
      const accountsList = [];
      if (this.userAccounts && this.userAccounts.length > 0) {
        this.userAccounts.forEach(acc => {
          accountsList.push({ id: acc.id, label: `${acc.label} (${acc.provider})` });
        });
      }

      const defaults = [
        { id: 'opencode-go-1', label: 'Default OpenCode GO' },
        { id: 'xiaomi-1', label: 'Default Xiaomi MiMo (Token Plan)' },
        { id: 'xiaomi-2', label: 'Default Xiaomi API Credits' },
        { id: 'openrouter-1', label: 'Default OpenRouter' },
        { id: 'deepseek-api-1', label: 'Default DeepSeek API' },
        { id: 'moonshot-1', label: 'Default Moonshot AI' },
        { id: 'minimax-1', label: 'Default MiniMax' },
        { id: 'nvidia-1', label: 'Default NVIDIA API' },
        { id: 'cavoti-1', label: 'Cavoti GPT' },
        { id: 'cavoti-2', label: 'Cavoti Claude' },
        { id: 'ollama-cloud-1', label: 'Ollama Cloud' }
      ];

      defaults.forEach(d => {
        if (!accountsList.some(a => a.id === d.id)) {
          accountsList.push(d);
        }
      });

      const sourceOptionsHtml = accountsList.map(acc => 
        `<option value="${acc.id}">${acc.label}</option>`
      ).join('');

      // Populate Providers Checkboxes
      const provContainer = document.getElementById('tpl-providers-checkboxes');
      provContainer.innerHTML = this.providers.map(p => `
        <label class="form-checkbox">
          <input type="checkbox" name="tpl-providers" value="${p.id}" checked>
          <span class="form-checkbox__label">${p.name}</span>
        </label>
      `).join('');

      // Populate Agents Configuration List
      const agentsContainer = document.getElementById('tpl-agents-container');
      
      agentsContainer.innerHTML = this.agents.map(a => `
        <div class="agent-row card" data-agent="${a.id}" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border); padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: 8px;">
          <div style="font-weight: 600; font-family: var(--font-code); color: var(--primary-start); font-size: var(--text-sm); margin-bottom: 8px;">
            ${a.name} (${a.role})
          </div>
          <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 8px;">
            <select class="form-select agent-model" data-agent="${a.id}" style="padding: 4px var(--space-2); font-size: 12px;">
              <option value="">(Desactivado / No usar)</option>
              ${this.models.map(m => `<option value="${m.id}">${m.is_free ? '[🎁 FREE] ' : ''}${m.name}</option>`).join('')}
            </select>
            <select class="form-select agent-source" data-agent="${a.id}" style="padding: 4px var(--space-2); font-size: 12px;">
              ${sourceOptionsHtml}
            </select>
          </div>
          <div class="fallbacks-container" id="fallbacks-${a.id}" style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;"></div>
          <button type="button" class="btn btn--sm" style="margin-top: 4px; background: transparent; border: 1px dashed var(--border); color: var(--text-secondary); width: 100%; text-align: left; padding: 2px 8px; font-size: 11px;" onclick="window.addFallbackRow('${a.id}')">➕ Añadir Respaldo</button>
        </div>
      `).join('');

    } catch (e) {
      console.error('Error cargando catálogos:', e);
    }
  },

  async loadTemplates() {
    const listContainer = document.getElementById('templates-list-container');
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      
      if (data.ok && data.templates) {
        this.templates = data.templates;
        if (this.templates.length === 0) {
          listContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: var(--space-6);">
              <p class="text-secondary">No hay plantillas registradas todavía.</p>
            </div>
          `;
          return;
        }

        listContainer.innerHTML = this.templates.map(t => {
          const providersBadges = (t.providers || []).map(p => {
            let badgeClass = 'badge--custom';
            if (p.includes('opencode')) badgeClass = 'badge--opencode';
            else if (p.includes('openrouter')) badgeClass = 'badge--openrouter';
            else if (p.includes('deepseek')) badgeClass = 'badge--deepseek';
            else if (p.includes('xiaomi')) badgeClass = 'badge--xiaomi';
            else if (p.includes('commandcode')) badgeClass = 'badge--commandcode';
            else if (p.includes('cavoti')) badgeClass = 'badge--moonshot';
            return `<span class="badge ${badgeClass}" style="margin-right: 4px; margin-bottom: 4px;">${p}</span>`;
          }).join('');

          return `
            <div class="card" style="margin-bottom: var(--space-4); background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h4 style="margin: 0; font-size: var(--text-base);">${t.name}</h4>
                  <p class="text-secondary" style="font-size: var(--text-xs); margin-top: 4px; line-height: 1.4;">${t.description || 'Sin descripción'}</p>
                  <div style="margin-top: var(--space-3); display: flex; flex-wrap: wrap;">
                    ${providersBadges || '<span class="text-secondary">Ninguno</span>'}
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn--secondary btn--sm" onclick="window.appTemplatesManager.editTemplate('${t.filename}')">Editar</button>
                  <button class="btn btn--danger btn--sm" onclick="window.appTemplatesManager.deleteTemplate('${t.filename}')">Eliminar</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.error(e);
      listContainer.innerHTML = `<div class="error">Error cargando plantillas: ${e.message}</div>`;
    }
  },

  async editTemplate(filename) {
    try {
      const res = await fetch(`/api/templates/${filename}`);
      const data = await res.json();
      
      if (data.ok && data.template) {
        this.isEditMode = true;
        this.editFilename = filename;
        const t = data.template;

        // Cambiar títulos y botones
        document.getElementById('tpl-form-title').textContent = 'Editar Plantilla';
        document.getElementById('tpl-name').value = t.name;
        document.getElementById('tpl-name').disabled = true; // Desactivar cambio de nombre para mantener coherencia de archivo
        document.getElementById('tpl-desc').value = t.description || '';

        // Checkboxes de proveedores
        const checkboxes = document.querySelectorAll('input[name="tpl-providers"]');
        checkboxes.forEach(cb => {
          cb.checked = (t.providers || []).includes(cb.value);
        });

        // Configuración de agentes
        const agentRows = document.querySelectorAll('.agent-row');
        agentRows.forEach(row => {
          const modelSelect = row.querySelector('.agent-model');
          const sourceSelect = row.querySelector('.agent-source');
          const agentName = modelSelect.getAttribute('data-agent');
          
          const agentConfig = t.agents?.[agentName];
          const fallbacksContainer = document.getElementById(`fallbacks-${agentName}`);
          if (fallbacksContainer) fallbacksContainer.innerHTML = '';

          if (agentConfig) {
            modelSelect.value = agentConfig.model || '';
            sourceSelect.value = agentConfig.source || '';
            
            if (agentConfig.fallbacks && Array.isArray(agentConfig.fallbacks)) {
              agentConfig.fallbacks.forEach(fb => {
                if (typeof fb === 'object') {
                  window.addFallbackRow(agentName, fb.model, fb.source);
                } else if (typeof fb === 'string') {
                  const parts = fb.split('/');
                  if (parts.length >= 2) {
                    window.addFallbackRow(agentName, parts.slice(1).join('/'), parts[0]);
                  }
                }
              });
            }
          } else {
            modelSelect.value = ''; // Desactivado
          }
        });

        // Mostrar botón de cancelar
        document.getElementById('tpl-cancel-btn').style.display = 'block';
        document.getElementById('tpl-submit-btn').textContent = 'Guardar Cambios 💾';
      }
    } catch (e) {
      alert('Error al cargar plantilla para edición: ' + e.message);
    }
  },

  cancelEdit() {
    this.isEditMode = false;
    this.editFilename = null;

    // Resetear formulario
    document.getElementById('template-form').reset();
    document.getElementById('tpl-name').disabled = false;
    document.getElementById('tpl-form-title').textContent = 'Crear Nueva Plantilla';
    document.getElementById('tpl-cancel-btn').style.display = 'none';
    document.getElementById('tpl-submit-btn').textContent = 'Guardar Plantilla 💾';
  },

  async saveTemplate() {
    try {
      const nameVal = document.getElementById('tpl-name').value.trim();
      const descVal = document.getElementById('tpl-desc').value.trim();
      const providersChecked = Array.from(document.querySelectorAll('input[name="tpl-providers"]:checked')).map(el => el.value);
      
      const agents = {};
      const agentRows = document.querySelectorAll('.agent-row');
      agentRows.forEach(row => {
        const modelSelect = row.querySelector('.agent-model');
        const sourceSelect = row.querySelector('.agent-source');
        const agentName = modelSelect.getAttribute('data-agent');
        
        if (modelSelect.value) {
          const fallbacks = [];
          const fbRows = row.querySelectorAll('.fallback-row');
          fbRows.forEach(fbRow => {
            const fbModel = fbRow.querySelector('.fallback-model').value;
            const fbSource = fbRow.querySelector('.fallback-source').value;
            if (fbModel && fbSource) {
              fallbacks.push({ model: fbModel, source: fbSource });
            }
          });

          agents[agentName] = {
            model: modelSelect.value,
            source: sourceSelect.value,
            fallbacks: fallbacks
          };
        }
      });

      const data = {
        name: nameVal,
        description: descVal,
        providers: providersChecked,
        accounts: {
          'opencode-go': [{ id: 'opencode-go-1', label: 'Cuenta Principal' }],
          'xiaomi': [{ id: 'xiaomi-1', label: 'Cuenta Principal' }],
          'openrouter': [{ id: 'openrouter-1', label: 'OpenRouter' }],
          'cavoti': [{ id: 'cavoti-1', label: 'Cavoti GPT' }]
        },
        agents: agents
      };

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resData = await res.json();
      if (resData.ok) {
        alert(this.isEditMode ? 'Plantilla modificada exitosamente.' : 'Plantilla creada exitosamente.');
        this.cancelEdit();
        await this.loadTemplates();
      } else {
        alert('Error al guardar plantilla: ' + resData.error);
      }
    } catch (e) {
      alert('Error de red: ' + e.message);
    }
  },

  async deleteTemplate(filename) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta plantilla?')) return;
    try {
      const res = await fetch(`/api/templates/${filename}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        await this.loadTemplates();
      } else {
        alert('Error al eliminar: ' + data.error);
      }
    } catch (e) {
      alert('Error de red: ' + e.message);
    }
  }
}
