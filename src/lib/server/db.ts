import { Pool } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';

export interface User {
    id: number;
    name: string;
    email: string;
    subscription: boolean;
    password: string;
    signup: Date;
    login: Date | null;
    logout: Date | null;
}

// Create a pool that can be reused across requests
const pool = new Pool({
    connectionString: DATABASE_URL
});

export async function query<T>(text: string, params?: any[]): Promise<T[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rows;
    } finally {
        client.release();
    }
}

// User-specific database operations
export const users = {
    async create(user: Omit<User, 'id' | 'signup' | 'login' | 'logout'>): Promise<User> {
        const result = await query<User>(
            'INSERT INTO users (name, email, subscription, password, signup) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
            [user.name, user.email, user.subscription, user.password]
        );
        return result[0];
    },

    async findByEmail(email: string): Promise<User | null> {
        const result = await query<User>(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result[0] || null;
    },

    async findById(id: number): Promise<User | null> {
        const result = await query<User>(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result[0] || null;
    },

    async updateLoginTime(id: number): Promise<void> {
        await query(
            'UPDATE users SET login = NOW() WHERE id = $1',
            [id]
        );
    },

    async updateLogoutTime(id: number): Promise<void> {
        await query(
            'UPDATE users SET logout = NOW() WHERE id = $1',
            [id]
        );
    },

    async list(): Promise<User[]> {
        return await query<User>('SELECT * FROM users ORDER BY signup DESC');
    }
};