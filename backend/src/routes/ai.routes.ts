import { Hono, Context } from 'hono';
import catchAsync from '../utils/catchAsync.ts';
import { authMiddleware } from '../middlewares/authMiddleware.ts';
import * as aiService from '../services/aiService.ts';
import prisma from '../client.ts';

const aiRoutes = new Hono();

aiRoutes.post('/chat', authMiddleware, catchAsync(async (c: Context) => {
  const body = await c.req.json();
  const messages = body?.messages;
  if (!Array.isArray(messages)) return c.json({ error: 'messages must be an array' }, 400);
  const userId = c.get('userId');
  const [leadCount, openDeals, pendingTasks, openTickets] = await Promise.all([
    prisma.lead.count({ where: { userId, isDeleted: false } }),
    prisma.deal.count({ where: { userId, isDeleted: false, stage: { notIn: ['Won', 'Lost'] } } }),
    prisma.task.count({ where: { userId, isDeleted: false, status: { not: 'Completed' } } }),
    prisma.ticket.count({ where: { userId, isDeleted: false, status: { not: 'Closed' } } })
  ]);
  const contextMessage = {
    role: 'system',
    content: `You are GreenCRM's sales assistant. Use this current CRM snapshot when relevant: ${leadCount} leads, ${openDeals} open deals, ${pendingTasks} pending tasks, and ${openTickets} open support tickets. Give concise, actionable answers and never invent customer-specific facts.`
  };
  return c.json(await aiService.chat([contextMessage, ...messages]));
}));

aiRoutes.post('/research-company', authMiddleware, catchAsync(async (c: Context) => {
  const body = await c.req.json();
  const { query } = body;

  const result = await aiService.researchCompany(query);
  return c.json(result);
}));

aiRoutes.post('/enhance-company', authMiddleware, catchAsync(async (c: Context) => {
  const body = await c.req.json();
  const { name, website, description } = body;

  const result = await aiService.enhanceCompanyInfo(name, website, description);
  return c.json(result);
}));

export default aiRoutes;