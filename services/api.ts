const API_BASE = '/crm/nexaloom-crm/api';

const getHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('nexaloom_token');

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn("API Request: No token found in localStorage (nexaloom_token)");
  }
  return headers;
};

// Helper for requests
const req = async (endpoint: string, options: RequestInit = {}) => {
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };
  // Ensure content-type provided for POST/PUT if body exists and not FormData
  if (config.body && typeof config.body === 'string' && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  // For FormData, remove Content-Type to let browser set boundary
  if (config.body instanceof FormData) {
    const { 'Content-Type': ct, ...rest } = config.headers as any;
    config.headers = rest;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  if (response.status === 401) {
    // Handle unauthorized (optional: dispatch event or redirect)
    console.warn('Unauthorized access. Token might be invalid.');
  }
  return response;
};

export const api = {
  // Auth
  login: async (credentials: any) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Login failed');
    }
    return response.json();
  },
  getMe: async () => {
    const response = await req('/auth/me');
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },
  // getTasks removed (mock)
  updateLead: async (id: string, updates: any) => {
    const response = await req(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.ok;
  },

  getLeads: async (tenantId: string) => {
    const response = await req(`/leads?tenantId=${tenantId}`);
    if (!response.ok) return [];
    return response.json();
  },
  createLead: async (lead: any) => {
    const response = await req(`/leads`, {
      method: 'POST',
      body: JSON.stringify(lead),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create lead');
    }
    return response.json();
  },
  updateLeadStatus: async (leadId: string, status: string) => {
    const response = await req(`/leads/${leadId}/status`, {
      method: 'PATCH',
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
    const response = await req(`/products?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },
  createProduct: async (product: any) => {
    const response = await req(`/products`, {
      method: 'POST',
      body: JSON.stringify(product),
    });
    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  },

  // Discounts
  getDiscounts: async (tenantId: string) => {
    const response = await req(`/discounts?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch discounts');
    return response.json();
  },
  addDiscount: async (discount: any) => {
    const response = await req(`/discounts`, {
      method: 'POST',
      body: JSON.stringify(discount),
    });
    return response.ok;
  },

  // Interactions
  getInteractions: async (tenantId: string, leadId?: string) => {
    let url = `/interactions?tenantId=${tenantId}`;
    if (leadId) {
      url += `&leadId=${leadId}`;
    }
    const response = await req(url);
    if (!response.ok) throw new Error('Failed to fetch interactions');
    return response.json();
  },
  createInteraction: async (interaction: any) => {
    const response = await req(`/interactions`, {
      method: 'POST',
      body: JSON.stringify(interaction),
    });
    if (!response.ok) throw new Error('Failed to create interaction');
    return response.json();
  },

  // Tasks
  getTasks: async (tenantId: string) => {
    const response = await req(`/tasks?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },
  createTask: async (task: any) => {
    const response = await req(`/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error('Failed to create task');
    return response.json();
  },
  updateTask: async (id: string, updates: any) => {
    const response = await req(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  },
  deleteTask: async (id: string, tenantId?: string) => {
    const response = await req(`/tasks/${id}${tenantId ? `?tenantId=${tenantId}` : ''}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete task');
    return response.json();
  },

  // Documents
  getDocuments: async (tenantId: string) => {
    const response = await req(`/documents?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  },
  uploadDocument: async (formData: FormData) => {
    const response = await req(`/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload document');
    return response.json();
  },
  deleteDocument: async (id: string) => {
    const response = await req(`/documents/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete document');
    return response.json();
  },

  // Proposals
  getProposals: async (tenantId: string) => {
    const response = await req(`/proposals?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch proposals');
    return response.json();
  },
  getProposal: async (id: string) => {
    const response = await req(`/proposals/${id}`);
    if (!response.ok) throw new Error('Failed to fetch proposal');
    return response.json();
  },
  createProposal: async (proposal: any) => {
    const response = await req(`/proposals`, {
      method: 'POST',
      body: JSON.stringify(proposal),
    });
    if (!response.ok) throw new Error('Failed to create proposal');
    return response.json();
  },
  updateProposal: async (id: string, updates: any) => {
    const response = await req(`/proposals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update proposal');
    return response.json();
  },
  deleteProposal: async (id: string) => {
    const response = await req(`/proposals/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete proposal');
    return response.json();
  },

  // Knowledge Base
  getArticles: async (tenantId: string) => {
    const response = await req(`/knowledge-base?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch articles');
    return response.json();
  },
  createArticle: async (article: any) => {
    const response = await req(`/knowledge-base`, {
      method: 'POST',
      body: JSON.stringify(article),
    });
    if (!response.ok) throw new Error('Failed to create article');
    return response.json();
  },
  updateArticle: async (id: string, updates: any) => {
    const response = await req(`/knowledge-base/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update article');
    return response.json();
  },
  deleteArticle: async (id: string) => {
    const response = await req(`/knowledge-base/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete article');
    return response.json();
  },

  // Tickets
  getTickets: async (tenantId: string) => {
    const response = await req(`/tickets?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return response.json();
  },
  createTicket: async (ticket: any) => {
    const response = await req(`/tickets`, {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
    if (!response.ok) throw new Error('Failed to create ticket');
    return response.json();
  },
  updateTicket: async (id: string, updates: any) => {
    const response = await req(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update ticket');
    return response.json();
  },
  deleteTicket: async (id: string) => {
    const response = await req(`/tickets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete ticket');
    return response.json();
  },

  // Users
  getUsers: async (tenantId: string) => {
    const response = await req(`/users?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },
  createUser: async (user: any) => {
    const response = await req(`/users`, {
      method: 'POST',
      body: JSON.stringify(user),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },
  updateUser: async (id: string, updates: any) => {
    const response = await req(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },
  deleteUser: async (id: string) => {
    const response = await req(`/users/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  // Settings
  getSettings: async (tenantId: string) => {
    const response = await req(`/settings?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  },
  updateSettings: async (updates: any) => {
    const response = await req(`/settings`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update settings');
    return response.json();
  },
  initTenant: async (id: string, name: string) => {
    await req(`/settings/init`, {
      method: 'POST',
      body: JSON.stringify({ id, name }),
    });
  }
};