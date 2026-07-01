import { promises as fs } from 'fs';
import path from 'path';

let providersCatalog = null;

async function loadCatalog() {
  if (!providersCatalog) {
    const data = await fs.readFile(path.join(process.cwd(), 'src/data/providers-catalog.json'), 'utf-8');
    providersCatalog = JSON.parse(data);
  }
  return providersCatalog;
}

export async function getAllProviders() {
  const catalog = await loadCatalog();
  return catalog.providers;
}

export async function getProvider(id) {
  const catalog = await loadCatalog();
  return catalog.providers.find(p => p.id === id);
}

export async function testConnection(providerId, apiKey) {
  const provider = await getProvider(providerId);
  if (!provider) throw new Error(`Provider ${providerId} no encontrado`);
  
  if (!provider.testEndpoint) {
    return { success: true, message: 'Test simulado (sin endpoint definido)' };
  }
  
  try {
    const headers = {
      'Authorization': provider.authType === 'Bearer' ? `Bearer ${apiKey}` : apiKey,
      'Content-Type': 'application/json'
    };
    
    let testEndpoint = provider.testEndpoint;
    if (providerId === 'xiaomi') {
      if (apiKey && apiKey.startsWith('sk-')) {
        testEndpoint = 'https://api.xiaomimimo.com/v1/models';
      } else {
        testEndpoint = 'https://token-plan-sgp.xiaomimimo.com/v1/models';
      }
    }

    // Test simple dependiendo del endpoint (usualmente /v1/models)
    const response = await fetch(testEndpoint, { headers });
    
    if (response.ok) {
      return { success: true, message: 'Conexión exitosa' };
    } else {
      return { success: false, message: `Error HTTP: ${response.status}` };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}
