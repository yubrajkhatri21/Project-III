import React, { useEffect, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string | string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const location = useLocation();

    const user = useMemo(() => {
        const rawUser = localStorage.getItem('user');
        if (!rawUser || rawUser === 'undefined') return null;

        try {
            return JSON.parse(rawUser);
        } catch {
            return null;
        }
    }, [location.pathname]);

    const token = localStorage.getItem('accessToken');
    const allowedRoleList = useMemo(
        () => (Array.isArray(allowedRoles) ? allowedRoles : allowedRoles ? [allowedRoles] : []),
        [allowedRoles]
    );

    useEffect(() => {
        if (!token && location.pathname !== '/auth/login' && location.pathname !== '/auth/signup') {
            localStorage.removeItem('user');
        }
    }, [location.pathname, token]);

    if (!token) {
        return <Navigate to='/auth/login' replace state={{ from: location.pathname }} />;
    }

    if (allowedRoleList.length > 0 && user?.role && !allowedRoleList.includes(user.role)) {
        return <Navigate to='/dashboard' replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
