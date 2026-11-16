import 'dotenv/config';

const bool = (v, d = false) => (v === undefined || v === '' ? d : ['true', '1', 'yes'].includes(String(v).toLowerCase()));

export const config = {
    port: Number(process.env.PORT) || 3001,
    // 127.0.0.1 = this PC only. Set HOST=0.0.0.0 to allow other devices on your network.
    host: process.env.HOST || '127.0.0.1',
    databaseUrl: process.env.DATABASE_URL,
    databaseSsl: bool(process.env.DATABASE_SSL),
    autoMigrate: bool(process.env.AUTO_MIGRATE, true),
    // Authentication is OFF (open access). See server/middleware/auth.js for how to switch it on later.
    authEnabled: bool(process.env.AUTH_ENABLED, false),
};

export function assertConfig() {
    if (!config.databaseUrl) {
        console.error('\nDATABASE_URL is not set. Copy .env.example to .env and add your PostgreSQL connection URL.\n');
        process.exit(1);
    }
}
