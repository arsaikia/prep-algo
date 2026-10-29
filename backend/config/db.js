// Legacy entry point. The runtime database is PostgreSQL (see ./postgres.js);
// these aliases keep older imports pointing at the real lifecycle.
export {
    connectPostgres as connectDB,
    disconnectPostgres as disconnectDB,
    getPostgresStatus as getDBStatus,
} from './postgres.js';
