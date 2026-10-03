import { api } from '@/lib/api';

export type CrmResource = 'deals' | 'tasks' | 'tickets' | 'products' | 'quotes' | 'invoices' | 'activities' | 'notifications' | 'automations';

export interface CrmActivity {
    id: string;
    type: string;
    description: string;
    entityType?: string | null;
    entityId?: string | null;
    occurredAt: string;
}

const activityStorageKey = () => {
    const savedUser = localStorage.getItem('user');
    const user = savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
    return user?.id ? `crm_activities_${user.id}` : 'crm_activities';
};

export const crmService = {
    list: async <T = any>(resource: CrmResource, params?: { q?: string; status?: string }) =>
        (await api.get<{ [key: string]: T[] }>(`/crm/${resource}`, { params })).data[resource] || [],
    create: async <T = any>(resource: CrmResource, data: Record<string, unknown>) =>
        (await api.post<{ [key: string]: T }>(`/crm/${resource}`, data)).data[resource === 'automations' ? 'automation' : resource.slice(0, -1)] as T,
    update: async <T = any>(resource: CrmResource, id: string, data: Record<string, unknown>) =>
        (await api.patch<{ [key: string]: T }>(`/crm/${resource}/${id}`, data)).data[resource === 'automations' ? 'automation' : resource.slice(0, -1)] as T,
    archive: async (resource: CrmResource, id: string) => api.delete(`/crm/${resource}/${id}`),
    executeAutomation: async (id: string) => (await api.post(`/crm/automations/${id}/execute`)).data,
    testAutomation: async (data: { trigger: string; conditions: Array<{ field: string; operator: string; value: string | number }> }) =>
        (await api.post('/crm/automations/test', data)).data,
    automationRuns: async () => (await api.get('/crm/automation-runs')).data.runs || [],
    summary: async () => (await api.get('/crm/summary')).data,
    auditLogs: async () => (await api.get('/crm/audit-logs')).data.logs,
    users: async () => (await api.get('/crm/users')).data.users,
    listEntityActivities: async (entityType: string, entityId: string): Promise<CrmActivity[]> => {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            const activities: CrmActivity[] = JSON.parse(localStorage.getItem(activityStorageKey()) || '[]');
            return activities
                .filter(activity => activity.entityType === entityType && activity.entityId === entityId)
                .sort((first, second) => Date.parse(second.occurredAt) - Date.parse(first.occurredAt));
        }
        const response = await api.get<{ activities: CrmActivity[] }>('/crm/activities', {
            params: { entityType, entityId }
        });
        return response.data.activities;
    },
    createEntityActivity: async (activity: Omit<CrmActivity, 'id' | 'occurredAt'> & { occurredAt?: string }): Promise<CrmActivity> => {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            const created: CrmActivity = {
                ...activity,
                id: crypto.randomUUID(),
                occurredAt: activity.occurredAt || new Date().toISOString()
            };
            const activities: CrmActivity[] = JSON.parse(localStorage.getItem(activityStorageKey()) || '[]');
            localStorage.setItem(activityStorageKey(), JSON.stringify([created, ...activities]));
            return created;
        }
        const response = await api.post<{ activity: CrmActivity }>('/crm/activities', activity);
        return response.data.activity;
    }
};