// services/api.ts
const API_BASE = '/crm/nexaloom-crm/api';

export const api = {
  getTasks: async (tenantId: string) => {
    const response = await fetch(`${API_BASE}/tasks?tenantId=${tenantId}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  }
getLeads: async (tenantId: string) => {
    const response = await fetch(`/crm/nexaloom-crm/api/leads?tenantId=${tenantId}`);
    if (!response.ok) return [];
    return response.json();
  }
};