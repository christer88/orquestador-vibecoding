export default {
  templates: [],
  selectedTemplateData: null,
  isEditMode: false,
  projectId: null,

  render(container) {
    this.projectId = window.currentRouteParams && window.currentRouteParams.id;
    this.isEditMode = !!this.projectId;

    container.innerHTML = `
      <div class="wizard-view" style="max-width: var(--content-max-width); margin: 0 auto;">
        <div class="main-content__header">
          <div>
            <h2 class="main-content__title">💡 ${this.isEditMode ? 'Editar Proyecto' : '✨ Nuevo Proyecto'} VibeCoding</h2>
            <p class="main-content__subtitle">${this.isEditMode ? 'Modifica la configuración de tu entorno de desarrollo.' : 'Configura tu entorno con soporte multi-proveedor y agentes automáticos.'}</p>
          </div>
        </div>
        
        <div class="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-top: var(--space-6);">
          <!-- Formulario -->
          <div class="card">
            <h3 style="margin-bottom: var(--space-4); border-bottom: 1px solid var(--border); padding-bottom: var(--space-2);">1. Configuración General</h3>
            
            <div class="form-group" style="margin-bottom: var(--space-4);">
              <label class="form-label form-label--required">Nombre del Proyecto</label>
              <input type="text" id="proj-name" class="form-input" placeholder="Ej: Mi App React">
            </div>
            
            <div class="form-group" style="margin-bottom: var(--space-4);">
              <label class="form-label">Descripción</label>
              <input type="text" id="proj-desc" class="form-input" placeholder="Qué hace este proyecto...">
            </div>
            
            <div class="form-group" style="margin-bottom: var(--space-4);">
              <label class="form-label">Plantilla Base</label>
              <select id="proj-template" class="form-select">
                <option value="">Cargando plantillas...</option>
              </select>
            </div>
            
            <div class="form-group" style="margin-top: var(--space-6);">
              <label class="form-checkbox">
                <input type="checkbox" id="proj-cache" checked>
                <span class="form-checkbox__label">Activar Modo Cache-Friendly</span>
              </label>
              <p class="form-hint" style="margin-top: var(--space-1); margin-left: 28px;">
                Genera tokens de sesión estructurados y optimiza el consumo de APIs para evitar Cache Misses.
              </p>
            </div>
            
            <h4 style="margin-top: var(--space-6); margin-bottom: var(--space-3); border-bottom: 1px dashed var(--border); padding-bottom: var(--space-2);">Skills Avanzados</h4>
            <div id="skills-warnings" style="margin-bottom: var(--space-4);"></div>
            <div class="form-group" style="margin-bottom: var(--space-3);">
              <label class="form-checkbox"><input type="checkbox" id="skill-uipro" checked><span class="form-checkbox__label">UI/UX Pro Max</span></label>
              <p class="form-hint" style="margin-top: var(--space-1); margin-left: 28px;">Forza al agente a crear diseños premium, coloridos y con animaciones.</p>
            </div>
            <div class="form-group" style="margin-bottom: var(--space-3);">
              <label class="form-checkbox"><input type="checkbox" id="skill-ponytail"><span class="form-checkbox__label">Ponytail</span></label>
              <p class="form-hint" style="margin-top: var(--space-1); margin-left: 28px;">Asistente minimalista (escribe solo el código necesario).</p>
            </div>
            <div class="form-group" style="margin-bottom: var(--space-3);">
              <label class="form-checkbox"><input type="checkbox" id="skill-codegraph"><span class="form-checkbox__label">CodeGraph (Built-in)</span></label>
              <p class="form-hint" style="margin-top: var(--space-1); margin-left: 28px;">Motor ultrarrápido de inteligencia de código y AST.</p>
            </div>
            <div class="form-group" style="margin-bottom: var(--space-3);">
              <label class="form-checkbox"><input type="checkbox" id="skill-engram"><span class="form-checkbox__label">Engram</span></label>
              <p class="form-hint" style="margin-top: var(--space-1); margin-left: 28px;">Memoria persistente a largo plazo para tu agente.</p>
            </div>
            <div class="form-group" style="margin-bottom: var(--space-3);">
              <label class="form-checkbox"><input type="checkbox" id="skill-speckit"><span class="form-checkbox__label">Spec-Kit</span></label>
              <p class="form-hint" style="margin-top: var(--space-1); margin-left: 28px;">Herramientas para Spec-Driven Development.</p>
            </div>
          </div>
          
          <!-- Vista Previa de la Plantilla -->
          <div class="card" id="template-preview-card">
            <h3 style="margin-bottom: var(--space-4); border-bottom: 1px solid var(--border); padding-bottom: var(--space-2);">2. Resumen de la Plantilla</h3>
            <div id="template-preview-content">
              <p class="text-secondary">Selecciona una plantilla para ver su detalle de agentes y proveedores.</p>
            </div>
          </div>
        </div>
        
        <div class="wizard-footer" style="margin-top: var(--space-8); display: flex; gap: var(--space-4); justify-content: flex-end;">
          <button class="btn btn--secondary" onclick="window.location.hash='#dashboard'">Cancelar</button>
          <button class="btn btn--primary" id="btn-submit" disabled onclick="window.appWizard.finish()">${this.isEditMode ? 'Guardar Cambios 💾' : 'Generar Configuraciones 🚀'}</button>
        </div>
      </div>
    `;
    window.appWizard = this;
    this.initWizard();
  },

  async initWizard() {
    const templateSelect = document.getElementById('proj-template');
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      
      if (data.ok && data.templates) {
        this.templates = data.templates;
        templateSelect.innerHTML = this.templates.map(t => 
          `<option value="${t.filename}">${t.name} — ${t.description}</option>`
        ).join('');
        
        // Si no estamos editando, cargar la primera por defecto
        if (!this.isEditMode && this.templates.length > 0) {
          this.loadTemplateDetails(this.templates[0].filename);
        }
      } else {
        templateSelect.innerHTML = '<option value="">Error al cargar plantillas</option>';
      }
    } catch (e) {
      console.error(e);
      templateSelect.innerHTML = '<option value="">Error de red al cargar plantillas</option>';
    }

    templateSelect.addEventListener('change', (e) => {
      this.loadTemplateDetails(e.target.value);
    });

    const checkSkills = () => {
      const uipro = document.getElementById('skill-uipro').checked;
      const ponytail = document.getElementById('skill-ponytail').checked;
      const codegraph = document.getElementById('skill-codegraph').checked;
      const engram = document.getElementById('skill-engram').checked;
      
      let warningsHtml = '';
      if (uipro && ponytail) {
        warningsHtml += `<div style="padding: 10px; background: rgba(255,50,50,0.1); border: 1px solid red; border-radius: 4px; color: red; margin-bottom: 8px;">
          <strong>🚨 Conflicto Crítico:</strong> Tienes activo UI/UX Pro (diseños ricos) y Ponytail (minimalismo extremo). El agente recibirá instrucciones contradictorias. Te sugerimos apagar uno.
        </div>`;
      }
      if (codebase && engram) {
        warningsHtml += `<div style="padding: 10px; background: rgba(255,200,0,0.1); border: 1px solid orange; border-radius: 4px; color: orange; margin-bottom: 8px;">
          <strong>⚠️ Advertencia:</strong> Codebase-Memory y Engram simultáneos consumen una gran cantidad de tokens de contexto.
        </div>`;
      }
      document.getElementById('skills-warnings').innerHTML = warningsHtml;
    };

    ['skill-uipro', 'skill-ponytail', 'skill-codegraph', 'skill-engram'].forEach(id => {
      document.getElementById(id).addEventListener('change', checkSkills);
    });

    if (this.isEditMode) {
      await this.loadProjectForEdit(this.projectId);
    }
  },

  async loadProjectForEdit(id) {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      
      if (data.ok && data.project) {
        const p = data.project;
        document.getElementById('proj-name').value = p.name || '';
        document.getElementById('proj-desc').value = p.description || '';
        document.getElementById('proj-cache').checked = !!p.cacheOptimization;
        
        if (p.skills) {
          document.getElementById('skill-uipro').checked = p.skills.uiPro !== false;
          document.getElementById('skill-ponytail').checked = !!p.skills.ponytail;
          document.getElementById('skill-codegraph').checked = !!p.skills.codegraph;
          document.getElementById('skill-engram').checked = !!p.skills.engram;
          document.getElementById('skill-speckit').checked = !!p.skills.specKit;
        }
        
        // Trigger validation check to show any initial warnings
        document.getElementById('skill-uipro').dispatchEvent(new Event('change'));
        
        // Sync dropdown to show correct template
        const matchedTemplate = this.templates.find(t => t.name === p.template);
        if (matchedTemplate) {
          document.getElementById('proj-template').value = matchedTemplate.filename;
        }

        this.selectedTemplateData = {
          name: p.template || 'Personalizada',
          providers: p.providers || [],
          accounts: p.accounts || {},
          agents: p.agents || {},
          runtime_fallback: p.runtime_fallback || {},
          background_task: p.background_task || {}
        };
        
        document.getElementById('btn-submit').disabled = false;
        this.renderTemplatePreview(this.selectedTemplateData);
      }
    } catch (e) {
      console.error('Error al cargar proyecto para edición:', e);
    }
  },

  async loadTemplateDetails(filename) {
    const previewContent = document.getElementById('template-preview-content');
    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    
    previewContent.innerHTML = '<div class="loading">Cargando detalles de plantilla...</div>';
    
    try {
      const res = await fetch(`/api/templates/${filename}`);
      const data = await res.json();
      
      if (data.ok && data.template) {
        this.selectedTemplateData = data.template;
        submitBtn.disabled = false;
        this.renderTemplatePreview(data.template);
      } else {
        previewContent.innerHTML = '<div class="error">No se pudieron cargar los detalles de la plantilla.</div>';
      }
    } catch (e) {
      console.error(e);
      previewContent.innerHTML = `<div class="error">Error al conectar con la API: ${e.message}</div>`;
    }
  },

  renderTemplatePreview(template) {
    const previewContent = document.getElementById('template-preview-content');
    const providersBadges = (template.providers || []).map(p => {
      let badgeClass = 'badge--custom';
      if (p.includes('opencode')) badgeClass = 'badge--opencode';
      else if (p.includes('openrouter')) badgeClass = 'badge--openrouter';
      else if (p.includes('deepseek')) badgeClass = 'badge--deepseek';
      else if (p.includes('xiaomi')) badgeClass = 'badge--xiaomi';
      else if (p.includes('commandcode')) badgeClass = 'badge--commandcode';
      else if (p.includes('cavoti')) badgeClass = 'badge--moonshot';
      
      return `<span class="badge ${badgeClass}" style="margin-right: 4px; margin-bottom: 4px;">${p}</span>`;
    }).join('');

    const agentsList = Object.entries(template.agents || {}).map(([name, config]) => {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) 0; border-bottom: 1px dashed var(--border); font-size: var(--text-sm);">
          <span style="font-family: var(--font-code); font-weight: 500; color: var(--primary-start);">${name}</span>
          <span class="text-secondary">${config.model}</span>
        </div>
      `;
    }).join('');

    previewContent.innerHTML = `
      <div style="margin-bottom: var(--space-4);">
        <h4 style="margin-bottom: var(--space-2);">Proveedores Incluidos:</h4>
        <div style="display: flex; flex-wrap: wrap;">
          ${providersBadges || '<span class="text-secondary">Ninguno</span>'}
        </div>
      </div>
      
      <div>
        <h4 style="margin-bottom: var(--space-2); display: flex; justify-content: space-between;">
          <span>Agentes Configurados:</span>
          <span class="badge badge--tier-1">${Object.keys(template.agents || {}).length}</span>
        </h4>
        <div style="max-height: 250px; overflow-y: auto; padding-right: 4px;">
          ${agentsList || '<p class="text-secondary">Sin agentes definidos</p>'}
        </div>
      </div>
    `;
  },

  async finish() {
    if (!this.selectedTemplateData) {
      alert('Por favor selecciona una plantilla válida.');
      return;
    }

    try {
      const nameInput = document.getElementById('proj-name').value.trim();
      if (!nameInput) {
        alert('Por favor ingresa un nombre para el proyecto.');
        return;
      }

      const data = {
        name: nameInput,
        description: document.getElementById('proj-desc').value,
        cacheOptimization: document.getElementById('proj-cache').checked,
        template: this.selectedTemplateData.name,
        providers: this.selectedTemplateData.providers || [],
        accounts: this.selectedTemplateData.accounts || {},
        agents: this.selectedTemplateData.agents || {},
        runtime_fallback: this.selectedTemplateData.runtime_fallback || {},
        background_task: this.selectedTemplateData.background_task || {},
        skills: {
          uiPro: document.getElementById('skill-uipro').checked,
          ponytail: document.getElementById('skill-ponytail').checked,
          codegraph: document.getElementById('skill-codegraph').checked,
          engram: document.getElementById('skill-engram').checked,
          specKit: document.getElementById('skill-speckit').checked
        }
      };

      const url = this.isEditMode ? `/api/projects/${this.projectId}` : '/api/projects';
      const method = this.isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();
      if (resData.ok) {
        alert(this.isEditMode ? '¡Cambios guardados con éxito!' : '¡Proyecto creado con éxito!');
        window.location.hash = '#dashboard';
      } else {
        alert('Error al guardar el proyecto: ' + resData.error);
      }
    } catch (e) {
      alert('Error de red: ' + e.message);
    }
  }
}
