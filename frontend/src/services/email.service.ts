import { api } from '@/lib/api';

export interface SendEmailRequest {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
}

export interface EmailStatusResponse {
    success: boolean;
    mode: 'live' | 'demo';
    provider: 'resend' | 'outlook';
    configured: boolean;
    message: string;
    from?: string;
}

export const emailService = {
    getStatus: async (): Promise<EmailStatusResponse> => {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            return {
                success: true,
                mode: 'demo',
                provider: 'resend',
                configured: false,
                message: 'Email integration is in demo mode.'
            };
        }

        const response = await api.get('/emails/status');
        return response.data;
    },

    sendEmail: async (payload: SendEmailRequest) => {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            return {
                success: true,
                message: 'Email sent in demo mode.',
                id: 'mock-email-id',
                provider: 'resend',
                mode: 'demo'
            };
        }

        const response = await api.post('/emails/send', payload);
        return response.data;
    }
};
