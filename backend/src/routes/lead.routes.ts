import { Hono, Context } from 'hono';
import { authMiddleware } from '../middlewares/authMiddleware.ts';
import prisma from '../client.ts';
import catchAsync from '../utils/catchAsync.ts';
import { z } from 'zod';
import ApiError from '../utils/ApiError.ts';
import { triggerAutomations } from '../services/automationService.ts';

const leadRoutes = new Hono();

leadRoutes.get('/', authMiddleware, catchAsync(async (c: Context) => {
  const userId = c.get('userId');
  const leads = await prisma.lead.findMany({
    where: { 
      userId,
      isDeleted: false 
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return c.json({ leads });
}));

leadRoutes.post('/', authMiddleware, catchAsync(async (c: Context) => {
  const userId = c.get('userId');
  const body = z.object({
    name: z.string().min(1), email: z.string().email().optional(), company: z.string().optional(), role: z.string().optional(),
    industry: z.string().optional(), status: z.string().optional(), source: z.string().optional(), phone: z.string().optional(),
    priority: z.string().optional(), score: z.number().int().min(0).max(100).optional(), assignedTo: z.string().optional(), notes: z.string().optional()
  }).safeParse(await c.req.json());
  if (!body.success) throw new ApiError(400, body.error.issues[0]?.message || 'Invalid lead');
  
  const lead = await prisma.lead.create({
    data: {
      ...body.data,
      userId
    }
  });
  await triggerAutomations(userId, { resource: 'lead', operation: 'created', after: lead });
  
  return c.json({ lead });
}));

leadRoutes.patch('/:id', authMiddleware, catchAsync(async (c: Context) => {
  const userId = c.get('userId');
  const existing = await prisma.lead.findFirst({ where: { id: c.req.param('id'), userId, isDeleted: false } });
  if (!existing) throw new ApiError(404, 'Lead not found');
  const body = z.object({ name: z.string().min(1).optional(), email: z.string().email().optional(), company: z.string().optional(), role: z.string().optional(), industry: z.string().optional(), status: z.string().optional(), source: z.string().optional(), phone: z.string().optional(), priority: z.string().optional(), score: z.number().int().min(0).max(100).optional(), assignedTo: z.string().optional(), notes: z.string().optional() }).partial().safeParse(await c.req.json());
  if (!body.success) throw new ApiError(400, 'Invalid lead');
  const lead = await prisma.lead.update({ where: { id: existing.id }, data: body.data });
  await triggerAutomations(userId, { resource: 'lead', operation: 'updated', before: existing, after: lead });
  return c.json({ lead });
}));

leadRoutes.delete('/:id', authMiddleware, catchAsync(async (c: Context) => {
  const userId = c.get('userId');
  const existing = await prisma.lead.findFirst({ where: { id: c.req.param('id'), userId, isDeleted: false } });
  if (!existing) throw new ApiError(404, 'Lead not found');
  await prisma.lead.update({ where: { id: existing.id }, data: { isDeleted: true } });
  return c.json({ message: 'Lead archived' });
}));

export default leadRoutes;
