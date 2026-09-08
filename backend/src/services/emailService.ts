import { Email, EmailProvider } from '@uptiqai/integrations-sdk';

export interface SendEmailInput {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}

export async function sendTransactionalEmail({ to, subject, text, html }: SendEmailInput) {
    const recipients = (Array.isArray(to) ? to : [to])
        .map(item => item?.trim())
        .filter(Boolean) as string[];

    if (!recipients.length) {
        throw new Error('At least one recipient is required');
    }

    if (!subject || !subject.trim()) {
        throw new Error('Email subject is required');
    }

    if (!text && !html) {
        throw new Error('Email body is required');
    }

    const hasRealProviderKey = !!process.env.UPTIQ_API_KEY &&
        !['test-uptiq-key', 'your_uptiq_api_key_here', 'your-api-key'].includes(process.env.UPTIQ_API_KEY.trim());

    if (!hasRealProviderKey) {
        console.warn('UPTIQ email API key is not configured; using local demo mode for email send.');
        return {
            success: true,
            id: `demo-${Date.now()}`,
            provider: 'Resend',
            mode: 'demo',
            message: 'Email queued in demo mode. Add a real UPTIQ API key to send from production.'
        };
    }

    const email = new Email({ provider: EmailProvider.Resend });
    const result = await email.sendEmail({
        to: recipients,
        subject: subject.trim(),
        ...(text ? { text } : {}),
        ...(html ? { html } : {})
    });

    return {
        success: true,
        ...result,
        mode: 'live',
        message: 'Email sent successfully.'
    };
}
