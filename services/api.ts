const API_BASE = '/crm/nexaloom-crm/api';

export const api = {
  // getTasks removed (mock)
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

  // Proposals
  getProposals: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/proposals?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch proposals');
    return response.json();
  },
  createProposal: async (proposal: any) => {
    const response = await fetch(`${API_BASE}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposal),
    });
    if (!response.ok) throw new Error('Failed to create proposal');
    return response.json();
  },
  updateProposal: async (id: string, updates: any) => {
    const response = await fetch(`${API_BASE}/proposals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update proposal');
    return response.json();
  },
  deleteProposal: async (id: string) => {
    const response = await fetch(`${API_BASE}/proposals/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete proposal');
    return response.json();
  },

  // Knowledge Base
  getArticles: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/knowledge-base?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch articles');
    return response.json();
  },
  createArticle: async (article: any) => {
    const response = await fetch(`${API_BASE}/knowledge-base`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(article),
    });
    if (!response.ok) throw new Error('Failed to create article');
    return response.json();
  },
  updateArticle: async (id: string, updates: any) => {
    const response = await fetch(`${API_BASE}/knowledge-base/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update article');
    return response.json();
  },
  deleteArticle: async (id: string) => {
    const response = await fetch(`${API_BASE}/knowledge-base/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete article');
    return response.json();
  },

  // Tickets
  getTickets: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/tickets?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
  },
  createTicket: async (ticket: any) => {
    const response = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    });
    if (!response.ok) throw new Error('Failed to create ticket');
    return response.json();
  },
  updateTicket: async (id: string, updates: any) => {
    const response = await fetch(`${API_BASE}/tickets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update ticket');
    return response.json();
  },
  deleteTicket: async (id: string) => {
    const response = await fetch(`${API_BASE}/tickets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete ticket');
    return response.json();
  },

  // Users
  getUsers: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/users?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },
  createUser: async (user: any) => {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },
  updateUser: async (id: string, updates: any) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },
  deleteUser: async (id: string) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  // Settings
  getSettings: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/settings?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  },
  updateSettings: async (updates: any) => {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update settings');
    return response.json();
  },
  initTenant: async (id: string, name: string) => {
    await fetch(`${API_BASE}/settings/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
  }
};