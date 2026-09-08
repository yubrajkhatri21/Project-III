import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
    Briefcase,
    Sparkles,
    LayoutDashboard,
    Users,
    Calendar,
    Mail,
    BarChart3,
    Shield,
    Settings,
    Home,
    Workflow,
    BellRing,
    ArrowRight,
    Plus,
    CheckCircle2,
    Zap,
    TimerReset
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
}

const defaultRules: AutomationRule[] = [
    { id: 'rule-1', name: 'New lead follow-up', trigger: 'Lead added', action: 'Assign to sales rep and send follow-up email', owner: 'Sales Team', frequency: 'Instant', active: true },
    { id: 'rule-2', name: 'High-priority ticket escalation', trigger: 'Ticket priority = Urgent', action: 'Notify manager and create urgent task', owner: 'Support', frequency: 'Instant', active: true },
    { id: 'rule-3', name: 'Deal close reminder', trigger: 'Deal near expiry', action: 'Create reminder 3 days before close date', owner: 'Account Manager', frequency: 'Daily', active: false }
];

const OperationsLinks = [
    { name: 'Home', icon: <Home size={20} />, path: '/' },
    { name: 'AI Command Centre', icon: <Sparkles size={20} />, path: '/ai-command', isGlow: true },
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Contacts', icon: <Users size={20} />, path: '/leads' },
    { name: 'Calendar', icon: <Calendar size={20} />, path: '/calendar' },
    { name: 'Mails', icon: <Mail size={20} />, path: '/mails' },
    { name: 'Deals', icon: <Briefcase size={20} />, path: '/deals' },
    { name: 'Automation', icon: <Workflow size={20} />, path: '/automation', active: true },
    { name: 'Analytics', icon: <BarChart3 size={20} />, path: '/analytics' },
    { name: 'User Management', icon: <Shield size={20} />, path: '/user-management', isBlue: true },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings', isBlue: true }
];

const AutomationCenter: React.FC = () => {
    const navigate = useNavigate();
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [newRule, setNewRule] = useState({
        name: '',
        trigger: 'Lead added',
        action: '',
        owner: 'Sales Team',
        frequency: 'Instant' as AutomationRule['frequency'],
        active: true
    });

    useEffect(() => {
        const loadRules = async () => {
            try {
                const backendRules = await crmService.list<AutomationRule>('automations');
                setRules(backendRules.length ? backendRules : defaultRules);
            } catch (error) {
                console.warn('Automation rules not available from backend, using fallback data.', error);
                const savedRules = localStorage.getItem('crm_automation_rules');
                setRules(savedRules ? JSON.parse(savedRules) : defaultRules);
            }
        };

        loadRules();
    }, []);

    useEffect(() => {
        localStorage.setItem('crm_automation_rules', JSON.stringify(rules));
    }, [rules]);

    const summary = useMemo(() => ({
        total: rules.length,
        active: rules.filter(rule => rule.active).length,
        instant: rules.filter(rule => rule.frequency === 'Instant').length,
        lastUpdated: rules[0]?.name || 'No rules yet'
    }), [rules]);

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    const addRule = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newRule.name || !newRule.action) return;

        const payload = {
            ...newRule,
            name: newRule.name.trim(),
            action: newRule.action.trim()
        };

        try {
            const createdRule = await crmService.create<AutomationRule>('automations', payload as Record<string, unknown>);
            setRules(prev => [createdRule, ...prev]);
        } catch (error) {
            console.warn('Could not save to backend. Storing locally instead.', error);
            const fallbackRule = {
                id: `rule-${Date.now()}`,
                ...payload
            };
            setRules(prev => [fallbackRule, ...prev]);
        }

        setNewRule({ name: '', trigger: 'Lead added', action: '', owner: 'Sales Team', frequency: 'Instant', active: true });
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

    const executeRule = async (ruleId: string) => {
        try {
            await crmService.executeAutomation(ruleId);
            setRules(prev => prev.map(rule => rule.id === ruleId ? { ...rule, active: true } : rule));
        } catch (error) {
            console.warn('Could not execute automation rule.', error);
        }
    };

    return (
        <div className='flex h-screen bg-white text-gray-900 font-inter overflow-hidden'>
            <Sidebar activeNav='Automation' />
            <main className='flex-1 ml-60 overflow-y-auto bg-gray-50 p-8 custom-scrollbar'>
                <header className='mb-8 flex items-center justify-between'>
                    <div>
                        <p className='text-xs uppercase tracking-[0.2em] text-[#22c55e] font-bold'>Workflow automation</p>
                        <h1 className='text-3xl font-black text-gray-900 mt-2'>Automate follow-ups and team actions</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className='px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 font-semibold hover:bg-gray-100'
                    >
                        Logout
                    </button>
                </header>

                <section className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-8'>
                    {[
                        { label: 'Total Rules', value: summary.total, icon: <Workflow size={16} />, tone: 'bg-green-50 text-green-700' },
                        { label: 'Active Rules', value: summary.active, icon: <CheckCircle2 size={16} />, tone: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Instant Rules', value: summary.instant, icon: <Zap size={16} />, tone: 'bg-violet-50 text-violet-700' },
                        { label: 'Last Updated', value: summary.lastUpdated, icon: <TimerReset size={16} />, tone: 'bg-amber-50 text-amber-700' }
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
                            <span className='px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase'>Live</span>
                        </div>

                        <form onSubmit={addRule} className='space-y-4'>
                            <div className='grid grid-cols-2 gap-3'>
                                <input
                                    value={newRule.name}
                                    onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                    placeholder='Rule name'
                                    className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'
                                />
                                <select
                                    value={newRule.trigger}
                                    onChange={e => setNewRule({ ...newRule, trigger: e.target.value })}
                                    className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'
                                >
                                    <option value='Lead added'>Lead added</option>
                                    <option value='Deal moved to proposal'>Deal moved to proposal</option>
                                    <option value='Ticket priority = Urgent'>Ticket priority = Urgent</option>
                                    <option value='Invoice overdue'>Invoice overdue</option>
                                </select>
                            </div>

                            <textarea
                                value={newRule.action}
                                onChange={e => setNewRule({ ...newRule, action: e.target.value })}
                                placeholder='Action to perform'
                                className='w-full px-3 py-3 border border-gray-200 rounded-xl text-sm min-h-[90px]'
                            />

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

                            <button type='submit' className='inline-flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] text-white rounded-xl font-bold text-sm'>
                                <Plus size={16} /> Add automation rule
                            </button>
                        </form>
                    </section>

                    <aside className='bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                        <div className='flex items-center justify-between mb-5'>
                            <h2 className='text-xl font-black text-gray-900'>Recommended automations</h2>
                            <BellRing size={18} className='text-[#22c55e]' />
                        </div>

                        <div className='space-y-3'>
                            {[
                                'New lead gets assigned and a reminder is scheduled',
                                'Urgent support ticket is routed to a manager',
                                'Overdue invoice triggers a payment reminder',
                                'Won deal creates a quote and proposal task'
                            ].map(item => (
                                <div key={item} className='flex items-start gap-3 p-3 border border-gray-100 rounded-2xl'>
                                    <div className='rounded-lg bg-green-50 p-2 text-green-700'><ArrowRight size={14} /></div>
                                    <p className='text-sm text-gray-700'>{item}</p>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>

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
                                    <p className='text-xs text-gray-500'>Action: {rule.action}</p>
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
