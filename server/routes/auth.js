const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/authMiddleware');

module.exports = (pool) => {
    // POST /api/auth/login
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;

        try {
            const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
            const user = users[0];

            if (!user) {
                return res.status(400).json({ error: 'Invalid email or password.' });
            }

            // If user has no passwordHash (legacy user), allow login if password matches a default text?
            // OR strictly enforcing hash. For now, if no hash, deny or handle migration logic if needed.
            // Assumption: migration script will be run to set passwords.

            if (!user.passwordHash) {
                // If this is a demo environment or you want to allow temp access:
                // return res.status(400).json({ error: 'Account setup required. Please contact admin.' });

                // FALLBACK for testing if migration hasn't run: 
                // If password is 'password' allow it? No, let's enforce security.
                return res.status(400).json({ error: 'Invalid email or password (no pass setup).' });
            }

            const validPassword = await bcrypt.compare(password, user.passwordHash);
            if (!validPassword) {
                return res.status(400).json({ error: 'Invalid email or password.' });
            }

            // Generate Token
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, name: user.name },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Update lastLogin
            await pool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [user.id]);

            // Return user info (excluding password)
            const { passwordHash, ...userInfo } = user;
            if (typeof userInfo.preferences === 'string') {
                userInfo.preferences = JSON.parse(userInfo.preferences);
            }

            res.json({ token, user: userInfo });
        } catch (err) {
            console.error('Login Error:', err);
            res.status(500).json({ error: 'Internal server error.' });
        }
    });

    // GET /api/auth/me
    router.get('/me', authenticateToken, async (req, res) => {
        try {
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
            const user = users[0];

            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            const { passwordHash, ...userInfo } = user;
            if (typeof userInfo.preferences === 'string') {
                userInfo.preferences = JSON.parse(userInfo.preferences);
            }
            res.json(userInfo);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
