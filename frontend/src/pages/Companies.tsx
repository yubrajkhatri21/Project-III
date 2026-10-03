import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Sparkles, Users, ArrowUpRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useDataset } from '@/context/DatasetContext';

const Companies: React.FC = () => {
    const { dataset, companies } = useDataset();
    const companyList = companies.length > 0 ? companies : dataset?.companies || [];

    return (
        <div className='min-h-screen bg-[#f8fafc] text-slate-900'>
            <Sidebar activeNav='Companies' />

            <main className='ml-60 p-4 sm:p-6 lg:p-10'>
                <div className='max-w-7xl mx-auto'>
                    <div className='flex flex-col items-start justify-between gap-4 mb-8 sm:flex-row sm:items-center'>
                        <div>
                            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-green-600'>Company Database</p>
                            <h1 className='mt-2 text-2xl sm:text-3xl font-bold tracking-tight'>Companies</h1>
                        </div>

                        <Link
                            to='/ai-command'
                            className='inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-500'
                        >
                            <Sparkles size={16} />
                            Research Company
                        </Link>
                    </div>

                    {!companyList.length ? (
                        <div className='rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm'>
                            <Building2 className='mx-auto mb-4 h-12 w-12 text-green-500' />
                            <h2 className='text-2xl font-bold text-slate-900'>No companies yet</h2>
                            <p className='mt-3 text-slate-600'>Research a company or import a CSV to populate your CRM pipeline.</p>
                        </div>
                    ) : (
                        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
                            {companyList.map((company: any, index: number) => {
                                const account = company.account || company.company || {};
                                const companyName = account.name || `Company ${index + 1}`;
                                const contactCount = Array.isArray(company.contacts) ? company.contacts.length : 0;
                                const leadCount = Array.isArray(company.leads) ? company.leads.length : 0;
                                const dealCount = Array.isArray(company.deals) ? company.deals.length : 0;

                                return (
                                    <div
                                        key={`${companyName}-${index}`}
                                        className='rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md'
                                    >
                                        <div className='mb-4 flex items-start justify-between'>
                                            <div className='flex items-center gap-3'>
                                                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600'>
                                                    <Building2 size={22} />
                                                </div>
                                                <div>
                                                    <h3 className='text-lg font-bold text-slate-900'>{companyName}</h3>
                                                    <p className='text-sm text-slate-500'>{account.industry || 'Unknown industry'}</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight className='h-5 w-5 text-slate-400' />
                                        </div>

                                        <div className='space-y-3 text-sm text-slate-600'>
                                            <div className='flex items-center gap-2'>
                                                <MapPin size={14} className='text-slate-400' />
                                                <span>{account.location || account.city || 'Location unavailable'}</span>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <Users size={14} className='text-slate-400' />
                                                <span>{contactCount} contacts • {leadCount} leads</span>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <Sparkles size={14} className='text-slate-400' />
                                                <span>{dealCount} deals in pipeline</span>
                                            </div>
                                        </div>

                                        <div className='mt-6 border-t border-slate-100 pt-4'>
                                            <p className='line-clamp-3 text-sm text-slate-600'>
                                                {account.description || 'No company summary available yet. Use AI research to enrich this account.'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Companies;
