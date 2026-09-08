export type RoleName =
    | 'Viewer'
    | 'Sales Representative'
    | 'Sales Manager'
    | 'Administrator';

const ROLE_RANK: Record<RoleName, number> = {
    Viewer: 1,
    'Sales Representative': 2,
    'Sales Manager': 3,
    Administrator: 4
};

export const normalizeRole = (role?: string | null): RoleName => {
    if (!role) return 'Viewer';

    const normalized = role.trim();
    if (normalized === 'Admin') return 'Administrator';
    if (normalized === 'Manager') return 'Sales Manager';
    if (normalized === 'Sales Rep') return 'Sales Representative';

    if (Object.prototype.hasOwnProperty.call(ROLE_RANK, normalized as RoleName)) {
        return normalized as RoleName;
    }

    return 'Viewer';
};

export const getCurrentUserRole = (): RoleName => {
    try {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return 'Viewer';
        const parsedUser = JSON.parse(rawUser);
        return normalizeRole(parsedUser?.role || parsedUser?.userRole);
    } catch {
        return 'Viewer';
    }
};

export const userHasRole = (requiredRole?: string | string[], role?: string | null): boolean => {
    const targetRole = normalizeRole(role ?? getCurrentUserRole());

    if (!requiredRole) return true;

    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const normalizedRequired = requiredRoles.map(normalizeRole);

    return normalizedRequired.some(required => ROLE_RANK[targetRole] >= ROLE_RANK[required]);
};
