import { api } from '@/lib/api';

export type CrmResource = 'deals' | 'tasks' | 'tickets' | 'products' | 'quotes' | 'invoices' | 'activities' | 'notifications' | 'automations';

export const crmService = {
    list: async <T = any>(resource: CrmResource, params?: { q?: string; status?: string }) =>
        (await api.get<{ [key: string]: T[] }>(`/crm/${resource}`, { params })).data[resource] || [],
    create: async <T = any>(resource: CrmResource, data: Record<string, unknown>) =>
        (await api.post<{ [key: string]: T }>(`/crm/${resource}`, data)).data[resource === 'automations' ? 'automation' : resource.slice(0, -1)] as T,
    update: async <T = any>(resource: CrmResource, id: string, data: Record<string, unknown>) =>
        (await api.patch<{ [key: string]: T }>(`/crm/${resource}/${id}`, data)).data[resource === 'automations' ? 'automation' : resource.slice(0, -1)] as T,
    archive: async (resource: CrmResource, id: string) => api.delete(`/crm/${resource}/${id}`),
    executeAutomation: async (id: string) => (await api.post(`/crm/automations/${id}/execute`)).data,
    summary: async () => (await api.get('/crm/summary')).data,
    auditLogs: async () => (await api.get('/crm/audit-logs')).data.logs,
    users: async () => (await api.get('/crm/users')).data.users
};