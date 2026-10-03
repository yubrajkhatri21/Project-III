import { randomUUID } from 'node:crypto';
import prisma from '../client.ts';
import { sendTransactionalEmail } from './emailService.ts';

type Resource = 'lead' | 'deal' | 'ticket' | 'invoice';
type Operation = 'created' | 'updated' | 'scheduled' | 'manual';
type AutomationEvent = {
    resource?: Resource;
    operation: Operation;
    before?: Record<string, any>;
    after?: Record<string, any>;
};
type AutomationCondition = { field: string; operator: string; value: string | number };
type AutomationRule = {
    id: string;
    name: string;
    trigger: string;
    action: string;
    actionType?: string;
    actionConfig?: Record<string, any> | null;
    conditions?: AutomationCondition[] | null;
    owner: string;
    frequency: string;
    userId: string;
};

const db = prisma as any;
const maxAttempts = 3;
const resourceModels: Record<Resource, string> = {
    lead: 'lead',
    deal: 'deal',
    ticket: 'ticket',
    invoice: 'invoice'
};

const normalizedValue = (value: unknown) => String(value ?? '').trim().toLowerCase();

const evaluateCondition = (condition: AutomationCondition, record: Record<string, any>) => {
    const actual = record[condition.field];
    const expected = condition.value;
    const actualNumber = Number(actual);
    const expectedNumber = Number(expected);
    const numeric = actual !== '' && expected !== '' && Number.isFinite(actualNumber) && Number.isFinite(expectedNumber);

    switch (condition.operator) {
        case 'equals': return numeric ? actualNumber === expectedNumber : normalizedValue(actual) === normalizedValue(expected);
        case 'not_equals': return numeric ? actualNumber !== expectedNumber : normalizedValue(actual) !== normalizedValue(expected);
        case 'greater_than': return numeric && actualNumber > expectedNumber;
        case 'greater_than_or_equal': return numeric && actualNumber >= expectedNumber;
        case 'less_than': return numeric && actualNumber < expectedNumber;
        case 'less_than_or_equal': return numeric && actualNumber <= expectedNumber;
        case 'contains': return normalizedValue(actual).includes(normalizedValue(expected));
        default: return false;
    }
};

const matchesTrigger = (rule: AutomationRule, event: AutomationEvent) => {
    const trigger = normalizedValue(rule.trigger);
    const after = event.after || {};
    const before = event.before || {};
    const scheduled = event.operation === 'scheduled';

    if ((trigger.includes('lead') || trigger.includes('score')) && event.resource === 'lead') {
        const scoreThreshold = trigger.match(/score\s*(?:>|>=)\s*(\d+)/);
        if (scoreThreshold) {
            const threshold = Number(scoreThreshold[1]);
            return Number(after.score || 0) > threshold && (scheduled || Number(before.score || 0) <= threshold);
        }
        if (trigger.includes('status')) return scheduled || (event.operation === 'updated' && normalizedValue(before.status) !== normalizedValue(after.status));
        const lookbackDays = rule.frequency === 'Weekly' ? 7 : 1;
        return (trigger.includes('added') || trigger.includes('created')) && (scheduled
            ? Date.now() - Date.parse(after.createdAt) <= lookbackDays * 86400000
            : event.operation === 'created');
    }

    if ((trigger.includes('deal') || trigger.includes('value')) && event.resource === 'deal') {
        if (trigger.includes('near expiry') || trigger.includes('near-expiry')) {
            const closeDate = Date.parse(after.expectedCloseDate || '');
            const daysUntilClose = (closeDate - Date.now()) / 86400000;
            return Number.isFinite(closeDate) && daysUntilClose >= 0 && daysUntilClose <= 3;
        }
        const valueThreshold = trigger.match(/value\s*>\s*\$?([\d,.]+)\s*([kmb])?/);
        if (valueThreshold) {
            const multiplier = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[valueThreshold[2]?.toLowerCase() as 'k' | 'm' | 'b'] || 1;
            const threshold = Number(valueThreshold[1].replace(/,/g, '')) * multiplier;
            return Number(after.value || 0) > threshold && (scheduled || Number(before.value || 0) <= threshold);
        }
        if (trigger.includes('won') || trigger.includes('lost')) {
            const target = trigger.includes('won') ? 'won' : 'lost';
            return normalizedValue(after.stage) === target && (scheduled || normalizedValue(before.stage) !== target);
        }
        if (trigger.includes('stage') || trigger.includes('proposal') || trigger.includes('moved')) {
            const target = trigger.match(/(?:moved\s+to|stage\s*=?)\s*(.+)/)?.[1]?.trim();
            if (target && target !== 'changed') {
                return normalizedValue(after.stage).includes(target) && (scheduled || !normalizedValue(before.stage).includes(target));
            }
            return scheduled || (event.operation === 'updated' && normalizedValue(before.stage) !== normalizedValue(after.stage));
        }
        return false;
    }

    if ((trigger.includes('ticket') || trigger.includes('priority')) && event.resource === 'ticket') {
        if (trigger.includes('priority') || trigger.includes('urgent')) {
            return normalizedValue(after.priority) === 'urgent' && (scheduled || normalizedValue(before.priority) !== 'urgent');
        }
        if (trigger.includes('status')) return scheduled || (event.operation === 'updated' && normalizedValue(before.status) !== normalizedValue(after.status));
        const lookbackDays = rule.frequency === 'Weekly' ? 7 : 1;
        return (trigger.includes('added') || trigger.includes('created')) && (scheduled
            ? Date.now() - Date.parse(after.createdAt) <= lookbackDays * 86400000
            : event.operation === 'created');
    }

    if (trigger.includes('invoice') && event.resource === 'invoice') {
        const dueDate = Date.parse(after.dueDate || '');
        return normalizedValue(after.status) !== 'paid' && Number.isFinite(dueDate) && dueDate < new Date().setHours(0, 0, 0, 0);
    }
    return false;
};

const conditionsMatch = (conditions: AutomationCondition[] | null | undefined, record?: Record<string, any>) =>
    !conditions?.length || (!!record && conditions.every(condition => evaluateCondition(condition, record)));

const interpolate = (template: string, record?: Record<string, any>) =>
    template.replace(/\{([a-zA-Z][\w]*)\}/g, (_, field: string) => String(record?.[field] ?? ''));

const performAction = async (userId: string, rule: AutomationRule, event: AutomationEvent) => {
    const config = rule.actionConfig || {};
    const record = event.after;
    const message = interpolate(String(config.message || rule.action || rule.name), record);

    switch (rule.actionType || 'notify') {
        case 'create_task': {
            const title = interpolate(String(config.title || rule.name), record);
            const dueDays = Number(config.dueInDays ?? 1);
            const dueDate = new Date(Date.now() + Math.max(0, dueDays) * 86400000).toISOString();
            await db.task.create({
                data: {
                    userId,
                    title,
                    description: message,
                    dueDate,
                    priority: config.priority || 'Medium',
                    type: 'Automation',
                    customerName: record?.name || record?.customerName || undefined,
                    assignedTo: config.assignedTo || rule.owner
                }
            });
            return `Created task: ${title}`;
        }
        case 'assign_lead': {
            if (event.resource !== 'lead' || !record?.id || !config.assignedTo) throw new Error('Choose an assignee and use a lead trigger.');
            const result = await db.lead.updateMany({ where: { id: record.id, userId }, data: { assignedTo: String(config.assignedTo) } });
            if (!result.count) throw new Error('The lead could not be assigned because it no longer exists.');
            return `Assigned ${record.name || 'lead'} to ${config.assignedTo}`;
        }
        case 'update_status': {
            if (!event.resource || !record?.id || !config.targetStatus) throw new Error('Choose a target status and use a record-based trigger.');
            const field = event.resource === 'deal' ? 'stage' : 'status';
            const result = await db[resourceModels[event.resource]].updateMany({
                where: { id: record.id, userId },
                data: { [field]: String(config.targetStatus) }
            });
            if (!result.count) throw new Error('The CRM record could not be updated because it no longer exists.');
            return `Updated ${event.resource} ${field} to ${config.targetStatus}`;
        }
        case 'send_email': {
            const to = interpolate(String(config.to || record?.email || ''), record);
            const subject = interpolate(String(config.subject || rule.name), record);
            const text = interpolate(String(config.body || rule.action || rule.name), record);
            const result = await sendTransactionalEmail({ to, subject, text });
            return result.mode === 'demo' ? 'Email action completed in demo mode; provider credentials are not configured.' : `Email sent to ${to}`;
        }
        case 'notify':
        default:
            await db.notification.create({
                data: { userId, title: `${rule.name} triggered`, message, type: 'automation' }
            });
            return message;
    }
};

const runRule = async (userId: string, rule: AutomationRule, event: AutomationEvent, eventKey: string) => {
    let run = await db.automationRun.findUnique({ where: { eventKey } });
    if (run?.status === 'success' || (run?.status === 'running' && Date.now() - run.createdAt.getTime() < 5 * 60000)) return run;
    if (run && run.attempts >= maxAttempts) return run;

    if (!run) {
        try {
            run = await db.automationRun.create({
                data: {
                    userId,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    trigger: rule.trigger,
                    eventKey,
                    status: 'running',
                    message: 'Automation is running.',
                    attempts: 0
                }
            });
        } catch (error: any) {
            if (error?.code === 'P2002') return db.automationRun.findUnique({ where: { eventKey } });
            throw error;
        }
    }

    for (let attempt = run.attempts + 1; attempt <= maxAttempts; attempt += 1) {
        await db.automationRun.update({ where: { id: run.id }, data: { status: 'running', attempts: attempt, message: `Attempt ${attempt} of ${maxAttempts}.` } });
        try {
            const result = await performAction(userId, rule, event);
            const completedRun = await db.automationRun.update({ where: { id: run.id }, data: { status: 'success', message: result, completedAt: new Date() } });
            try {
                await db.activity.create({ data: { userId, type: 'Automation', description: `${rule.name}: ${result}` } });
                await prisma.auditLog.create({
                    data: { userId, action: 'executed', entityType: 'automationRule', entityId: rule.id, after: { runId: run.id, result, event } }
                });
            } catch (logError) {
                console.warn(`Could not write secondary logs for automation '${rule.name}'.`, logError);
            }
            return completedRun;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Automation action failed.';
            await db.automationRun.update({
                where: { id: run.id },
                data: { status: attempt === maxAttempts ? 'failed' : 'retrying', message, completedAt: attempt === maxAttempts ? new Date() : null }
            });
            if (attempt === maxAttempts) console.warn(`Automation '${rule.name}' failed after ${maxAttempts} attempts.`, error);
        }
    }
    return db.automationRun.findUnique({ where: { id: run.id } });
};

const isMatchingEvent = (rule: AutomationRule, event: AutomationEvent) =>
    matchesTrigger(rule, event) && conditionsMatch(rule.conditions, event.after);

export const triggerAutomations = async (userId: string, event: AutomationEvent) => {
    if (!event.resource || !event.after) return 0;
    try {
        const rules = await db.automationRule.findMany({ where: { userId, active: true, isDeleted: false, frequency: 'Instant' } });
        const matchingRules = rules.filter((rule: AutomationRule) => isMatchingEvent(rule, event));
        for (const rule of matchingRules) {
            const eventKey = `${rule.id}:${event.resource}:${event.after.id}:${event.after.updatedAt || event.operation}`;
            await runRule(userId, rule, event, eventKey);
        }
        return matchingRules.length;
    } catch (error) {
        console.warn('Automation trigger processing failed.', error);
        return 0;
    }
};

export const executeAutomationRule = async (userId: string, rule: AutomationRule) =>
    await runRule(userId, rule, { operation: 'manual' }, `manual:${rule.id}:${randomUUID()}`);

const scheduledPeriod = (frequency: string, now: Date) => {
    if (frequency === 'Weekly') return `week-${Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 604800000)}`;
    return `day-${now.toISOString().slice(0, 10)}`;
};

const resourceForTrigger = (trigger: string): Resource | undefined => {
    const normalized = normalizedValue(trigger);
    if (normalized.includes('lead') || normalized.includes('score')) return 'lead';
    if (normalized.includes('deal') || normalized.includes('value') || normalized.includes('stage')) return 'deal';
    if (normalized.includes('ticket') || normalized.includes('priority')) return 'ticket';
    if (normalized.includes('invoice')) return 'invoice';
    return undefined;
};

export const testAutomationConditions = async (userId: string, trigger: string, conditions: AutomationCondition[] = []) => {
    const resource = resourceForTrigger(trigger);
    if (!resource) return { resource: null, scanned: 0, matching: 0, samples: [] };
    const records = await db[resourceModels[resource]].findMany({
        where: { userId, isDeleted: false },
        orderBy: { updatedAt: 'desc' },
        take: 200
    });
    const testRule = { trigger, conditions, frequency: 'Weekly' } as AutomationRule;
    const matches = records.filter((record: Record<string, any>) => isMatchingEvent(testRule, {
        resource,
        operation: 'scheduled',
        after: record
    }));
    return {
        resource,
        scanned: records.length,
        matching: matches.length,
        samples: matches.slice(0, 5).map((record: Record<string, any>) => ({
            id: record.id,
            name: record.name || record.subject || record.number || record.customerName,
            status: record.status || record.stage,
            score: record.score,
            value: record.value ?? record.amount
        }))
    };
};

const runScheduledRules = async (force = false) => {
    const now = new Date();
    const isDailyBoundary = now.getUTCHours() === 0 && now.getUTCMinutes() < 5;
    const isWeeklyBoundary = isDailyBoundary && now.getUTCDay() === 1;
    if (!force && !isDailyBoundary) return;
    const rules = await db.automationRule.findMany({
        where: { active: true, isDeleted: false, frequency: { in: ['Daily', 'Weekly'] } },
        take: 200
    });

    for (const rule of rules as AutomationRule[]) {
        if (!force && rule.frequency === 'Weekly' && !isWeeklyBoundary) continue;
        const resource = resourceForTrigger(rule.trigger);
        if (!resource) continue;
        const records = await db[resourceModels[resource]].findMany({ where: { userId: rule.userId, isDeleted: false }, take: 500 });
        for (const record of records) {
            const event: AutomationEvent = { resource, operation: 'scheduled', after: record };
            if (!isMatchingEvent(rule, event)) continue;
            const eventKey = `schedule:${rule.id}:${scheduledPeriod(rule.frequency, now)}:${resource}:${record.id}`;
            await runRule(rule.userId, rule, event, eventKey);
        }
    }
};

let scheduler: NodeJS.Timeout | undefined;

export const startAutomationScheduler = () => {
    if (scheduler) return scheduler;
    scheduler = setInterval(() => {
        void runScheduledRules().catch(error => console.warn('Automation scheduler tick failed.', error));
    }, 60_000);
    scheduler.unref();
    void runScheduledRules(true).catch(error => console.warn('Initial automation scheduler run failed.', error));
    return scheduler;
};