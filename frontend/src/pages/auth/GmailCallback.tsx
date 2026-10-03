import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GmailCallback: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const status = searchParams.get('status');
        const message = searchParams.get('message') || 'Gmail connected successfully.';

        if (status === 'success') {
            localStorage.setItem('gmailConnected', 'true');
            localStorage.setItem('gmailStatus', message);
        } else {
            localStorage.setItem('gmailConnected', 'false');
            localStorage.setItem('gmailStatus', 'Gmail connection failed.');
        }

        const timeout = window.setTimeout(() => {
            navigate('/mails', { replace: true });
        }, 1800);

        return () => window.clearTimeout(timeout);
    }, [navigate, searchParams]);

    return (
        <div className='min-h-screen bg-gradient-to-br from-[#f6fff5] via-white to-[#ecfdf5] flex items-center justify-center px-6'>
            <div className='bg-white border border-[#d1fae5] rounded-2xl shadow-xl p-8 max-w-md w-full text-center'>
                <div className='mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7] text-[#166534] text-2xl'>
                    ✓
                </div>
                <h1 className='text-2xl font-bold text-gray-900 mb-2'>Gmail connected</h1>
                <p className='text-gray-600'>You are being redirected back to your inbox.</p>
            </div>
        </div>
    );
};

export default GmailCallback;
