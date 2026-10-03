import { Email, EmailProvider } from '@uptiqai/integrations-sdk';
import { hasGmailConfiguration, sendGmailEmail } from './gmailService.ts';

export interface EmailAttachmentInput {
    filename: string;
    mimeType?: string;
    contentBase64: string;
}

export interface SendEmailInput {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    attachments?: EmailAttachmentInput[];
}

export interface EmailRuntimeStatus {
    mode: 'live' | 'demo';
    provider: 'resend' | 'outlook' | 'gmail';
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

const EMAIL_ADDRESS_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z0-9-]+$/i;

function normalizeRecipient(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error('Recipient email address is required.');
    }

    const addressMatch = trimmed.match(/<([^>]+)>/);
    const emailCandidate = (addressMatch ? addressMatch[1] : trimmed).trim();

    if (!EMAIL_ADDRESS_PATTERN.test(emailCandidate)) {
        throw new Error(`Invalid recipient email address: "${trimmed}"`);
    }

    return emailCandidate;
}

export function normalizeEmailInput({ to, subject, text, html }: SendEmailInput) {
    const recipients = (Array.isArray(to) ? to : [to])
        .flatMap(item => {
            if (typeof item !== 'string') {
                return [];
            }

            return item
                .split(/[;,]/)
                .map(part => part.trim())
                .filter(Boolean);
        })
        .map(normalizeRecipient)
        .filter((value, index, array) => array.indexOf(value) === index);

    const cleanSubject = subject?.trim() ?? '';
    const cleanText = text?.trim() ?? '';
    const cleanHtml = html?.trim() ?? '';

    if (!recipients.length) {
        throw new Error('At least one valid recipient email is required');
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
    const providerName = (env.EMAIL_PROVIDER || 'gmail').toLowerCase();
    const fromAddress = env.EMAIL_FROM || env.OUTLOOK_USER_EMAIL || env.GMAIL_USER_EMAIL || 'noreply@greencrm.local';
    const apiKey = env.UPTIQ_API_KEY?.trim() ?? '';
    const isRealKey = !!apiKey && !DEMO_KEYS.has(apiKey);
    const outlookReady = hasOutlookConfiguration(env);
    const gmailReady = hasGmailConfiguration(env);

    if (providerName === 'gmail' && gmailReady) {
        return {
            mode: 'live',
            provider: 'gmail',
            configured: true,
            from: fromAddress,
            message: 'Gmail integration is configured for live sending via Google OAuth.'
        };
    }

    if (providerName === 'outlook' && outlookReady) {
        return {
            mode: 'live',
            provider: 'outlook',
            configured: true,
            from: fromAddress,
            message: 'Outlook integration is configured for live sending via Microsoft Graph.'
        };
    }

    if (!isRealKey && !outlookReady && !gmailReady) {
        return {
            mode: 'demo',
            provider: providerName === 'outlook' ? 'outlook' : providerName === 'gmail' ? 'gmail' : 'resend',
            configured: false,
            from: fromAddress,
            message: 'Email is running in demo mode. Add Gmail OAuth or another provider to send live emails.'
        };
    }

    return {
        mode: 'live',
        provider: providerName === 'outlook' ? 'outlook' : providerName === 'gmail' ? 'gmail' : 'resend',
        configured: true,
        from: fromAddress,
        message: providerName === 'outlook'
            ? 'Outlook integration is configured for live sending.'
            : providerName === 'gmail'
                ? 'Gmail integration is configured for live sending.'
                : 'Email integration is configured for live sending.'
    };
}

export async function sendTransactionalEmail({ to, subject, text, html, from, attachments }: SendEmailInput) {
    const { recipients, subject: cleanSubject, text: cleanText, html: cleanHtml } = normalizeEmailInput({ to, subject, text, html });
    const status = getEmailRuntimeStatus();
    const configuredFrom = from || process.env.EMAIL_FROM || process.env.GMAIL_USER_EMAIL || 'noreply@greencrm.local';

    if (status.provider === 'gmail' && status.configured) {
        return sendGmailEmail({
            to: recipients,
            subject: cleanSubject,
            text: cleanText,
            html: cleanHtml,
            from: configuredFrom,
            attachments
        });
    }

    if (status.mode === 'demo') {
        console.warn('Email API not configured; using local demo mode for email send.');
        return {
            success: true,
            id: `demo-${Date.now()}`,
            provider: status.provider,
            from: configuredFrom,
            mode: 'demo',
            message: 'Email queued in demo mode. Add Gmail OAuth or another provider to send live emails.'
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
