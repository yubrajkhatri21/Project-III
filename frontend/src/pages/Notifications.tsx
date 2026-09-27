import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Bell, CheckCircle2, Clock3, Sparkles } from 'lucide-react';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: string;
    type: 'info' | 'success' | 'warning';
    read: boolean;
}

const defaultNotifications: NotificationItem[] = [
    { id: '1', title: 'New deal activity', message: 'Northstar Labs updated the deal stage to Proposal Review.', time: '2 min ago', type: 'info', read: false },
    { id: '2', title: 'Follow-up assigned', message: 'Alex was assigned to review the Finora account health report.', time: '18 min ago', type: 'success', read: false },
    { id: '3', title: 'Renewal reminder', message: 'Kova Systems has a renewal due in 4 days.', time: '1 hour ago', type: 'warning', read: true },
    { id: '4', title: 'AI insight added', message: 'Company research summary has been refreshed for Minto AI.', time: 'Today', type: 'info', read: true }
];

const NotificationsCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('crm_notifications');
        if (saved) {
            setNotifications(JSON.parse(saved));
        } else {
            setNotifications(defaultNotifications);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('crm_notifications', JSON.stringify(notifications));
    }, [notifications]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
    };

    const unread = notifications.filter(item => !item.read).length;

    return (
        <div className='min-h-screen bg-slate-50 text-slate-900'>
            <Sidebar activeNav='Notifications' />

            <main className='ml-60 p-8 lg:p-10'>
                <div className='max-w-5xl mx-auto'>
                    <div className='mb-8 flex items-center justify-between'>
                        <div>
                            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-green-600'>Communication</p>
                            <h1 className='mt-2 text-3xl font-bold tracking-tight'>Notifications</h1>
                        </div>
                        <div className='rounded-2xl bg-green-600 px-4 py-2 text-sm font-semibold text-white'>
                            {unread} unread
                        </div>
                    </div>

                    <div className='space-y-4'>
                        {notifications.map(item => (
                            <div
                                key={item.id}
                                className={`rounded-2xl border p-5 shadow-sm ${item.read ? 'border-slate-200 bg-white' : 'border-green-200 bg-green-50/50'}`}
                            >
                                <div className='flex items-start justify-between gap-4'>
                                    <div className='flex gap-3'>
                                        <div className={`mt-1 rounded-xl p-2 ${item.type === 'success' ? 'bg-green-100 text-green-600' : item.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                                            {item.type === 'success' ? <CheckCircle2 size={18} /> : item.type === 'warning' ? <Clock3 size={18} /> : <Bell size={18} />}
                                        </div>
                                        <div>
                                            <p className='font-semibold text-slate-800'>{item.title}</p>
                                            <p className='mt-1 text-sm text-slate-600'>{item.message}</p>
                                            <div className='mt-2 flex items-center gap-2 text-xs text-slate-500'>
                                                <Sparkles size={12} />
                                                <span>{item.time}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {!item.read && (
                                        <button
                                            onClick={() => markAsRead(item.id)}
                                            className='rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50'
                                        >
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default NotificationsCenter;
