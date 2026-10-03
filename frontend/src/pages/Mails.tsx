import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import {
    Search,
    Mail,
    Send,
    FileText,
    Archive,
    Layout,
    RotateCcw,
    Plus,
    Filter,
    ChevronRight,
    Star,
    Inbox,
    Trash2,
    Clock,
    CheckCircle2,
    Sparkles,
    Bot,
    Users,
    Smile,
    ImageIcon,
    Download,
    SendHorizontal,
    ThumbsUp,
    ThumbsDown,
    Zap,
    BarChart3,
    Target,
    Shield,
    Briefcase,
    ArrowLeft,
    MoreHorizontal,
    Settings,
    Home,
    LayoutDashboard,
    Layers,
    Calendar as CalendarIcon,
    LogOut,
    ChevronDown,
    PaperclipIcon,
    Database,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/auth.service';
import { aiService } from '../services/ai.service';
import { emailService } from '../services/email.service';
import { useDataset } from '@/context/DatasetContext';

const TEMPLATES = [
    {
        id: '1',
        title: 'Cold Outreach – CTO',
        persona: 'CTO',
        industry: 'SaaS',
        openRate: '48%',
        category: 'Cold outreach'
    },
    {
        id: '2',
        title: 'Demo Follow-up',
        persona: 'Decision Maker',
        industry: 'General',
        openRate: '62%',
        category: 'Follow-up emails'
    },
    {
        id: '3',
        title: 'Technical Walkthrough',
        persona: 'Engineer',
        industry: 'IT',
        openRate: '54%',
        category: 'Demo scheduling'
    },
    {
        id: '4',
        title: 'Re-engagement',
        persona: 'Dormant Lead',
        industry: 'Enterprise',
        openRate: '35%',
        category: 'Re-engagement'
    },
    {
        id: '5',
        title: 'Deal Closing Signature',
        persona: 'CEO/CFO',
        industry: 'All',
        openRate: '82%',
        category: 'Deal closing'
    }
];

const SUBJECT_LINES = [
    'Quick question about your data stack',
    'Reducing data pipeline latency',
    'Thought this might help your ML team',
    '5 minutes about your data architecture'
];

const REMINDERS = [
    {
        id: '1',
        contact: 'John Smith',
        company: 'Acme Inc',
        lastEmail: '3 days ago',
        suggestion: 'Send follow-up email'
    },
    { id: '2', contact: 'Sarah Chen', company: 'TechFlow', lastEmail: '5 hours ago', suggestion: 'Share documentation' }
];

const DEMO_LEADS = [
    { id: 'demo-lead-1', name: 'Emma Lawson', email: 'emma.lawson@example.com', role: 'VP of Operations', company: 'Acme Manufacturing', status: 'Engaged' },
    { id: 'demo-lead-2', name: 'Carlos Nguyen', email: 'carlos.nguyen@example.com', role: 'Director of Digital Transformation', company: 'Northstar Systems', status: 'Qualified' },
    { id: 'demo-lead-3', name: 'Sofia Patel', email: 'sofia.patel@example.com', role: 'Procurement Manager', company: 'Meridian Industrial', status: 'New Lead' }
];

const DEMO_EMAILS = [
    { leadIndex: 0, daysAgo: 0, subject: 'Next steps after the operations demo', preview: 'The predictive maintenance workflow looks promising. Can we schedule a 30-minute review of the pilot scope this week?', unread: true },
    { leadIndex: 1, daysAgo: 1, subject: 'Integration requirements for the pilot', preview: 'I shared the MES integration notes with engineering. Please send the API requirements so we can confirm the technical review.', unread: true },
    { leadIndex: 2, daysAgo: 7, subject: 'Re: Updated implementation proposal', preview: 'Our procurement team has reviewed the proposal. Could you clarify the onboarding milestones and payment schedule?', unread: false },
    { leadIndex: 0, daysAgo: 30, subject: 'Follow-up: predictive maintenance pilot', preview: 'Following up on the pilot outline we discussed. The operations team is ready to review success metrics and timing.', unread: false },
    { leadIndex: 1, daysAgo: 90, subject: 'Quarterly digital transformation review', preview: 'We are planning our next-quarter roadmap and would like to revisit the automation opportunity with your team.', unread: false },
    { leadIndex: 2, daysAgo: 180, subject: 'Checking in on the supplier evaluation', preview: 'It has been a little while since our last conversation. Is supplier evaluation still on the roadmap for this year?', unread: false }
];

const Mails: React.FC = () => {
    const navigate = useNavigate();
    const { dataset, emails, leads, loadSampleDataset } = useDataset();
    const [activeFolder, setActiveFolder] = useState('Inbox');
    const [selectedEmail, setSelectedEmail] = useState<any>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [activeNav] = useState('Mails');
    const [activeTone, setActiveTone] = useState('Professional');
    const [viewThread, setViewThread] = useState(false);
    const [composeForm, setComposeForm] = useState({
        to: '',
        subject: '',
        body: ''
    });
    const [draftSettings, setDraftSettings] = useState({
        role: 'CTO',
        topic: '',
        tone: 'Professional',
        length: 'Medium'
    });
    const [draftGoal, setDraftGoal] = useState('');
    const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
    const [draftAssistantMessage, setDraftAssistantMessage] = useState<string | null>(null);
    const emojiList = ['😊', '👍', '🎉', '✅', '🔥', '🚀', '💡', '📩', '📎', '🤝'];
    const [sendMessage, setSendMessage] = useState<string | null>(null);
    const [gmailInboxMessages, setGmailInboxMessages] = useState<any[]>([]);
    const [isConnectingGmail, setIsConnectingGmail] = useState(false);
    const [gmailConnectionMessage, setGmailConnectionMessage] = useState<string | null>(() => localStorage.getItem('gmailStatus'));
    const [gmailConnected, setGmailConnected] = useState<boolean>(() => localStorage.getItem('gmailConnected') === 'true');

    useEffect(() => {
        const syncGmailState = () => {
            const connected = localStorage.getItem('gmailConnected') === 'true';
            setGmailConnected(connected);
            const status = localStorage.getItem('gmailStatus');
            if (status) setGmailConnectionMessage(status);
        };

        window.addEventListener('storage', syncGmailState);
        syncGmailState();
        return () => window.removeEventListener('storage', syncGmailState);
    }, []);

    useEffect(() => {
        if (!gmailConnected) {
            setGmailInboxMessages([]);
            return;
        }

        const loadGmailInbox = async () => {
            try {
                const response = await emailService.getGmailInbox();
                setGmailInboxMessages(Array.isArray(response?.messages) ? response.messages : []);
            } catch (error) {
                setGmailInboxMessages([]);
            }
        };

        loadGmailInbox();
    }, [gmailConnected]);

    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };

    const dynamicEmails = useMemo(() => {
        const gmailEmails = gmailInboxMessages.map((message: any, index: number) => {
            const from = message?.from || 'Unknown sender';
            const senderName = from.replace(/<.*>/, '').trim() || 'Unknown sender';
            const senderEmail = from.match(/<([^>]+)>/)?.[1] || '';

            return {
                id: `gmail-${message.id || index}`,
                source: 'Gmail',
                contact: {
                    name: senderName,
                    email: senderEmail,
                    role: 'Gmail contact',
                    company: 'Gmail inbox',
                    avatar: (senderName || 'G')[0]?.toUpperCase() || 'G'
                },
                subject: message?.subject || 'No subject',
                preview: message?.preview || 'No preview available.',
                sentiment: 'Neutral',
                deal: 'Inbox thread',
                timestamp: message?.date ? new Date(message.date).toLocaleString() : 'Recently',
                status: 'Received',
                priority: 'Medium',
                intent: 'Inbox sync',
                isUnread: true,
                keyPoints: ['Fetched from Gmail inbox', 'Connected via Google OAuth'],
                suggestedResponse: 'Thanks for the email. I will review it and follow up shortly.',
                nextAction: 'Review inbox item',
                thread: [{
                    id: `gmail-thread-${message.id || index}`,
                    sender: senderName,
                    role: 'incoming',
                    content: `${message?.preview || 'No preview available.'}`,
                    time: message?.date ? new Date(message.date).toLocaleTimeString() : 'Now'
                }]
            };
        });

        const datasetEmails = (emails || []).map((email: any, index: number) => {
            const contactInfo = leads?.find((c: any) => c.name === email.contact);
            return {
                id: email.email_id || `dynamic-${index}`,
                source: 'CRM data',
                contact: {
                    name: email.contact,
                    role: contactInfo?.role || 'Stakeholder',
                    company: email.companyName || 'Company',
                    avatar: email.contact ? email.contact[0] : 'U'
                },
                subject: email.subject,
                preview: email.summary || 'No preview available.',
                sentiment: 'Neutral',
                deal: 'Associated Deal',
                timestamp: email.timestamp ? new Date(email.timestamp).toLocaleDateString() : 'Recently',
                status: 'Awaiting reply',
                priority: 'Medium',
                intent: 'Inquiry',
                isUnread: index === 0,
                keyPoints: ['Extracted from communication history', 'Awaiting manual assessment'],
                suggestedResponse: 'Thank you for your email. I will review the details and get back to you shortly.',
                nextAction: 'Review and respond',
                thread: [
                    {
                        id: `t-${index}-1`,
                        sender: email.contact,
                        role: 'incoming',
                        content: email.summary || 'Original email body not available in dataset.',
                        time: email.timestamp ? new Date(email.timestamp).toLocaleTimeString() : 'Recently'
                    }
                ]
            };
        });

        const availableLeads = leads?.length
            ? leads.slice(0, 3).map((lead: any) => ({
                id: lead.id,
                name: lead.name || 'CRM lead',
                email: lead.email || '',
                role: lead.role || 'Sales contact',
                company: lead.company || 'Account',
                status: lead.status || 'Active'
            }))
            : DEMO_LEADS;

        const now = Date.now();
        const demoEmails = DEMO_EMAILS.map((demoEmail, index) => {
            const lead = availableLeads[demoEmail.leadIndex % availableLeads.length];
            const timestamp = new Date(now - demoEmail.daysAgo * 24 * 60 * 60 * 1000);
            const formattedTimestamp = timestamp.toLocaleString();

            return {
                id: `demo-email-${lead.id}-${index}`,
                source: 'Demo sample',
                contact: {
                    name: lead.name,
                    email: lead.email,
                    role: lead.role,
                    company: lead.company,
                    avatar: lead.name[0]
                },
                subject: demoEmail.subject,
                preview: demoEmail.preview,
                sentiment: 'Neutral',
                deal: `${lead.status} lead`,
                timestamp: formattedTimestamp,
                status: 'Sample',
                priority: index < 2 ? 'High' : 'Medium',
                intent: 'Sales follow-up',
                isUnread: demoEmail.unread,
                keyPoints: [`Lead status: ${lead.status}`, `Lead email: ${lead.email || 'not provided'}`],
                suggestedResponse: `Hi ${lead.name.split(' ')[0]}, thanks for the update. I will follow up with the requested details.`,
                nextAction: 'Follow up with lead',
                thread: [{
                    id: `demo-thread-${index}`,
                    sender: lead.name,
                    role: 'incoming',
                    content: `From: ${lead.name} <${lead.email || 'email not provided'}>\nRole: ${lead.role}\nCompany: ${lead.company}\nLead status: ${lead.status}\n\n${demoEmail.preview}`,
                    time: formattedTimestamp
                }]
            };
        });

        return [...gmailEmails, ...demoEmails, ...datasetEmails];
    }, [emails, leads, gmailInboxMessages]);

    const sidebarLinks = [
        { name: 'Home', icon: <Home size={20} />, path: '/' },
        { name: 'AI Command Centre', icon: <Sparkles size={20} />, path: '/ai-command', isGlow: true },
        { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
        { name: 'Contacts', icon: <Users size={20} />, path: '/leads' },
        { name: 'Master Table', icon: <Layers size={20} /> },
        { name: 'Calendar', icon: <CalendarIcon size={20} />, path: '/calendar' },
        { name: 'Mails', icon: <Mail size={20} />, path: '/mails' },
        { name: 'Deals', icon: <Briefcase size={20} />, path: '/deals' },
        { name: 'Analytics', icon: <BarChart3 size={20} />, path: '/analytics' },
        { name: 'User Management', icon: <Shield size={20} />, path: '/user-management', isBlue: true },
        { name: 'Settings', icon: <Settings size={20} />, path: '/settings', isBlue: true }
    ];

    const folders = [
        { name: 'Inbox', icon: <Inbox size={18} />, badge: dynamicEmails.length > 0 ? 1 : 0 },
        { name: 'Sent', icon: <Send size={18} /> },
        { name: 'Drafts', icon: <FileText size={18} /> },
        { name: 'Archived', icon: <Archive size={18} /> },
        { name: 'Templates', icon: <Layout size={18} /> },
        { name: 'Sequences', icon: <RotateCcw size={18} /> },
        { name: 'Reminders', icon: <Clock size={18} />, badge: REMINDERS.length }
    ];

    const handleSelectEmail = (email: any) => {
        setSelectedEmail(email);
        setViewThread(true);
    };

    const handleBackToList = () => {
        setViewThread(false);
    };

    const handleConnectGmail = async () => {
        try {
            setIsConnectingGmail(true);
            setGmailConnectionMessage('Opening Google sign-in...');
            const ok = await emailService.connectGmail();
            if (ok) {
                setGmailConnectionMessage('Google sign-in opened in a new tab. Complete the flow to connect Gmail.');
            } else {
                setGmailConnectionMessage('Could not start the Gmail connection flow.');
            }
        } catch (error: any) {
            setGmailConnectionMessage(error?.response?.data?.message || 'Unable to start Gmail OAuth.');
        } finally {
            setIsConnectingGmail(false);
        }
    };

    const handleSelectAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setSelectedAttachments(prev => [...prev, ...files]);
        event.target.value = '';
    };

    const handleInsertEmoji = (emoji: string) => {
        setComposeForm(prev => ({
            ...prev,
            body: `${prev.body}${prev.body ? ' ' : ''}${emoji}`
        }));
    };

    const handleGenerateDraft = async (mode: 'compose' | 'smart' = 'compose') => {
        const topic = mode === 'compose' ? draftSettings.topic : draftGoal;
        const tone = mode === 'compose' ? draftSettings.tone : 'Professional';
        const recipientRole = mode === 'compose' ? draftSettings.role : 'decision maker';
        const length = mode === 'compose' ? draftSettings.length : 'Medium';

        if (!topic.trim()) {
            setDraftAssistantMessage('Add a brief topic or goal before generating the email draft.');
            return;
        }

        try {
            setIsGeneratingDraft(true);
            setDraftAssistantMessage(null);

            const response = await aiService.chat([
                {
                    id: 'email-draft',
                    role: 'user',
                    content: `Write a ${length.toLowerCase()} length email drafted for a ${recipientRole} in a ${tone.toLowerCase()} tone. Topic: ${topic}. Include a clear subject line, short intro, core message, and a concise CTA. Keep it useful for a CRM sales workflow.`
                }
            ]);

            const draftText = response?.content || 'Hi there,\n\nThanks for your time. I wanted to follow up on the opportunity and share a quick update.\n\nI would appreciate a chance to connect and discuss the next step.\n\nBest regards,';
            const firstLine = draftText.split('\n')[0]?.startsWith('Subject:') ? draftText.split('\n')[0] : 'Subject: Follow-up on the opportunity';
            const body = draftText.includes('\n') ? draftText.split('\n').slice(1).join('\n').trim() || draftText : draftText;

            setComposeForm(prev => ({
                ...prev,
                subject: firstLine.replace(/^Subject:\s*/i, '').trim() || prev.subject || 'Follow-up on the opportunity',
                body: body.trim() || prev.body
            }));

            if (mode === 'smart') {
                setIsDrafting(false);
            }

            setDraftAssistantMessage('AI draft inserted into the email composer.');
        } catch (error: any) {
            setDraftAssistantMessage(error?.message || 'Unable to generate an AI draft right now.');
        } finally {
            setIsGeneratingDraft(false);
        }
    };

    const handleSendEmail = async () => {
        if (!composeForm.to.trim() || !composeForm.subject.trim() || !composeForm.body.trim()) {
            setSendMessage('Please fill in the recipient, subject, and message body before sending.');
            return;
        }

        try {
            setIsSending(true);
            setSendMessage(null);

            const attachments = await Promise.all(selectedAttachments.map(async file => {
                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                bytes.forEach(byte => {
                    binary += String.fromCharCode(byte);
                });
                const contentBase64 = btoa(binary);

                return {
                    filename: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    contentBase64
                };
            }));

            const response = await emailService.sendEmail({
                to: composeForm.to,
                subject: composeForm.subject,
                text: composeForm.body,
                attachments: attachments.length > 0 ? attachments : undefined
            });

            if (response?.success) {
                setSendMessage(response.message || 'Email sent successfully.');
                setComposeForm({ to: '', subject: '', body: '' });
                setSelectedAttachments([]);
                setIsComposing(false);
            } else {
                setSendMessage(response?.message || 'Email could not be sent.');
            }
        } catch (error: any) {
            setSendMessage(error?.response?.data?.message || 'An error occurred while sending the email.');
        } finally {
            setIsSending(false);
        }
    };

    if (!dataset && dynamicEmails.length === 0) {
        return (
            <div className='flex h-screen bg-white text-gray-900 font-inter overflow-hidden'>
                <aside className='w-60 h-full bg-[#f9fafb] border-r border-gray-200 flex flex-col fixed left-0 top-0 z-40'>
                    <div className='absolute top-0 right-0 bottom-0 w-[2px] bg-[#22c55e]/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]' />
                    <div className='p-6 flex items-center gap-2 mb-4'>
                        <img
                            src='/logos/full-crm-mattr.png'
                            alt='GreenCRM Logo'
                            className='h-8 w-auto'
                        />
                        <span className='text-xl font-bold tracking-tight text-gray-900'>GreenCRM</span>
                    </div>
                    <nav className='flex-1 px-4 space-y-1'>
                        <Link
                            to='/'
                            className='w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all'
                        >
                            <Home
                                size={20}
                                className='text-gray-400'
                            />
                            <span>Home</span>
                        </Link>
                        <Link
                            to='/ai-command'
                            className='w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium bg-[#22c55e] text-white shadow-lg shadow-green-100 animate-glow-pulse'
                        >
                            <Sparkles
                                size={20}
                                className='text-white'
                            />
                            <span>AI Command Centre</span>
                        </Link>
                        <Link
                            to='/analytics'
                            className='w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all'
                        >
                            <BarChart3
                                size={20}
                                className='text-gray-400'
                            />
                            <span>Analytics</span>
                        </Link>
                    </nav>
                </aside>

                <main className='flex-1 ml-60 flex flex-col items-center justify-center p-8 bg-gray-50/30'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className='text-center max-w-md'
                    >
                        <div className='w-20 h-20 bg-white rounded-3xl shadow-xl border border-gray-100 flex items-center justify-center mx-auto mb-8'>
                            <Database className='w-10 h-10 text-[#22c55e]' />
                        </div>
                        <h2 className='text-3xl font-extrabold text-gray-900 mb-4'>No emails available</h2>
                        <p className='text-gray-500 mb-10 leading-relaxed'>
                            Populate your dashboard with real intelligence to start managing your inbox.
                        </p>
                        <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
                            <button
                                type='button'
                                onClick={loadSampleDataset}
                                className='inline-flex items-center gap-3 px-8 py-4 bg-[#22c55e] text-white font-bold rounded-2xl hover:bg-[#16a34a] transition-all shadow-xl shadow-green-100 hover:-translate-y-1'
                            >
                                Load Demo CRM Data
                                <Database size={20} />
                            </button>
                            <Link
                                to='/ai-command'
                                className='inline-flex items-center gap-3 px-8 py-4 bg-white text-[#22c55e] border border-[#22c55e] font-bold rounded-2xl hover:bg-green-50 transition-all shadow-sm'
                            >
                                Go to AI Command Centre
                                <ArrowRight size={20} />
                            </Link>
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    return (
        <div className='flex h-screen bg-white text-gray-900 font-inter overflow-hidden'>
            <Sidebar activeNav={activeNav} />
            {/* --- MAIN WORKSPACE --- */}
            <div className='flex-1 ml-60 flex flex-col overflow-hidden'>
                {/* --- TOP TOOLBAR --- */}
                <header className='min-h-16 border-b border-gray-100 flex flex-col items-stretch gap-3 px-3 py-3 bg-white shrink-0 z-20 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
                    <div className='flex w-full items-center gap-3 sm:flex-1 sm:gap-4 sm:max-w-2xl'>
                        <div className='relative flex-1 group'>
                            <Search
                                className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#22c55e] transition-colors'
                                size={16}
                            />
                            <input
                                type='text'
                                placeholder='Search emails by contact, company, subject, keywords...'
                                className='w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 focus:border-[#22c55e] transition-all'
                            />
                        </div>
                        <button className='flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all group'>
                            <Filter
                                size={14}
                                className='group-hover:text-[#22c55e]'
                            />
                            Filters
                            <ChevronDown size={14} />
                        </button>
                    </div>

                    <div className='flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-4'>
                        <button
                            onClick={handleConnectGmail}
                            disabled={isConnectingGmail}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                gmailConnected
                                    ? 'bg-green-50 text-[#166534] border border-green-200'
                                    : 'bg-[#f5f3ff] text-[#5b21b6] border border-[#e9d5ff] hover:bg-[#efe7ff]'
                            }`}
                        >
                            <Mail size={14} />
                            {isConnectingGmail ? 'Connecting...' : gmailConnected ? 'Gmail Connected' : 'Connect Gmail'}
                        </button>
                        <button
                            onClick={() => setIsDrafting(true)}
                            className='px-4 py-2 border border-[#22c55e] text-[#22c55e] rounded-xl text-xs font-bold hover:bg-green-50 transition-all flex items-center gap-2'
                        >
                            <Sparkles size={14} />
                            Create Draft
                        </button>
                        <button
                            onClick={() => setIsComposing(true)}
                            className='px-4 py-2 bg-[#22c55e] text-white rounded-xl text-xs font-bold hover:bg-[#16a34a] transition-all flex items-center gap-2 shadow-lg shadow-green-100'
                        >
                            <Plus size={16} />
                            Compose Email
                        </button>
                    </div>
                </header>
                {gmailConnectionMessage && (
                    <div className='px-6 py-2 border-b border-gray-100 bg-[#f6fff7] text-xs text-[#166534]'>
                        {gmailConnectionMessage}
                    </div>
                )}
                {/* --- THREE COLUMN LAYOUT --- */}
                <div className='flex-1 flex min-h-0 flex-col overflow-visible bg-white lg:flex-row lg:overflow-hidden'>
                    {/* COLUMN 1: LEFT SIDEBAR (20%) */}
                    <aside className='w-full max-h-48 border-b border-gray-100 bg-white flex flex-col shrink-0 overflow-y-auto custom-scrollbar lg:w-[20%] lg:max-h-none lg:border-b-0 lg:border-r'>
                        <div className='p-4 space-y-1'>
                            {folders.map(folder => (
                                <button
                                    key={folder.name}
                                    onClick={() => {
                                        setActiveFolder(folder.name);
                                        setViewThread(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        activeFolder === folder.name
                                            ? 'bg-green-50 text-[#22c55e]'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <div className='flex items-center gap-3'>
                                        <span
                                            className={
                                                activeFolder === folder.name ? 'text-[#22c55e]' : 'text-gray-400'
                                            }
                                        >
                                            {folder.icon}
                                        </span>
                                        <span>{folder.name}</span>
                                    </div>
                                    {folder.badge && (
                                        <span
                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                activeFolder === folder.name
                                                    ? 'bg-[#22c55e] text-white'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}
                                        >
                                            {folder.badge}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className='mt-8 px-6 pb-4'>
                            <h4 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4'>
                                Suggested Subject Lines
                            </h4>
                            <div className='space-y-3'>
                                {SUBJECT_LINES.map((line, i) => (
                                    <div
                                        key={i}
                                        className='p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#22c55e]/30 transition-all cursor-pointer group'
                                    >
                                        <p className='text-[10px] font-medium text-gray-600 group-hover:text-gray-900 leading-tight'>
                                            {line}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className='mt-8 px-6 pb-6 border-t border-gray-50 pt-6'>
                            <h4 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4'>
                                Follow-up Reminders
                            </h4>
                            <div className='space-y-3'>
                                {REMINDERS.map(r => (
                                    <div
                                        key={r.id}
                                        className='p-3 bg-white border border-gray-100 rounded-xl hover:border-[#22c55e]/30 transition-all cursor-pointer group shadow-sm'
                                    >
                                        <div className='flex items-center justify-between mb-1'>
                                            <p className='text-[10px] font-bold text-gray-900'>{r.contact}</p>
                                            <span className='text-[8px] text-gray-400'>{r.lastEmail}</span>
                                        </div>
                                        <p className='text-[9px] text-gray-500 mb-2 truncate'>{r.company}</p>
                                        <div className='flex items-center gap-1.5 text-[9px] font-bold text-[#22c55e]'>
                                            <ArrowLeft
                                                size={10}
                                                className='rotate-180'
                                            />
                                            {r.suggestion}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* COLUMN 2: CENTER PANEL (40%) */}
                    <main className='w-full h-[65vh] min-h-[28rem] border-b border-gray-100 flex flex-col shrink-0 bg-[#fcfcfc] overflow-hidden relative lg:h-auto lg:w-[40%] lg:min-h-0 lg:border-b-0 lg:border-r'>
                        <AnimatePresence mode='wait'>
                            {!viewThread ? (
                                <motion.div
                                    key='list'
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className='flex flex-col h-full'
                                >
                                    <div className='p-4 border-b border-gray-100 bg-white flex items-center justify-between shrink-0'>
                                        <h2 className='font-bold text-gray-900 text-sm flex items-center gap-2'>
                                            {activeFolder}
                                            <span className='text-[10px] font-normal text-gray-400'>
                                                (
                                                {activeFolder === 'Templates'
                                                    ? TEMPLATES.length
                                                    : activeFolder === 'Inbox'
                                                      ? dynamicEmails.length
                                                      : 0}
                                                )
                                            </span>
                                        </h2>
                                        <button className='text-gray-400 hover:text-gray-600 transition-colors'>
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </div>

                                    <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar'>
                                        {activeFolder === 'Inbox' &&
                                            dynamicEmails.map((email: any) => (
                                                <motion.div
                                                    key={email.id}
                                                    whileHover={{ y: -2 }}
                                                    onClick={() => handleSelectEmail(email)}
                                                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                                                        selectedEmail?.id === email.id
                                                            ? 'bg-white border-[#22c55e] shadow-md ring-1 ring-[#22c55e]/10'
                                                            : 'bg-white border-gray-100 hover:border-[#22c55e]/30 hover:shadow-sm'
                                                    }`}
                                                >
                                                    {email.isUnread && (
                                                        <div className='absolute top-4 right-4 w-2 h-2 bg-[#22c55e] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]' />
                                                    )}

                                                    <div className='flex items-start gap-3 mb-3'>
                                                        <div className='w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#22c55e] font-bold text-xs shrink-0 border border-green-100'>
                                                            {email.contact.avatar}
                                                        </div>
                                                        <div className='min-w-0 flex-1'>
                                                            <div className='flex items-center justify-between mb-0.5'>
                                                                <h4 className='text-xs font-bold text-gray-900 truncate'>
                                                                    {email.contact.name}
                                                                </h4>
                                                                <span className='text-[10px] text-gray-400'>
                                                                    {email.timestamp}
                                                                </span>
                                                            </div>
                                                            <p className='text-[10px] text-gray-500 truncate'>
                                                                {email.contact.role} | {email.contact.company}
                                                            </p>
                                                            {email.contact.email && (
                                                                <p className='text-[10px] text-gray-400 truncate'>{email.contact.email}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className='mb-3'>
                                                        <p className='text-xs font-bold text-gray-900 truncate mb-1'>
                                                            {email.subject}
                                                        </p>
                                                        <p className='text-[11px] text-gray-500 line-clamp-1'>
                                                            {email.preview}
                                                        </p>
                                                    </div>

                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 ${
                                                                email.sentiment === 'Positive'
                                                                    ? 'bg-green-50 text-green-600'
                                                                    : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                        >
                                                            {email.sentiment === 'Positive' ? (
                                                                <ThumbsUp size={10} />
                                                            ) : (
                                                                <ThumbsDown size={10} />
                                                            )}
                                                            {email.sentiment}
                                                        </span>
                                                        <span className='px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold flex items-center gap-1'>
                                                            <Target size={10} />
                                                            {email.deal}
                                                        </span>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                                email.status === 'Awaiting reply'
                                                                    ? 'bg-amber-50 text-amber-600'
                                                                    : 'bg-green-50 text-green-600'
                                                            }`}
                                                        >
                                                            {email.status}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            ))}

                                        {activeFolder === 'Templates' &&
                                            TEMPLATES.map(template => (
                                                <div
                                                    key={template.id}
                                                    className='p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#22c55e]/30 cursor-pointer transition-all group'
                                                >
                                                    <div className='flex items-center justify-between mb-2'>
                                                        <h4 className='text-sm font-bold text-gray-900 group-hover:text-[#22c55e] transition-colors'>
                                                            {template.title}
                                                        </h4>
                                                        <span className='px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold'>
                                                            {template.category}
                                                        </span>
                                                    </div>
                                                    <div className='grid grid-cols-2 gap-4'>
                                                        <div>
                                                            <p className='text-[9px] font-bold text-gray-400 uppercase'>
                                                                Persona
                                                            </p>
                                                            <p className='text-xs font-medium text-gray-700'>
                                                                {template.persona}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className='text-[9px] font-bold text-gray-400 uppercase'>
                                                                Open Rate
                                                            </p>
                                                            <p className='text-xs font-bold text-[#22c55e]'>
                                                                {template.openRate}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                        {activeFolder === 'Inbox' && dynamicEmails.length === 0 && (
                                            <div className='text-center py-12'>
                                                <p className='text-gray-400 italic text-sm'>No emails in this folder</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key='thread'
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className='flex flex-col h-full bg-white'
                                >
                                    <div className='p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10'>
                                        <button
                                            onClick={handleBackToList}
                                            className='flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#22c55e] transition-colors'
                                        >
                                            <ArrowLeft size={16} />
                                            Back to Inbox
                                        </button>
                                        <div className='flex items-center gap-3'>
                                            <button className='p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors'>
                                                <Star size={16} />
                                            </button>
                                            <button className='p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors'>
                                                <Archive size={16} />
                                            </button>
                                            <button className='p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors'>
                                                <Trash2 size={16} />
                                            </button>
                                            <button className='p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors'>
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className='flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gray-50/20'>
                                        <div className='mb-8'>
                                            <h2 className='text-lg font-bold text-gray-900 mb-2'>
                                                {selectedEmail.subject}
                                            </h2>
                                            <div className='flex items-center gap-3'>
                                                <div className='w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#22c55e] font-bold border border-green-100 shrink-0'>
                                                    {selectedEmail.contact.avatar}
                                                </div>
                                                <div className='min-w-0'>
                                                    <p className='text-sm font-bold text-gray-900'>
                                                        {selectedEmail.contact.name}
                                                    </p>
                                                    <p className='text-[11px] text-gray-500'>
                                                        {selectedEmail.contact.role} | {selectedEmail.contact.company}
                                                    </p>
                                                </div>
                                                <div className='flex-1' />
                                                <span className='text-[10px] text-gray-400 font-medium'>
                                                    {selectedEmail.timestamp}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedEmail.thread?.map((msg: any) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.role === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[90%] space-y-2 ${msg.role === 'outgoing' ? 'items-end' : 'items-start'}`}
                                                >
                                                    <div
                                                        className={`flex items-center gap-2 mb-1 ${msg.role === 'outgoing' ? 'flex-row-reverse' : 'flex-row'}`}
                                                    >
                                                        <span className='text-[10px] font-bold text-gray-900'>
                                                            {msg.sender}
                                                        </span>
                                                        <span className='text-[9px] text-gray-400'>{msg.time}</span>
                                                    </div>
                                                    <div
                                                        className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                            msg.role === 'outgoing'
                                                                ? 'bg-[#22c55e] text-white rounded-tr-none'
                                                                : 'bg-white border border-gray-100 text-gray-700 rounded-tl-none'
                                                        }`}
                                                    >
                                                        {msg.content}

                                                        {msg.attachments && (
                                                            <div className='mt-4 pt-4 border-t border-white/20 flex flex-col gap-2'>
                                                                {msg.attachments.map((file: any, i: number) => (
                                                                    <div
                                                                        key={i}
                                                                        className='flex items-center justify-between p-2 bg-black/5 rounded-xl border border-white/10 group cursor-pointer'
                                                                    >
                                                                        <div className='flex items-center gap-2'>
                                                                            <FileText size={14} />
                                                                            <span className='text-[11px] font-medium'>
                                                                                {file.name}
                                                                            </span>
                                                                            <span className='text-[9px] opacity-60'>
                                                                                ({file.size})
                                                                            </span>
                                                                        </div>
                                                                        <Download
                                                                            size={14}
                                                                            className='opacity-0 group-hover:opacity-100 transition-opacity'
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className='p-4 border-t border-gray-100 bg-white sticky bottom-0 z-10'>
                                        <div className='flex items-center gap-3'>
                                            <button className='flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2'>
                                                <RotateCcw size={16} /> Reply
                                            </button>
                                            <button className='flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2'>
                                                <Send size={16} /> Forward
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>

                    {/* COLUMN 3: RIGHT PANEL (40%) */}
                    <aside className='w-full min-h-[20rem] flex flex-col bg-white overflow-hidden lg:w-[40%] lg:min-h-0'>
                        {selectedEmail ? (
                            <div className='flex-1 flex flex-col overflow-hidden'>
                                <div className='p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0'>
                                    <div className='flex items-center gap-2'>
                                        <div className='p-1.5 bg-green-50 text-[#22c55e] rounded-lg'>
                                            <Sparkles size={18} />
                                        </div>
                                        <h3 className='font-bold text-gray-900 text-sm'>Email Insights</h3>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <div className='flex items-center gap-1.5'>
                                            <span className='text-[10px] font-bold text-gray-400'>Analysis:</span>
                                            <span className='text-[10px] font-bold text-[#22c55e] bg-green-50 px-2 py-0.5 rounded-full'>
                                                Completed
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className='flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar'>
                                    {/* CONTACT INTENT */}
                                    <section>
                                        <div className='flex items-center gap-2 mb-4'>
                                            <Target
                                                size={18}
                                                className='text-[#22c55e]'
                                            />
                                            <h4 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                                                Contact Intent
                                            </h4>
                                        </div>
                                        <div className='p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm'>
                                            <p className='text-sm font-bold text-gray-900 leading-relaxed'>
                                                {selectedEmail.intent || 'Interested in pricing discussion'}
                                            </p>
                                        </div>
                                    </section>

                                    {/* KEY POINTS EXTRACTED */}
                                    <section>
                                        <div className='flex items-center gap-2 mb-4'>
                                            <ListIcon
                                                size={18}
                                                className='text-[#22c55e]'
                                            />
                                            <h4 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                                                Key Points Extracted
                                            </h4>
                                        </div>
                                        <div className='space-y-3'>
                                            {selectedEmail.keyPoints?.map((point: string, i: number) => (
                                                <div
                                                    key={i}
                                                    className='flex items-start gap-3 p-4 bg-white border border-gray-50 rounded-2xl hover:border-[#22c55e]/20 transition-all group'
                                                >
                                                    <div className='w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-[#22c55e] text-[10px] font-bold group-hover:bg-[#22c55e] group-hover:text-white transition-all shrink-0'>
                                                        {i + 1}
                                                    </div>
                                                    <p className='text-xs text-gray-700 font-medium leading-relaxed'>
                                                        {point}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* SUGGESTED RESPONSE */}
                                    <section>
                                        <div className='flex items-center gap-2 mb-4'>
                                            <Bot
                                                size={18}
                                                className='text-[#22c55e]'
                                            />
                                            <h4 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                                                Suggested Response
                                            </h4>
                                        </div>
                                        <div className='p-6 bg-green-50/30 rounded-[2rem] border border-[#22c55e]/10 relative group'>
                                            <div className='absolute top-4 right-4 text-[#22c55e] opacity-40 group-hover:opacity-100 transition-opacity'>
                                                <Sparkles size={20} />
                                            </div>
                                            <p className='text-sm text-gray-700 leading-relaxed italic mb-8 pr-6'>
                                                "{selectedEmail.suggestedResponse}"
                                            </p>

                                            <div className='flex flex-col gap-4'>
                                                <div className='flex items-center justify-between px-2'>
                                                    <span className='text-[10px] font-bold text-gray-400 uppercase'>
                                                        Tone Selector
                                                    </span>
                                                    <div className='flex items-center gap-2'>
                                                        {[
                                                            'Friendly',
                                                            'Professional',
                                                            'Short',
                                                            'Technical',
                                                            'Follow-up'
                                                        ].map(tone => (
                                                            <button
                                                                key={tone}
                                                                onClick={() => setActiveTone(tone)}
                                                                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                                                                    activeTone === tone
                                                                        ? 'bg-[#22c55e] text-white shadow-md'
                                                                        : 'bg-white text-gray-400 hover:text-gray-600'
                                                                }`}
                                                            >
                                                                {tone}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button className='w-full py-4 bg-[#22c55e] text-white rounded-2xl text-xs font-bold hover:bg-[#16a34a] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100'>
                                                    <SendHorizontal size={16} />
                                                    Generate Full Reply Draft
                                                </button>
                                            </div>
                                        </div>
                                    </section>

                                    {/* NEXT BEST ACTION */}
                                    <section className='pb-8'>
                                        <div className='flex items-center gap-2 mb-4'>
                                            <Zap
                                                size={18}
                                                className='text-[#22c55e]'
                                            />
                                            <h4 className='text-[10px] font-bold text-gray-400 uppercase tracking-widest'>
                                                Next Best Action
                                            </h4>
                                        </div>
                                        <div className='flex items-center justify-between p-5 bg-[#1a0b2e] text-[#00f2ff] rounded-[2rem] shadow-xl shadow-cyan-900/10 group cursor-pointer hover:scale-[1.02] transition-all'>
                                            <div className='flex items-center gap-4'>
                                                <div className='w-12 h-12 rounded-2xl bg-[#00f2ff]/10 flex items-center justify-center border border-[#00f2ff]/20'>
                                                    <CheckCircle2 size={24} />
                                                </div>
                                                <div>
                                                    <p className='text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1'>
                                                        Recommended Action
                                                    </p>
                                                    <p className='text-sm font-extrabold tracking-tight'>
                                                        {selectedEmail.nextAction}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight
                                                size={20}
                                                className='group-hover:translate-x-1 transition-transform'
                                            />
                                        </div>

                                        <div className='grid grid-cols-2 gap-3 mt-4'>
                                            <button className='p-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-white hover:border-[#22c55e]/30 transition-all text-center'>
                                                Schedule Technical Demo
                                            </button>
                                            <button className='p-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-white hover:border-[#22c55e]/30 transition-all text-center'>
                                                Send Pricing Sheet
                                            </button>
                                            <button className='p-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-white hover:border-[#22c55e]/30 transition-all text-center'>
                                                Share Documentation
                                            </button>
                                            <button className='p-3 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-white hover:border-[#22c55e]/30 transition-all text-center'>
                                                Introduce Specialist
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        ) : (
                            <div className='flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/20'>
                                <div className='w-24 h-24 bg-white rounded-[2rem] shadow-xl border border-gray-100 flex items-center justify-center mb-8'>
                                    <Mail className='w-12 h-12 text-gray-200' />
                                </div>
                                <h3 className='text-xl font-extrabold text-gray-900 mb-2 tracking-tight'>
                                    Select a conversation
                                </h3>
                                <p className='text-sm text-gray-500 max-w-xs mx-auto leading-relaxed'>
                                    Choose a thread from your inbox to view AI-powered insights, key extraction and
                                    suggested responses.
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            {/* --- COMPOSE PANEL OVERLAY --- */}
            <AnimatePresence>
                {isComposing && (
                    <div className='fixed inset-0 z-50 flex items-end justify-end p-2 sm:p-6 pointer-events-none'>
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            className='w-full max-w-4xl bg-white rounded-2xl sm:rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.2)] border border-gray-200 flex flex-col pointer-events-auto overflow-hidden h-[90dvh] max-h-[700px]'
                        >
                            <div className='p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 bg-[#22c55e] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100'>
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h3 className='text-sm font-extrabold text-gray-900'>Compose New Message</h3>
                                        <p className='text-[10px] text-gray-500 font-medium tracking-wide'>
                                            AI DRAFT ASSISTANT ACTIVE
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsComposing(false)}
                                    className='w-10 h-10 hover:bg-gray-200 rounded-xl text-gray-400 transition-colors flex items-center justify-center'
                                >
                                    <Plus
                                        size={24}
                                        className='rotate-45'
                                    />
                                </button>
                            </div>

                            <div className='flex-1 flex overflow-hidden'>
                                {/* COMPOSER FIELDS */}
                                <div className='flex-1 flex flex-col p-8 space-y-6 overflow-y-auto custom-scrollbar'>
                                    <div className='space-y-4'>
                                        <div className='flex items-center gap-4 border-b border-gray-100 pb-3'>
                                            <span className='text-[11px] font-bold text-gray-400 uppercase w-16'>
                                                To
                                            </span>
                                            <input
                                                value={composeForm.to}
                                                onChange={(e) => setComposeForm(prev => ({ ...prev, to: e.target.value }))}
                                                type='text'
                                                placeholder='Recipient email or contact name'
                                                className='flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300'
                                            />
                                        </div>
                                        <div className='flex items-center gap-4 border-b border-gray-100 pb-3'>
                                            <span className='text-[11px] font-bold text-gray-400 uppercase w-16'>
                                                Subject
                                            </span>
                                            <input
                                                value={composeForm.subject}
                                                onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                                                type='text'
                                                placeholder='Add a compelling subject line'
                                                className='flex-1 bg-transparent border-none outline-none text-sm font-bold text-gray-900 placeholder:text-gray-300'
                                            />
                                        </div>
                                    </div>

                                    <div className='flex-1 relative'>
                                        <textarea
                                            value={composeForm.body}
                                            onChange={(e) => setComposeForm(prev => ({ ...prev, body: e.target.value }))}
                                            placeholder='Start writing your message here or use the Draft Assistant on the right...'
                                            className='w-full h-full bg-transparent border-none outline-none text-base leading-relaxed resize-none placeholder:text-gray-300 custom-scrollbar'
                                        />
                                    </div>

                                    {selectedAttachments.length > 0 && (
                                        <div className='space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3'>
                                            <p className='text-[10px] font-bold uppercase tracking-widest text-gray-400'>Attachments</p>
                                            <div className='flex flex-wrap gap-2'>
                                                {selectedAttachments.map((file, index) => (
                                                    <div key={`${file.name}-${index}`} className='flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700'>
                                                        <PaperclipIcon size={12} />
                                                        <span className='max-w-[180px] truncate'>{file.name}</span>
                                                        <button
                                                            type='button'
                                                            onClick={() => setSelectedAttachments(prev => prev.filter((_, idx) => idx !== index))}
                                                            className='text-gray-400 hover:text-red-500'
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {sendMessage && (
                                        <div className='rounded-xl border border-green-200 bg-green-50 text-green-700 text-xs px-3 py-2'>
                                            {sendMessage}
                                        </div>
                                    )}

                                    <div className='flex items-center justify-between py-6 border-t border-gray-100 mt-auto shrink-0'>
                                        <div className='flex items-center gap-2'>
                                            <label className='w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 transition-colors cursor-pointer'>
                                                <PaperclipIcon size={20} />
                                                <input type='file' multiple className='hidden' onChange={handleSelectAttachments} />
                                            </label>
                                            <label className='w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 transition-colors cursor-pointer'>
                                                <ImageIcon size={20} />
                                                <input type='file' accept='image/*' className='hidden' onChange={handleSelectAttachments} />
                                            </label>
                                            <div className='relative group'>
                                                <button type='button' className='w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-gray-400 transition-colors'>
                                                    <Smile size={20} />
                                                </button>
                                                <div className='absolute bottom-12 left-0 hidden group-hover:flex group-focus-within:flex gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg z-20'>
                                                    {emojiList.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            type='button'
                                                            onClick={() => handleInsertEmoji(emoji)}
                                                            className='text-lg hover:scale-110 transition-transform'
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className='w-px h-6 bg-gray-200 mx-2' />
                                            <button className='px-4 py-2 bg-green-50 text-[#22c55e] rounded-xl text-[10px] font-bold hover:bg-green-100 transition-all flex items-center gap-2'>
                                                <Bot size={14} /> Smart Check
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleSendEmail}
                                            disabled={isSending}
                                            className='px-10 py-4 bg-[#22c55e] text-white rounded-2xl font-bold shadow-xl shadow-green-100 hover:bg-[#16a34a] hover:-translate-y-0.5 transition-all flex items-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed'
                                        >
                                            {isSending ? 'Sending...' : 'Send Email'}
                                            <SendHorizontal size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* DRAFT ASSISTANT SIDEBAR */}
                                <div className='w-80 bg-[#f9fafb] border-l border-gray-200 flex flex-col shrink-0'>
                                    <div className='p-6 border-b border-gray-200 bg-white'>
                                        <h4 className='text-[11px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2'>
                                            <Sparkles
                                                size={14}
                                                className='text-[#22c55e]'
                                            />{' '}
                                            Draft Assistant
                                        </h4>
                                    </div>
                                    <div className='flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar'>
                                        <div className='space-y-5'>
                                            <div>
                                                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2'>
                                                    Recipient Role
                                                </label>
                                                <select
                                                    value={draftSettings.role}
                                                    onChange={(e) => setDraftSettings(prev => ({ ...prev, role: e.target.value }))}
                                                    className='w-full bg-white border border-gray-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#22c55e]/20 transition-all appearance-none'
                                                >
                                                    <option>CTO</option>
                                                    <option>CEO</option>
                                                    <option>VP Engineering</option>
                                                    <option>Technical Director</option>
                                                    <option>Product Manager</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2'>
                                                    Primary Topic
                                                </label>
                                                <input
                                                    type='text'
                                                    value={draftSettings.topic}
                                                    onChange={(e) => setDraftSettings(prev => ({ ...prev, topic: e.target.value }))}
                                                    placeholder='e.g. Data platform demo'
                                                    className='w-full bg-white border border-gray-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#22c55e]/20 transition-all'
                                                />
                                            </div>
                                            <div>
                                                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2'>
                                                    Desired Tone
                                                </label>
                                                <select
                                                    value={draftSettings.tone}
                                                    onChange={(e) => setDraftSettings(prev => ({ ...prev, tone: e.target.value }))}
                                                    className='w-full bg-white border border-gray-200 rounded-2xl p-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#22c55e]/20 transition-all appearance-none'
                                                >
                                                    <option>Professional</option>
                                                    <option>Friendly & Casual</option>
                                                    <option>Direct & Concise</option>
                                                    <option>Technically Focused</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2'>
                                                    Message Length
                                                </label>
                                                <div className='flex gap-2'>
                                                    {['Short', 'Medium', 'Long'].map(l => (
                                                        <button
                                                            key={l}
                                                            onClick={() => setDraftSettings(prev => ({ ...prev, length: l }))}
                                                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold border transition-all ${draftSettings.length === l ? 'bg-[#22c55e] text-white border-[#22c55e] shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                                        >
                                                            {l}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {draftAssistantMessage && (
                                            <div className='rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[10px] text-green-700'>
                                                {draftAssistantMessage}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => void handleGenerateDraft('compose')}
                                            disabled={isGeneratingDraft}
                                            className='w-full py-4 bg-[#22c55e] text-white rounded-2xl font-bold hover:bg-[#16a34a] transition-all shadow-lg shadow-green-50 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
                                        >
                                            <Sparkles size={16} />
                                            {isGeneratingDraft ? 'Generating...' : 'Generate AI Draft'}
                                        </button>

                                        <div className='pt-8 border-t border-gray-200'>
                                            <h5 className='text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4'>
                                                Smart Suggestions
                                            </h5>
                                            <div className='space-y-3'>
                                                {TEMPLATES.slice(0, 3).map(template => (
                                                    <div
                                                        key={template.id}
                                                        onClick={() => {
                                                            setDraftSettings(prev => ({ ...prev, topic: template.title, role: template.persona }));
                                                            void handleGenerateDraft('compose');
                                                        }}
                                                        className='p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#22c55e]/30 cursor-pointer transition-all shadow-sm group'
                                                    >
                                                        <div className='flex items-center justify-between mb-1'>
                                                            <p className='text-[10px] font-bold text-gray-900 group-hover:text-[#22c55e] transition-colors'>
                                                                {template.title}
                                                            </p>
                                                            <span className='text-[8px] font-bold text-[#22c55e] bg-green-50 px-1.5 py-0.5 rounded-md'>
                                                                {template.openRate}
                                                            </span>
                                                        </div>
                                                        <p className='text-[9px] text-gray-400 uppercase tracking-widest font-bold'>
                                                            Target: {template.persona}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- SMART DRAFT OVERLAY (FOR "CREATE DRAFT" BUTTON) --- */}
            <AnimatePresence>
                {isDrafting && (
                    <div className='fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-gray-900/40 backdrop-blur-md'>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className='w-full max-w-xl bg-white rounded-[3rem] shadow-2xl border border-white/50 overflow-hidden flex flex-col'
                        >
                            <div className='p-5 sm:p-10 bg-gradient-to-br from-[#dcfce7] to-white flex flex-col items-center text-center relative'>
                                <button
                                    onClick={() => setIsDrafting(false)}
                                    className='absolute top-6 right-6 w-10 h-10 flex items-center justify-center hover:bg-white/50 rounded-full text-gray-400 transition-colors'
                                >
                                    <Plus
                                        size={24}
                                        className='rotate-45'
                                    />
                                </button>
                                <div className='w-20 h-20 bg-[#22c55e] text-white rounded-[1.75rem] flex items-center justify-center shadow-2xl shadow-green-200 mb-8 transform rotate-3'>
                                    <Sparkles size={40} />
                                </div>
                                <h3 className='text-2xl font-black text-gray-900 mb-3 tracking-tight'>
                                    Smart Draft Composer
                                </h3>
                                <p className='text-sm text-gray-500 font-medium max-w-xs leading-relaxed'>
                                    Let AI craft the perfect response using your CRM history and stakeholder insights.
                                </p>
                            </div>

                            <div className='p-10 space-y-8'>
                                <div className='space-y-6'>
                                    <div>
                                        <label className='text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 block'>
                                            Campaign Category
                                        </label>
                                        <div className='grid grid-cols-2 gap-3'>
                                            {[
                                                'Cold Outreach',
                                                'Post-Demo Follow-up',
                                                'Deal Closure',
                                                'Meeting Request'
                                            ].map(cat => (
                                                <button
                                                    key={cat}
                                                    className='p-4 rounded-2xl border border-gray-100 bg-gray-50 text-xs font-extrabold text-gray-600 hover:border-[#22c55e] hover:bg-green-50 hover:text-[#22c55e] transition-all text-left shadow-sm'
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className='text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 block'>
                                            Primary Goal
                                        </label>
                                        <input
                                            type='text'
                                            value={draftGoal}
                                            onChange={(e) => setDraftGoal(e.target.value)}
                                            placeholder='e.g. Schedule a 15-minute intro call'
                                            className='w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#22c55e]/20 focus:bg-white transition-all shadow-inner'
                                        />
                                    </div>
                                </div>

                                <div className='flex gap-4 pt-4'>
                                    <button
                                        onClick={() => setIsDrafting(false)}
                                        className='flex-1 py-5 border border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all'
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!draftGoal.trim()) {
                                                setDraftGoal('Follow-up and next steps for a sales conversation');
                                            }
                                            void handleGenerateDraft('smart');
                                        }}
                                        className='flex-[2] py-5 bg-[#22c55e] text-white rounded-2xl text-sm font-black hover:bg-[#16a34a] transition-all shadow-xl shadow-green-100 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
                                        disabled={isGeneratingDraft}
                                    >
                                        <Sparkles size={18} />
                                        {isGeneratingDraft ? 'Generating...' : 'Compose AI Draft'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Simple Icon wrapper for List
const ListIcon = ({ size, className }: { size: number; className: string }) => (
    <div className={className}>
        <LayoutDashboard size={size} />
    </div>
);

export default Mails;
