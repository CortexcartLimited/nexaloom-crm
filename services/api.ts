const API_BASE = '/crm/nexaloom-crm/api';

export const api = {
  getTasks: async (tenantId: string) => {
    // Mock data for now
    return [];
  },
  updateLead: async (id: string, updates: any) => {
    const response = await fetch(`${API_BASE}/leads/${id}`, {
      method: 'PATCH', // Using PATCH for partial updates
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.ok;
  },

  getLeads: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/leads?tenantId=${tenantId}`);
    if (!response.ok) return [];
    return response.json();
  },
  createLead: async (lead: any) => {
    const response = await fetch(`${API_BASE}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create lead');
    }
    return response.json();
  },
  updateLeadStatus: async (leadId: string, status: string) => {
    const response = await fetch(`${API_BASE}/leads/${leadId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update lead status');
    }
    return response.json();
  },

  // Products
  getProducts: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/products?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },
  createProduct: async (product: any) => {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },

  // Discounts
  getDiscounts: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/discounts?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch discounts');
    return response.json();
  },
  addDiscount: async (discount: any) => {
    const response = await fetch(`${API_BASE}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discount),
    });
    return response.ok;
  },

  // Interactions
  getInteractions: async (tenantId: string, leadId?: string) => {
    let url = `${API_BASE}/interactions?tenantId=${tenantId}`;
    if (leadId) {
      url += `&leadId=${leadId}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch interactions');
    return response.json();
  },
  createInteraction: async (interaction: any) => {
    const response = await fetch(`${API_BASE}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interaction),
    });
    if (!response.ok) throw new Error('Failed to create interaction');
    return response.json();
  },

  // Tasks
  getTasks: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/tasks?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },
  createTask: async (task: any) => {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error('Failed to create task');
    return response.json();
  },
  updateTask: async (id: string, updates: any) => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  },
  deleteTask: async (id: string, tenantId?: string) => {
    const response = await fetch(`${API_BASE}/tasks/${id}${tenantId ? `?tenantId=${tenantId}` : ''}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete task');
    return response.json();
  },

  // Documents
  getDocuments: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/documents?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  },
  uploadDocument: async (formData: FormData) => {
    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData, // fetch automatically sets Content-Type to multipart/form-data
    });
    if (!response.ok) throw new Error('Failed to upload document');
    return response.json();
  },
  deleteDocument: async (id: string) => {
    const response = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete document');
    return response.json();
  },
};