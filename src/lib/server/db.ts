import { Pool, neonConfig } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
export interface User {
    user_id: number;
    name: string;
    email: string;
    subscription: boolean;
    password: string;
    signup: string;
    login: string | null;
    logout: string | null;
    updated_at: string;
}

export interface Campaign {
    campaign_id: number;
    user_id: number;
    title: string;
    description: string;
    backlink_id?: number;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface CampaignComment {
    comment_id: number;
    campaign_id: number;
    user_id: number;
    content: string;
    created_at: string;
    updated_at: string;
}

// Create a pool that can be reused across requests
const pool = new Pool({
    connectionString: DATABASE_URL
});

export const db = {
    query: async <T>(text: string, params?: any[]): Promise<T[]> => {
        const client = await pool.connect();
        try {
            const result = await client.query(text, params);
            return result.rows;
        } finally {
            client.release();
        }
    },
    getClient: () => pool.connect()
};

// User-specific database operations
export const users = {
    async create(user: Omit<User, 'user_id' | 'signup' | 'login' | 'logout' | 'updated_at'>): Promise<User> {
        const result = await db.query<User>(
            'INSERT INTO users (name, email, subscription, password) VALUES ($1, $2, $3, $4) RETURNING *',
            [user.name, user.email, user.subscription, user.password]
        );
        return result[0];
    },

    async findByEmail(email: string): Promise<User | null> {
        const result = await db.query<User>(
            'SELECT user_id, name, email, subscription, password, signup, login, logout, updated_at FROM users WHERE email = $1',
            [email]
        );
        return result[0] || null;
    },

    async findById(id: number): Promise<User | null> {
        const result = await db.query<User>(
            'SELECT user_id, name, email, subscription, password, signup, login, logout, updated_at FROM users WHERE user_id = $1',
            [id]
        );
        return result[0] || null;
    },

    async updateLoginTime(id: number): Promise<void> {
        await db.query(
            'UPDATE users SET login = CURRENT_TIMESTAMP WHERE user_id = $1',
            [id]
        );
    },

    async updateLogoutTime(id: number): Promise<void> {
        await db.query(
            'UPDATE users SET logout = CURRENT_TIMESTAMP WHERE user_id = $1',
            [id]
        );
    },

    async list(): Promise<User[]> {
        return await db.query<User>('SELECT user_id, name, email, subscription, password, signup, login, logout, updated_at FROM users ORDER BY signup DESC');
    }
};