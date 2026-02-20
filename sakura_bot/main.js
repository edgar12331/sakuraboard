// ===============================
// Sakura Bot – main.js
// Server-spezifische Command-Registrierung mit Logging
// ===============================

import discord from 'discord.js';
const {
  Client,
  GatewayIntentBits,
  Collection,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = discord;

// Funktionen importieren
import { registerUserCommands as registerUserCmds, handleUserInteraction, initAbmeldungSystem } from './src/commands/user.js';
import { registerFunkCommands as registerFunkCmds, handleFunkInteraction } from './src/commands/funk.js';
import { registerFarbenCommands as registerFarbenCmds, handleFarbenInteraction, initFarbenSystem } from './src/commands/farben.js';

// KI-Chatbot importieren
import { registerAICommands, handleAIIntersection, initAI } from './src/services/ai.js';

// Logging-Funktionen importieren
import {
  logCommand,
  logMemberKick,
  logMemberBan,
  logMemberUnban,
  logRoleAdd,
  logRoleRemove,
  logMemberJoin,
  logMemberLeave,
  logMessageDelete,
  logMessageEdit,
  logBotError,
  logCustom
} from './src/services/logs.js';

// Für LOG_COLORS - direkt importieren
import { LOG_COLORS } from './src/services/logs.js';

import { initDatabase, getPanelMessage, upsertPanelMessage } from './src/db/database.js';

// API Server importieren
import { startApiServer } from './src/api/server.js';

// Config
import { TOKEN } from './config.js';

// ===============================
// BELEIDIGUNG COMMAND
// ===============================

// Liste der "Beleidigungen"
const BELEIDIGUNGEN = [
  'Du wandelnde Denkpause',
  'Charmanter Chaosmagnet',
  // ... (alle Beleidigungen bleiben gleich)
];

// Erlaubte Rollen für den Befehl
const ALLOWED_BELEIDIGUNG_ROLES = [
  '1136028969481797743', // B. King
  '1096402401424060516'  // Inhaber
];

// Logo URL
const LOGO_URL = 'https://i.postimg.cc/1381yM8G/grafik.png';

// Command für die Registrierung
function registerBeleidigungCommand() {
  const command = new SlashCommandBuilder()
    .setName('beleidigung')
    .setDescription('Schickt eine zufällige "Beleidigung" an einen Benutzer')
    .addUserOption(option =>
      option
        .setName('ziel')
        .setDescription('Wer soll "beleidigt" werden?')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('anlass')
        .setDescription('Warum wird "beleidigt"?')
        .setRequired(false)
        .setMaxLength(200)
    )
    .toJSON();

  return command;
}

// Handler für den Befehl
async function handleBeleidigungInteraction(interaction) {
  try {
    // Prüfen ob der User eine der erlaubten Rollen hat
    const hasRequiredRole = interaction.member.roles.cache.some(role =>
      ALLOWED_BELEIDIGUNG_ROLES.includes(role.id)
    );

    if (!hasRequiredRole) {
      return await interaction.reply({
        content: '❌ Nur **B. King** oder **Inhaber** können diesen Befehl verwenden!',
        flags: MessageFlags.Ephemeral
      });
    }

    // Optionen holen
    const targetUser = interaction.options.getUser('ziel');
    const anlass = interaction.options.getString('anlass') || 'Weil ich es kann!';

    // Prüfen ob Ziel-Bot ist
    if (targetUser.bot) {
      return await interaction.reply({
        content: '❌ Bots können nicht "beleidigt" werden!',
        flags: MessageFlags.Ephemeral
      });
    }

    // Prüfen ob Selbst-"Beleidigung"
    if (targetUser.id === interaction.user.id) {
      return await interaction.reply({
        content: '❌ Selbst-"Beleidigung" ist nicht erlaubt!',
        flags: MessageFlags.Ephemeral
      });
    }

    // Zufällige Beleidigung auswählen
    const randomBeleidigung = BELEIDIGUNGEN[Math.floor(Math.random() * BELEIDIGUNGEN.length)];

    // Bestimme welche Rolle der Ausführende hat (für den Log)
    const userRole = interaction.member.roles.cache.find(role =>
      ALLOWED_BELEIDIGUNG_ROLES.includes(role.id)
    );
    const roleName = userRole?.name || 'Unbekannte Rolle';

    // Embed erstellen
    const embed = new EmbedBuilder()
      .setColor('#FFD700') // Goldene Farbe
      .setTitle('🎭 OFFIZIELLE "BELEIDIGUNG" 🎭')
      .setDescription(`**Achtung!** Es folgt eine offizielle "Beleidigung":`)
      .addFields(
        {
          name: '👑 Ausführender',
          value: `<@${interaction.user.id}> (${roleName})`,
          inline: true
        },
        {
          name: '🎯 Ziel der "Beleidigung"',
          value: `<@${targetUser.id}>`,
          inline: true
        },
        {
          name: '📝 Anlass',
          value: anlass,
          inline: false
        },
        {
          name: '💥 Die "Beleidigung" lautet:',
          value: `***"${randomBeleidigung}!"***`,
          inline: false
        }
      )
      .setThumbnail(LOGO_URL)
      .setFooter({
        text: 'Sakura Humorabteilung • Diese "Beleidigung" ist rein freundschaftlich gemeint!',
        iconURL: LOGO_URL
      })
      .setTimestamp();

    // Als Antwort im Channel posten (nicht ephemeral)
    await interaction.reply({
      content: `<@${targetUser.id}>`,
      embeds: [embed]
    });

    // Loggen
    console.log(`🎭 Beleidigung von ${interaction.user.tag} (${roleName}) an ${targetUser.tag}: "${randomBeleidigung}"`);

    // Custom Log (optional)
    await logCustom(
      interaction.client,
      '🎭 **OFFIZIELLE "BELEIDIGUNG"**',
      `**Von:** ${interaction.user} (${interaction.user.tag})\n` +
      `**Rolle:** ${roleName}\n` +
      `**An:** ${targetUser} (${targetUser.tag})\n` +
      `**"Beleidigung":** "${randomBeleidigung}"\n` +
      `**Channel:** <#${interaction.channel.id}>`,
      LOG_COLORS.INFO
    );

  } catch (error) {
    console.error('❌ Fehler bei /beleidigung:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Fehler beim Senden der "Beleidigung".',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

// ===============================
// ADMIN PANEL (BUTTONS)
// ===============================

function hasPanelRole(member) {
  return member?.roles?.cache?.some(role => PANEL_ALLOWED_ROLES.includes(role.id));
}

function buildAdminPanelEmbed() {
  return new EmbedBuilder()
    .setColor('#1f6feb')
    .setTitle('🧭 Admin Schnellaktionen')
    .setDescription('Nutze die Buttons, um Befehle schnell zu starten.')
    .addFields(
      { name: '🔧 Funk', value: 'Funk aktualisieren (Sakura/Neon/Blacklist)', inline: false },
      { name: '🚨 Sanktion', value: 'Sanktion für einen User erstellen', inline: false },
      { name: '✅ Sanktion bezahlt', value: 'Sanktion als bezahlt markieren', inline: false },
      { name: '📋 Abmeldung (Admin)', value: 'Mitglied per Admin abmelden', inline: false },
      { name: '⏱️ Timeout', value: 'Timeout setzen/entfernen', inline: false },
      { name: '🎭 Rolle', value: 'Rolle geben/entfernen', inline: false },
      { name: '🐢 Slowmode', value: 'Slowmode setzen/entfernen', inline: false },
      { name: '🏷️ Nickname', value: 'Nickname setzen/zuruecksetzen', inline: false },
      { name: '👤 User Info', value: 'Infos & Rollen anzeigen', inline: false }
    )
    .setFooter({ text: 'Sakura Admin Panel', iconURL: LOGO_URL })
    .setTimestamp();
}

function buildUserSelectRow(customId, placeholder) {
  return new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(1)
  );
}

function buildAdminPanelComponents() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_panel_funk')
      .setLabel('Funk aktualisieren')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('admin_panel_sanki')
      .setLabel('Sanktion erstellen')
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_panel_bezahlt')
      .setLabel('Sanktion bezahlt')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('admin_panel_abmeldung')
      .setLabel('Abmeldung (Admin)')
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('admin_panel_timeout')
      .setLabel('Timeout')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_panel_role')
      .setLabel('Rolle')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_panel_slowmode')
      .setLabel('Slowmode')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_panel_nickname')
      .setLabel('Nickname')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('admin_panel_userinfo')
      .setLabel('User Info')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row, row2, row3];
}

async function upsertAdminPanelMessage(client) {
  try {
    const channel = await client.channels.fetch(ADMIN_PANEL_CHANNEL_ID);
    if (!channel) return;

    const panelData = await getPanelMessage(ADMIN_PANEL_KEY);
    const embed = buildAdminPanelEmbed();
    const components = buildAdminPanelComponents();

    if (panelData && panelData.channel_id === ADMIN_PANEL_CHANNEL_ID) {
      try {
        const message = await channel.messages.fetch(panelData.message_id);
        await message.edit({ embeds: [embed], components });
        return;
      } catch (error) {
        console.warn('⚠️ Admin-Panel Nachricht nicht gefunden, erstelle neu.');
      }
    }

    const newMessage = await channel.send({ embeds: [embed], components });
    await upsertPanelMessage(ADMIN_PANEL_KEY, ADMIN_PANEL_CHANNEL_ID, newMessage.id);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Admin-Panels:', error);
  }
}

function parseUserIdFromCustomId(customId, prefix) {
  if (!customId.startsWith(prefix)) return null;
  const parts = customId.split(':');
  return parts.length > 1 ? parts[1] : null;
}

function parseDurationInput(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  if (['0', 'off', 'remove', 'reset'].includes(value)) return 0;

  const match = value.match(/^(\d+)\s*(m|h|d)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2] || 'm';
  const multiplier = unit === 'h'
    ? 60 * 60 * 1000
    : unit === 'd'
      ? 24 * 60 * 60 * 1000
      : 60 * 1000;

  return amount * multiplier;
}

function parseRoleId(raw) {
  const match = String(raw || '').match(/(\d{17,20})/);
  return match ? match[1] : null;
}

function buildProxyInteraction(interaction, overrides = {}) {
  return {
    ...overrides,
    user: interaction.user,
    member: interaction.member,
    guild: interaction.guild,
    guildId: interaction.guildId,
    channel: interaction.channel,
    channelId: interaction.channelId,
    client: interaction.client,
    reply: (...args) => interaction.reply(...args),
    editReply: (...args) => interaction.editReply(...args),
    deferReply: (...args) => interaction.deferReply?.(...args),
    followUp: (...args) => interaction.followUp?.(...args),
    update: (...args) => interaction.update?.(...args),
    get replied() {
      return interaction.replied;
    },
    get deferred() {
      return interaction.deferred;
    }
  };
}

// ===============================
// CLIENT
// ===============================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildEmojisAndStickers
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER', 'GUILD_MEMBER']
});

client.commands = new Collection();

// ===============================
// KONSTANTEN
// ===============================

const TARGET_GUILD_ID = '1096402401382109237';
const ABMELDUNG_CHANNEL_ID = '1096402402325835818'; // ⟫💤│abmeldung
const ADMIN_PANEL_CHANNEL_ID = '1326673667781951558';
const ADMIN_PANEL_KEY = 'admin_panel_main';

const PANEL_ALLOWED_ROLES = [
  '1096402401407279152',
  '1096402401382109245',
  '1427766432414044160',
  '1096402401407279150',
  '1097403678715031612',
  '1360267078321311836',
  '1136028969481797743',
  '1096402401407279149',
  '1096402401382109243'
];

// ===============================
// COMMANDS SAMMELN
// ===============================

const funkCommands = registerFunkCmds();
const userCommands = registerUserCmds();
const farbenCommands = registerFarbenCmds();
const aiCommands = registerAICommands();
const beleidigungCommand = registerBeleidigungCommand();

// ===============================
// SERVER-SPEZIFISCHE COMMAND REGISTRIERUNG
// ===============================

async function registerGuildCommands() {
  try {
    const guild = await client.guilds.fetch(TARGET_GUILD_ID);
    console.log(`🎯 Befehle für Server: ${guild.name}`);

    const allCommands = [
      ...funkCommands,
      ...userCommands,
      ...farbenCommands,
      ...aiCommands,
      beleidigungCommand
    ];

    const commandMap = new Map();
    for (const command of allCommands) {
      if (command?.name) {
        commandMap.set(command.name, command);
      }
    }

    const uniqueCommands = [...commandMap.values()];

    console.log(`🔄 Registriere ${uniqueCommands.length} Slash Commands...`);
    await guild.commands.set(uniqueCommands);

    console.log('✅ Slash Commands registriert');

    const registeredCommands = await guild.commands.fetch();
    console.log(`📋 Befehle: ${registeredCommands.map(cmd => `/${cmd.name}`).join(', ')}`);

    try {
      if (client.application?.commands) {
        await client.application.commands.set([]);
        console.log('🧹 Globale Commands wurden entfernt (gegen Duplikate)');
      }
    } catch (error) {
      console.warn('⚠️ Konnte globale Commands nicht entfernen:', error.message);
    }

    // Log Command-Registrierung
    await logCustom(
      client,
      '🔄 **COMMAND REGISTRIERUNG**',
      `**Server:** ${guild.name}\n` +
      `**Anzahl Befehle:** ${registeredCommands.size}\n` +
      `**Befehle:** ${registeredCommands.map(cmd => `\`/${cmd.name}\``).join(', ')}`,
      LOG_COLORS.SUCCESS
    );

  } catch (err) {
    console.error('❌ Fehler beim Registrieren:', err);
    await logBotError(client, err, 'Command-Registrierung');
  }
}

// ===============================
// EVENT HANDLER
// ===============================

// Mitgliedsereignisse
client.on('guildMemberAdd', async (member) => {
  try {
    await logMemberJoin(client, member);
  } catch (error) {
    console.error('Fehler beim Loggen des Mitgliedsbeitritts:', error);
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    await logMemberLeave(client, member);
  } catch (error) {
    console.error('Fehler beim Loggen des Mitgliedsaustritts:', error);
  }
});

// Rollenänderungen (nur durch Bot)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    // Prüfe auf hinzugefügte Rollen
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    // Logge jede hinzugefügte Rolle
    for (const role of addedRoles.values()) {
      // Ignoriere @everyone Rolle
      if (role.id === newMember.guild.id) continue;

      await logRoleAdd(client, newMember.guild, newMember, role, 'System (Automatisch)');
    }

    // Logge jede entfernte Rolle
    for (const role of removedRoles.values()) {
      // Ignoriere @everyone Rolle
      if (role.id === newMember.guild.id) continue;

      await logRoleRemove(client, newMember.guild, newMember, role, 'System (Automatisch)');
    }
  } catch (error) {
    console.error('Fehler beim Loggen der Rollenänderungen:', error);
  }
});

// Nachrichtenereignisse
client.on('messageDelete', async (message) => {
  // Ignoriere Bot-Nachrichten und DMs
  if (message.author?.bot || !message.guild) return;

  try {
    await logMessageDelete(client, message);
  } catch (error) {
    console.error('Fehler beim Loggen der gelöschten Nachricht:', error);
  }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  // Ignoriere Bot-Nachrichten, DMs und Embed-Updates
  if (newMessage.author?.bot || !newMessage.guild || oldMessage.content === newMessage.content) return;

  try {
    await logMessageEdit(client, oldMessage, newMessage);
  } catch (error) {
    console.error('Fehler beim Loggen der bearbeiteten Nachricht:', error);
  }
});

// Manuelle Abmeldungen im Channel verarbeiten
client.on('messageCreate', async (message) => {
  try {
    // Ignoriere Bot-Nachrichten
    if (message.author.bot) return;

    // Nur im Abmeldung-Channel
    if (message.channel.id === ABMELDUNG_CHANNEL_ID) {
      console.log(`📝 Prüfe manuelle Abmeldung von ${message.author.tag}: "${message.content.substring(0, 100)}..."`);

      // Lösche die Nachricht und zeige stattdessen eine Hilfemeldung
      await message.delete().catch(() => { });

      const helpEmbed = new EmbedBuilder()
        .setColor(LOG_COLORS.INFO)
        .setTitle('📋 ABMELDUNGSSYSTEM')
        .setDescription('Bitte verwende die Slash-Commands für Abmeldungen:')
        .addFields(
          {
            name: '👤 Für Mitglieder',
            value: '`/abmeldung`',
            inline: false
          },
          {
            name: '👨‍💼 Für Admins',
            value: '`/abmeldung-admin`',
            inline: false
          },
          {
            name: '📋 Verwaltung',
            value: '`/abmeldung-verwaltung` (Admin-Tools)',
            inline: false
          },
          {
            name: '📊 Liste',
            value: '`/abmeldung_list` (Aktive Abmeldungen anzeigen)',
            inline: false
          },
          {
            name: '🤖 KI-Hilfe',
            value: '`/help abmeldung` für detaillierte Hilfe',
            inline: false
          }
        )
        .setFooter({ text: 'Sakura Abmeldungssystem', iconURL: LOGO_URL })
        .setTimestamp();

      const helpMessage = await message.channel.send({
        content: `${message.author}`,
        embeds: [helpEmbed]
      });

      // Lösche die Hilfemeldung nach 30 Sekunden
      setTimeout(() => {
        helpMessage.delete().catch(() => { });
      }, 30000);
    }
  } catch (error) {
    console.error('❌ Fehler bei manueller Abmeldungsprüfung:', error);
  }
});

// ===============================
// READY EVENT
// ===============================

client.once('ready', async () => {
  console.log(`🤖 Sakura-Bot online als ${client.user.tag}`);
  console.log(`🆔 Bot ID: ${client.user.id}`);

  try {
    await initDatabase();

    // KI INITIALISIEREN
    console.log('🤖 Initialisiere KI-Chatbot...');
    const aiInitialized = initAI();
    if (aiInitialized) {
      console.log('✅ KI-Chatbot initialisiert');
    } else {
      console.log('⚠️ KI-Chatbot konnte nicht initialisiert werden (API Key fehlt)');
    }

    // Bot-Start Log
    await logCustom(
      client,
      '🚀 **BOT GESTARTET**',
      `**Bot:** ${client.user.tag}\n` +
      `**Bot-ID:** \`${client.user.id}\`\n` +
      `**Server:** ${client.guilds.cache.size}\n` +
      `**Ping:** ${client.ws.ping}ms\n` +
      `**Version:** Kombinierte user.js + KI-Chatbot\n` +
      `**KI-Chatbot:** ${aiInitialized ? '✅ Aktiviert' : '⚠️ Deaktiviert (API Key benötigt)'}`,
      LOG_COLORS.SUCCESS
    );

    await registerGuildCommands();

    await upsertAdminPanelMessage(client);

    // Fraktionsfarben-System initialisieren
    initFarbenSystem(client);

    // Abmeldungssystem initialisieren (aus user.js)
    initAbmeldungSystem(client);

    // API Server für die Webseite (SakuraBoard) starten
    console.log('🌐 Starte Express API Server für SakuraBoard...');
    startApiServer(client);

    console.log('✅ Bot vollständig initialisiert und betriebsbereit');

    // Status setzen
    client.user.setPresence({
      activities: [{
        name: '/help für Befehle | /chat für KI',
        type: 3 // WATCHING
      }],
      status: 'online'
    });

  } catch (error) {
    console.error('❌ Fehler bei der Initialisierung:', error);
    await logBotError(client, error, 'Bot Initialisierung');

    // Versuche trotzdem fortzufahren, aber mit Warnung
    console.log('⚠️ Bot startet mit Einschränkungen');

    await logCustom(
      client,
      '⚠️ **BOT START MIT FEHLER**',
      `**Bot:** ${client.user.tag}\n` +
      `**Fehler:** ${error.message}\n` +
      `**Hinweis:** Einige Systeme möglicherweise eingeschränkt`,
      LOG_COLORS.WARNING
    );

    await initDatabase();

    // Trotzdem Commands registrieren
    await registerGuildCommands();
    initFarbenSystem(client);
    initAbmeldungSystem(client);
    await upsertAdminPanelMessage(client);

    // Versuche KI zu initialisieren
    initAI();
  }
});

// ===============================
// INTERACTION HANDLER - KORRIGIERT
// ===============================

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (!hasPanelRole(interaction.member)) {
      return await interaction.reply({
        content: '❌ Keine Berechtigung für das Admin-Panel.',
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_funk') {
      const modal = new ModalBuilder()
        .setCustomId('admin_panel_funk_modal')
        .setTitle('Funk aktualisieren');

      const typInput = new TextInputBuilder()
        .setCustomId('funk_typ')
        .setLabel('Typ (sakura / neon / blacklist)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(typInput));
      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'admin_panel_sanki') {
      const row = buildUserSelectRow('admin_panel_sanki_user_select', 'User für Sanktion auswählen');
      return await interaction.reply({
        content: '👤 Bitte wähle den User für die Sanktion aus:',
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_bezahlt') {
      const row = buildUserSelectRow('admin_panel_bezahlt_user_select', 'User auswählen (Bezahlt)');
      return await interaction.reply({
        content: '👤 Bitte wähle den User aus, der bezahlt hat:',
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_abmeldung') {
      const row = buildUserSelectRow('admin_panel_abmeldung_user_select', 'User für Abmeldung auswählen');
      return await interaction.reply({
        content: '👤 Bitte wähle den User für die Abmeldung aus:',
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_timeout') {
      const row = buildUserSelectRow('admin_panel_timeout_user_select', 'User für Timeout auswählen');
      return await interaction.reply({
        content: '👤 Bitte wähle den User für den Timeout aus:',
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_role') {
      const row = buildUserSelectRow('admin_panel_role_user_select', 'User für Rollenaktion auswählen');
      return await interaction.reply({
        content: '👤 Bitte wähle den User für die Rollenaktion aus:',
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_slowmode') {
      const modal = new ModalBuilder()
        .setCustomId('admin_panel_slowmode_modal')
        .setTitle('Slowmode setzen');

      const secondsInput = new TextInputBuilder()
        .setCustomId('slowmode_seconds')
        .setLabel('Sekunden (0 = aus)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const channelInput = new TextInputBuilder()
        .setCustomId('slowmode_channel')
        .setLabel('Channel-ID (leer = aktueller)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(secondsInput),
        new ActionRowBuilder().addComponents(channelInput)
      );

      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'admin_panel_nickname') {
      const row = buildUserSelectRow('admin_panel_nick_user_select', 'User für Nickname auswählen');
      return await interaction.reply({
        content: '👤 Bitte wähle den User für den Nickname aus:',
        components: [row],
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_userinfo') {
      const row = buildUserSelectRow('admin_panel_userinfo_user_select', 'User für Info auswählen');
      return await interaction.reply({
        content: '👤 Bitte wähle den User für die Info aus:',
        components: [row],
        ephemeral: true
      });
    }
  }

  if (interaction.isUserSelectMenu()) {
    if (!hasPanelRole(interaction.member)) {
      return await interaction.reply({
        content: '❌ Keine Berechtigung für das Admin-Panel.',
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_sanki_user_select') {
      const userId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_panel_sanki_modal:${userId}`)
        .setTitle('Sanktion erstellen');

      const betragInput = new TextInputBuilder()
        .setCustomId('sanki_betrag')
        .setLabel('Betrag (z.B. 300.000)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const grundInput = new TextInputBuilder()
        .setCustomId('sanki_grund')
        .setLabel('Grund der Sanktion')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(betragInput),
        new ActionRowBuilder().addComponents(grundInput)
      );

      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'admin_panel_bezahlt_user_select') {
      const userId = interaction.values[0];
      let user;
      try {
        user = await interaction.client.users.fetch(userId);
      } catch (error) {
        return await interaction.reply({
          content: '❌ User nicht gefunden.',
          ephemeral: true
        });
      }

      const fakeInteraction = {
        commandName: 'bezahlt',
        options: {
          getUser: (name) => (name === 'user' ? user : null)
        }
      };

      return await handleUserInteraction(client, buildProxyInteraction(interaction, fakeInteraction));
    }

    if (interaction.customId === 'admin_panel_abmeldung_user_select') {
      const userId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_panel_abmeldung_modal:${userId}`)
        .setTitle('Admin Abmeldung');

      const zeitraumInput = new TextInputBuilder()
        .setCustomId('abmeldung_zeitraum')
        .setLabel('Zeitraum (z.B. "3 tage" oder "22.01.2026")')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const grundInput = new TextInputBuilder()
        .setCustomId('abmeldung_grund')
        .setLabel('Grund der Abmeldung')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(zeitraumInput),
        new ActionRowBuilder().addComponents(grundInput)
      );

      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'admin_panel_timeout_user_select') {
      const userId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_panel_timeout_modal:${userId}`)
        .setTitle('Timeout setzen');

      const durationInput = new TextInputBuilder()
        .setCustomId('timeout_duration')
        .setLabel('Dauer (z.B. 10m, 1h, 1d, 0 = aus)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('timeout_reason')
        .setLabel('Grund (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(durationInput),
        new ActionRowBuilder().addComponents(reasonInput)
      );

      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'admin_panel_role_user_select') {
      const userId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_panel_role_modal:${userId}`)
        .setTitle('Rolle geben/entfernen');

      const actionInput = new TextInputBuilder()
        .setCustomId('role_action')
        .setLabel('Aktion (add/remove)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const roleInput = new TextInputBuilder()
        .setCustomId('role_id')
        .setLabel('Rollen-ID oder @Erwaehnung')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('role_reason')
        .setLabel('Grund (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(actionInput),
        new ActionRowBuilder().addComponents(roleInput),
        new ActionRowBuilder().addComponents(reasonInput)
      );

      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'admin_panel_nick_user_select') {
      const userId = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`admin_panel_nick_modal:${userId}`)
        .setTitle('Nickname setzen');

      const nickInput = new TextInputBuilder()
        .setCustomId('nickname_value')
        .setLabel('Nickname (reset = zuruecksetzen)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('nickname_reason')
        .setLabel('Grund (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nickInput),
        new ActionRowBuilder().addComponents(reasonInput)
      );

      return await interaction.showModal(modal);
    }

    if (interaction.customId === 'admin_panel_userinfo_user_select') {
      const userId = interaction.values[0];
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return await interaction.reply({
          content: '❌ User nicht gefunden.',
          ephemeral: true
        });
      }

      const roles = member.roles.cache
        .filter(role => role.id !== member.guild.id)
        .map(role => `<@&${role.id}>`)
        .join(' ');

      const embed = new EmbedBuilder()
        .setColor(LOG_COLORS.INFO)
        .setTitle('👤 User Info')
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: 'User', value: `${member.user} (${member.user.tag})`, inline: false },
          { name: 'User-ID', value: `\`${member.id}\``, inline: true },
          { name: 'Beigetreten', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'Unbekannt', inline: true },
          { name: 'Rollen', value: roles || 'Keine Rollen', inline: false }
        )
        .setTimestamp();

      await logCustom(
        interaction.client,
        '👤 **ADMIN PANEL: USER INFO**',
        `**User:** ${member.user} (${member.user.tag})\n` +
        `**Ausfuehrender:** ${interaction.user} (${interaction.user.tag})\n` +
        `**Channel:** <#${interaction.channel.id}>`,
        LOG_COLORS.INFO
      );

      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (interaction.isModalSubmit()) {
    if (!hasPanelRole(interaction.member)) {
      return await interaction.reply({
        content: '❌ Keine Berechtigung fuer das Admin-Panel.',
        ephemeral: true
      });
    }

    if (interaction.customId === 'admin_panel_funk_modal') {
      const typeRaw = interaction.fields.getTextInputValue('funk_typ') || '';
      const type = typeRaw.trim().toLowerCase();

      if (!['sakura', 'neon', 'blacklist'].includes(type)) {
        return await interaction.reply({
          content: '❌ Ungueltiger Typ. Bitte nutze: sakura, neon oder blacklist.',
          ephemeral: true
        });
      }

      const fakeInteraction = {
        commandName: 'funk',
        fromPanel: true,
        options: {
          getString: (name) => (name === 'typ' ? type : null)
        }
      };

      return await handleFunkInteraction(client, buildProxyInteraction(interaction, fakeInteraction));
    }

    if (interaction.customId === 'admin_panel_slowmode_modal') {
      const secondsRaw = interaction.fields.getTextInputValue('slowmode_seconds');
      const channelRaw = interaction.fields.getTextInputValue('slowmode_channel') || '';
      const seconds = Number.parseInt(secondsRaw, 10);

      if (Number.isNaN(seconds) || seconds < 0) {
        return await interaction.reply({
          content: '❌ Ungueltige Sekunden. Bitte eine Zahl >= 0 angeben.',
          ephemeral: true
        });
      }

      const channelId = channelRaw.trim() ? parseRoleId(channelRaw.trim()) : interaction.channel.id;
      const targetChannel = await interaction.client.channels.fetch(channelId).catch(() => null);

      if (!targetChannel || typeof targetChannel.setRateLimitPerUser !== 'function') {
        return await interaction.reply({
          content: '❌ Channel nicht gefunden oder kein Text-Channel.',
          ephemeral: true
        });
      }

      await targetChannel.setRateLimitPerUser(seconds, `Admin Panel von ${interaction.user.tag}`);

      await logCustom(
        interaction.client,
        '🐢 **ADMIN PANEL: SLOWMODE**',
        `**Channel:** <#${targetChannel.id}>\n` +
        `**Sekunden:** ${seconds}\n` +
        `**Ausfuehrender:** ${interaction.user} (${interaction.user.tag})`,
        LOG_COLORS.WARNING
      );

      return await interaction.reply({
        content: `✅ Slowmode gesetzt: ${seconds} Sekunden in <#${targetChannel.id}>.`,
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith('admin_panel_timeout_modal')) {
      const userId = parseUserIdFromCustomId(interaction.customId, 'admin_panel_timeout_modal');
      const durationRaw = interaction.fields.getTextInputValue('timeout_duration');
      const reason = interaction.fields.getTextInputValue('timeout_reason') || 'Admin Panel';

      if (!userId) {
        return await interaction.reply({
          content: '❌ Kein User ausgewaehlt.',
          ephemeral: true
        });
      }

      const durationMs = parseDurationInput(durationRaw);
      if (durationMs === null) {
        return await interaction.reply({
          content: '❌ Ungueltige Dauer. Nutze z.B. 10m, 1h, 1d oder 0.',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return await interaction.reply({
          content: '❌ User nicht gefunden.',
          ephemeral: true
        });
      }

      if (durationMs === 0) {
        await member.timeout(null, reason);
      } else {
        await member.timeout(durationMs, reason);
      }

      await logCustom(
        interaction.client,
        '⏱️ **ADMIN PANEL: TIMEOUT**',
        `**User:** ${member.user} (${member.user.tag})\n` +
        `**Dauer:** ${durationMs === 0 ? 'Entfernt' : `${Math.round(durationMs / 60000)} Min.`}\n` +
        `**Grund:** ${reason}\n` +
        `**Ausfuehrender:** ${interaction.user} (${interaction.user.tag})`,
        LOG_COLORS.WARNING
      );

      return await interaction.reply({
        content: durationMs === 0
          ? `✅ Timeout fuer ${member.user.tag} entfernt.`
          : `✅ Timeout gesetzt: ${member.user.tag}.`,
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith('admin_panel_role_modal')) {
      const userId = parseUserIdFromCustomId(interaction.customId, 'admin_panel_role_modal');
      const actionRaw = interaction.fields.getTextInputValue('role_action') || '';
      const roleRaw = interaction.fields.getTextInputValue('role_id') || '';
      const reason = interaction.fields.getTextInputValue('role_reason') || 'Admin Panel';

      if (!userId) {
        return await interaction.reply({
          content: '❌ Kein User ausgewaehlt.',
          ephemeral: true
        });
      }

      const action = actionRaw.trim().toLowerCase();
      if (!['add', 'remove'].includes(action)) {
        return await interaction.reply({
          content: '❌ Ungueltige Aktion. Bitte add oder remove.',
          ephemeral: true
        });
      }

      const roleId = parseRoleId(roleRaw);
      if (!roleId) {
        return await interaction.reply({
          content: '❌ Ungueltige Rollen-ID oder Erwaehnung.',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return await interaction.reply({
          content: '❌ User nicht gefunden.',
          ephemeral: true
        });
      }

      if (action === 'add') {
        await member.roles.add(roleId, reason);
      } else {
        await member.roles.remove(roleId, reason);
      }

      await logCustom(
        interaction.client,
        '🎭 **ADMIN PANEL: ROLLE**',
        `**User:** ${member.user} (${member.user.tag})\n` +
        `**Aktion:** ${action}\n` +
        `**Rolle:** <@&${roleId}>\n` +
        `**Grund:** ${reason}\n` +
        `**Ausfuehrender:** ${interaction.user} (${interaction.user.tag})`,
        LOG_COLORS.INFO
      );

      return await interaction.reply({
        content: `✅ Rolle ${action === 'add' ? 'gegeben' : 'entfernt'}: <@&${roleId}> für ${member.user.tag}.`,
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith('admin_panel_nick_modal')) {
      const userId = parseUserIdFromCustomId(interaction.customId, 'admin_panel_nick_modal');
      const nicknameRaw = interaction.fields.getTextInputValue('nickname_value') || '';
      const reason = interaction.fields.getTextInputValue('nickname_reason') || 'Admin Panel';

      if (!userId) {
        return await interaction.reply({
          content: '❌ Kein User ausgewaehlt.',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return await interaction.reply({
          content: '❌ User nicht gefunden.',
          ephemeral: true
        });
      }

      const nicknameValue = nicknameRaw.trim();
      if (!nicknameValue) {
        return await interaction.reply({
          content: '❌ Nickname darf nicht leer sein.',
          ephemeral: true
        });
      }

      if (nicknameValue.toLowerCase() === 'reset') {
        await member.setNickname(null, reason);
      } else {
        await member.setNickname(nicknameValue, reason);
      }

      await logCustom(
        interaction.client,
        '🏷️ **ADMIN PANEL: NICKNAME**',
        `**User:** ${member.user} (${member.user.tag})\n` +
        `**Nickname:** ${nicknameValue.toLowerCase() === 'reset' ? 'Reset' : nicknameValue}\n` +
        `**Grund:** ${reason}\n` +
        `**Ausfuehrender:** ${interaction.user} (${interaction.user.tag})`,
        LOG_COLORS.INFO
      );

      return await interaction.reply({
        content: nicknameValue.toLowerCase() === 'reset'
          ? `✅ Nickname von ${member.user.tag} zurueckgesetzt.`
          : `✅ Nickname gesetzt: ${member.user.tag}.`,
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith('admin_panel_sanki_modal')) {
      const userId = parseUserIdFromCustomId(interaction.customId, 'admin_panel_sanki_modal');
      const betrag = interaction.fields.getTextInputValue('sanki_betrag');
      const grund = interaction.fields.getTextInputValue('sanki_grund');

      if (!userId) {
        return await interaction.reply({
          content: '❌ Kein User ausgewählt.',
          ephemeral: true
        });
      }

      let user;
      try {
        user = await interaction.client.users.fetch(userId);
      } catch (error) {
        return await interaction.reply({
          content: '❌ User nicht gefunden.',
          ephemeral: true
        });
      }

      const fakeInteraction = {
        commandName: 'sanki',
        options: {
          getUser: (name) => (name === 'user' ? user : null),
          getString: (name) => {
            if (name === 'betrag') return betrag;
            if (name === 'grund') return grund;
            return null;
          }
        }
      };

      return await handleUserInteraction(client, buildProxyInteraction(interaction, fakeInteraction));
    }

    if (interaction.customId.startsWith('admin_panel_abmeldung_modal')) {
      const userId = parseUserIdFromCustomId(interaction.customId, 'admin_panel_abmeldung_modal');
      const zeitraum = interaction.fields.getTextInputValue('abmeldung_zeitraum');
      const grund = interaction.fields.getTextInputValue('abmeldung_grund');

      if (!userId) {
        return await interaction.reply({
          content: '❌ Kein User ausgewählt.',
          ephemeral: true
        });
      }

      let user;
      try {
        user = await interaction.client.users.fetch(userId);
      } catch (error) {
        return await interaction.reply({
          content: '❌ User nicht gefunden.',
          ephemeral: true
        });
      }

      const fakeInteraction = {
        commandName: 'abmeldung-admin',
        options: {
          getUser: (name) => (name === 'user' ? user : null),
          getString: (name) => {
            if (name === 'zeitraum') return zeitraum;
            if (name === 'grund') return grund;
            return null;
          }
        }
      };

      return await handleUserInteraction(client, buildProxyInteraction(interaction, fakeInteraction));
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  console.log(`🔧 Befehl: /${commandName} von ${interaction.user.tag}`);

  try {
    // Logge jeden Befehl
    await logCommand(client, interaction);

    // AI Commands (chat, help) zuerst prüfen
    if (['chat', 'help'].includes(commandName)) {
      return await handleAIIntersection(client, interaction);
    }

    // Funk Commands
    if (['setup', 'funk'].includes(commandName)) {
      return await handleFunkInteraction(client, interaction);
    }

    // Farben Commands - JETZT KORREKT
    if (['fraktionen', 'fraktion-löschen', 'fraktion-aktualisieren', 'fraktion-hinzufügen'].includes(commandName)) {
      return await handleFarbenInteraction(interaction);
    }

    // Beleidigung Command
    if (commandName === 'beleidigung') {
      return await handleBeleidigungInteraction(interaction);
    }

    // ALLE anderen Commands (Kündigung, Abmeldung, Ranks, Sanktionen)
    return await handleUserInteraction(client, interaction);

  } catch (error) {
    console.error(`❌ Fehler bei /${commandName}:`, error);

    // Logge den Fehler
    await logBotError(client, error, `Befehl: /${commandName}`);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Unerwarteter Fehler.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
});

// ===============================
// ERROR HANDLING
// ===============================

client.on('error', async (error) => {
  console.error('❌ Discord Client Error:', error);
  await logBotError(client, error, 'Discord Client');
});

process.on('unhandledRejection', async (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  await logBotError(client, error, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await logBotError(client, error, 'Uncaught Exception');
});

// ===============================
// LOGIN
// ===============================

console.log('🚀 Starte Sakura-Bot...');
client.login(TOKEN)
  .then(() => console.log('🔐 Login erfolgreich'))
  .catch(async (err) => {
    console.error('❌ Login fehlgeschlagen:', err);
    await logBotError(client, err, 'Bot Login');
    process.exit(1);
  });