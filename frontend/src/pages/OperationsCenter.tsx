import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
    Briefcase,
    FileText,
    DollarSign,
    Ticket,
    Plus,
    CheckCircle2,
    Clock3,
    ReceiptText,
    ArrowUpRight,
    Sparkles,
    LayoutDashboard,
    Users,
    Calendar,
    Mail,
    BarChart3,
    Shield,
    Settings,
    Home
} from 'lucide-react';
import { authService } from '../services/auth.service';
import { formatNpr } from '../utils/currency';

interface Quote {
    id: string;
    number: string;
    customerName: string;
    amount: number;
    status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
    validUntil: string;
}

interface Invoice {
    id: string;
    number: string;
    customerName: string;
    amount: number;
    status: 'Pending' | 'Paid' | 'Overdue';
    dueDate: string;
}

interface TicketItem {
    id: string;
    subject: string;
    customerName: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Open' | 'In Progress' | 'Waiting on Customer' | 'Closed';
}

const defaultQuotes: Quote[] = [
    { id: 'q-101', number: 'QTN-101', customerName: 'Nabil Bank', amount: 245000, status: 'Approved', validUntil: '2026-10-10' },
    { id: 'q-102', number: 'QTN-102', customerName: 'Nepal Telecom', amount: 580000, status: 'Sent', validUntil: '2026-10-18' },
    { id: 'q-103', number: 'QTN-103', customerName: 'Everest Valley Hotel', amount: 185000, status: 'Draft', validUntil: '2026-09-25' }
];

const defaultInvoices: Invoice[] = [
    { id: 'inv-201', number: 'INV-201', customerName: 'Himalayan Foods', amount: 190000, status: 'Pending', dueDate: '2026-09-18' },
    { id: 'inv-202', number: 'INV-202', customerName: 'Kathmandu Logistics', amount: 320000, status: 'Paid', dueDate: '2026-09-05' },
    { id: 'inv-203', number: 'INV-203', customerName: 'Green Valley Labs', amount: 275000, status: 'Overdue', dueDate: '2026-08-30' }
];

const defaultTickets: TicketItem[] = [
    { id: 't-301', subject: 'Mobile app login issue', customerName: 'Sujan Shrestha', category: 'Technical', priority: 'High', status: 'In Progress' },
    { id: 't-302', subject: 'Request for custom pricing', customerName: 'Rajendra Koirala', category: 'Sales', priority: 'Medium', status: 'Open' },
    { id: 't-303', subject: 'Invoice clarification', customerName: 'Anita Gurung', category: 'Billing', priority: 'Urgent', status: 'Waiting on Customer' }
];

const sidebarLinks = [
    { name: 'Home', icon: <Home size={20} />, path: '/' },
    { name: 'AI Command Centre', icon: <Sparkles size={20} />, path: '/ai-command', isGlow: true },
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Contacts', icon: <Users size={20} />, path: '/leads' },
    { name: 'Calendar', icon: <Calendar size={20} />, path: '/calendar' },
    { name: 'Mails', icon: <Mail size={20} />, path: '/mails' },
    { name: 'Deals', icon: <Briefcase size={20} />, path: '/deals' },
    { name: 'Operations', icon: <FileText size={20} />, path: '/operations', active: true },
    { name: 'Analytics', icon: <BarChart3 size={20} />, path: '/analytics' },
    { name: 'User Management', icon: <Shield size={20} />, path: '/user-management', isBlue: true },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings', isBlue: true }
];

const OperationsCenter: React.FC = () => {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [quoteForm, setQuoteForm] = useState({ number: '', customerName: '', amount: '', status: 'Draft' as Quote['status'], validUntil: '' });
    const [invoiceForm, setInvoiceForm] = useState({ number: '', customerName: '', amount: '', status: 'Pending' as Invoice['status'], dueDate: '' });
    const [ticketForm, setTicketForm] = useState({ subject: '', customerName: '', category: 'Technical', priority: 'Medium' as TicketItem['priority'], status: 'Open' as TicketItem['status'] });

    useEffect(() => {
        const savedQuotes = localStorage.getItem('crm_quotes');
        const savedInvoices = localStorage.getItem('crm_invoices');
        const savedTickets = localStorage.getItem('crm_tickets');

        setQuotes(savedQuotes ? JSON.parse(savedQuotes) : defaultQuotes);
        setInvoices(savedInvoices ? JSON.parse(savedInvoices) : defaultInvoices);
        setTickets(savedTickets ? JSON.parse(savedTickets) : defaultTickets);
    }, []);

    useEffect(() => {
        localStorage.setItem('crm_quotes', JSON.stringify(quotes));
    }, [quotes]);

    useEffect(() => {
        localStorage.setItem('crm_invoices', JSON.stringify(invoices));
    }, [invoices]);

    useEffect(() => {
        localStorage.setItem('crm_tickets', JSON.stringify(tickets));
    }, [tickets]);

    const summary = useMemo(() => ({
        totalQuotes: quotes.length,
        approvedQuotes: quotes.filter(q => q.status === 'Approved').length,
        openInvoices: invoices.filter(i => i.status !== 'Paid').length,
        pendingTickets: tickets.filter(t => t.status !== 'Closed').length,
        quoteValue: quotes.reduce((sum, q) => sum + q.amount, 0),
        unpaidValue: invoices.filter(i => i.status !== 'Paid').reduce((sum, invoice) => sum + invoice.amount, 0)
    }), [invoices, quotes, tickets]);

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    const addQuote = (event: React.FormEvent) => {
        event.preventDefault();
        if (!quoteForm.number || !quoteForm.customerName || !quoteForm.amount) return;

        setQuotes(prev => [{
            id: `q-${Date.now()}`,
            number: quoteForm.number,
            customerName: quoteForm.customerName,
            amount: Number(quoteForm.amount),
            status: quoteForm.status,
            validUntil: quoteForm.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
        }, ...prev]);

        setQuoteForm({ number: '', customerName: '', amount: '', status: 'Draft', validUntil: '' });
    };

    const addInvoice = (event: React.FormEvent) => {
        event.preventDefault();
        if (!invoiceForm.number || !invoiceForm.customerName || !invoiceForm.amount) return;

        setInvoices(prev => [{
            id: `inv-${Date.now()}`,
            number: invoiceForm.number,
            customerName: invoiceForm.customerName,
            amount: Number(invoiceForm.amount),
            status: invoiceForm.status,
            dueDate: invoiceForm.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
        }, ...prev]);

        setInvoiceForm({ number: '', customerName: '', amount: '', status: 'Pending', dueDate: '' });
    };

    const addTicket = (event: React.FormEvent) => {
        event.preventDefault();
        if (!ticketForm.subject || !ticketForm.customerName) return;

        setTickets(prev => [{
            id: `t-${Date.now()}`,
            subject: ticketForm.subject,
            customerName: ticketForm.customerName,
            category: ticketForm.category,
            priority: ticketForm.priority,
            status: ticketForm.status
        }, ...prev]);

        setTicketForm({ subject: '', customerName: '', category: 'Technical', priority: 'Medium', status: 'Open' });
    };

    const changeTicketStatus = (ticketId: string, nextStatus: TicketItem['status']) => {
        setTickets(prev => prev.map(ticket => ticket.id === ticketId ? { ...ticket, status: nextStatus } : ticket));
    };

    return (
        <div className='flex h-screen bg-white text-gray-900 font-inter overflow-hidden'>
            <Sidebar activeNav='Operations' />
            <main className='flex-1 ml-60 min-w-0 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8 custom-scrollbar'>
                <header className='mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
                    <div>
                        <p className='text-xs uppercase tracking-[0.2em] text-[#22c55e] font-bold'>Operations Center</p>
                        <h1 className='text-2xl sm:text-3xl font-black text-gray-900 mt-2'>Sales, billing & support workflow</h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className='px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 font-semibold hover:bg-gray-100'
                    >
                        Logout
                    </button>
                </header>

                <section className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-8'>
                    {[
                        { label: 'Quotes', value: summary.totalQuotes, icon: <FileText size={16} />, tone: 'bg-green-50 text-green-700' },
                        { label: 'Approved', value: summary.approvedQuotes, icon: <CheckCircle2 size={16} />, tone: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Open Invoices', value: summary.openInvoices, icon: <ReceiptText size={16} />, tone: 'bg-amber-50 text-amber-700' },
                        { label: 'Open Tickets', value: summary.pendingTickets, icon: <Ticket size={16} />, tone: 'bg-blue-50 text-blue-700' },
                        { label: 'Quote Value', value: formatNpr(summary.quoteValue), icon: <DollarSign size={16} />, tone: 'bg-violet-50 text-violet-700' },
                        { label: 'Unpaid Value', value: formatNpr(summary.unpaidValue), icon: <Clock3 size={16} />, tone: 'bg-rose-50 text-rose-700' }
                    ].map(item => (
                        <div key={item.label} className='bg-white border border-gray-100 rounded-2xl p-4 shadow-sm'>
                            <div className={`inline-flex rounded-xl p-2 ${item.tone}`}>
                                {item.icon}
                            </div>
                            <p className='text-xs uppercase tracking-[0.18em] text-gray-400 mt-4'>{item.label}</p>
                            <p className='text-xl font-black text-gray-900 mt-2'>{item.value}</p>
                        </div>
                    ))}
                </section>

                <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
                    <section className='bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-xl font-black text-gray-900'>Quotes</h2>
                            <span className='px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold uppercase'>Sales</span>
                        </div>

                        <form onSubmit={addQuote} className='space-y-3 mb-6'>
                            <div className='grid grid-cols-2 gap-3'>
                                <input value={quoteForm.number} onChange={e => setQuoteForm({ ...quoteForm, number: e.target.value })} placeholder='Quote number' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                <input value={quoteForm.customerName} onChange={e => setQuoteForm({ ...quoteForm, customerName: e.target.value })} placeholder='Customer' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <input type='number' value={quoteForm.amount} onChange={e => setQuoteForm({ ...quoteForm, amount: e.target.value })} placeholder='Amount' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                <select value={quoteForm.status} onChange={e => setQuoteForm({ ...quoteForm, status: e.target.value as Quote['status'] })} className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'>
                                    <option value='Draft'>Draft</option>
                                    <option value='Sent'>Sent</option>
                                    <option value='Approved'>Approved</option>
                                    <option value='Rejected'>Rejected</option>
                                </select>
                            </div>
                            <div className='flex gap-3'>
                                <input type='date' value={quoteForm.validUntil} onChange={e => setQuoteForm({ ...quoteForm, validUntil: e.target.value })} className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                <button type='submit' className='inline-flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] text-white rounded-xl font-bold text-sm'>
                                    <Plus size={16} /> Add
                                </button>
                            </div>
                        </form>

                        <div className='space-y-3'>
                            {quotes.map(quote => (
                                <div key={quote.id} className='border border-gray-100 rounded-2xl p-3'>
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-black text-gray-900'>{quote.number}</p>
                                            <p className='text-xs text-gray-500'>{quote.customerName}</p>
                                        </div>
                                        <span className='px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-[9px] font-bold uppercase'>{quote.status}</span>
                                    </div>
                                    <div className='mt-3 flex items-center justify-between'>
                                        <span className='font-bold text-gray-900'>{formatNpr(quote.amount)}</span>
                                        <span className='text-[10px] text-gray-400'>Valid till {quote.validUntil}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className='bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-xl font-black text-gray-900'>Invoices</h2>
                            <span className='px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase'>Billing</span>
                        </div>

                        <form onSubmit={addInvoice} className='space-y-3 mb-6'>
                            <div className='grid grid-cols-2 gap-3'>
                                <input value={invoiceForm.number} onChange={e => setInvoiceForm({ ...invoiceForm, number: e.target.value })} placeholder='Invoice number' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                <input value={invoiceForm.customerName} onChange={e => setInvoiceForm({ ...invoiceForm, customerName: e.target.value })} placeholder='Customer' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <input type='number' value={invoiceForm.amount} onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} placeholder='Amount' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                <select value={invoiceForm.status} onChange={e => setInvoiceForm({ ...invoiceForm, status: e.target.value as Invoice['status'] })} className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'>
                                    <option value='Pending'>Pending</option>
                                    <option value='Paid'>Paid</option>
                                    <option value='Overdue'>Overdue</option>
                                </select>
                            </div>
                            <div className='flex gap-3'>
                                <input type='date' value={invoiceForm.dueDate} onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                <button type='submit' className='inline-flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] text-white rounded-xl font-bold text-sm'>
                                    <Plus size={16} /> Add
                                </button>
                            </div>
                        </form>

                        <div className='space-y-3'>
                            {invoices.map(invoice => (
                                <div key={invoice.id} className='border border-gray-100 rounded-2xl p-3'>
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <p className='text-sm font-black text-gray-900'>{invoice.number}</p>
                                            <p className='text-xs text-gray-500'>{invoice.customerName}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${invoice.status === 'Paid' ? 'bg-green-50 text-green-700' : invoice.status === 'Overdue' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                                            {invoice.status}
                                        </span>
                                    </div>
                                    <div className='mt-3 flex items-center justify-between'>
                                        <span className='font-bold text-gray-900'>{formatNpr(invoice.amount)}</span>
                                        <span className='text-[10px] text-gray-400'>Due {invoice.dueDate}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className='bg-white rounded-3xl border border-gray-100 shadow-sm p-5'>
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-xl font-black text-gray-900'>Tickets</h2>
                            <span className='px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase'>Support</span>
                        </div>

                        <form onSubmit={addTicket} className='space-y-3 mb-6'>
                            <input value={ticketForm.subject} onChange={e => setTicketForm({ ...ticketForm, subject: e.target.value })} placeholder='Subject' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                            <div className='grid grid-cols-2 gap-3'>
                                <input value={ticketForm.customerName} onChange={e => setTicketForm({ ...ticketForm, customerName: e.target.value })} placeholder='Customer' className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm' />
                                <select value={ticketForm.category} onChange={e => setTicketForm({ ...ticketForm, category: e.target.value })} className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'>
                                    <option value='Technical'>Technical</option>
                                    <option value='Sales'>Sales</option>
                                    <option value='Billing'>Billing</option>
                                    <option value='General'>General</option>
                                </select>
                            </div>
                            <div className='grid grid-cols-2 gap-3'>
                                <select value={ticketForm.priority} onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value as TicketItem['priority'] })} className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'>
                                    <option value='Low'>Low</option>
                                    <option value='Medium'>Medium</option>
                                    <option value='High'>High</option>
                                    <option value='Urgent'>Urgent</option>
                                </select>
                                <select value={ticketForm.status} onChange={e => setTicketForm({ ...ticketForm, status: e.target.value as TicketItem['status'] })} className='w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm'>
                                    <option value='Open'>Open</option>
                                    <option value='In Progress'>In Progress</option>
                                    <option value='Waiting on Customer'>Waiting on Customer</option>
                                    <option value='Closed'>Closed</option>
                                </select>
                            </div>
                            <button type='submit' className='w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#22c55e] text-white rounded-xl font-bold text-sm'>
                                <Plus size={16} /> Add ticket
                            </button>
                        </form>

                        <div className='space-y-3'>
                            {tickets.map(ticket => (
                                <div key={ticket.id} className='border border-gray-100 rounded-2xl p-3'>
                                    <div className='flex items-center justify-between gap-2'>
                                        <div>
                                            <p className='text-sm font-black text-gray-900'>{ticket.subject}</p>
                                            <p className='text-xs text-gray-500'>{ticket.customerName}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${ticket.priority === 'Urgent' ? 'bg-rose-50 text-rose-700' : ticket.priority === 'High' ? 'bg-orange-50 text-orange-700' : ticket.priority === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <div className='mt-3 flex items-center justify-between'>
                                        <span className='text-[10px] text-gray-500'>{ticket.category}</span>
                                        <select
                                            value={ticket.status}
                                            onChange={e => changeTicketStatus(ticket.id, e.target.value as TicketItem['status'])}
                                            className='px-2 py-1 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 bg-white'
                                        >
                                            <option value='Open'>Open</option>
                                            <option value='In Progress'>In Progress</option>
                                            <option value='Waiting on Customer'>Waiting on Customer</option>
                                            <option value='Closed'>Closed</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className='mt-6 flex items-center justify-between rounded-3xl bg-white border border-gray-100 p-5 shadow-sm'>
                    <div className='flex items-center gap-3'>
                        <div className='p-2 rounded-xl bg-green-50 text-green-700'>
                            <ArrowUpRight size={16} />
                        </div>
                        <div>
                            <p className='text-xs uppercase tracking-[0.18em] text-gray-400'>Operational health</p>
                            <p className='text-xl font-black text-gray-900'>Healthy pipeline with 3 urgent follow-ups</p>
                        </div>
                    </div>
                    <button className='px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-sm'>Review queue</button>
                </div>
            </main>
        </div>
    );
};

export default OperationsCenter;
