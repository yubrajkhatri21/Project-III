import React from 'react';
import { Search, Mail, BarChart3, FileText, Target, Settings, Sparkles } from 'lucide-react';

const features = [
    {
        title: 'Dashboard',
        description: 'Track the full health of your pipeline, AI insights, and team activity in one command center.',
        icon: BarChart3
    },
    {
        title: 'Companies',
        description: 'Manage organization records, firmographics, and account-level context in a structured database.',
        icon: Search
    },
    {
        title: 'Contacts',
        description: 'Capture key stakeholders, decision-makers, and relationship history across every account.',
        icon: Target
    },
    {
        title: 'Leads',
        description: 'Prioritize and manage active opportunities with AI-assisted scoring and lead enrichment.',
        icon: Target
    },
    {
        title: 'Deals / Pipeline',
        description: 'Monitor sales stages, deal values, close probabilities, and next-step actions in real time.',
        icon: BarChart3
    },
    {
        title: 'Tasks & Follow-ups',
        description: 'Automate reminders and follow-ups so your team stays on top of outreach and execution.',
        icon: Settings
    },
    {
        title: 'Email / Gmail Integration',
        description: 'Connect communication workflows to CRM activity and keep outreach tied to recorded customer context.',
        icon: Mail
    },
    {
        title: 'Company Research',
        description: 'Run AI-powered research to uncover business signals, competitors, and buying context.',
        icon: Search
    },
    {
        title: 'AI Company Enhancement',
        description: 'Improve records with enriched profiles, deal context, and opportunity intelligence.',
        icon: Sparkles
    },
    {
        title: 'CSV Import',
        description: 'Import lead and company files to quickly populate the CRM and transform raw data into accounts.',
        icon: FileText
    },
    {
        title: 'Reports & Analytics',
        description: 'Review pipeline metrics, conversion trends, and team performance with clear reporting views.',
        icon: BarChart3
    },
    {
        title: 'Notifications',
        description: 'Stay updated on deal changes, milestones, and team events as they happen.',
        icon: Settings
    },
    {
        title: 'Activity / Audit History',
        description: 'Keep a searchable history of actions, updates, and system events across the CRM.',
        icon: FileText
    }
];

const Features: React.FC = () => {
    return (
        <section
            id='features'
            className='py-24 px-6 bg-white'
        >
            <div className='max-w-7xl mx-auto'>
                <div className='text-center mb-16'>
                    <h2 className='text-4xl font-bold text-[#111827] mb-4'>Built for AI-Powered Sales Teams</h2>
                    <p className='text-[#6B7280] text-lg max-w-2xl mx-auto'>
                        Experience a CRM that doesn't just store data, but actively helps you close deals.
                    </p>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className='bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow group'
                        >
                            <div className='w-12 h-12 rounded-xl bg-[#E8F8F0] flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors'>
                                <feature.icon className='w-6 h-6 text-primary' />
                            </div>
                            <h3 className='text-xl font-bold text-[#111827] mb-3 group-hover:text-primary transition-colors'>
                                {feature.title}
                            </h3>
                            <p className='text-[#6B7280] leading-relaxed'>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
