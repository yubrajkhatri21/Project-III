import React, { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { CheckCheck, Clock3, Plus, Trash2, CalendarDays, Sparkles, Loader2 } from 'lucide-react';
import { aiService } from '../services/ai.service';
import { crmService } from '../services/crm.service';

interface TaskItem {
    id: string;
    title: string;
    dueDate: string;
    priority: 'Low' | 'Medium' | 'High';
    completed: boolean;
    owner: string;
}

const getTaskStorageKey = (baseKey: string) => {
    try {
        const savedUser = localStorage.getItem('user');
        const user = savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
        return user?.id ? `${baseKey}_${user.id}` : baseKey;
    } catch {
        return baseKey;
    }
};

const readCachedTasks = (storageKey: string): TaskItem[] => {
    try {
        const saved = localStorage.getItem(storageKey) || (storageKey !== 'crm_tasks' ? localStorage.getItem('crm_tasks') : null);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
};

const taskFromApi = (record: any): TaskItem => ({
    id: record.id,
    title: record.title,
    dueDate: record.dueDate || '',
    priority: record.priority || 'Medium',
    completed: record.status === 'Completed',
    owner: record.assignedTo || 'Unassigned'
});

const taskToApi = (task: Omit<TaskItem, 'id'>) => ({
    title: task.title,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.completed ? 'Completed' : 'Open',
    assignedTo: task.owner,
    type: 'Task'
});

const Tasks: React.FC = () => {
    const storageKey = getTaskStorageKey('crm_tasks');
    const [tasks, setTasks] = useState<TaskItem[]>(() => readCachedTasks(storageKey));
    const [isLoading, setIsLoading] = useState(true);
    const [syncError, setSyncError] = useState('');
    const didLoad = useRef(false);
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<TaskItem['priority']>('Medium');
    const [owner, setOwner] = useState('Alex');
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [aiMessage, setAiMessage] = useState('');

    useEffect(() => {
        if (!isLoading) localStorage.setItem(storageKey, JSON.stringify(tasks));
    }, [storageKey, tasks, isLoading]);

    useEffect(() => {
        if (didLoad.current) return;
        didLoad.current = true;

        const loadTasks = async () => {
            try {
                const records = await crmService.list<any>('tasks');
                let savedRecords = records.filter(record => record.type !== 'CalendarEvent');

                if (savedRecords.length === 0) {
                    const cachedTasks = readCachedTasks(storageKey);
                    if (cachedTasks.length > 0) {
                        savedRecords = [];
                        for (const cachedTask of cachedTasks) {
                            const record = await crmService.create<any>('tasks', taskToApi(cachedTask));
                            savedRecords.push(record);
                        }
                    }
                }

                const savedTasks = savedRecords.map(taskFromApi);
                setTasks(savedTasks);
                localStorage.setItem(storageKey, JSON.stringify(savedTasks));
                setSyncError('');
            } catch (error: any) {
                setSyncError(error?.response?.data?.message || 'Could not sync tasks. Changes will stay on this device until the server is available.');
            } finally {
                setIsLoading(false);
            }
        };

        void loadTasks();
    }, [storageKey]);

    const stats = useMemo(() => {
        const completed = tasks.filter(item => item.completed).length;
        const pending = tasks.length - completed;
        const dueSoon = tasks.filter(item => !item.completed && new Date(item.dueDate).getTime() >= Date.now()).length;
        return { completed, pending, dueSoon };
    }, [tasks]);

    const addTask = async () => {
        if (!title.trim()) return;

        const task = {
            title: title.trim(),
            dueDate: dueDate || new Date().toISOString().slice(0, 10),
            priority,
            completed: false,
            owner: owner || 'Unassigned'
        };
        try {
            const savedTask = await crmService.create<any>('tasks', taskToApi(task));
            setTasks(prev => [taskFromApi(savedTask), ...prev]);
            setSyncError('');
        } catch (error: any) {
            setSyncError(error?.response?.data?.message || 'Could not save the task to your account.');
            return;
        }

        setTitle('');
        setDueDate('');
        setPriority('Medium');
        setOwner('Alex');
        setAiMessage('');
    };

    const suggestTaskWithAI = async () => {
        if (!title.trim()) {
            setAiMessage('Enter a rough note first, then ask AI to refine it.');
            return;
        }

        setIsSuggesting(true);
        setAiMessage('');
        try {
            const response = await aiService.chat([
                {
                    id: 'task-assistant-system',
                    role: 'system',
                    content: 'You are a CRM task assistant. Rewrite the user note as one concise, actionable sales follow-up task. Return only the task title, with no bullets or explanation.'
                },
                {
                    id: 'task-assistant-user',
                    role: 'user',
                    content: `Rewrite this task note: "${title.trim()}". Priority: ${priority}. Owner: ${owner || 'Unassigned'}.`
                }
            ]);
            const suggestion = response?.content?.trim();
            if (suggestion) setTitle(suggestion.replace(/^[-*]\s*/, '').replace(/^"|"$/g, ''));
        } catch {
            setAiMessage('AI suggestions are unavailable right now. You can still add the task manually.');
        } finally {
            setIsSuggesting(false);
        }
    };

    const toggleTask = async (id: string) => {
        const task = tasks.find(item => item.id === id);
        if (!task) return;
        try {
            const savedTask = await crmService.update<any>('tasks', id, taskToApi({ ...task, completed: !task.completed }));
            setTasks(prev => prev.map(item => item.id === id ? taskFromApi(savedTask) : item));
            setSyncError('');
        } catch (error: any) {
            setSyncError(error?.response?.data?.message || 'Could not update the task in your account.');
        }
    };

    const removeTask = async (id: string) => {
        try {
            await crmService.archive('tasks', id);
            setTasks(prev => prev.filter(task => task.id !== id));
            setSyncError('');
        } catch (error: any) {
            setSyncError(error?.response?.data?.message || 'Could not delete the task from your account.');
        }
    };

    return (
        <div className='min-h-screen bg-slate-50 text-slate-900'>
            <Sidebar activeNav='Tasks' />

            <main className='ml-60 p-8 lg:p-10'>
                <div className='max-w-7xl mx-auto'>
                    <div className='mb-8 flex items-center justify-between'>
                        <div>
                            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-green-600'>Workflow</p>
                            <h1 className='mt-2 text-3xl font-bold tracking-tight'>Tasks & Follow-ups</h1>
                        </div>
                    </div>

                    <div className='mb-5 flex items-center gap-2 text-xs text-slate-500' role='status'>
                        <Clock3 size={14} />
                        {isLoading ? 'Loading tasks from your account...' : 'Tasks are saved to your account.'}
                    </div>
                    {syncError && <p role='alert' className='mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>{syncError}</p>}

                    <div className='mb-8 grid gap-4 md:grid-cols-3'>
                        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                            <p className='text-sm text-slate-500'>Pending</p>
                            <p className='mt-2 text-3xl font-bold'>{stats.pending}</p>
                        </div>
                        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                            <p className='text-sm text-slate-500'>Completed</p>
                            <p className='mt-2 text-3xl font-bold text-green-600'>{stats.completed}</p>
                        </div>
                        <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                            <p className='text-sm text-slate-500'>Due soon</p>
                            <p className='mt-2 text-3xl font-bold text-amber-600'>{stats.dueSoon}</p>
                        </div>
                    </div>

                    <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
                        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
                            <div className='mb-6 flex items-center gap-3'>
                                <CheckCheck className='text-green-600' size={20} />
                                <h2 className='text-xl font-bold'>Task List</h2>
                            </div>

                            <div className='space-y-3'>
                                {tasks.length === 0 ? (
                                    <div className='rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500'>
                                        No tasks yet. Add your first follow-up item.
                                    </div>
                                ) : (
                                    tasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`flex items-center gap-3 rounded-2xl border p-4 transition ${task.completed ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-slate-50'}`}
                                        >
                                            <input
                                                type='checkbox'
                                                checked={task.completed}
                                                onChange={() => toggleTask(task.id)}
                                                className='h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500'
                                            />

                                            <div className='min-w-0 flex-1'>
                                                <p className={`font-semibold ${task.completed ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                    {task.title}
                                                </p>
                                                <div className='mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500'>
                                                    <span className='inline-flex items-center gap-1'><CalendarDays size={12} /> {task.dueDate}</span>
                                                    <span className={`rounded-full px-2 py-0.5 font-medium ${task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>{task.priority}</span>
                                                    <span>Owner: {task.owner}</span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => removeTask(task.id)}
                                                className='rounded-xl p-2 text-slate-400 transition hover:bg-slate-200 hover:text-red-600'
                                                aria-label='Delete task'
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
                            <div className='mb-6 flex items-center gap-3'>
                                <Plus className='text-green-600' size={18} />
                                <h2 className='text-xl font-bold'>Add Follow-up</h2>
                            </div>

                            <div className='space-y-4'>
                                <div>
                                    <div className='mb-1 flex items-center justify-between gap-3'>
                                        <label className='block text-sm font-medium text-slate-600'>Task title</label>
                                        <button
                                            type='button'
                                            onClick={suggestTaskWithAI}
                                            disabled={isSuggesting}
                                            className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60'
                                        >
                                            {isSuggesting ? <Loader2 size={13} className='animate-spin' /> : <Sparkles size={13} />}
                                            {isSuggesting ? 'Suggesting...' : 'AI suggest'}
                                        </button>
                                    </div>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className='w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-green-500 focus:bg-white'
                                        placeholder='Follow up with account owner'
                                    />
                                    {aiMessage && <p className='mt-2 text-xs text-amber-700'>{aiMessage}</p>}
                                </div>

                                <div className='grid grid-cols-2 gap-4'>
                                    <div>
                                        <label className='mb-1 block text-sm font-medium text-slate-600'>Due date</label>
                                        <input
                                            type='date'
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className='w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-green-500 focus:bg-white'
                                        />
                                    </div>
                                    <div>
                                        <label className='mb-1 block text-sm font-medium text-slate-600'>Priority</label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value as TaskItem['priority'])}
                                            className='w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-green-500 focus:bg-white'
                                        >
                                            <option value='Low'>Low</option>
                                            <option value='Medium'>Medium</option>
                                            <option value='High'>High</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className='mb-1 block text-sm font-medium text-slate-600'>Owner</label>
                                    <input
                                        value={owner}
                                        onChange={(e) => setOwner(e.target.value)}
                                        className='w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-green-500 focus:bg-white'
                                        placeholder='Alex'
                                    />
                                </div>

                                <button
                                    onClick={() => void addTask()}
                                    className='mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-500'
                                >
                                    <Plus size={16} /> Add task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Tasks;
