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
    app.use(express.json({ limit: '50mb' }));
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
        const { stayLoggedIn, tuner } = req.query;
        // Use 'state' to carry over the preference through the OAuth flow
        let state = stayLoggedIn === 'true' ? 'stayIn' : 'noStay';
        if (tuner === 'true') {
            state += '_tuner';
        }
        const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&response_type=code&scope=identify%20guilds&state=${state}`;
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
            // Also set cookie for same-domain cases (if requested)
            const { state } = req.query;
            const isStay = state && state.startsWith('stayIn');
            const isTuner = state && state.endsWith('_tuner');
            const maxAge = isStay ? 30 * 24 * 60 * 60 * 1000 : undefined; // 30 days or session

            res.cookie('token', jwtToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: maxAge,
            });

            if (isTuner) {
                res.redirect(`${FRONTEND_URL}?token=${jwtToken}&app=tuner`);
            } else {
                res.redirect(`${FRONTEND_URL}?token=${jwtToken}`);
            }

        } catch (error) {
            console.error('OAuth Callback Error:', error.response?.data || error);
            res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
        }
    });

    // Helper function to check current Discord roles
    async function checkUserRolesAndUpdateStatus(userId) {
        try {
            // Fetch current roles from Discord
            const memberResponse = await axios.get(
                `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`,
                { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
            );
            const currentRoles = memberResponse.data.roles || [];
            const hasAdminRole = currentRoles.some(role => ADMIN_ROLES.includes(role));

            // Get user from database
            const [rows] = await pool.execute('SELECT * FROM website_users WHERE user_id = ?', [userId]);
            if (rows.length === 0) return null;

            const user = rows[0];
            let newStatus = user.status;
            let newRole = user.website_role;

            // If user lost admin roles and was auto-approved as admin
            if (!hasAdminRole && user.status === 'approved' && user.website_role === 'admin') {
                newStatus = 'pending';
                newRole = 'viewer';
            }

            // Update database if status changed
            if (newStatus !== user.status || newRole !== user.website_role) {
                await pool.execute(
                    'UPDATE website_users SET status = ?, website_role = ?, discord_roles = ? WHERE user_id = ?',
                    [newStatus, newRole, JSON.stringify(currentRoles), userId]
                );
            } else {
                // Just update roles
                await pool.execute(
                    'UPDATE website_users SET discord_roles = ? WHERE user_id = ?',
                    [JSON.stringify(currentRoles), userId]
                );
            }

            return { ...user, status: newStatus, website_role: newRole, discord_roles: currentRoles };
        } catch (err) {
            // User not in guild anymore (left server or kicked)
            if (err.response?.status === 404) {
                await pool.execute(
                    'UPDATE website_users SET status = ?, website_role = ?, discord_roles = ? WHERE user_id = ?',
                    ['pending', 'viewer', JSON.stringify([]), userId]
                );
                return { status: 'pending', website_role: 'viewer', discord_roles: [] };
            }
            throw err;
        }
    }

    // 3. Get Current User (with automatic role verification)
    app.get('/api/users/me', authenticateToken, async (req, res) => {
        try {
            // Check and update user's current Discord roles
            const updatedUser = await checkUserRolesAndUpdateStatus(req.user.id);

            if (!updatedUser) {
                return res.status(404).json({ error: 'User not found in db' });
            }

            // Return updated user data
            const userData = {
                ...req.user,
                role: updatedUser.website_role,
                status: updatedUser.status,
                memberRoles: updatedUser.discord_roles,
            };

            res.json(userData);
        } catch (err) {
            console.error('Error checking user status:', err);
            res.status(500).json({ error: 'Database error' });
        }
    });

    app.post('/api/auth/logout', (req, res) => {
        res.clearCookie('token');
        res.json({ success: true });
    });

    // ─── ADMIN ROUTES ───
    // Verify all users' Discord roles (periodic check)
    app.post('/api/admin/verify-all-users', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        try {
            const [rows] = await pool.execute('SELECT user_id FROM website_users');
            const results = { updated: 0, errors: 0, total: rows.length };

            for (const user of rows) {
                try {
                    await checkUserRolesAndUpdateStatus(user.user_id);
                    results.updated++;
                } catch (err) {
                    console.error(`Failed to check user ${user.user_id}:`, err.message);
                    results.errors++;
                }
            }

            res.json({ success: true, results });
        } catch (error) {
            console.error('Verify all users error:', error);
            res.status(500).json({ error: 'DB Error' });
        }
    });

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

    // Update a user (approve / change role / permissions)
    app.post('/api/admin/users/:userId', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const { status, website_role, can_delete_columns, can_delete_cards } = req.body;
        const { userId } = req.params;

        try {
            // Try to add columns for permissions if they don't exist (no-op if already there)
            try {
                await pool.execute("ALTER TABLE website_users ADD COLUMN can_delete_columns TINYINT(1) DEFAULT 1");
            } catch (_) { /* column already exists */ }
            try {
                await pool.execute("ALTER TABLE website_users ADD COLUMN can_delete_cards TINYINT(1) DEFAULT 1");
            } catch (_) { /* column already exists */ }

            const cdCols = can_delete_columns !== undefined ? (can_delete_columns ? 1 : 0) : 1;
            const cdCards = can_delete_cards !== undefined ? (can_delete_cards ? 1 : 0) : 1;
            await pool.execute(
                'UPDATE website_users SET status = ?, website_role = ?, can_delete_columns = ?, can_delete_cards = ? WHERE user_id = ?',
                [status, website_role, cdCols, cdCards, userId]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Update user error:', err);
            res.status(500).json({ error: 'DB Error' });
        }
    });

    // Delete a user (reject access request)
    app.delete('/api/admin/users/:userId', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        try {
            await pool.execute('DELETE FROM website_users WHERE user_id = ?', [req.params.userId]);
            res.json({ success: true });
        } catch (err) {
            console.error('Delete user error:', err);
            res.status(500).json({ error: 'DB Error' });
        }
    });

    // Get all Discord guild members (for moderation member picker)
    app.get('/api/admin/discord/members', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        try {
            let allMembers = [];
            let after = '0';
            let page;
            do {
                const response = await axios.get(
                    `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
                    { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
                );
                page = response.data;
                if (page.length === 0) break;
                allMembers = allMembers.concat(page);
                after = page[page.length - 1].user.id;
            } while (page.length === 1000);

            const members = allMembers.map(m => ({
                id: m.user.id,
                username: m.user.username,
                displayName: m.nick || m.user.global_name || m.user.username,
                avatar: m.user.avatar
                    ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64`
                    : null,
                roles: m.roles || [],
            }));

            res.json(members);
        } catch (err) {
            console.error('Members fetch error:', err.response?.data || err.message);
            res.status(500).json({ error: 'Failed to fetch guild members' });
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

    // ─── BOARD DATA CRUD ───

    // Get entire board (tags, columns, cards)
    app.get('/api/board', authenticateToken, async (req, res) => {
        try {
            const [tags] = await pool.execute('SELECT * FROM board_tags ORDER BY sort_order, created_at');
            const [columns] = await pool.execute('SELECT * FROM board_columns ORDER BY sort_order, created_at');
            const [cards] = await pool.execute('SELECT * FROM board_cards ORDER BY sort_order, created_at');

            // Parse JSON fields in cards
            const parsedCards = cards.map(c => ({
                id: c.id,
                columnId: c.column_id,
                title: c.title,
                description: c.description || '',
                tagIds: JSON.parse(c.tag_ids || '[]'),
                imageUrl: c.image_url || undefined,
                assignedUserIds: JSON.parse(c.assigned_user_ids || '[]'),
                dueDate: c.due_date || undefined,
                allowedViewerIds: JSON.parse(c.allowed_viewer_ids || '[]'),
                allowedEditorIds: JSON.parse(c.allowed_editor_ids || '[]'),
                comments: JSON.parse(c.comments || '[]'),
                createdAt: c.created_at,
            }));

            // Build column cardIds from actual cards
            const parsedColumns = columns.map(col => ({
                id: col.id,
                title: col.title,
                color: col.color,
                cardIds: parsedCards.filter(c => c.columnId === col.id).map(c => c.id),
            }));

            res.json({
                tags: tags.map(t => ({ id: t.id, name: t.name, color: t.color })),
                columns: parsedColumns,
                cards: parsedCards,
            });
        } catch (err) {
            console.error('Board fetch error:', err);
            res.status(500).json({ error: 'Failed to load board' });
        }
    });

    // ── Tags CRUD ──
    app.post('/api/board/tags', authenticateToken, async (req, res) => {
        const { id, name, color } = req.body;
        try {
            await pool.execute('INSERT INTO board_tags (id, name, color) VALUES (?, ?, ?)', [id, name, color]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to create tag' });
        }
    });

    app.put('/api/board/tags/:id', authenticateToken, async (req, res) => {
        const { name, color } = req.body;
        try {
            await pool.execute('UPDATE board_tags SET name = ?, color = ? WHERE id = ?', [name, color, req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update tag' });
        }
    });

    app.delete('/api/board/tags/:id', authenticateToken, async (req, res) => {
        try {
            await pool.execute('DELETE FROM board_tags WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete tag' });
        }
    });

    // ── Columns CRUD ──
    app.post('/api/board/columns', authenticateToken, async (req, res) => {
        const { id, title, color } = req.body;
        try {
            const [existing] = await pool.execute('SELECT MAX(sort_order) as max_order FROM board_columns');
            const sortOrder = (existing[0]?.max_order || 0) + 1;
            await pool.execute('INSERT INTO board_columns (id, title, color, sort_order) VALUES (?, ?, ?, ?)', [id, title, color || '#ff6b9d', sortOrder]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to create column' });
        }
    });

    // Reorder columns (must be before :id routes)
    app.put('/api/board/columns/reorder', authenticateToken, async (req, res) => {
        const { columnIds } = req.body;
        if (!Array.isArray(columnIds)) return res.status(400).json({ error: 'columnIds required' });
        try {
            for (let i = 0; i < columnIds.length; i++) {
                await pool.execute('UPDATE board_columns SET sort_order = ? WHERE id = ?', [i, columnIds[i]]);
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to reorder columns' });
        }
    });

    app.put('/api/board/columns/:id', authenticateToken, async (req, res) => {
        const { title, color } = req.body;
        try {
            await pool.execute('UPDATE board_columns SET title = ?, color = ? WHERE id = ?', [title, color, req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update column' });
        }
    });

    app.delete('/api/board/columns/:id', authenticateToken, async (req, res) => {
        try {
            await pool.execute('DELETE FROM board_cards WHERE column_id = ?', [req.params.id]);
            await pool.execute('DELETE FROM board_columns WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete column' });
        }
    });

    // ── Cards CRUD ──
    function formatDateForMySQL(isoString) {
        if (!isoString) return null;
        try {
            return new Date(isoString).toISOString().slice(0, 19).replace('T', ' ');
        } catch (e) {
            return null;
        }
    }

    app.post('/api/board/cards', authenticateToken, async (req, res) => {
        const { id, columnId, title, description, tagIds, imageUrl, assignedUserIds, dueDate, allowedViewerIds, allowedEditorIds, comments } = req.body;
        try {
            const mysqlDueDate = formatDateForMySQL(dueDate);
            const [existing] = await pool.execute('SELECT MAX(sort_order) as max_order FROM board_cards WHERE column_id = ?', [columnId]);
            const sortOrder = (existing[0]?.max_order || 0) + 1;
            await pool.execute(
                `INSERT INTO board_cards (id, column_id, title, description, tag_ids, image_url, assigned_user_ids, due_date, allowed_viewer_ids, allowed_editor_ids, comments, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, columnId, title, description || '', JSON.stringify(tagIds || []), imageUrl || null, JSON.stringify(assignedUserIds || []), mysqlDueDate, JSON.stringify(allowedViewerIds || []), JSON.stringify(allowedEditorIds || []), JSON.stringify(comments || []), sortOrder]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Card create error:', err);
            res.status(500).json({ error: 'Failed to create card' });
        }
    });

    app.put('/api/board/cards/:id', authenticateToken, async (req, res) => {
        const { title, description, tagIds, imageUrl, assignedUserIds, dueDate, allowedViewerIds, allowedEditorIds, comments, columnId } = req.body;
        try {
            const mysqlDueDate = formatDateForMySQL(dueDate);
            await pool.execute(
                `UPDATE board_cards SET title = ?, description = ?, tag_ids = ?, image_url = ?, assigned_user_ids = ?, due_date = ?, allowed_viewer_ids = ?, allowed_editor_ids = ?, comments = ?, column_id = ? WHERE id = ?`,
                [title, description || '', JSON.stringify(tagIds || []), imageUrl || null, JSON.stringify(assignedUserIds || []), mysqlDueDate, JSON.stringify(allowedViewerIds || []), JSON.stringify(allowedEditorIds || []), JSON.stringify(comments || []), columnId, req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Card update error:', err);
            res.status(500).json({ error: 'Failed to update card' });
        }
    });

    app.delete('/api/board/cards/:id', authenticateToken, async (req, res) => {
        try {
            await pool.execute('DELETE FROM board_cards WHERE id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete card' });
        }
    });

    // Move card to different column
    app.put('/api/board/cards/:id/move', authenticateToken, async (req, res) => {
        const { columnId, sortOrder, siblingIds } = req.body;
        try {
            await pool.execute('UPDATE board_cards SET column_id = ?, sort_order = ? WHERE id = ?', [columnId, sortOrder || 0, req.params.id]);

            if (Array.isArray(siblingIds) && siblingIds.length > 0) {
                // Update exact sort_order for all cards in the destination column
                for (let i = 0; i < siblingIds.length; i++) {
                    await pool.execute('UPDATE board_cards SET sort_order = ? WHERE id = ?', [i, siblingIds[i]]);
                }
            }

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to move card' });
        }
    });

    // ─── TUNER EXAM ROUTES ───

    // Request access to exam / get current status
    app.get('/api/tuner-exam/status', authenticateToken, async (req, res) => {
        try {
            const [rows] = await pool.execute('SELECT status, score FROM tuner_exams WHERE user_id = ?', [req.user.id]);
            if (rows.length === 0) {
                // Not requested yet, automatically create a request when they first login as tuner
                await pool.execute(
                    'INSERT INTO tuner_exams (user_id, username, avatar, status) VALUES (?, ?, ?, ?)',
                    [req.user.id, req.user.username, req.user.avatar, 'locked']
                );
                return res.json({ status: 'locked' });
            }
            res.json({ status: rows[0].status, score: rows[0].score });
        } catch (err) {
            console.error('Tuner exam status error:', err);
            res.status(500).json({ error: 'DB Error' });
        }
    });

    // Submit exam
    app.post('/api/tuner-exam/submit', authenticateToken, async (req, res) => {
        const { answers, ausbilder, score } = req.body;

        try {
            // Verify they are unlocked
            const [rows] = await pool.execute('SELECT status FROM tuner_exams WHERE user_id = ?', [req.user.id]);
            if (rows.length === 0 || rows[0].status !== 'unlocked') {
                return res.status(403).json({ error: 'Not authorized or already submitted' });
            }

            const finalScore = score || 0;

            await pool.execute(
                'UPDATE tuner_exams SET status = ?, score = ?, answers = ?, ausbilder = ? WHERE user_id = ?',
                ['submitted', finalScore, JSON.stringify(answers), ausbilder || '', req.user.id]
            );

            res.json({ success: true });
        } catch (err) {
            console.error('Tuner exam submit error:', err);
            res.status(500).json({ error: 'DB Error' });
        }
    });

    // ─── ADMIN TUNER EXAM ROUTES ───
    app.get('/api/admin/tuner-exams', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        try {
            const [rows] = await pool.execute('SELECT * FROM tuner_exams ORDER BY updated_at DESC');
            res.json(rows);
        } catch (err) {
            console.error('Admin tuner exams error:', err);
            res.status(500).json({ error: 'DB Error' });
        }
    });

    app.post('/api/admin/tuner-exams/:id/unlock', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        try {
            await pool.execute('UPDATE tuner_exams SET status = ? WHERE user_id = ?', ['unlocked', req.params.id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Admin unlock error:', err);
            res.status(500).json({ error: 'DB Error' });
        }
    });

    app.delete('/api/admin/tuner-exams/:id', authenticateToken, async (req, res) => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        try {
            await pool.execute('DELETE FROM tuner_exams WHERE user_id = ?', [req.params.id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Admin delete exam error:', err);
            res.status(500).json({ error: 'DB Error' });
        }
    });

    // ─── START SERVER ───
    app.listen(PORT, () => {
        console.log(`🚀 SakuraBoard Backend API running on port ${PORT}`);
    });
}
