import { api } from '@/lib/api';

export interface EmailAttachmentRequest {
    filename: string;
    mimeType?: string;
    contentBase64: string;
}

export interface SendEmailRequest {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    attachments?: EmailAttachmentRequest[];
}

export interface EmailStatusResponse {
    success: boolean;
    mode: 'live' | 'demo';
    provider: 'resend' | 'outlook' | 'gmail';
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
                provider: 'gmail',
                configured: false,
                message: 'Email integration is in demo mode. Add Gmail OAuth credentials in the backend to switch to live Gmail API.'
            };
        }

        const response = await api.get('/emails/status');
        return response.data;
    },

    getGmailAuthUrl: async (): Promise<{ success: boolean; url: string }> => {
        const response = await api.get('/emails/gmail/auth-url');
        return response.data;
    },

    getGmailInbox: async () => {
        const response = await api.get('/emails/gmail/inbox');
        return response.data;
    },

    connectGmail: async () => {
        const response = await emailService.getGmailAuthUrl();
        if (response?.url) {
            window.open(response.url, '_blank', 'noopener,noreferrer');
            return true;
        }
        return false;
    },

    sendEmail: async (payload: SendEmailRequest) => {
        if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
            return {
                success: true,
                message: 'Email sent in demo mode using Gmail-compatible mock output.',
                id: 'mock-email-id',
                provider: 'gmail',
                mode: 'demo'
            };
        }

        const response = await api.post('/emails/send', payload);
        return response.data;
    }
};
