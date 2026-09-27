import { Hono, Context } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/authMiddleware.ts';
import prisma from '../client.ts';
import ApiError from '../utils/ApiError.ts';
import catchAsync from '../utils/catchAsync.ts';

const crmRoutes = new Hono();
const db = prisma as any;

const resources: Record<string, string> = {
    deals: 'deal',
    tasks: 'task',
    tickets: 'ticket',
    products: 'product',
    quotes: 'quote',
    invoices: 'invoice',
    activities: 'activity',
    notifications: 'notification',
    automations: 'automationRule'
};

const schemas: Record<string, any> = {
    deals: z.object({ name: z.string().min(1), value: z.number().nonnegative().optional(), probability: z.number().int().min(0).max(100).optional() }),
    tasks: z.object({
        title: z.string().min(1),
        dueDate: z.string().optional(),
        description: z.string().optional(),
        priority: z.string().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        customerName: z.string().optional(),
        assignedTo: z.string().optional()
    }),
    tickets: z.object({ subject: z.string().min(1), priority: z.string().optional(), status: z.string().optional() }),
    products: z.object({ name: z.string().min(1), price: z.number().nonnegative().optional() }),
    quotes: z.object({ number: z.string().min(1), customerName: z.string().min(1), amount: z.number().nonnegative().optional() }),
    invoices: z.object({ number: z.string().min(1), customerName: z.string().min(1), amount: z.number().nonnegative().optional() }),
    activities: z.object({ type: z.string().min(1), description: z.string().min(1) }),
    notifications: z.object({ title: z.string().min(1), message: z.string().min(1) }),
    automations: z.object({
        name: z.string().min(1),
        trigger: z.string().min(1),
        action: z.string().min(1),
        owner: z.string().min(1),
        frequency: z.enum(['Instant', 'Daily', 'Weekly']).default('Instant'),
        active: z.boolean().default(true)
    })
};

const userIdOf = (c: Context) => {
    const userId = c.get('userId');
    if (!userId) throw new ApiError(401, 'Unauthorized');
    return userId as string;
};

const writeAudit = async (userId: string, action: string, entityType: string, entityId: string, before?: unknown, after?: unknown) => {
    await prisma.auditLog.create({ data: { userId, action, entityType, entityId, before: before === undefined ? undefined : JSON.parse(JSON.stringify(before)), after: after === undefined ? undefined : JSON.parse(JSON.stringify(after)) } });
};

crmRoutes.use('*', authMiddleware);

crmRoutes.get('/summary', catchAsync(async (c: Context) => {
    const userId = userIdOf(c);
    const [leads, deals, tasks, tickets, invoices] = await Promise.all([
        prisma.lead.findMany({ where: { userId, isDeleted: false }, select: { status: true, source: true } }),
        prisma.deal.findMany({ where: { userId, isDeleted: false }, select: { stage: true, value: true, probability: true } }),
        prisma.task.count({ where: { userId, isDeleted: false, status: { not: 'Completed' } } }),
        prisma.ticket.count({ where: { userId, isDeleted: false, status: { not: 'Closed' } } }),
        prisma.invoice.aggregate({ where: { userId, isDeleted: false, status: 'Paid' }, _sum: { amount: true } })
    ]);
    const wonDeals = deals.filter(deal => deal.stage.toLowerCase() === 'won');
    return c.json({
        kpis: {
            totalLeads: leads.length,
            qualifiedLeads: leads.filter(lead => lead.status.toLowerCase() === 'qualified').length,
            openDeals: deals.filter(deal => !['won', 'lost'].includes(deal.stage.toLowerCase())).length,
            wonDeals: wonDeals.length,
            pipelineValue: deals.reduce((total, deal) => total + deal.value, 0),
            forecastValue: deals.reduce((total, deal) => total + deal.value * deal.probability / 100, 0),
            totalRevenue: invoices._sum.amount || 0,
            pendingTasks: tasks,
            openTickets: tickets,
            conversionRate: leads.length ? Math.round((wonDeals.length / leads.length) * 100) : 0
        },
        leadsBySource: Object.entries(leads.reduce<Record<string, number>>((result, lead) => {
            const source = lead.source || 'Unknown';
            result[source] = (result[source] || 0) + 1;
            return result;
        }, {})).map(([source, count]) => ({ source, count }))
    });
}));

crmRoutes.get('/audit-logs', catchAsync(async (c: Context) => {
    const userId = userIdOf(c);
    const logs = await prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
    return c.json({ logs });
}));

crmRoutes.get('/users', catchAsync(async (c: Context) => {
    const role = c.get('userRole');
    if (!['Administrator', 'Admin', 'Manager', 'Sales Manager'].includes(role)) throw new ApiError(403, 'Manager access required');
    const users = await prisma.user.findMany({ where: { isDeleted: false }, select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
    return c.json({ users });
}));

crmRoutes.get('/:resource', catchAsync(async (c: Context) => {
    const resource = c.req.param('resource');
    const model = resources[resource];
    if (!model) throw new ApiError(404, 'CRM resource not found');
    const userId = userIdOf(c);
    const q = c.req.query('q');
    const status = c.req.query('status');
    const where: any = { userId };
    if (['activity', 'notification', 'automationRule'].includes(model)) {
        if (model === 'automationRule') where.isDeleted = false;
    } else {
        where.isDeleted = false;
    }
    if (status) where.status = status;
    if (q) where.OR = [{ name: { contains: q } }, { title: { contains: q } }, { subject: { contains: q } }, { customerName: { contains: q } }, { trigger: { contains: q } }, { action: { contains: q } }];
    const records = await db[model].findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    return c.json({ [resource]: records });
}));

crmRoutes.post('/automations/:id/execute', catchAsync(async (c: Context) => {
    const userId = userIdOf(c);
    const automationId = c.req.param('id');
    const rule = await db.automationRule.findFirst({ where: { id: automationId, userId, isDeleted: false } });
    if (!rule) throw new ApiError(404, 'Automation rule not found');

    await db.notification.create({
        data: {
            userId,
            title: `${rule.name} triggered`,
            message: rule.action,
            type: 'automation'
        }
    });

    await db.activity.create({
        data: {
            userId,
            type: 'Automation',
            description: `${rule.name} fired: ${rule.action}`
        }
    });

    await writeAudit(userId, 'executed', 'automationRule', rule.id, undefined, rule);
    return c.json({ executed: true, message: `Automation '${rule.name}' was triggered successfully.` });
}));

crmRoutes.post('/:resource', catchAsync(async (c: Context) => {
    const resource = c.req.param('resource');
    const model = resources[resource];
    const schema = schemas[resource];
    if (!model || !schema) throw new ApiError(404, 'CRM resource not found');
    const userId = userIdOf(c);
    const parsed = schema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || 'Invalid request');
    const record = await db[model].create({ data: { ...parsed.data, userId } });
    await writeAudit(userId, 'created', model, record.id, undefined, record);
    const responseKey = resource === 'automations' ? 'automation' : resource.slice(0, -1);
    return c.json({ [responseKey]: record }, 201);
}));

crmRoutes.patch('/:resource/:id', catchAsync(async (c: Context) => {
    const resource = c.req.param('resource');
    const model = resources[resource];
    if (!model || !schemas[resource]) throw new ApiError(404, 'CRM resource not found');
    const userId = userIdOf(c);
    const existing = await db[model].findFirst({ where: { id: c.req.param('id'), userId } });
    if (!existing) throw new ApiError(404, 'Record not found');
    const parsed = schemas[resource].partial().safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || 'Invalid request');
    const record = await db[model].update({ where: { id: existing.id }, data: parsed.data });
    await writeAudit(userId, 'updated', model, record.id, existing, record);
    const responseKey = resource === 'automations' ? 'automation' : resource.slice(0, -1);
    return c.json({ [responseKey]: record });
}));

crmRoutes.delete('/:resource/:id', catchAsync(async (c: Context) => {
    const resource = c.req.param('resource');
    const model = resources[resource];
    if (!model || ['activities', 'notifications'].includes(resource)) throw new ApiError(404, 'CRM resource not found');
    const userId = userIdOf(c);
    const existing = await db[model].findFirst({ where: { id: c.req.param('id'), userId } });
    if (!existing) throw new ApiError(404, 'Record not found');
    const record = await db[model].update({ where: { id: existing.id }, data: { isDeleted: true } });
    await writeAudit(userId, 'archived', model, record.id, existing, record);
    return c.json({ message: 'Record archived' });
}));

export default crmRoutes;