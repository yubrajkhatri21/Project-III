import React from 'react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string | string[];
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    return <>{children}</>;
};

export default ProtectedRoute;
