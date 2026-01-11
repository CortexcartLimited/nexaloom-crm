const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

const authenticateToken = (req, res, next) => {
    // 1. API Key Authentication (For Python Agents / External Scripts)
    const apiKey = req.headers['x-api-key'];
    const VALID_API_KEY = process.env.NEXALOOM_API_KEY || 'nexaloom_agent_secret_key_v1';

    if (apiKey && apiKey === VALID_API_KEY) {
        // Bypass JWT check, assign Admin role
        req.user = { role: 'ADMIN', source: 'API_AGENT' };
        return next();
    }

    // 2. JWT Authentication (Standard Web App)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRoles, JWT_SECRET };
