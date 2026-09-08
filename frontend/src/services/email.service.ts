import { api } from '@/lib/api';

export interface SendEmailRequest {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}

export const emailService = {
    sendEmail: async (payload: SendEmailRequest) => {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            return {
                success: true,
                message: 'Email sent in demo mode.',
                id: 'mock-email-id',
                provider: 'Resend',
                mode: 'demo'
            };
        }

        const response = await api.post('/emails/send', payload);
        return response.data;
    }
};
