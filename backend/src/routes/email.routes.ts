import { Hono } from 'hono';
import { sendTransactionalEmail } from '../services/emailService.ts';
import catchAsync from '../utils/catchAsync.ts';

const emailRoutes = new Hono();

emailRoutes.post('/send', catchAsync(async c => {
    const body = await c.req.json();
    const { to, subject, text, html } = body ?? {};

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
        html
    });

    return c.json({
        success: true,
        ...result
    }, 200);
}));

export default emailRoutes;
