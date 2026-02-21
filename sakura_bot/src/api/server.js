// src/api/server.js
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { pool } from '../db/database.js';

import { CLIENT_ID, GUILD_ID } from '../../config.js';

// The bot token is used to fetch guild members
import { TOKEN as BOT_TOKEN } from '../../config.js';

// You need to set these in a .env file or config later
// For now we'll read them from environment or throw error if missing
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'EzZuwWnM3oVE1JNVfA6NOaAxDLIAdmaf'; // REPLACE THIS IN PROD
const JWT_SECRET = process.env.JWT_SECRET || 'sakura-super-secret-jwt-key-change-in-prod';
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'https://sakura-bot-fkih.onrender.com/api/auth/discord/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sakuraboard.vercel.app';
const PORT = process.env.PORT || 3001;

const ADMIN_ROLES = [
    '1097403678715031612', '1096402401407279150', '1427766432414044160',
    '1096402401382109245', '1096402401407279154', '1306720155132497930',
    '1096402401407279152', '1096402401424060516'
];

export function startApiServer(discordClient) {
    const app = express();

    app.use(cors({
        origin: FRONTEND_URL,
        credentials: true,
    }));
    app.use(express.json());
    app.use(cookieParser());

    // ─── AUTH MIDDLEWARE ───
    const authenticateToken = (req, res, next) => {
        const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Token invalid' });
            req.user = user;
            next();
        });
    };

    // ─── ROUTES ───
    // Root redirect → Frontend
    app.get('/', (req, res) => res.redirect(FRONTEND_URL));

    // 1. Redirect to Discord OAuth
    app.get('/api/auth/discord', (req, res) => {
        const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
        res.redirect(url);
    });

    // 2. Discord Callback
    app.get('/api/auth/discord/callback', async (req, res) => {
        const { code } = req.query;
        if (!code) return res.status(400).send('No code provided');

        try {
            // Exchange code for token
            const params = new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code.toString(),
                redirect_uri: OAUTH_REDIRECT_URI,
            });

            const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            const { access_token } = tokenResponse.data;

            // Get User Info
            const userResponse = await axios.get('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            const discordUser = userResponse.data;

            // Check member's roles in the specific guild using the Bot Token
            let memberRoles = [];
            let inGuild = false;
            try {
                const memberResponse = await axios.get(`https://discord.com/api/guilds/${GUILD_ID}/members/${discordUser.id}`, {
                    headers: { Authorization: `Bot ${BOT_TOKEN}` }
                });
                memberRoles = memberResponse.data.roles || [];
                inGuild = true;
            } catch (err) {
                console.log(`User ${discordUser.username} is not in the guild`);
            }

            const hasAdminRole = memberRoles.some(role => ADMIN_ROLES.includes(role));

            // Upsert user into DB
            let finalRole = 'viewer';
            let status = 'pending';

            const [rows] = await pool.execute('SELECT * FROM website_users WHERE user_id = ?', [discordUser.id]);
            const existingUser = rows[0];

            if (hasAdminRole) {
                finalRole = 'admin';
                status = 'approved';
            } else if (existingUser) {
                finalRole = existingUser.website_role;
                status = existingUser.status;
            }

            if (!existingUser) {
                await pool.execute(
                    'INSERT INTO website_users (user_id, username, avatar, website_role, status, discord_roles) VALUES (?, ?, ?, ?, ?, ?)',
                    [discordUser.id, discordUser.username, discordUser.avatar, finalRole, status, JSON.stringify(memberRoles)]
                );
            } else {
                await pool.execute(
                    'UPDATE website_users SET username = ?, avatar = ?, discord_roles = ?, website_role = ?, status = ? WHERE user_id = ?',
                    [discordUser.username, discordUser.avatar, JSON.stringify(memberRoles), finalRole, status, discordUser.id]
                );
            }

            // Generate JWT
            const jwtToken = jwt.sign({
                id: discordUser.id,
                username: discordUser.username,
                avatar: discordUser.avatar,
                role: finalRole,
                status,
                memberRoles,
            }, JWT_SECRET, { expiresIn: '7d' });

            // Pass JWT via URL param (cross-domain cookie workaround)
            res.redirect(`${FRONTEND_URL}?token=${jwtToken}`);

        } catch (error) {
            console.error('OAuth Callback Error:', error.response?.data || error);
            res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
        }
    });

    // 3. Get Current User
    app.get('/api/users/me', authenticateToken, async (req, res) => {
        // Refresh status from DB
        try {
            const [rows] = await pool.execute('SELECT website_role, status, discord_roles FROM website_users WHERE user_id = ?', [req.user.id]);
            if (rows.length === 0) return res.status(404).json({ error: 'User not found in db' });

            const userDb = rows[0];

            // Update the user object with latest db info
            const userData = {
                ...req.user,
                role: userDb.website_role,
                status: userDb.status,
            };

            res.json(userData);
        } catch (err) {
            res.status(500).json({ error: 'Database error' });
        }
    });

    app.post('/api/auth/logout', (req, res) => {
        res.clearCookie('token');
        res.json({ success: true });
    });

    // ─── ADMIN ROUTES ───
    // Get all users
    app.get('/api/admin/users', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        try {
            const [rows] = await pool.execute('SELECT * FROM website_users ORDER BY created_at DESC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: 'DB Error' });
        }
    });

    // Update a user (approve / change role)
    app.post('/api/admin/users/:userId', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const { status, website_role } = req.body;
        const { userId } = req.params;

        try {
            await pool.execute('UPDATE website_users SET status = ?, website_role = ? WHERE user_id = ?', [status, website_role, userId]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'DB Error' });
        }
    });


    // ─── DISCORD MODERATION (Admin only) ───

    // Timeout a member
    app.post('/api/admin/discord/timeout', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const { userId, durationMinutes = 60, reason = 'Timeout via SakuraBoard' } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required' });
        try {
            const until = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
            await axios.patch(
                `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
                { communication_disabled_until: until },
                { headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json', 'X-Audit-Log-Reason': reason } }
            );
            res.json({ success: true, message: `User ${userId} timed out for ${durationMinutes} minutes.` });
        } catch (err) {
            console.error('Timeout error:', err.response?.data || err.message);
            res.status(500).json({ error: err.response?.data?.message || 'Failed to timeout user' });
        }
    });

    // Kick a member
    app.post('/api/admin/discord/kick', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const { userId, reason = 'Kicked via SakuraBoard' } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required' });
        try {
            await axios.delete(
                `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
                { headers: { Authorization: `Bot ${BOT_TOKEN}`, 'X-Audit-Log-Reason': reason } }
            );
            res.json({ success: true, message: `User ${userId} was kicked.` });
        } catch (err) {
            console.error('Kick error:', err.response?.data || err.message);
            res.status(500).json({ error: err.response?.data?.message || 'Failed to kick user' });
        }
    });

    // Ban a member
    app.post('/api/admin/discord/ban', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const { userId, reason = 'Banned via SakuraBoard', deleteMessageDays = 0 } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required' });
        try {
            await axios.put(
                `https://discord.com/api/v10/guilds/${GUILD_ID}/bans/${userId}`,
                { delete_message_days: deleteMessageDays },
                { headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json', 'X-Audit-Log-Reason': reason } }
            );
            res.json({ success: true, message: `User ${userId} was banned.` });
        } catch (err) {
            console.error('Ban error:', err.response?.data || err.message);
            res.status(500).json({ error: err.response?.data?.message || 'Failed to ban user' });
        }
    });

    // Get current funk values from DB
    app.get('/api/admin/funk', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        try {
            const [rows] = await pool.execute("SELECT * FROM funk_settings WHERE guild_id = ?", [GUILD_ID]);
            res.json(rows[0] || { sakura: 205473, neon: 6969, blacklist: 18747 });
        } catch (err) {
            res.json({ sakura: 205473, neon: 6969, blacklist: 18747 });
        }
    });

    // Update a funk value and post to Discord channel
    app.post('/api/admin/funk', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const { type } = req.body; // 'sakura' | 'neon' | 'blacklist'
        if (!['sakura', 'neon', 'blacklist'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

        const FUNK_CHANNEL_ID = '1416920966004478063';
        const ANNOUNCE_CHANNEL_ID = '1096402401898008621';
        const newValue = Math.floor(Math.random() * 900000) + 100000;

        try {
            // Update DB
            await pool.execute(
                `UPDATE funk_settings SET ${type} = ? WHERE guild_id = ?`,
                [newValue, GUILD_ID]
            );

            // Post announcement using bot token via Discord API
            const label = type === 'sakura' ? '🌸 Sakura Funk' : type === 'neon' ? '🌌 Neon Lotus Funk' : '🚫 Blacklist Funk';
            const color = type === 'sakura' ? 0xFF69B4 : type === 'neon' ? 0x00FFFF : 0xFF0000;
            const embed = {
                title: '🔔 Funk-Update',
                description: `Der **${label}** wurde über das SakuraBoard aktualisiert!`,
                color,
                fields: [
                    { name: '👤 Ausgeführt von', value: `<@${req.user.id}>`, inline: true },
                    { name: '🔢 Neue Nummer', value: `\`${newValue}\``, inline: true },
                ],
                timestamp: new Date().toISOString(),
            };

            await axios.post(
                `https://discord.com/api/v10/channels/${ANNOUNCE_CHANNEL_ID}/messages`,
                { embeds: [embed] },
                { headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' } }
            );

            res.json({ success: true, newValue, type });
        } catch (err) {
            console.error('Funk error:', err.response?.data || err.message);
            res.status(500).json({ error: 'Failed to update funk' });
        }
    });

    // ─── START SERVER ───
    app.listen(PORT, () => {
        console.log(`🚀 SakuraBoard Backend API running on port ${PORT}`);
    });
}
