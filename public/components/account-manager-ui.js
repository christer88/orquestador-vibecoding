export default {
  accounts: [],
  providers: [],

  render(container) {
    container.innerHTML = `
      <div class="account-manager-view" style="max-width: var(--content-max-width); margin: 0 auto;">
        <div class="main-content__header" style="margin-bottom: var(--space-6); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 class="main-content__title">🔑 Gestión de Cuentas y API Keys</h2>
            <p class="main-content__subtitle">Registra tus cuentas para cada proveedor y asocia sus variables de entorno.</p>
          </div>
          <button class="btn btn--secondary" onclick="window.appAccountManager.syncFreeModels()">🎁 Sincronizar Modelos Gratuitos</button>
        </div>

        <div class="grid" style="display: grid; grid-template-columns: 1fr 1.5fr; gap: var(--space-6);">
          <!-- Formulario Agregar -->
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: var(--space-2); margin-bottom: var(--space-4);">
              <h3 style="margin: 0;">Registrar Cuenta</h3>
              <button class="btn btn--secondary btn--sm" onclick="window.appAccountManager.showCustomProviderModal()">➕ Añadir Proveedor</button>
            </div>
            <form id="account-form" onsubmit="event.preventDefault(); window.appAccountManager.saveAccount();">
              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label form-label--required">Proveedor</label>
                <select id="acc-provider" class="form-select" required>
                  <option value="">Selecciona un proveedor...</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label form-label--required">Nombre / Etiqueta</label>
                <input type="text" id="acc-label" class="form-input" placeholder="Ej: Mi Cuenta Principal" required>
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label form-label--required">Variable de Entorno (.env)</label>
                <input type="text" id="acc-envkey" class="form-input form-input--code" placeholder="Ej: OPENCODE_GO_1_AUTH" required>
                <span class="form-hint">El nombre de la variable (ej: OPENCODE_GO_1_AUTH).</span>
              </div>

              <div class="form-group" style="margin-bottom: var(--space-4);">
                <label class="form-label">Valor de la API Key (Opcional)</label>
                <input type="password" id="acc-apikey" class="form-input form-input--code" placeholder="Ingresa el valor real de la API key (ej: sk-...)">
                <span class="form-hint">Si lo ingresas, se guardará de forma segura en el archivo .env del servidor para probar conexiones.</span>
              </div>

              <div class="form-group" style="margin-top: var(--space-6);">
                <label class="form-checkbox">
                  <input type="checkbox" id="acc-active" checked>
                  <span class="form-checkbox__label">Cuenta Activa</span>
                </label>
              </div>

              <button type="submit" class="btn btn--primary" style="margin-top: var(--space-6); width: 100%;">Guardar Cuenta 💾</button>
            </form>
          </div>

          <!-- Listado de Cuentas -->
          <div class="card">
            <h3 style="margin-bottom: var(--space-4); border-bottom: 1px solid var(--border); padding-bottom: var(--space-2);">Cuentas Registradas</h3>
            <div id="accounts-list-container">
              <div class="loading">Cargando cuentas...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Proveedor Personalizado -->
      <div id="custom-provider-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
        <div class="card" style="width: 100%; max-width: 500px; background: var(--bg-surface); box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid var(--border);">
          <h3 style="margin-top: 0; margin-bottom: var(--space-4); color: var(--primary-start);">Nuevo Proveedor</h3>
          <form id="custom-provider-form" onsubmit="event.preventDefault(); window.appAccountManager.saveCustomProvider();">
            <div class="form-group" style="margin-bottom: var(--space-4);">
              <label class="form-label form-label--required">Nombre del Proveedor</label>
              <input type="text" id="cp-name" class="form-input" placeholder="Ej: SiliconFlow" required>
            </div>
            <div class="form-group" style="margin-bottom: var(--space-4);">
              <label class="form-label form-label--required">URL del Endpoint (Base)</label>
              <input type="url" id="cp-endpoint" class="form-input" placeholder="Ej: https://api.siliconflow.cn/v1" required>
            </div>
            <div class="form-group" style="margin-bottom: var(--space-4);">
              <label class="form-label form-label--required">Modelos Soportados</label>
              <textarea id="cp-models" class="form-input" placeholder="Separados por comas. Ej: deepseek-chat, Qwen/Qwen2-72B-Instruct" required style="min-height: 80px; resize: vertical;"></textarea>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: var(--space-6);">
              <button type="button" class="btn btn--secondary" onclick="document.getElementById('custom-provider-modal').style.display = 'none'">Cancelar</button>
              <button type="submit" class="btn btn--primary">Guardar Proveedor</button>
            </div>
          </form>
        </div>
      </div>
    `;

    window.appAccountManager = this;
    this.init();
  },

  async init() {
    await this.loadProviders();
    await this.loadAccounts();
  },

  async loadProviders() {
    const providerSelect = document.getElementById('acc-provider');
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      if (data.ok && data.providers) {
        this.providers = data.providers.providers || [];
        providerSelect.innerHTML = '<option value="">Selecciona un proveedor...</option>' + 
          this.providers.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');
      }
    } catch (e) {
      console.error('Error cargando proveedores:', e);
    }
  },

  async loadAccounts() {
    const listContainer = document.getElementById('accounts-list-container');
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      
      if (data.ok && data.accounts) {
        this.accounts = data.accounts;
        if (this.accounts.length === 0) {
          listContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: var(--space-6);">
              <p class="text-secondary">No hay cuentas registradas todavía.</p>
            </div>
          `;
          return;
        }

        listContainer.innerHTML = this.accounts.map(acc => {
          let badgeClass = 'badge--custom';
          if (acc.provider.includes('opencode')) badgeClass = 'badge--opencode';
          else if (acc.provider.includes('openrouter')) badgeClass = 'badge--openrouter';
          else if (acc.provider.includes('deepseek')) badgeClass = 'badge--deepseek';
          else if (acc.provider.includes('xiaomi')) badgeClass = 'badge--xiaomi';
          else if (acc.provider.includes('commandcode')) badgeClass = 'badge--commandcode';

          return `
            <div class="card" style="margin-bottom: var(--space-4); background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-4);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h4 style="margin: 0; font-size: var(--text-base);">${acc.label}</h4>
                  <div style="margin-top: 4px; display: flex; gap: 8px; align-items: center;">
                    <span class="badge ${badgeClass}">${acc.provider}</span>
                    <code style="font-family: var(--font-code); font-size: var(--text-xs); color: var(--text-muted);">${acc.envKey}</code>
                  </div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn--secondary btn--sm" onclick="window.appAccountManager.testConnection('${acc.id}', this)">Probar Conexión ⚡</button>
                  <button class="btn btn--danger btn--sm" onclick="window.appAccountManager.deleteAccount('${acc.id}')">Eliminar</button>
                </div>
              </div>
              <div class="test-result" id="test-result-${acc.id}" style="margin-top: var(--space-3); font-size: var(--text-xs); display: none; padding: var(--space-2); border-radius: var(--radius-sm);"></div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.error(e);
      listContainer.innerHTML = `<div class="error">Error cargando cuentas: ${e.message}</div>`;
    }
  },

  async saveAccount() {
    try {
      const data = {
        provider: document.getElementById('acc-provider').value,
        label: document.getElementById('acc-label').value.trim(),
        envKey: document.getElementById('acc-envkey').value.trim(),
        apiKey: document.getElementById('acc-apikey').value.trim(),
        active: document.getElementById('acc-active').checked
      };

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resData = await res.json();
      if (resData.ok) {
        alert('Cuenta agregada exitosamente.');
        document.getElementById('account-form').reset();
        await this.loadAccounts();
      } else {
        alert('Error al guardar la cuenta: ' + resData.error);
      }
    } catch (e) {
      alert('Error de red: ' + e.message);
    }
  },

  async deleteAccount(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cuenta?')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        await this.loadAccounts();
      } else {
        alert('Error al eliminar: ' + data.error);
      }
    } catch (e) {
      alert('Error de red: ' + e.message);
    }
  },

  async testConnection(id, button) {
    const originalText = button.textContent;
    button.textContent = 'Probando...';
    button.disabled = true;
    
    const resultDiv = document.getElementById(`test-result-${id}`);
    resultDiv.style.display = 'block';
    resultDiv.style.background = 'rgba(255,255,255,0.05)';
    resultDiv.style.color = 'var(--text-secondary)';
    resultDiv.textContent = 'Enviando petición de prueba al endpoint del proveedor...';

    try {
      const res = await fetch(`/api/accounts/${id}/test`, { method: 'POST' });
      const data = await res.json();
      
      if (data.ok) {
        if (data.status === 'connected') {
          resultDiv.style.background = 'rgba(34, 197, 94, 0.1)';
          resultDiv.style.color = 'var(--success)';
          resultDiv.textContent = `🟢 Conexión Exitosa: ${data.message}`;
        } else if (data.status === 'no_key') {
          resultDiv.style.background = 'rgba(245, 158, 11, 0.1)';
          resultDiv.style.color = 'var(--warning)';
          resultDiv.textContent = `🟡 Advertencia: ${data.message}. Recuerda definir esta llave en el archivo .env local de este servidor para poder probarla.`;
        } else if (data.status === 'no_test') {
          resultDiv.style.background = 'rgba(59, 130, 246, 0.1)';
          resultDiv.style.color = 'var(--info)';
          resultDiv.textContent = `🔵 Info: ${data.message}. La clave ha sido registrada y guardada de forma correcta.`;
        } else {
          resultDiv.style.background = 'rgba(239, 68, 68, 0.1)';
          resultDiv.style.color = 'var(--error)';
          resultDiv.textContent = `🔴 Fallo de Conexión: ${data.message}`;
        }
      } else {
        resultDiv.style.background = 'rgba(239, 68, 68, 0.1)';
        resultDiv.style.color = 'var(--error)';
        resultDiv.textContent = `🔴 Error de la API: ${data.error}`;
      }
    } catch (e) {
      resultDiv.style.background = 'rgba(239, 68, 68, 0.1)';
      resultDiv.style.color = 'var(--error)';
      resultDiv.textContent = `🔴 Error de Red: ${e.message}`;
    } finally {
      button.textContent = originalText;
      button.disabled = false;
    }
  },

  showCustomProviderModal() {
    document.getElementById('custom-provider-modal').style.display = 'flex';
  },

  async saveCustomProvider() {
    try {
      const data = {
        name: document.getElementById('cp-name').value.trim(),
        endpoint: document.getElementById('cp-endpoint').value.trim(),
        models: document.getElementById('cp-models').value.trim()
      };

      const res = await fetch('/api/providers/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const resData = await res.json();
      if (resData.ok) {
        alert('Proveedor agregado exitosamente.');
        document.getElementById('custom-provider-modal').style.display = 'none';
        document.getElementById('custom-provider-form').reset();
        await this.loadProviders();
      } else {
        alert('Error: ' + resData.error);
      }
    } catch (e) {
      alert('Error de red: ' + e.message);
    }
  },

  async syncFreeModels() {
    if (!confirm('¿Escanear proveedores (OpenRouter, NVIDIA, etc.) para autodetectar modelos gratuitos?')) return;
    try {
      const res = await fetch('/api/models/sync-free', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        alert(data.message);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error de red: ' + e.message);
    }
  }
}
