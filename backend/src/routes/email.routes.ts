import fs from 'node:fs';
import path from 'node:path';
import { Hono } from 'hono';
import { buildGmailAuthUrl, exchangeGmailCode, getGmailRuntimeStatus, listGmailInbox } from '../services/gmailService.ts';
import { getEmailRuntimeStatus, sendTransactionalEmail } from '../services/emailService.ts';
import catchAsync from '../utils/catchAsync.ts';

const emailRoutes = new Hono();

function saveGmailTokens(tokens: { access_token?: string; refresh_token?: string }) {
    if (!tokens.access_token && !tokens.refresh_token) {
        return;
    }

    const envPath = path.resolve(process.cwd(), '.env');
    const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/) : [];

    const setEnvValue = (key: string, value: string) => {
        const nextLines = [...lines];
        const index = nextLines.findIndex(line => line.startsWith(`${key}=`));
        const normalizedValue = value.replace(/\r/g, '');

        if (index >= 0) {
            nextLines[index] = `${key}=${normalizedValue}`;
        } else {
            nextLines.push(`${key}=${normalizedValue}`);
        }

        fs.writeFileSync(envPath, `${nextLines.join('\n')}\n`, 'utf8');
    };

    if (tokens.access_token) {
        setEnvValue('GMAIL_ACCESS_TOKEN', tokens.access_token);
        process.env.GMAIL_ACCESS_TOKEN = tokens.access_token;
    }

    if (tokens.refresh_token) {
        setEnvValue('GMAIL_REFRESH_TOKEN', tokens.refresh_token);
        process.env.GMAIL_REFRESH_TOKEN = tokens.refresh_token;
    }
}

emailRoutes.get('/status', catchAsync(async c => {
    return c.json({
        success: true,
        ...getEmailRuntimeStatus()
    }, 200);
}));

emailRoutes.get('/gmail/status', catchAsync(async c => {
    return c.json({
        success: true,
        ...getGmailRuntimeStatus()
    }, 200);
}));

emailRoutes.get('/gmail/inbox', catchAsync(async c => {
    const messages = await listGmailInbox();
    return c.json({
        success: true,
        messages
    }, 200);
}));

emailRoutes.get('/gmail/auth-url', catchAsync(async c => {
    return c.json({
        success: true,
        url: buildGmailAuthUrl()
    }, 200);
}));

emailRoutes.get('/gmail/callback', catchAsync(async c => {
    const code = c.req.query('code');
    if (!code) {
        return c.json({
            success: false,
            message: 'Google OAuth code is required.'
        }, 400);
    }

    const tokens = await exchangeGmailCode(code);
    saveGmailTokens(tokens);

    const frontendUrl = process.env.FRONTEND_DOMAIN || 'http://localhost:5173';
    const redirectUrl = new URL('/auth/gmail-callback', frontendUrl);
    redirectUrl.searchParams.set('status', 'success');
    redirectUrl.searchParams.set('message', 'Gmail OAuth exchange completed successfully.');
    redirectUrl.searchParams.set('accessToken', tokens.access_token || '');

    return c.redirect(redirectUrl.toString());
}));

emailRoutes.post('/send', catchAsync(async c => {
    const body = await c.req.json();
    const { to, subject, text, html, from, attachments } = body ?? {};

    if (!to || !subject) {
        return c.json({
            success: false,
            message: 'Recipient and subject are required.'
        }, 400);
    }

    const result = await sendTransactionalEmail({
        to,
        subject,
        text,
        html,
        from,
        attachments
    });

    return c.json({
        ...result,
        success: true
    }, 200);
}));

export default emailRoutes;
