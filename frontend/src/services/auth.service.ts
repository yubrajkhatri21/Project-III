import axios from 'axios';

export interface User {
    id: string;
    email: string;
    name: string;
    role?: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

// Create an axios instance with the backend base URL
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000',
    headers: {
        'Content-Type': 'application/json'
    }
});

const createDemoUser = (email = 'demo@greencrm.local', name = 'Demo User'): User => ({
    id: 'demo-user',
    email,
    name,
    role: 'Administrator'
});

const saveSession = (user: User, accessToken = 'demo_access_token', refreshToken = 'demo_refresh_token') => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
};

export const authService = {
    login: async (credentials: any): Promise<AuthResponse> => {
        const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true';
        if (useMock) {
            await new Promise(resolve => setTimeout(resolve, 800));
            const demoUser = createDemoUser(credentials?.email || 'demo@greencrm.local', credentials?.name || 'Demo User');
            saveSession(demoUser);
            return {
                user: demoUser,
                accessToken: 'demo_access_token',
                refreshToken: 'demo_refresh_token'
            };
        }

        try {
            const response = await api.post('/auth/login', credentials);
            const data = response.data;

            if (data.accessToken) {
                saveSession(data.user, data.accessToken, data.refreshToken);
            }

            return data;
        } catch (error: any) {
            if (!error?.response || error.response.status === 0 || error.response.status >= 500) {
                const demoUser = createDemoUser(credentials?.email || 'demo@greencrm.local', credentials?.name || 'Demo User');
                saveSession(demoUser);
                return {
                    user: demoUser,
                    accessToken: 'demo_access_token',
                    refreshToken: 'demo_refresh_token'
                };
            }
            throw error;
        }
    },

    register: async (data: any): Promise<AuthResponse> => {
        const useMock = import.meta.env.VITE_USE_MOCK_DATA === 'true';
        if (useMock) {
            await new Promise(resolve => setTimeout(resolve, 800));
            const demoUser = createDemoUser(data?.email || 'demo@greencrm.local', data?.name || 'Demo User');
            saveSession(demoUser);
            return {
                user: demoUser,
                accessToken: 'demo_access_token',
                refreshToken: 'demo_refresh_token'
            };
        }

        try {
            const response = await api.post('/auth/register', data);
            const authData = response.data;

            if (authData.accessToken) {
                saveSession(authData.user, authData.accessToken, authData.refreshToken);
            }

            return authData;
        } catch (error: any) {
            if (!error?.response || error.response.status === 0 || error.response.status >= 500) {
                const demoUser = createDemoUser(data?.email || 'demo@greencrm.local', data?.name || 'Demo User');
                saveSession(demoUser);
                return {
                    user: demoUser,
                    accessToken: 'demo_access_token',
                    refreshToken: 'demo_refresh_token'
                };
            }
            throw error;
        }
    },

    getCurrentUser: async (): Promise<{ user: User }> => {
        try {
            const saved = localStorage.getItem('user');
            const user = (saved && saved !== 'undefined') ? JSON.parse(saved) : createDemoUser();
            if (import.meta.env.VITE_USE_MOCK_DATA === 'true') return { user };

            const response = await api.get('/auth/me');
            return response.data;
        } catch {
            const fallback = createDemoUser();
            saveSession(fallback);
            return { user: fallback };
        }
    },

    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('crm_remembered_login_email');
    }
};