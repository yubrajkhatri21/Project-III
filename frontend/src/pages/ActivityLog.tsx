import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Activity, ArrowRight, TrendingUp } from 'lucide-react';

interface ActivityItem {
    id: string;
    user: string;
    action: string;
    target: string;
    time: string;
    type: 'lead' | 'deal' | 'system';
}

const defaultActivity: ActivityItem[] = [
    { id: '1', user: 'Alex', action: 'updated', target: 'Northstar Labs deal stage', time: '2 minutes ago', type: 'deal' },
    { id: '2', user: 'Priya', action: 'added', target: 'new lead for Finora', time: '22 minutes ago', type: 'lead' },
    { id: '3', user: 'System', action: 'scored', target: 'B2B account health snapshot', time: '1 hour ago', type: 'system' },
    { id: '4', user: 'Sam', action: 'closed', target: 'Minto AI renewal', time: 'Yesterday', type: 'deal' }
];

const ActivityLog: React.FC = () => {
    const [activity, setActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('crm_activity');
        if (saved) {
            setActivity(JSON.parse(saved));
        } else {
            setActivity(defaultActivity);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('crm_activity', JSON.stringify(activity));
    }, [activity]);

    return (
        <div className='min-h-screen bg-slate-50 text-slate-900'>
            <Sidebar activeNav='Activity' />

            <main className='ml-60 p-8 lg:p-10'>
                <div className='max-w-5xl mx-auto'>
                    <div className='mb-8'>
                        <p className='text-sm font-semibold uppercase tracking-[0.2em] text-green-600'>Operations</p>
                        <h1 className='mt-2 text-3xl font-bold tracking-tight'>Activity Log</h1>
                    </div>

                    <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'>
                        <div className='mb-5 flex items-center gap-3'>
                            <Activity className='text-green-600' size={20} />
                            <h2 className='text-xl font-bold'>Recent team actions</h2>
                        </div>

                        <div className='space-y-4'>
                            {activity.map(item => (
                                <div key={item.id} className='flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                                    <div className={`rounded-xl p-2 ${item.type === 'deal' ? 'bg-blue-100 text-blue-600' : item.type === 'lead' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        <TrendingUp size={16} />
                                    </div>

                                    <div className='flex-1'>
                                        <p className='font-medium text-slate-800'>
                                            <span className='font-semibold'>{item.user}</span> {item.action} <span className='font-semibold'>{item.target}</span>
                                        </p>
                                        <div className='mt-1 flex items-center gap-2 text-sm text-slate-500'>
                                            <ArrowRight size={14} />
                                            <span>{item.time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ActivityLog;
