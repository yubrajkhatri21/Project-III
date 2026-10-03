import crypto from 'node:crypto';

export interface GmailOAuthTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    id_token?: string;
}

export function hasGmailConfiguration(env: Record<string, string | undefined> = process.env): boolean {
    return Boolean(
        (env.GOOGLE_GMAIL_CLIENT_ID || env.GOOGLE_OAUTH_CLIENT_ID) &&
        (env.GOOGLE_GMAIL_CLIENT_SECRET || env.GOOGLE_OAUTH_CLIENT_SECRET) &&
        (env.GOOGLE_GMAIL_REDIRECT_URI || env.GOOGLE_OAUTH_REDIRECT_URI)
    );
}

export function getGmailRuntimeStatus(env: Record<string, string | undefined> = process.env) {
    const configured = hasGmailConfiguration(env);
    return {
        provider: 'gmail' as const,
        configured,
        mode: configured ? ('live' as const) : ('demo' as const),
        message: configured
            ? 'Gmail API is configured for live sending via Google OAuth.'
            : 'Gmail API is not configured. Add OAuth credentials and tokens to enable live Gmail access.'
    };
}

export function buildGmailAuthUrl(env: Record<string, string | undefined> = process.env): string {
    const clientId = env.GOOGLE_GMAIL_CLIENT_ID || env.GOOGLE_OAUTH_CLIENT_ID;
    const redirectUri = env.GOOGLE_GMAIL_REDIRECT_URI || env.GOOGLE_OAUTH_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        throw new Error('Gmail OAuth client ID and redirect URI are required.');
    }

    const state = crypto.randomUUID();
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: 'https://www.googleapis.com/auth/gmail.send',
        state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function fetchGoogleToken(payload: Record<string, string>, env: Record<string, string | undefined> = process.env): Promise<GmailOAuthTokenResponse> {
    const clientId = env.GOOGLE_GMAIL_CLIENT_ID || env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = env.GOOGLE_GMAIL_CLIENT_SECRET || env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Gmail OAuth client credentials are missing.');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            ...payload
        }).toString()
    });

    const data = await response.json() as { error?: { message?: string } } & Partial<GmailOAuthTokenResponse>;
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to exchange Gmail OAuth token.');
    }

    return data as GmailOAuthTokenResponse;
}

export async function exchangeGmailCode(code: string, env: Record<string, string | undefined> = process.env): Promise<GmailOAuthTokenResponse> {
    const redirectUri = env.GOOGLE_GMAIL_REDIRECT_URI || env.GOOGLE_OAUTH_REDIRECT_URI;
    if (!redirectUri) {
        throw new Error('Gmail OAuth redirect URI is missing.');
    }

    return fetchGoogleToken({
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    }, env);
}

export async function refreshGmailAccessToken(env: Record<string, string | undefined> = process.env): Promise<GmailOAuthTokenResponse> {
    const refreshToken = env.GMAIL_REFRESH_TOKEN || env.GOOGLE_GMAIL_REFRESH_TOKEN;
    if (!refreshToken) {
        throw new Error('Gmail refresh token is missing.');
    }

    return fetchGoogleToken({
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
    }, env);
}

export async function getGmailAccessToken(env: Record<string, string | undefined> = process.env): Promise<string> {
    const accessToken = env.GMAIL_ACCESS_TOKEN || env.GOOGLE_GMAIL_ACCESS_TOKEN;
    if (accessToken) {
        return accessToken;
    }

    const refreshed = await refreshGmailAccessToken(env);
    return refreshed.access_token;
}

function normalizeGmailAddress(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error('Recipient email address is required.');
    }

    const match = trimmed.match(/<([^>]+)>/);
    const candidate = (match ? match[1] : trimmed).trim();
    const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z0-9-]+$/i;

    if (!emailPattern.test(candidate)) {
        throw new Error(`Invalid recipient email address: "${trimmed}"`);
    }

    return candidate;
}

function formatEmailAddressList(value: string | string[]): string {
    const recipients = Array.isArray(value) ? value : [value];
    return recipients
        .flatMap(item => (typeof item !== 'string' ? [] : item.split(/[;,]/)))
        .map(item => item.trim())
        .filter(Boolean)
        .map(normalizeGmailAddress)
        .filter((item, index, array) => array.indexOf(item) === index)
        .join(', ');
}

function createGmailRawMessage({
    to,
    subject,
    text,
    html,
    from,
    attachments = []
}: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    attachments?: Array<{ filename: string; mimeType?: string; contentBase64: string }>;
}): string {
    const toHeader = formatEmailAddressList(to);
    if (!toHeader) {
        throw new Error('Invalid To header: recipient list is empty.');
    }

    const fromHeader = from || 'noreply@greencrm.local';
    const cleanText = text?.trim() || '';
    const cleanHtml = html?.trim() || '';
    const hasAttachments = attachments.length > 0;
    const mimeBoundary = `greencrm_${Date.now()}`;
    const altBoundary = `greencrm_alt_${Date.now()}`;

    const emailParts = [
        `To: ${toHeader}\r\n`,
        `From: ${fromHeader}\r\n`,
        `Subject: ${subject}\r\n`,
        'MIME-Version: 1.0\r\n',
        'Date: ' + new Date().toUTCString() + '\r\n'
    ];

    if (hasAttachments) {
        emailParts.push(`Content-Type: multipart/mixed; boundary="${mimeBoundary}"\r\n\r\n`);
        emailParts.push(`--${mimeBoundary}\r\n`);
        emailParts.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n`);
        emailParts.push(`--${altBoundary}\r\n`);
        emailParts.push('Content-Type: text/plain; charset="UTF-8"\r\n\r\n');
        emailParts.push(`${cleanText || 'See email content.'}\r\n\r\n`);
        emailParts.push(`--${altBoundary}\r\n`);
        emailParts.push('Content-Type: text/html; charset="UTF-8"\r\n\r\n');
        emailParts.push(`${cleanHtml || (cleanText ? `<p>${cleanText.replace(/\n/g, '<br />')}</p>` : '<p>Email</p>')}\r\n`);
        emailParts.push(`--${altBoundary}--\r\n`);

        for (const attachment of attachments) {
            const safeFilename = attachment.filename.replace(/"/g, '').replace(/\r?\n/g, '');
            const mimeType = attachment.mimeType || 'application/octet-stream';
            const contentBase64 = attachment.contentBase64.replace(/\s+/g, '');
            emailParts.push(`--${mimeBoundary}\r\n`);
            emailParts.push(`Content-Type: ${mimeType}; name="${safeFilename}"\r\n`);
            emailParts.push('Content-Transfer-Encoding: base64\r\n');
            emailParts.push(`Content-Disposition: attachment; filename="${safeFilename}"\r\n\r\n`);
            emailParts.push(`${contentBase64}\r\n`);
        }

        emailParts.push(`--${mimeBoundary}--`);
        return emailParts.join('');
    }

    emailParts.push(`Content-Type: multipart/alternative; boundary="${mimeBoundary}"\r\n\r\n`);
    emailParts.push(`--${mimeBoundary}\r\n`);
    emailParts.push('Content-Type: text/plain; charset="UTF-8"\r\n\r\n');
    emailParts.push(`${cleanText || 'See email content.'}\r\n\r\n`);
    emailParts.push(`--${mimeBoundary}\r\n`);
    emailParts.push('Content-Type: text/html; charset="UTF-8"\r\n\r\n');
    emailParts.push(`${cleanHtml || (cleanText ? `<p>${cleanText.replace(/\n/g, '<br />')}</p>` : '<p>Email</p>')}\r\n`);
    emailParts.push(`--${mimeBoundary}--`);

    return emailParts.join('');
}

export async function listGmailInbox(env: Record<string, string | undefined> = process.env, maxResults = 10) {
    const accessToken = await getGmailAccessToken(env);
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=${maxResults}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const data = await response.json().catch(() => ({})) as { messages?: Array<{ id: string }> ; error?: { message?: string } };
    if (!response.ok) {
        throw new Error(data.error?.message || `Gmail API error: ${response.status}`);
    }

    const messages = Array.isArray(data.messages) ? data.messages : [];
    const detailed = await Promise.all(messages.map(async message => {
        const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        const detail = await detailResponse.json().catch(() => ({})) as {
            id?: string;
            snippet?: string;
            payload?: { headers?: Array<{ name?: string; value?: string }> };
            error?: { message?: string };
        };

        if (!detailResponse.ok) {
            return null;
        }

        const headers = detail.payload?.headers ?? [];
        const from = headers.find(header => header.name === 'From')?.value || 'Unknown sender';
        const subject = headers.find(header => header.name === 'Subject')?.value || 'No subject';
        const date = headers.find(header => header.name === 'Date')?.value || new Date().toISOString();

        return {
            id: detail.id || message.id,
            from,
            subject,
            date,
            preview: detail.snippet || 'No preview available.'
        };
    }));

    return detailed.filter(Boolean);
}

export async function sendGmailEmail({
    to,
    subject,
    text,
    html,
    from,
    attachments = []
}: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    attachments?: Array<{ filename: string; mimeType?: string; contentBase64: string }>;
}) {
    const accessToken = await getGmailAccessToken();
    const rawMessage = createGmailRawMessage({ to, subject, text, html, from, attachments });
    const encoded = Buffer.from(rawMessage).toString('base64url');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encoded })
    });

    const data = await response.json().catch(() => ({})) as { id?: string; error?: { message?: string } };
    if (!response.ok) {
        throw new Error(data.error?.message || `Gmail API error: ${response.status}`);
    }

    return {
        success: true,
        id: data.id,
        provider: 'gmail',
        mode: 'live',
        from: from || 'noreply@greencrm.local',
        message: 'Email sent successfully using the Gmail API.'
    };
}
