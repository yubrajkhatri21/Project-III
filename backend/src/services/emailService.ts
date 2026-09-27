import { Email, EmailProvider } from '@uptiqai/integrations-sdk';

export interface SendEmailInput {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
}

export interface EmailRuntimeStatus {
    mode: 'live' | 'demo';
    provider: 'resend' | 'outlook';
    configured: boolean;
    message: string;
    from?: string;
}

const DEMO_KEYS = new Set(['test-uptiq-key', 'your_uptiq_api_key_here', 'your-api-key', 'demo-key', '']);

function hasOutlookConfiguration(env: Record<string, string | undefined> = process.env): boolean {
    return Boolean(
        env.OUTLOOK_TENANT_ID &&
        env.OUTLOOK_CLIENT_ID &&
        env.OUTLOOK_CLIENT_SECRET &&
        env.OUTLOOK_USER_EMAIL
    );
}

export function normalizeEmailInput({ to, subject, text, html }: SendEmailInput) {
    const recipients = (Array.isArray(to) ? to : [to])
        .map(item => item?.trim())
        .filter((item): item is string => Boolean(item && item.length > 0));

    const cleanSubject = subject?.trim() ?? '';
    const cleanText = text?.trim() ?? '';
    const cleanHtml = html?.trim() ?? '';

    if (!recipients.length) {
        throw new Error('At least one recipient is required');
    }

    if (!cleanSubject) {
        throw new Error('Email subject is required');
    }

    if (!cleanText && !cleanHtml) {
        throw new Error('Email body is required');
    }

    return {
        recipients,
        subject: cleanSubject,
        text: cleanText,
        html: cleanHtml
    };
}

export function getEmailRuntimeStatus(env: Record<string, string | undefined> = process.env): EmailRuntimeStatus {
    const providerName = (env.EMAIL_PROVIDER || 'resend').toLowerCase();
    const fromAddress = env.EMAIL_FROM || env.OUTLOOK_USER_EMAIL || 'noreply@greencrm.local';
    const apiKey = env.UPTIQ_API_KEY?.trim() ?? '';
    const isRealKey = !!apiKey && !DEMO_KEYS.has(apiKey);
    const outlookReady = hasOutlookConfiguration(env);
    const provider: EmailRuntimeStatus['provider'] =
        providerName === 'outlook' ? 'outlook' : 'resend';

    if (provider === 'outlook' && outlookReady) {
        return {
            mode: 'live',
            provider: 'outlook',
            configured: true,
            from: fromAddress,
            message: 'Outlook integration is configured for live sending via Microsoft Graph.'
        };
    }

    if (!isRealKey && !outlookReady) {
        return {
            mode: 'demo',
            provider,
            configured: false,
            from: fromAddress,
            message: 'Email is running in demo mode. Add a real provider configuration to send live emails.'
        };
    }

    return {
        mode: 'live',
        provider,
        configured: true,
        from: fromAddress,
        message: provider === 'outlook'
            ? 'Outlook integration is configured for live sending.'
            : 'Email integration is configured for live sending.'
    };
}

export async function sendTransactionalEmail({ to, subject, text, html, from }: SendEmailInput) {
    const { recipients, subject: cleanSubject, text: cleanText, html: cleanHtml } = normalizeEmailInput({ to, subject, text, html });
    const status = getEmailRuntimeStatus();
    const configuredFrom = from || process.env.EMAIL_FROM || 'noreply@greencrm.local';

    if (status.mode === 'demo') {
        console.warn('Email API not configured; using local demo mode for email send.');
        return {
            success: true,
            id: `demo-${Date.now()}`,
            provider: status.provider,
            from: configuredFrom,
            mode: 'demo',
            message: 'Email queued in demo mode. Add a real UPTIQ API key and provider settings to send live emails.'
        };
    }

    const email = new Email({ provider: EmailProvider.Resend });

    const result = await email.sendEmail({
        to: recipients,
        subject: cleanSubject,
        ...(cleanText ? { text: cleanText } : {}),
        ...(cleanHtml ? { html: cleanHtml } : {})
    });

    return {
        success: true,
        ...result,
        provider: status.provider,
        from: configuredFrom,
        mode: 'live',
        message: 'Email sent successfully.'
    };
}
