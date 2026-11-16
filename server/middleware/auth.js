import { config } from '../config.js';

/**
 * Authentication hook (currently OPEN ACCESS).
 *
 * Every request gets a `req.user`. While AUTH_ENABLED=false everybody is an anonymous admin.
 * To introduce real login later, replace the body of `authenticate` (verify a session cookie / JWT against
 * the `users` table) and the app will start enforcing `requireRole` on every route that already uses it.
 */
export function authenticate(req, _res, next) {
    req.user = config.authEnabled ? null : { id: 'anonymous', role: 'admin', email: null };
    next();
}

/** Route guard. Pass 'admin' / 'user'. Allows everything while AUTH is disabled. */
export const requireRole = (...roles) => (req, res, next) => {
    if (!config.authEnabled) return next();
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
};
