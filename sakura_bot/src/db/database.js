// src/database.js
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'mysql-mariadb-1-25.zap-srv.com',
  database: 'zap902593-6',
  user: 'zap902593-6',
  password: '6SuJP8TEDiV66Wp1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

const pool = mysql.createPool(dbConfig);

export async function initDatabase() {
  try {
    const connection = await pool.getConnection();

    console.log('🔌 Verbinde mit Datenbank...');

    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Datenbankverbindung erfolgreich:', rows[0].test === 1);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS abmeldungen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        reason TEXT,
        status ENUM('active', 'completed') DEFAULT 'active',
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_end_date (end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS fraktionsfarben (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        name_key VARCHAR(255) NOT NULL UNIQUE,
        primaer VARCHAR(255) NOT NULL,
        sekundaer VARCHAR(255) NOT NULL,
        perlglanz VARCHAR(255) NOT NULL,
        unterboden VARCHAR(255) NOT NULL,
        scheinwerfer VARCHAR(255) NOT NULL,
        reifenqualm VARCHAR(255) NOT NULL,
        felgenfarbe VARCHAR(255) NOT NULL,
        autor VARCHAR(255) NOT NULL,
        datum DATETIME NOT NULL,
        nachricht_id VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name_key (name_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS fraktionsfarben_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action ENUM('delete', 'update') NOT NULL,
        fraktion_name VARCHAR(255) NOT NULL,
        user_tag VARCHAR(255) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        details TEXT NULL,
        logged_at DATETIME NOT NULL,
        INDEX idx_action (action),
        INDEX idx_logged_at (logged_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS funk_settings (
        guild_id VARCHAR(32) PRIMARY KEY,
        message_id VARCHAR(32) NULL,
        sakura INT NOT NULL,
        neon INT NOT NULL,
        blacklist INT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bot_panels (
        panel_key VARCHAR(64) PRIMARY KEY,
        channel_id VARCHAR(32) NOT NULL,
        message_id VARCHAR(32) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS website_users (
        user_id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        website_role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
        status ENUM('pending', 'approved') DEFAULT 'pending',
        discord_roles TEXT,
        can_delete_columns TINYINT(1) DEFAULT 1,
        can_delete_cards TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS board_tags (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(32) NOT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS board_columns (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        color VARCHAR(32) NOT NULL DEFAULT '#ff6b9d',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS board_cards (
        id VARCHAR(64) PRIMARY KEY,
        column_id VARCHAR(64) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        tag_ids TEXT,
        image_url LONGTEXT,
        assigned_user_ids TEXT,
        due_date DATETIME NULL,
        allowed_viewer_ids TEXT,
        allowed_editor_ids TEXT,
        comments TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_column_id (column_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    // Migration: ensure image_url is LONGTEXT (TEXT truncates base64 images)
    try {
      await connection.execute('ALTER TABLE board_cards MODIFY COLUMN image_url LONGTEXT');
    } catch (_) { /* table might not exist yet or column already correct */ }

    console.log('✅ Datenbank-Tabellen initialisiert');
    connection.release();

    return true;
  } catch (error) {
    console.error('❌ Datenbank-Initialisierungsfehler:', error);
    console.error('❌ Stelle sicher, dass:');
    console.error('1. Die MySQL-Datenbank existiert: zap902593-6');
    console.error('2. Der Benutzer zap902593-6 Zugriff hat');
    console.error('3. Das Passwort stimmt');
    console.error('4. Remote-Verbindungen erlaubt sind');
    throw error;
  }
}

function normalizeNameKey(name) {
  return String(name || '').trim().toLowerCase();
}

export async function listFraktionsfarben() {
  const [rows] = await pool.execute('SELECT * FROM fraktionsfarben');
  return rows;
}

export async function getFraktionByKey(name) {
  const nameKey = normalizeNameKey(name);
  const [rows] = await pool.execute('SELECT * FROM fraktionsfarben WHERE name_key = ? LIMIT 1', [nameKey]);
  return rows[0] || null;
}

export async function upsertFraktion(fraktion) {
  const nameKey = normalizeNameKey(fraktion.name);
  const values = [
    fraktion.name,
    nameKey,
    fraktion.primär,
    fraktion.sekundär,
    fraktion.perlglanz,
    fraktion.unterboden,
    fraktion.scheinwerfer,
    fraktion.reifenqualm,
    fraktion.felgenfarbe,
    fraktion.autor,
    fraktion.datum ? new Date(fraktion.datum) : new Date(),
    fraktion.nachrichtId || null
  ];

  await pool.execute(
    `INSERT INTO fraktionsfarben
      (name, name_key, primaer, sekundaer, perlglanz, unterboden, scheinwerfer, reifenqualm, felgenfarbe, autor, datum, nachricht_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        primaer = VALUES(primaer),
        sekundaer = VALUES(sekundaer),
        perlglanz = VALUES(perlglanz),
        unterboden = VALUES(unterboden),
        scheinwerfer = VALUES(scheinwerfer),
        reifenqualm = VALUES(reifenqualm),
        felgenfarbe = VALUES(felgenfarbe),
        autor = VALUES(autor),
        datum = VALUES(datum),
        nachricht_id = VALUES(nachricht_id)
    `,
    values
  );
}

export async function updateFraktion(name, updatedData) {
  const nameKey = normalizeNameKey(name);
  const fields = [];
  const values = [];

  const map = {
    name: 'name',
    primär: 'primaer',
    sekundär: 'sekundaer',
    perlglanz: 'perlglanz',
    unterboden: 'unterboden',
    scheinwerfer: 'scheinwerfer',
    reifenqualm: 'reifenqualm',
    felgenfarbe: 'felgenfarbe',
    autor: 'autor',
    datum: 'datum',
    nachrichtId: 'nachricht_id'
  };

  Object.keys(map).forEach((key) => {
    if (updatedData[key] !== undefined) {
      fields.push(`${map[key]} = ?`);
      values.push(key === 'datum' ? new Date(updatedData[key]) : updatedData[key]);
    }
  });

  if (fields.length === 0) return;

  values.push(nameKey);
  await pool.execute(`UPDATE fraktionsfarben SET ${fields.join(', ')} WHERE name_key = ?`, values);
}

export async function deleteFraktion(name) {
  const nameKey = normalizeNameKey(name);
  await pool.execute('DELETE FROM fraktionsfarben WHERE name_key = ?', [nameKey]);
}

export async function updateFraktionMessageId(name, messageId) {
  const nameKey = normalizeNameKey(name);
  await pool.execute('UPDATE fraktionsfarben SET nachricht_id = ? WHERE name_key = ?', [messageId, nameKey]);
}

export async function addFraktionLog(action, fraktionName, userTag, userId, details = null) {
  await pool.execute(
    'INSERT INTO fraktionsfarben_logs (action, fraktion_name, user_tag, user_id, details, logged_at) VALUES (?, ?, ?, ?, ?, ?)',
    [action, fraktionName, userTag, userId, details ? JSON.stringify(details) : null, new Date()]
  );
}

export async function getFunkSettings(guildId) {
  const [rows] = await pool.execute('SELECT * FROM funk_settings WHERE guild_id = ? LIMIT 1', [guildId]);
  return rows[0] || null;
}

export async function upsertFunkSettings(guildId, data) {
  await pool.execute(
    `INSERT INTO funk_settings (guild_id, message_id, sakura, neon, blacklist)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       message_id = VALUES(message_id),
       sakura = VALUES(sakura),
       neon = VALUES(neon),
       blacklist = VALUES(blacklist)`
    ,
    [guildId, data.messageId || null, data.sakura, data.neon, data.blacklist]
  );
}

export async function updateFunkMessageId(guildId, messageId) {
  await pool.execute('UPDATE funk_settings SET message_id = ? WHERE guild_id = ?', [messageId, guildId]);
}

export async function getPanelMessage(panelKey) {
  const [rows] = await pool.execute('SELECT * FROM bot_panels WHERE panel_key = ? LIMIT 1', [panelKey]);
  return rows[0] || null;
}

export async function upsertPanelMessage(panelKey, channelId, messageId) {
  await pool.execute(
    `INSERT INTO bot_panels (panel_key, channel_id, message_id)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id), message_id = VALUES(message_id)`
    ,
    [panelKey, channelId, messageId]
  );
}

export { pool };