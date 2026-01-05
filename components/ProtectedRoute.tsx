import React from 'react';

interface ProtectedRouteProps {
    isAuthenticated: boolean;
    userRole?: string;
    allowedRoles?: string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    isAuthenticated,
    userRole,
    allowedRoles,
    children,
    fallback = null
}) => {
    if (!isAuthenticated) {
        return <>{fallback}</>;
    }

    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center text-gray-500 p-8">
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Access Denied</h3>
                <p className="text-sm">You do not have permission to view this section.</p>
            </div>
        )
    }

    return <>{children}</>;
};
