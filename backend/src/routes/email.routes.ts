import { Hono } from 'hono';
import { getEmailRuntimeStatus, sendTransactionalEmail } from '../services/emailService.ts';
import catchAsync from '../utils/catchAsync.ts';

const emailRoutes = new Hono();

emailRoutes.get('/status', catchAsync(async c => {
    return c.json({
        success: true,
        ...getEmailRuntimeStatus()
    }, 200);
}));

emailRoutes.post('/send', catchAsync(async c => {
    const body = await c.req.json();
    const { to, subject, text, html, from } = body ?? {};

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
        from
    });

    return c.json({
        ...result,
        success: true
    }, 200);
}));

export default emailRoutes;
