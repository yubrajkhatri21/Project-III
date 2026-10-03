import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
    Workflow,
    BellRing,
    ArrowRight,
    Plus,
    CheckCircle2,
    Zap,
    TimerReset,
    Pencil,
    Trash2,
    X
} from 'lucide-react';
import { authService } from '../services/auth.service';
import { crmService } from '../services/crm.service';

interface AutomationRule {
    id: string;
    name: string;
    trigger: string;
    action: string;
    owner: string;
    frequency: 'Instant' | 'Daily' | 'Weekly';
    active: boolean;
    actionType?: 'notify' | 'create_task' | 'assign_lead' | 'update_status' | 'send_email';
    actionConfig?: Record<string, unknown>;
    conditions?: AutomationCondition[];
}

interface AutomationCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'contains';
    value: string | number;
}

interface AutomationRunLog {
    id: string;
    ruleId: string;
    ruleName: string;
    status: 'running' | 'retrying' | 'success' | 'failed';
    message: string;
    createdAt: string;
    attempts?: number;
}

interface AutomationTestResult {
    resource: string | null;
    scanned: number;
    matching: number;
    samples: Array<{ id: string; name?: string; status?: string; score?: number; value?: number }>;
}

const createEmptyDraft = () => ({
    name: '',
    trigger: 'Lead added',
    action: '',
    owner: 'Sales Team',
    frequency: 'Instant' as AutomationRule['frequency'],
    active: true,
    actionType: 'notify' as NonNullable<AutomationRule['actionType']>,
    actionConfig: { message: '' } as Record<string, unknown>,
    conditions: [] as AutomationCondition[]
});

const conditionFields = [
    { value: 'score', label: 'Lead score' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'value', label: 'Deal value' },
    { value: 'stage', label: 'Deal stage' },
    { value: 'probability', label: 'Deal probability' },
    { value: 'amount', label: 'Invoice amount' },
    { value: 'customerName', label: 'Customer name' }
];

const conditionOperators: Array<{ value: AutomationCondition['operator']; label: string }> = [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'greater_than_or_equal', label: 'at least' },
    { value: 'less_than', label: 'less than' },
    { value: 'less_than_or_equal', label: 'at most' },
    { value: 'contains', label: 'contains' }
];

const AutomationCenter: React.FC = () => {
    const navigate = useNavigate();
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [runLogs, setRunLogs] = useState<AutomationRunLog[]>([]);
    const [newRule, setNewRule] = useState(createEmptyDraft);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const [testResult, setTestResult] = useState<AutomationTestResult | null>(null);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        void Promise.all([loadRules(), loadRunLogs()]);
        const refreshTimer = window.setInterval(() => void loadRunLogs(), 15_000);
        return () => window.clearInterval(refreshTimer);
    }, []);

    const loadRules = async () => {
        try {
            setRules(await crmService.list<AutomationRule>('automations'));
        } catch (error) {
            console.warn('Could not load automation rules.', error);
            setFormError('Could not load rules from the server. Check the backend connection and try again.');
        }
    };

    const loadRunLogs = async () => {
        try {
            setRunLogs(await crmService.automationRuns());
        } catch (error) {
            console.warn('Could not load automation run history.', error);
        }
    };

    const summary = useMemo(() => ({
        total: rules.length,
        active: rules.filter(rule => rule.active).length,
        instant: rules.filter(rule => rule.frequency === 'Instant').length,
        scheduled: rules.filter(rule => rule.frequency !== 'Instant' && rule.active).length,
        successful: runLogs.filter(run => run.status === 'success').length,
        failed: runLogs.filter(run => run.status === 'failed').length,
        lastUpdated: rules[0]?.name || 'No rules yet'
    }), [rules, runLogs]);

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    const testDraftRule = async () => {
        setTesting(true);
        setTestResult(null);
        setFormError('');
        try {
            const result = await crmService.testAutomation({
                trigger: newRule.trigger,
                conditions: newRule.conditions.filter(condition => String(condition.value).trim() !== '')
            });
            setTestResult(result as AutomationTestResult);
        } catch (error) {
            console.warn('Could not test automation rule.', error);
            setFormError('Could not test this rule against your CRM data.');
        } finally {
            setTesting(false);
        }
    };

    const addRule = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newRule.name.trim()) {
            setFormError('Give this automation a name.');
            return;
        }

        const payload = {
            ...newRule,
            name: newRule.name.trim(),
            action: newRule.action.trim() || String(newRule.actionConfig.message || newRule.actionConfig.body || newRule.actionConfig.title || newRule.name),
            conditions: newRule.conditions.filter(condition => String(condition.value).trim() !== '')
        };

        setBusy(true);
        setFormError('');
        try {
            if (editingRuleId) {
                const updatedRule = await crmService.update<AutomationRule>('automations', editingRuleId, payload as Record<string, unknown>);
                setRules(prev => prev.map(rule => rule.id === editingRuleId ? updatedRule : rule));
            } else {
                const createdRule = await crmService.create<AutomationRule>('automations', payload as Record<string, unknown>);
                setRules(prev => [createdRule, ...prev]);
            }
            setNewRule(createEmptyDraft());
            setEditingRuleId(null);
        } catch (error) {
            console.warn('Could not save automation rule.', error);
            setFormError('The rule could not be saved. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    };

    const toggleRule = async (ruleId: string) => {
        const rule = rules.find(item => item.id === ruleId);
        if (!rule) return;

        try {
            const updatedRule = await crmService.update<AutomationRule>('automations', ruleId, { active: !rule.active });
            setRules(prev => prev.map(item => item.id === ruleId ? { ...item, active: updatedRule.active } : item));
        } catch (error) {
            console.warn('Failed to update automation state on backend.', error);
            setRules(prev => prev.map(item => item.id === ruleId ? { ...item, active: !item.active } : item));
        }
    };

    const editRule = (rule: AutomationRule) => {
        setEditingRuleId(rule.id);
        setFormError('');
        setNewRule({
            name: rule.name,
            trigger: rule.trigger,
            action: rule.action,
            owner: rule.owner,
            frequency: rule.frequency,
            active: rule.active,
            actionType: rule.actionType || 'notify',
            actionConfig: rule.actionConfig || { message: rule.action },
            conditions: rule.conditions || []
        });
    };

    const executeRule = async (ruleId: string) => {
        const rule = rules.find(item => item.id === ruleId);
        if (!rule) return;

        try {
            await crmService.executeAutomation(ruleId);
            await loadRunLogs();
        } catch (error) {
            console.warn('Could not execute automation rule.', error);
            await loadRunLogs();
        }
    };

    const executeAllRules = async () => {
        setBusy(true);
        try {
            const activeRules = rules.filter(rule => rule.active && rule.frequency === 'Instant');
            for (const rule of activeRules) {
                await executeRule(rule.id);
            }
        } finally {
            setBusy(false);
        }
    };

    const deleteRule = async (rule: AutomationRule) => {
        if (!window.confirm(`Archive "${rule.name}"? Its run history will be retained.`)) return;
        try {
            await crmService.archive('automations', rule.id);
            setRules(prev => prev.filter(item => item.id !== rule.id));
            if (editingRuleId === rule.id) {
                setEditingRuleId(null);
                setNewRule(createEmptyDraft());
            }
            await loadRunLogs();
        } catch (error) {
            console.warn('Could not delete automation rule.', error);
            setFormError('The rule could not be deleted.');
        }
    };

    const updateActionConfig = (field: string, value: string | number) => {
        setNewRule(prev => ({ ...prev, actionConfig: { ...prev.actionConfig, [field]: value } }));
    };

    const applyTemplate = (template: { name: string; trigger: string; action: string; owner: string; frequency: AutomationRule['frequency']; actionType: NonNullable<AutomationRule['actionType']>; actionConfig: Record<string, unknown> }) => {
        setEditingRuleId(null);
        setFormError('');
        setNewRule({
            name: template.name,
            trigger: template.trigger,
            action: template.action,
            owner: template.owner,
            frequency: template.frequency,
            active: true,
            actionType: template.actionType,
            actionConfig: template.actionConfig,
            conditions: []
        });
    };

    const quickTemplates = [
        {
            name: 'New lead first follow-up',
            trigger: 'Lead added',
            action: 'Create a first-touch follow-up task for every new lead.',
            owner: 'Sales Team',
            frequency: 'Instant' as AutomationRule['frequency'],
            actionType: 'create_task' as NonNullable<AutomationRule['actionType']>,
            actionConfig: { title: 'First follow-up: {name}', message: 'Reach out to {name} and confirm their needs.', assignedTo: 'Sales Team', dueInDays: 1, priority: 'High' }
        },
        {
            name: 'Deal closing soon follow-up',
            trigger: 'Deal near expiry',
            action: 'Create a daily follow-up task for open deals closing within three days.',
            owner: 'Sales Team',
            frequency: 'Daily' as AutomationRule['frequency'],
            actionType: 'create_task' as NonNullable<AutomationRule['actionType']>,
            actionConfig: { title: 'Closing soon: {name}', message: 'Follow up on this deal before its expected close date.', assignedTo: 'Sales Team', dueInDays: 0, priority: 'High' }
        },
        {
            name: 'High-value lead routing',
            trigger: 'Lead score > 80',
            action: 'Create a follow-up task for a high-scoring lead.',
            owner: 'Sales Team',
            frequency: 'Instant' as AutomationRule['frequency'],
            actionType: 'create_task' as NonNullable<AutomationRule['actionType']>,
            actionConfig: { title: 'Follow up with high-scoring lead', message: 'Contact {name}', assignedTo: 'Sales Team', dueInDays: 1, priority: 'High' }
        },
        {
            name: 'Customer health alert',
            trigger: 'Deal value > $25k',
            action: 'Notify the team when a high-value deal crosses the threshold.',
            owner: 'Account Manager',
            frequency: 'Instant' as AutomationRule['frequency'],
            actionType: 'notify' as NonNullable<AutomationRule['actionType']>,
            actionConfig: { message: 'High-value deal: {name}' }
        },
        {
            name: 'Support escalation',
            trigger: 'Ticket priority = Urgent',
            action: 'Create a priority follow-up task for the urgent ticket.',
            owner: 'Support',
            frequency: 'Instant' as AutomationRule['frequency'],
            actionType: 'create_task' as NonNullable<AutomationRule['actionType']>,
            actionConfig: { title: 'Escalate urgent ticket', message: 'Review ticket: {subject}', assignedTo: 'Support', dueInDays: 0, priority: 'Urgent' }
        }
    ];

    return (
        <div className='flex h-screen bg-white text-gray-900 font-inter overflow-hidden'>
            <Sidebar activeNav='Automation' />
            <main className='flex-1 ml-60 min-w-0 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8 custom-scrollbar'>
                <header className='mb-8 flex flex-col items-start justify-between gap-4 xl:flex-row xl:items-center'>
                    <div>
                        <p className='text-xs uppercase tracking-[0.2em] text-[#22c55e] font-bold'>Workflow automation</p>
                        <h1 className='text-2xl sm:text-3xl font-black text-gray-900 mt-2'>Automate follow-ups and team actions</h1>
                    </div>
                    <div className='flex w-full flex-wrap items-center gap-3 xl:w-auto'>
                        <button
                            onClick={executeAllRules}
                            disabled={busy}
                            className='px-4 py-2 rounded-xl bg-[#22c55e] text-white font-semibold hover:bg-[#16a34a] flex items-center gap-2 disabled:opacity-50'
                        >
                            <Zap size={16} /> {busy ? 'Running...' : 'Run active instant rules'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className='px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 font-semibold hover:bg-gray-100'
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <section className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
                    {[
                        { label: 'Total Rules', value: summary.total, icon: <Workflow size={16} />, tone: 'bg-green-50 text-green-700' },
                        { label: 'Active Rules', value: summary.active, icon: <CheckCircle2 size={16} />, tone: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Successful Runs', value: summary.successful, icon: <Zap size={16} />, tone: 'bg-sky-50 text-sky-700' },
                        { label: 'Failed Runs', value: summary.failed, icon: <TimerReset size={16} />, tone: 'bg-amber-50 text-amber-700' }
                    ].map(item => (
                        <div key={item.label} className='bg-white border border-gray-100 rounded-2xl p-4 shadow-sm'>
                            <div className={`inline-flex rounded-xl p-2 ${item.tone}`}>{item.icon}</div>
                            <p className='mt-4 text-[10px] uppercase tracking-[0.2em] text-gray-400'>{item.label}</p>
                            <p className='mt-2 text-xl font-black text-gray-900'>{item.value}</p>
                        </div>
                    ))}
                </section>

                <div className='grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6'>
                    <section className='bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                        <div className='flex items-center justify-between mb-5'>
                            <h2 className='text-xl font-black text-gray-900'>Rule builder</h2>
                            <span className='px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase'>{editingRuleId ? 'Editing' : 'Ready'}</span>
                        </div>

                        <form onSubmit={addRule} className='space-y-4'>
                            <div className='grid grid-cols-2 gap-3'>
                                <input
                                    value={newRule.name}
                                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                    placeholder='Rule name'
                                    required
                                    className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'
                                />
                                <select
                                    value={newRule.trigger}
                                    onChange={e => setNewRule({ ...newRule, trigger: e.target.value })}
                                    className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'
                                >
                                    <option value='Lead added'>Lead added</option>
                                    <option value='Lead score > 80'>Lead score &gt; 80</option>
                                    <option value='Lead status changed'>Lead status changed</option>
                                    <option value='Deal moved to proposal'>Deal moved to proposal</option>
                                    <option value='Deal stage changed'>Deal stage changed</option>
                                    <option value='Deal won'>Deal won</option>
                                    <option value='Deal lost'>Deal lost</option>
                                    <option value='Deal value > $25k'>Deal value &gt; $25k</option>
                                    <option value='Deal near expiry'>Deal near expiry</option>
                                    <option value='Ticket created'>Ticket created</option>
                                    <option value='Ticket priority = Urgent'>Ticket priority = Urgent</option>
                                    <option value='Ticket status changed'>Ticket status changed</option>
                                    <option value='Invoice overdue'>Invoice overdue</option>
                                </select>
                            </div>

                            <div className='space-y-3 rounded-2xl border border-gray-200 p-4'>
                                <select
                                    value={newRule.actionType}
                                    onChange={e => setNewRule({ ...newRule, actionType: e.target.value as NonNullable<AutomationRule['actionType']>, actionConfig: {} })}
                                    className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'
                                >
                                    <option value='notify'>Create an in-app notification</option>
                                    <option value='create_task'>Create a follow-up task</option>
                                    <option value='assign_lead'>Assign the matching lead</option>
                                    <option value='update_status'>Update the matching record</option>
                                    <option value='send_email'>Send an email</option>
                                </select>

                                {newRule.actionType === 'notify' && (
                                    <textarea value={String(newRule.actionConfig.message || '')} onChange={e => updateActionConfig('message', e.target.value)} placeholder='Notification message, e.g. Review {name}' required className='w-full px-3 py-3 border border-gray-200 rounded-xl text-sm min-h-[76px]' />
                                )}

                                {newRule.actionType === 'create_task' && (
                                    <div className='grid grid-cols-2 gap-3'>
                                        <input value={String(newRule.actionConfig.title || '')} onChange={e => updateActionConfig('title', e.target.value)} placeholder='Task title' required className='px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                        <input value={String(newRule.actionConfig.assignedTo || '')} onChange={e => updateActionConfig('assignedTo', e.target.value)} placeholder='Assignee or team' className='px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                        <input type='number' min='0' max='365' value={String(newRule.actionConfig.dueInDays ?? 1)} onChange={e => updateActionConfig('dueInDays', Number(e.target.value))} aria-label='Task due in days' className='px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                        <select value={String(newRule.actionConfig.priority || 'Medium')} onChange={e => updateActionConfig('priority', e.target.value)} className='px-3 py-2.5 border border-gray-200 rounded-xl text-sm'>
                                            <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
                                        </select>
                                        <textarea value={String(newRule.actionConfig.message || '')} onChange={e => updateActionConfig('message', e.target.value)} placeholder='Task details, e.g. Follow up with {name}' className='col-span-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm min-h-[70px]' />
                                    </div>
                                )}

                                {newRule.actionType === 'assign_lead' && (
                                    <input value={String(newRule.actionConfig.assignedTo || '')} onChange={e => updateActionConfig('assignedTo', e.target.value)} placeholder='Assignee name or email' required className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                )}

                                {newRule.actionType === 'update_status' && (
                                    <input value={String(newRule.actionConfig.targetStatus || '')} onChange={e => updateActionConfig('targetStatus', e.target.value)} placeholder='New status or deal stage' required className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                )}

                                {newRule.actionType === 'send_email' && (
                                    <div className='space-y-3'>
                                        <input type='email' value={String(newRule.actionConfig.to || '')} onChange={e => updateActionConfig('to', e.target.value)} placeholder='Recipient email, blank uses record email' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                        <input value={String(newRule.actionConfig.subject || '')} onChange={e => updateActionConfig('subject', e.target.value)} placeholder='Subject' required className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                        <textarea value={String(newRule.actionConfig.body || '')} onChange={e => updateActionConfig('body', e.target.value)} placeholder='Email body, e.g. Hello {name}' required className='w-full px-3 py-3 border border-gray-200 rounded-xl text-sm min-h-[90px]' />
                                    </div>
                                )}
                            </div>

                            <div className='space-y-3'>
                                <div className='flex items-center justify-between'>
                                    <p className='text-sm font-bold text-gray-800'>Conditions</p>
                                    <button type='button' onClick={() => setNewRule(prev => ({ ...prev, conditions: [...prev.conditions, { field: 'status', operator: 'equals', value: '' }] }))} className='text-xs font-bold text-green-700 hover:text-green-800'>Add condition</button>
                                </div>
                                {newRule.conditions.map((condition, index) => (
                                    <div key={`${index}-${condition.field}`} className='grid grid-cols-[1fr_1fr_1fr_auto] gap-2'>
                                        <select value={condition.field} onChange={e => setNewRule(prev => ({ ...prev, conditions: prev.conditions.map((item, itemIndex) => itemIndex === index ? { ...item, field: e.target.value } : item) }))} className='min-w-0 px-2 py-2 border border-gray-200 rounded-lg text-xs'>
                                            {conditionFields.map(field => <option key={field.value} value={field.value}>{field.label}</option>)}
                                        </select>
                                        <select value={condition.operator} onChange={e => setNewRule(prev => ({ ...prev, conditions: prev.conditions.map((item, itemIndex) => itemIndex === index ? { ...item, operator: e.target.value as AutomationCondition['operator'] } : item) }))} className='min-w-0 px-2 py-2 border border-gray-200 rounded-lg text-xs'>
                                            {conditionOperators.map(operator => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                                        </select>
                                        <input value={String(condition.value)} onChange={e => setNewRule(prev => ({ ...prev, conditions: prev.conditions.map((item, itemIndex) => itemIndex === index ? { ...item, value: e.target.value } : item) }))} placeholder='Value' className='min-w-0 px-2 py-2 border border-gray-200 rounded-lg text-xs' />
                                        <button type='button' title='Remove condition' onClick={() => setNewRule(prev => ({ ...prev, conditions: prev.conditions.filter((_, itemIndex) => itemIndex !== index) }))} className='p-2 text-gray-500 hover:text-red-600'><X size={15} /></button>
                                    </div>
                                ))}
                            </div>

                            <div className='grid grid-cols-3 gap-3'>
                                <select
                                    value={newRule.owner}
                                    onChange={e => setNewRule({ ...newRule, owner: e.target.value })}
                                    className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'
                                >
                                    <option value='Sales Team'>Sales Team</option>
                                    <option value='Support'>Support</option>
                                    <option value='Management'>Management</option>
                                    <option value='Account Manager'>Account Manager</option>
                                </select>
                                <select
                                    value={newRule.frequency}
                                    onChange={e => setNewRule({ ...newRule, frequency: e.target.value as AutomationRule['frequency'] })}
                                    className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'
                                >
                                    <option value='Instant'>Instant</option>
                                    <option value='Daily'>Daily</option>
                                    <option value='Weekly'>Weekly</option>
                                </select>
                                <label className='flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700'>
                                    <input
                                        type='checkbox'
                                        checked={newRule.active}
                                        onChange={e => setNewRule({ ...newRule, active: e.target.checked })}
                                    />
                                    Active
                                </label>
                            </div>

                            {formError && <p role='alert' className='text-sm text-red-700'>{formError}</p>}
                            {testResult && (
                                <div role='status' className='rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900'>
                                    Matched {testResult.matching} of {testResult.scanned} {testResult.resource || 'CRM'} records.
                                    {testResult.samples.length > 0 && <p className='mt-1 text-xs'>{testResult.samples.map(sample => sample.name || sample.id).join(', ')}</p>}
                                    {testResult.matching === 0 && <p className='mt-1 text-xs'>No current records match this trigger and its conditions. No action was run.</p>}
                                </div>
                            )}
                            <div className='flex items-center gap-2'>
                                <button disabled={testing} type='button' onClick={testDraftRule} className='px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm disabled:opacity-50'>
                                    {testing ? 'Testing...' : 'Test conditions'}
                                </button>
                                <button disabled={busy} type='submit' className='inline-flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] text-white rounded-xl font-bold text-sm disabled:opacity-50'>
                                    {editingRuleId ? <Pencil size={16} /> : <Plus size={16} />}{busy ? 'Saving...' : editingRuleId ? 'Save changes' : 'Add automation rule'}
                                </button>
                                {editingRuleId && <button type='button' onClick={() => { setEditingRuleId(null); setNewRule(createEmptyDraft()); setFormError(''); }} className='px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm'>Cancel</button>}
                            </div>
                        </form>
                    </section>

                    <aside className='bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                        <div className='flex items-center justify-between mb-5'>
                            <h2 className='text-xl font-black text-gray-900'>Recommended automations</h2>
                            <BellRing size={18} className='text-[#22c55e]' />
                        </div>

                        <div className='space-y-3'>
                            {quickTemplates.map(item => (
                                <button
                                    key={item.name}
                                    type='button'
                                    onClick={() => applyTemplate(item)}
                                    className='w-full text-left flex items-start gap-3 p-3 border border-gray-100 rounded-2xl hover:border-[#22c55e]/30 hover:bg-green-50 transition-all'
                                >
                                    <div className='rounded-lg bg-green-50 p-2 text-green-700'><ArrowRight size={14} /></div>
                                    <div>
                                        <p className='text-sm font-bold text-gray-900'>{item.name}</p>
                                        <p className='text-xs text-gray-600 mt-1'>{item.action}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </aside>
                </div>

                <section className='mt-6 grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6'>
                    <div className='bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-xl font-black text-gray-900'>Workflow execution log</h2>
                            <span className='text-xs text-gray-400'>Latest automation events</span>
                        </div>
                        <div className='space-y-3'>
                            {runLogs.length === 0 ? (
                                <div className='rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500'>
                                    No automation runs yet. Trigger a rule to start the activity feed.
                                </div>
                            ) : (
                                runLogs.map(log => (
                                    <div key={log.id} className='flex items-start justify-between gap-3 rounded-2xl border border-gray-200 p-3'>
                                        <div>
                                            <p className='text-sm font-bold text-gray-900'>{log.ruleName}</p>
                                            <p className='text-xs text-gray-500'>{log.message}</p>
                                        </div>
                                        <div className='text-right'>
                                            <span className={`inline-flex px-2 py-1 rounded-full text-[9px] font-bold uppercase ${log.status === 'success' ? 'bg-green-50 text-green-700' : log.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {log.status}
                                            </span>
                                            <p className='mt-1 text-[10px] text-gray-400'>{new Date(log.createdAt).toLocaleString()}{log.attempts ? ` · ${log.attempts} attempts` : ''}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className='bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                        <h2 className='text-xl font-black text-gray-900 mb-4'>Automation coverage</h2>
                        <div className='space-y-3'>
                            {[
                                { title: 'Instant workflows', value: summary.instant, detail: 'Rules triggered by lead, deal, and ticket changes' },
                                { title: 'Scheduled workflows', value: summary.scheduled, detail: 'Daily and weekly rules scanned by the backend' },
                                { title: 'Conditioned rules', value: rules.filter(rule => rule.conditions?.length).length, detail: 'Rules with additional field conditions' },
                                { title: 'Execution success', value: runLogs.length ? `${Math.round(summary.successful / runLogs.length * 100)}%` : '—', detail: 'Based on persisted workflow runs' }
                            ].map(card => (
                                <div key={card.title} className='rounded-2xl border border-gray-200 p-3'>
                                    <div className='flex items-center justify-between'>
                                        <p className='text-sm font-bold text-gray-900'>{card.title}</p>
                                        <span className='text-lg font-black text-[#22c55e]'>{card.value}</span>
                                    </div>
                                    <p className='text-xs text-gray-500 mt-1'>{card.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className='mt-6 bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                    <div className='flex items-center justify-between mb-4'>
                        <h2 className='text-xl font-black text-gray-900'>Configured workflows</h2>
                        <span className='text-xs text-gray-400'>Execution order: trigger → action → owner</span>
                    </div>

                    <div className='space-y-3'>
                        {rules.map(rule => (
                            <div key={rule.id} className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 border border-gray-200 rounded-2xl p-4'>
                                <div>
                                    <div className='flex items-center gap-2'>
                                        <p className='text-sm font-black text-gray-900'>{rule.name}</p>
                                        <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${rule.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {rule.active ? 'Active' : 'Paused'}
                                        </span>
                                    </div>
                                    <p className='mt-1 text-xs text-gray-500'>Trigger: {rule.trigger}</p>
                                    <p className='text-xs text-gray-500'>Action: {rule.actionType?.replace('_', ' ') || 'notification'} · {rule.action}</p>
                                    {!!rule.conditions?.length && <p className='text-xs text-gray-500'>Conditions: {rule.conditions.map(condition => `${condition.field} ${condition.operator.replace(/_/g, ' ')} ${condition.value}`).join(' and ')}</p>}
                                </div>
                                <div className='flex items-center gap-3'>
                                    <div className='text-right'>
                                        <p className='text-[10px] uppercase tracking-[0.15em] text-gray-400'>Owner</p>
                                        <p className='text-sm font-bold text-gray-700'>{rule.owner}</p>
                                    </div>
                                    <div className='text-right'>
                                        <p className='text-[10px] uppercase tracking-[0.15em] text-gray-400'>Frequency</p>
                                        <p className='text-sm font-bold text-gray-700'>{rule.frequency}</p>
                                    </div>
                                    <button
                                        onClick={() => executeRule(rule.id)}
                                        className='px-3 py-2 rounded-xl text-xs font-bold bg-[#22c55e] text-white'
                                    >
                                        Run now
                                    </button>
                                    <button title='Edit automation' onClick={() => editRule(rule)} className='p-2 rounded-lg text-gray-600 hover:bg-gray-100'><Pencil size={16} /></button>
                                    <button title='Archive automation' onClick={() => void deleteRule(rule)} className='p-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-700'><Trash2 size={16} /></button>
                                    <button
                                        onClick={() => toggleRule(rule.id)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold ${rule.active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
                                    >
                                        {rule.active ? 'Pause' : 'Resume'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AutomationCenter;
