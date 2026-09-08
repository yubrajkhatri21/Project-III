export interface User {
    id: string;
    email: string;
    name: string | null;
    role?: string;
    createdAt: Date;
}

export interface UserIdentity {
    id: string;
    userId: string;
    provider: string;
    providerId: string;
    metadata: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
}
