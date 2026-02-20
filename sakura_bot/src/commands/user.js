// ===============================
// Sakura Bot – Combined user.js
// Enthält: Kündigungssystem, Abmeldungssystem, Ranksystem, Sanktionensystem
// ===============================

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';

// ===============================
// KONSTANTEN
// ===============================

// Allgemeine Konstanten
const LOGO_URL = 'https://i.postimg.cc/1381yM8G/grafik.png';

// Kanal IDs
const KÜNDIGUNG_CHANNEL_ID = '1096402402107727944';
const ABMELDUNG_CHANNEL_ID = '1096402402325835818';
const RANKS_CHANNEL_ID = '1096402402107727943';
const SANKTION_CHANNEL_ID = '1096402401898008626';
const FUHRUNG_CHANNEL_ID = '1461804036721344544';
const EINSTELLUNG_LOG_CHANNEL_ID = '1469009045926183146';

// Rollen IDs
const ALLOWED_ROLES = [
  '1096402401407279152',  // Vice-President
  '1096402401382109245',  // Co-Owner
  '1427766432414044160',  // Manager
  '1096402401407279150',  // Admin
  '1097403678715031612',  // Leitung
  '1360267078321311836',  // B.King
  '1136028969481797743',  // Inhaber
  '1096402401407279149'   // Bot Dev
];

const ABMELDUNG_ROLE_ID = '1461803260519120896';
const SPECIFIC_ROLE_TO_REMOVE = '1114997406669475850'; // Bewerber-Rolle
const FINAL_ROLES = [
  '1114997406669475850',
  '1096402401382109239',
  '1096413941690810379'
];

// Rollen-Mappings
const ROLE_MAPPING = {
  'Praktikant': '1096402401382109246',
  'Lehrling': '1096402401407279145',
  'Tuner': '1096402401407279146',
  'Geselle': '1096402401407279147',
  'Meister': '1096402401407279148',
  'Ausbilder': '1096402401407279149',
  'Stv. Werkstattleiter': '1096402401407279150',
  'Werkstattleiter': '1096402401407279151',
  'Manager': '1096402401407279152',
  'Teamleiter': '1371585424086138900',
  'Clubleitung': '1436330697735540841',
  'Clubmanager': '1436331343792439306',
  'Barkeeper': '1436331853962285086',
  'Security': '1436332637533896714',
  'DJ': '1326999150193021059',
  'B. King': '1136028969481797743',
  'B. Event Manager': '1388225057678954596',
  'B. Racer': '1196063254884130866',
  'B. Azubi': '1454894130898534514'
};

const AUTOMATIC_ADDITIONAL_ROLES = {
  '1096402401407279149': ['1097403678715031612'], // Wenn Ausbilder, dann auch Leitung
};

const ADDITIONAL_EINSTELLUNG_ROLES = [
  '1096402401382109246',
  '1096402401382109244',
  '1096413941690810379',
  '1097402977670680588',
  '1096402401382109239'
];

// Log Farben
const LOG_COLORS = {
  SUCCESS: '#00FF00',
  ERROR: '#FF0000',
  WARNING: '#FFA500',
  INFO: '#3498DB',
  NEUTRAL: '#95A5A6'
};

// ===============================
// HELPER FUNKTIONEN
// ===============================

function getBerlinTime() {
  const now = new Date();
  const options = {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  return new Intl.DateTimeFormat('de-DE', options).format(now);
}

function formatTime(date) {
  if (!date) return 'Unbekannt';
  
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDate(date) {
  if (!date) return 'Unbekannt';
  
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatShortDate(date) {
  if (!date) return 'Unbekannt';
  
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateDurationDays(start, end) {
  const diff = end - start;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function calculateDurationHours(start, end) {
  const diff = end - start;
  return Math.ceil(diff / (1000 * 60 * 60));
}

function formatRemainingTime(endDate) {
  if (!endDate) return 'Unbekannt';
  
  const now = new Date();
  const diff = endDate - now;
  
  if (diff < 0) return '🔴 Abgelaufen';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `🟢 ${days} Tag${days !== 1 ? 'e' : ''} ${hours > 0 ? `${hours}h` : ''}`;
  } else if (hours > 0) {
    return `🟡 ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return `🟠 ${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
  }
}

// ===============================
// ABMELDUNGSSYSTEM FUNKTIONEN
// ===============================

function validateAndParseDate(dateStr) {
  if (!dateStr) return null;
  
  dateStr = dateStr.trim().toLowerCase();
  
  // SPEZIALFALL: "aufstellung" = 1 Tag
  if (dateStr === 'aufstellung') {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 1);
    const startDate = new Date(now);
    return { startDate, endDate };
  }
  
  // Einzelnes Datum
  if (!dateStr.includes('-') && dateStr.match(/\d{1,2}\.\d{1,2}\.\d{4}/)) {
    const endDate = parseSingleDate(dateStr);
    if (!endDate) return null;
    const startDate = new Date();
    return { startDate, endDate };
  }
  
  // Zeitraum mit Bindestrich
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-').map(p => p.trim());
    if (parts.length !== 2) return null;
    
    const [startStr, endStr] = parts;
    const startDate = parseSingleDate(startStr);
    const endDate = parseSingleDate(endStr);
    
    if (!startDate || !endDate) return null;
    return { startDate, endDate };
  }
  
  // Relative Angabe
  const relativeMatch = dateStr.match(/^(\d+)\s*(tage?|t|tag|d)$/i);
  if (relativeMatch) {
    const days = parseInt(relativeMatch[1]);
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  
  return null;
}

function parseSingleDate(dateStr) {
  if (!dateStr) return null;
  
  dateStr = dateStr.trim();
  const dateRegex = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/;
  const match = dateStr.match(dateRegex);
  
  if (!match) return null;
  
  const day = parseInt(match[1]);
  const month = parseInt(match[2]) - 1;
  const year = parseInt(match[3]);
  
  const date = new Date(year, month, day, 23, 59, 59, 999);
  
  if (date.getFullYear() !== year || 
      date.getMonth() !== month || 
      date.getDate() !== day) {
    return null;
  }
  
  return date;
}

// ===============================
// COMMAND REGISTRIERUNG
// ===============================

export function registerUserCommands() {
  const commands = [];
  
  // Kündigung Befehl
  const kündigungCommand = new SlashCommandBuilder()
    .setName('kündigung')
    .setDescription('Kündigt einen Mitarbeiter')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Wer wird gekündigt')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('von')
        .setDescription('Wer führt die Kündigung aus (Namen)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('grund')
        .setDescription('Grund der Kündigung')
        .setRequired(true)
    )
    .toJSON();
  
  commands.push(kündigungCommand);
  
  // Abmeldungsbefehl für Mitglieder
  const abmeldungCommand = new SlashCommandBuilder()
    .setName('abmeldung')
    .setDescription('Trage eine Abmeldung ein')
    .addStringOption(option =>
      option
        .setName('zeitraum')
        .setDescription('Zeitraum der Abmeldung (z.B. "aufstellung", "22.01.2026", "20.01.2026-22.01.2026", "3 tage")')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('grund')
        .setDescription('Grund für die Abmeldung')
        .setRequired(true)
        .setMaxLength(500)
    )
    .toJSON();
  
  commands.push(abmeldungCommand);
  
  // Abmeldungsliste Command
  const abmeldungListCommand = new SlashCommandBuilder()
    .setName('abmeldung_list')
    .setDescription('Zeige alle aktiven Abmeldungen mit verbleibender Zeit')
    .toJSON();
  
  commands.push(abmeldungListCommand);
  
  // Admin-Befehl für Abmeldungen anderer
  const abmeldungAdminCommand = new SlashCommandBuilder()
    .setName('abmeldung-admin')
    .setDescription('Admin: Melde ein Mitglied ab')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Wer soll abgemeldet werden?')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('zeitraum')
        .setDescription('Zeitraum der Abmeldung (z.B. "aufstellung", "22.01.2026", "3 tage")')
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption(option =>
      option
        .setName('grund')
        .setDescription('Grund für die Abmeldung')
        .setRequired(true)
        .setMaxLength(500)
    )
    .toJSON();
  
  commands.push(abmeldungAdminCommand);
  
  // Admin-Verwaltungsbefehle
  const abmeldungVerwaltungCommand = new SlashCommandBuilder()
    .setName('abmeldung-verwaltung')
    .setDescription('Admin-Befehle für Abmeldungen')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('liste')
        .setDescription('Zeige alle aktiven Abmeldungen')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('entfernen')
        .setDescription('Entferne eine Abmeldung manuell')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User dessen Abmeldung entfernt werden soll')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Zeige Info über eine bestimmte Abmeldung')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User dessen Abmeldungsinfo angezeigt werden soll')
            .setRequired(true)
        )
    )
    .toJSON();
  
  commands.push(abmeldungVerwaltungCommand);
  
  // RANKS COMMANDS
  // Rang-Auswahl für alle Commands
  const rankChoices = Object.keys(ROLE_MAPPING).map(rank => ({
    name: rank,
    value: rank
  }));

  // Einstellung
  const einstellungCommand = new SlashCommandBuilder()
    .setName('einstellung')
    .setDescription('Stellt einen neuen Mitarbeiter ein')
    .addUserOption(option =>
      option.setName('mitarbeiter')
        .setDescription('Der neue Mitarbeiter')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('rang')
        .setDescription('Startrang des Mitarbeiters')
        .setRequired(true)
        .addChoices(...rankChoices))
    .addStringOption(option =>
      option.setName('grund')
        .setDescription('Grund der Einstellung')
        .setRequired(true)
        .setMaxLength(500))
    .toJSON();

  commands.push(einstellungCommand);

  // Up-Rank
  const upRankCommand = new SlashCommandBuilder()
    .setName('up-rank')
    .setDescription('Befördert einen Mitarbeiter')
    .addUserOption(option =>
      option.setName('mitarbeiter')
        .setDescription('Der zu befördernde Mitarbeiter')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('alter_rang')
        .setDescription('Aktueller Rang des Mitarbeiters')
        .setRequired(true)
        .addChoices(...rankChoices))
    .addStringOption(option =>
      option.setName('neuer_rang')
        .setDescription('Neuer Rang nach Beförderung')
        .setRequired(true)
        .addChoices(...rankChoices))
    .addStringOption(option =>
      option.setName('grund')
        .setDescription('Grund der Beförderung')
        .setRequired(true)
        .setMaxLength(500))
    .toJSON();

  commands.push(upRankCommand);

  // Down-Rank
  const downRankCommand = new SlashCommandBuilder()
    .setName('down-rank')
    .setDescription('Degradiert einen Mitarbeiter')
    .addUserOption(option =>
      option.setName('mitarbeiter')
        .setDescription('Der zu degradierende Mitarbeiter')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('alter_rang')
        .setDescription('Aktueller Rang des Mitarbeiters')
        .setRequired(true)
        .addChoices(...rankChoices))
    .addStringOption(option =>
      option.setName('neuer_rang')
        .setDescription('Neuer Rang nach Degradierung')
        .setRequired(true)
        .addChoices(...rankChoices))
    .addStringOption(option =>
      option.setName('grund')
        .setDescription('Grund der Degradierung')
        .setRequired(true)
        .setMaxLength(500))
    .toJSON();

  commands.push(downRankCommand);
  
  // SANKTION COMMANDS
  // Sanki Befehl
  const sankiCommand = new SlashCommandBuilder()
    .setName('sanki')
    .setDescription('Stellt eine Sanktion für einen User aus')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Der betroffene User')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('betrag')
        .setDescription('Betrag der Sanktion (z.B. 300.000)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('grund')
        .setDescription('Grund der Sanktion')
        .setRequired(true))
    .toJSON();
  
  commands.push(sankiCommand);
  
  // Bezahlt Befehl
  const bezahltCommand = new SlashCommandBuilder()
    .setName('bezahlt')
    .setDescription('Entfernt Sanktionen von einem User')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User, der bezahlt hat')
        .setRequired(true))
    .toJSON();
  
  commands.push(bezahltCommand);
  
  return commands;
}

// ===============================
// INTERACTION HANDLER
// ===============================

export async function handleUserInteraction(client, interaction) {
  const { commandName } = interaction;
  
  // KÜNDIGUNG HANDLER
  if (commandName === 'kündigung') {
    await handleKündigungInteraction(client, interaction);
  }
  // ABMELDUNG HANDLER
  else if (commandName === 'abmeldung') {
    await handleSelfAbmeldung(interaction);
  } else if (commandName === 'abmeldung_list') {
    await handleAbmeldungList(interaction);
  } else if (commandName === 'abmeldung-admin') {
    await handleAdminAbmeldung(interaction);
  } else if (commandName === 'abmeldung-verwaltung') {
    await handleAbmeldungVerwaltung(interaction);
  }
  // RANKS HANDLER
  else if (commandName === 'einstellung' || commandName === 'up-rank' || commandName === 'down-rank') {
    await handleRanksInteraction(interaction);
  }
  // SANKTION HANDLER
  else if (commandName === 'sanki' || commandName === 'bezahlt') {
    await handleSanktionCommands(interaction);
  }
}

// ===============================
// KÜNDIGUNG FUNKTIONEN
// ===============================

function buildKündigungEmbed({ user, von, grund, executorName }) {
  const date = getBerlinTime();

  return new EmbedBuilder()
    .setColor('#3b0000')
    .setTitle('Kündigung')
    .setThumbnail(LOGO_URL)
    .setDescription(
      `**Wer:** ${user}\n` +
      `**Von:** ${von}\n` +
      `**Grund:**\n${grund}\n\n` +
      `**Gekündigt am:** ${date}`
    )
    .setFooter({ 
      text: `Sakura-bot • Kündigung ausgeführt von ${executorName}`, 
      iconURL: LOGO_URL 
    })
    .setTimestamp();
}

async function handleKündigungInteraction(client, interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const hasPermission = interaction.member.roles.cache.some(role =>
      ALLOWED_ROLES.includes(role.id)
    );

    if (!hasPermission) {
      return interaction.editReply({
        content: '❌ Keine Berechtigung.'
      });
    }

    const targetUser = interaction.options.getUser('user');
    const von = interaction.options.getString('von');
    const grund = interaction.options.getString('grund');
    const executorName = interaction.member?.displayName || interaction.user.username;

    let guildMember;
    try {
      guildMember = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      console.error('Fehler beim Fetchen des Users:', error);
      return interaction.editReply({
        content: '❌ Der angegebene Benutzer wurde nicht gefunden oder ist nicht mehr auf dem Server.'
      });
    }

    try {
      const rolesToRemove = guildMember.roles.cache.filter(
        role => role.id !== interaction.guild.roles.everyone.id
      );

      if (rolesToRemove.size > 0) {
        await guildMember.roles.remove(rolesToRemove);
      }

      for (const roleId of FINAL_ROLES) {
        try {
          await guildMember.roles.add(roleId);
        } catch (roleError) {
          console.warn(`Konnte Rolle ${roleId} nicht hinzufügen:`, roleError.message);
        }
      }

      const embed = buildKündigungEmbed({
        user: `<@${targetUser.id}>`,
        von,
        grund,
        executorName
      });

      const channel = await client.channels.fetch(KÜNDIGUNG_CHANNEL_ID);
      await channel.send({ embeds: [embed] });

      return interaction.editReply({
        content: `✅ ${targetUser.username} wurde erfolgreich gekündigt.`
      });

    } catch (roleError) {
      console.error('Fehler bei Rollenänderung:', roleError);
      return interaction.editReply({
        content: '❌ Fehler bei der Rollenänderung. Die Kündigung wurde nicht vollständig durchgeführt.'
      });
    }

  } catch (err) {
    console.error('❌ Kündigung Fehler:', err);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: '❌ Fehler bei der Kündigung. Bitte überprüfe die Berechtigungen und versuche es erneut.'
      });
    } else {
      await interaction.reply({
        content: '❌ Fehler bei der Kündigung.',
        ephemeral: true
      });
    }
  }
}

// ===============================
// ABMELDUNG FUNKTIONEN
// ===============================

async function handleSelfAbmeldung(interaction) {
  await interaction.reply({ content: '🔄 Verarbeite deine Abmeldung...', flags: MessageFlags.Ephemeral });
  
  try {
    const zeitraum = interaction.options.getString('zeitraum');
    const grund = interaction.options.getString('grund');
    const displayName = interaction.member.nickname || interaction.user.globalName || interaction.user.username;
    const userId = interaction.user.id;
    
    console.log(`📝 Selbst-Abmeldung von ${displayName} (${userId}): "${zeitraum}"`);
    
    // Dummy-Funktion für vorhandene Abmeldungsprüfung (muss mit Datenbank implementiert werden)
    // const existingAbmeldung = await getActiveAbmeldung(userId);
    const existingAbmeldung = null; // Temporär
    
    if (existingAbmeldung) {
      const endDate = new Date(existingAbmeldung.end_date);
      const now = new Date();
      
      if (endDate > now) {
        const hoursLeft = Math.ceil((endDate - now) / (1000 * 60 * 60));
        return await interaction.editReply({
          content: `❌ **Du hast bereits eine aktive Abmeldung!**\n\n` +
                  `📅 **Bis:** ${formatDate(endDate)}\n` +
                  `⏳ **Noch:** ${hoursLeft} Stunde${hoursLeft !== 1 ? 'n' : ''}\n` +
                  `📝 **Grund:** ${existingAbmeldung.reason || 'Kein Grund'}\n\n` +
                  `Du kannst erst eine neue Abmeldung eintragen, wenn diese abgelaufen ist.`
        });
      }
    }
    
    const dates = validateAndParseDate(zeitraum);
    if (!dates) {
      return await interaction.editReply({
        content: '❌ **Ungültiger Zeitraum!**\n\n' +
                '**Gültige Formate:**\n' +
                '• `aufstellung` (genau 1 Tag - bis morgen gleiche Uhrzeit)\n' +
                '• `22.01.2026` (bis 22.01.2026 23:59)\n' +
                '• `20.01.2026-22.01.2026` (Zeitraum)\n' +
                '• `3 tage` (3 Tage ab jetzt)\n\n' +
                '**Wichtig:**\n' +
                '• `aufstellung` = genau 1 Tag\n' +
                '• Alle anderen Abmeldungen = mindestens 3 Tage\n\n' +
                '**Beispiele:**\n' +
                '• `/abmeldung zeitraum:aufstellung grund:Arbeit`\n' +
                '• `/abmeldung zeitraum:22.01.2026 grund:Urlaub`\n' +
                '• `/abmeldung zeitraum:3 tage grund:Krank`'
      });
    }
    
    let { startDate, endDate } = dates;
    const durationHours = calculateDurationHours(startDate, endDate);
    const durationDays = calculateDurationDays(startDate, endDate);
    
    console.log(`📊 Dauer berechnet: ${durationHours} Stunden (${durationDays} Tage)`);
    
    if (zeitraum.toLowerCase() === 'aufstellung') {
      if (durationHours < 23 || durationHours > 25) {
        return await interaction.editReply({
          content: `❌ **Aufstellung muss genau 1 Tag (24h) dauern!**\n\n` +
                  `Aktuelle Dauer: ${durationHours} Stunden\n` +
                  `Bei "aufstellung" endet die Abmeldung automatisch morgen um die gleiche Uhrzeit.\n` +
                  `Bitte verwende einfach: \`/abmeldung zeitraum:aufstellung grund:DeinGrund\``
        });
      }
    } else {
      if (durationHours < 72) {
        return await interaction.editReply({
          content: `❌ **Mindestdauer nicht erreicht!**\n\n` +
                  `Du möchtest dich für **${durationHours} Stunden** (${durationDays} Tage) abmelden.\n` +
                  `Reguläre Abmeldungen müssen **mindestens 3 Tage (72 Stunden)** dauern.\n\n` +
                  `**Ausnahme:** \`aufstellung\` (24 Stunden) ist erlaubt.\n` +
                  `**Beispiele für 3+ Tage:**\n` +
                  `• \`/abmeldung zeitraum:3 tage grund:Krank\`\n` +
                  `• \`/abmeldung zeitraum:23.01.2026 grund:Urlaub\` (wenn heute vor dem 20.01.)`
        });
      }
    }
    
    if (endDate < new Date()) {
      return await interaction.editReply({
        content: '❌ Das Enddatum liegt in der Vergangenheit! Bitte gib einen zukünftigen Zeitpunkt an.'
      });
    }
    
    // Füge Abmeldungsrolle hinzu
    try {
      await interaction.member.roles.add(ABMELDUNG_ROLE_ID);
    } catch (error) {
      console.error('❌ Fehler beim Hinzufügen der Abmeldungsrolle:', error);
      return await interaction.editReply({
        content: '❌ Fehler beim Hinzufügen der Abmeldungsrolle. Bitte kontaktiere die Leitung.'
      });
    }
    
    // Erstelle Embed für Abmeldung-Channel
    const channel = interaction.guild.channels.cache.get(ABMELDUNG_CHANNEL_ID);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor(LOG_COLORS.INFO)
        .setTitle('📋 OFFIZIELLE ABMELDUNG')
        .setDescription('Ein Mitglied hat sich offiziell abgemeldet.')
        .addFields(
          { name: '👤 Wer', value: displayName, inline: true },
          { name: '📅 Zeitraum', value: `${formatDate(startDate)} bis ${formatDate(endDate)}`, inline: false },
          { name: '⏱️ Dauer', value: `${durationHours} Stunden (${durationDays} Tage)`, inline: true },
          { name: '📝 Grund', value: grund, inline: false }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Sakura Abmeldungssystem', iconURL: LOGO_URL })
        .setTimestamp();
      
      await channel.send({ 
        content: `${interaction.user}`,
        embeds: [embed] 
      });
    }
    
    await interaction.editReply({
      content: `✅ **Abmeldung erfolgreich eingetragen!**\n\n` +
              `**Zusammenfassung:**\n` +
              `👤 **Wer:** ${displayName}\n` +
              `📅 **Start:** ${formatDate(startDate)}\n` +
              `📅 **Ende:** ${formatDate(endDate)}\n` +
              `⏱️ **Dauer:** ${durationHours} Stunden (${durationDays} Tage)\n` +
              `📝 **Grund:** ${grund}\n\n` +
              `Die Abmeldung wird automatisch am ${formatDate(endDate)} beendet.\n\n` +
              `**Du kannst erst eine neue Abmeldung eintragen, wenn diese abgelaufen ist.**`
    });
    
  } catch (error) {
    console.error('❌ Fehler bei Selbst-Abmeldung:', error);
    
    try {
      await interaction.editReply({
        content: '❌ Fehler bei der Abmeldung. Bitte kontaktiere die Leitung.'
      });
    } catch (editError) {
      console.error('❌ Konnte Antwort nicht bearbeiten:', editError);
    }
  }
}

async function handleAbmeldungList(interaction) {
  try {
    const hasRole = interaction.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasRole) {
      return await interaction.reply({ 
        content: '❌ **Keine Berechtigung!**\n\nNur autorisierte Rollen können die Abmeldungsliste einsehen.',
        flags: MessageFlags.Ephemeral
      });
    }
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    // Dummy-Daten für aktive Abmeldungen
    // const activeAbmeldungen = await getAllActiveAbmeldungen();
    const activeAbmeldungen = []; // Temporär
    
    if (activeAbmeldungen.length === 0) {
      return await interaction.editReply({
        content: '📭 **Keine aktiven Abmeldungen vorhanden.**\n\nEs sind momentan keine Mitglieder abgemeldet.'
      });
    }
    
    // Sortiere nach Enddatum
    activeAbmeldungen.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.INFO)
      .setTitle('📋 AKTIVE ABMELDUNGEN')
      .setDescription(`**${activeAbmeldungen.length}** aktive Abmeldung(en)`)
      .setFooter({ 
        text: `Angefordert von ${interaction.user.username} • ${new Date().toLocaleDateString('de-DE')}`, 
        iconURL: LOGO_URL 
      })
      .setTimestamp();
    
    let fieldCount = 0;
    let embedCount = 1;
    const embeds = [embed];
    
    for (const abmeldung of activeAbmeldungen) {
      const member = await interaction.guild.members.fetch(abmeldung.user_id).catch(() => null);
      const displayName = member ? (member.nickname || member.user.globalName || member.user.username) : abmeldung.user_name;
      
      const startDate = new Date(abmeldung.start_date);
      const endDate = new Date(abmeldung.end_date);
      const durationDays = calculateDurationDays(startDate, endDate);
      const remainingTime = formatRemainingTime(endDate);
      
      const newField = {
        name: `${fieldCount + 1}. ${displayName}`,
        value: `👤 **User:** ${member ? member.user.toString() : displayName}\n` +
               `📅 **Endet:** ${formatShortDate(endDate)}\n` +
               `⏱️ **Dauer:** ${durationDays} Tag${durationDays !== 1 ? 'e' : ''}\n` +
               `⏳ **Verbleibend:** ${remainingTime}\n` +
               `📝 **Grund:** ${abmeldung.reason?.slice(0, 80) || 'Kein Grund angegeben'}`,
        inline: false
      };
      
      if (fieldCount >= 5) {
        const newEmbed = new EmbedBuilder()
          .setColor(LOG_COLORS.INFO)
          .setTitle(`📋 AKTIVE ABMELDUNGEN (Fortsetzung ${embedCount + 1})`)
          .setFooter({ 
            text: `Seite ${embedCount + 1} • Sakura Abmeldungssystem`, 
            iconURL: LOGO_URL 
          })
          .setTimestamp();
        
        embeds.push(newEmbed);
        embedCount++;
        fieldCount = 0;
      }
      
      embeds[embeds.length - 1].addFields(newField);
      fieldCount++;
    }
    
    const summaryEmbed = embeds[embeds.length - 1];
    summaryEmbed.addFields({
      name: '📊 Zusammenfassung',
      value: `**Total:** ${activeAbmeldungen.length} Abmeldungen\n` +
             `**Nächste Beendigung:** ${formatRemainingTime(new Date(activeAbmeldungen[0]?.end_date))}\n` +
             `**Letzte Aktualisierung:** <t:${Math.floor(Date.now() / 1000)}:R>`,
      inline: false
    });
    
    await interaction.editReply({ 
      content: `✅ **Aktive Abmeldungen gefunden:** ${activeAbmeldungen.length}`,
      embeds: embeds 
    });
    
  } catch (error) {
    console.error('❌ Fehler bei /abmeldung_list:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Fehler beim Abrufen der Abmeldungsliste.'
      });
    } else {
      await interaction.reply({
        content: '❌ Fehler beim Abrufen der Abmeldungsliste.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleAdminAbmeldung(interaction) {
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const user = interaction.options.getUser('user');
    const zeitraum = interaction.options.getString('zeitraum');
    const grund = interaction.options.getString('grund');
    const targetMember = await interaction.guild.members.fetch(user.id);
    const displayName = targetMember.nickname || user.globalName || user.username;
    const adminName = interaction.member.nickname || interaction.user.globalName || interaction.user.username;
    
    console.log(`👨‍💼 Admin ${adminName} meldet ${displayName} ab: "${zeitraum}"`);
    
    // Dummy-Funktion für vorhandene Abmeldungsprüfung
    // const existingAbmeldung = await getActiveAbmeldung(user.id);
    const existingAbmeldung = null; // Temporär
    
    if (existingAbmeldung) {
      const endDate = new Date(existingAbmeldung.end_date);
      return await interaction.editReply({
        content: `❌ ${displayName} hat bereits eine aktive Abmeldung!\n📅 **Bis:** ${formatDate(endDate)}\n⏳ **Noch:** ${calculateDurationDays(new Date(), endDate)} Tage`
      });
    }
    
    const dates = validateAndParseDate(zeitraum);
    if (!dates) {
      return await interaction.editReply({
        content: '❌ **Ungültiger Zeitraum!**\n\n' +
                '**Gültige Formate:**\n' +
                '• `aufstellung` (bis morgen gleiche Uhrzeit - 1 Tag)\n' +
                '• `22.01.2026` (einzelnes Enddatum)\n' +
                '• `20.01.2026-22.01.2026` (Zeitraum)\n' +
                '• `3 tage` (relative Tage)'
      });
    }
    
    const { startDate, endDate } = dates;
    const durationHours = calculateDurationHours(startDate, endDate);
    const durationDays = calculateDurationDays(startDate, endDate);
    
    if (zeitraum.toLowerCase() === 'aufstellung') {
      if (durationHours < 23 || durationHours > 25) {
        return await interaction.editReply({
          content: `❌ **Aufstellung muss genau 1 Tag (24h) dauern!**\n\n` +
                  `Aktuelle Dauer: ${durationHours} Stunden\n` +
                  `Bei "aufstellung" endet die Abmeldung automatisch morgen um die gleiche Uhrzeit.`
        });
      }
    } else {
      if (durationHours < 72) {
        return await interaction.editReply({
          content: `❌ **Mindestdauer nicht erreicht!**\n\n` +
                  `Die Abmeldung würde nur **${durationHours} Stunden** (${durationDays} Tage) dauern.\n` +
                  `Reguläre Abmeldungen müssen **mindestens 3 Tage (72 Stunden)** dauern.\n\n` +
                  `**Ausnahme:** \`aufstellung\` (24 Stunden) ist erlaubt.`
        });
      }
    }
    
    try {
      await targetMember.roles.add(ABMELDUNG_ROLE_ID);
    } catch (error) {
      console.error('❌ Fehler beim Hinzufügen der Abmeldungsrolle:', error);
      return await interaction.editReply({
        content: '❌ Fehler beim Hinzufügen der Abmeldungsrolle.'
      });
    }
    
    const channel = interaction.guild.channels.cache.get(ABMELDUNG_CHANNEL_ID);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor(LOG_COLORS.WARNING)
        .setTitle('📋 ADMIN ABMELDUNG')
        .setDescription('Ein Admin hat ein Mitglied abgemeldet.')
        .addFields(
          { name: '👤 Wer', value: displayName, inline: true },
          { name: '👨‍💼 Durchgeführt von', value: adminName, inline: true },
          { name: '📅 Zeitraum', value: `${formatDate(startDate)} bis ${formatDate(endDate)}`, inline: false },
          { name: '⏱️ Dauer', value: `${durationHours} Stunden (${durationDays} Tage)`, inline: true },
          { name: '📝 Grund', value: grund, inline: false }
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Sakura Abmeldungssystem', iconURL: LOGO_URL })
        .setTimestamp();
      
      await channel.send({ 
        content: `${user}`,
        embeds: [embed] 
      });
    }
    
    await interaction.editReply({
      content: `✅ **${displayName} erfolgreich abgemeldet!**\n\n` +
              `**Zusammenfassung:**\n` +
              `👤 **Wer:** ${displayName}\n` +
              `📅 **Start:** ${formatDate(startDate)}\n` +
              `📅 **Ende:** ${formatDate(endDate)}\n` +
              `⏱️ **Dauer:** ${durationHours} Stunden (${durationDays} Tage)\n` +
              `📝 **Grund:** ${grund}\n` +
              `👨‍💼 **Durchgeführt von:** ${adminName}\n\n` +
              `Die Abmeldung wird automatisch am ${formatDate(endDate)} beendet.`
    });
    
  } catch (error) {
    console.error('❌ Fehler bei Admin-Abmeldung:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({
        content: '❌ Fehler bei der Abmeldung.'
      });
    } else {
      await interaction.reply({
        content: '❌ Fehler bei der Abmeldung.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleAbmeldungVerwaltung(interaction) {
  const subcommand = interaction.options.getSubcommand();
  
  try {
    switch (subcommand) {
      case 'liste':
        await handleListeCommand(interaction);
        break;
        
      case 'entfernen':
        await handleEntfernenCommand(interaction);
        break;
        
      case 'info':
        await handleInfoCommand(interaction);
        break;
    }
  } catch (error) {
    console.error(`❌ Fehler bei /abmeldung-verwaltung ${subcommand}:`, error);
    await interaction.reply({
      content: '❌ Fehler beim Ausführen des Befehls.',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function handleListeCommand(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  // Dummy-Daten
  // const activeAbmeldungen = await getAllActiveAbmeldungen();
  const activeAbmeldungen = []; // Temporär
  
  if (activeAbmeldungen.length === 0) {
    return await interaction.editReply({
      content: '📭 Keine aktiven Abmeldungen vorhanden.'
    });
  }
  
  const embed = new EmbedBuilder()
    .setColor(LOG_COLORS.INFO)
    .setTitle('📋 AKTIVE ABMELDUNGEN (Admin-View)')
    .setDescription(`**${activeAbmeldungen.length}** aktive Abmeldung(en)`)
    .setFooter({ text: 'Sakura Abmeldungs-Verwaltung', iconURL: LOGO_URL })
    .setTimestamp();
  
  let fieldCount = 0;
  let embedCount = 1;
  const embeds = [embed];
  
  for (const abmeldung of activeAbmeldungen) {
    const member = await interaction.guild.members.fetch(abmeldung.user_id).catch(() => null);
    const displayName = member ? (member.nickname || member.user.globalName || member.user.username) : abmeldung.user_name;
    
    const startDate = new Date(abmeldung.start_date);
    const endDate = new Date(abmeldung.end_date);
    const durationDays = calculateDurationDays(startDate, endDate);
    const daysLeft = calculateDurationDays(new Date(), endDate);
    
    const newField = {
      name: `${fieldCount + 1}. ${displayName}`,
      value: `📅 **Zeitraum:** ${formatDate(startDate)} bis ${formatDate(endDate)}\n` +
             `⏱️ **Dauer:** ${durationDays} Tage\n` +
             `⏳ **Noch:** ${daysLeft} Tage\n` +
             `📝 **Grund:** ${abmeldung.reason?.slice(0, 100) || 'Kein Grund'}`,
      inline: false
    };
    
    if (fieldCount >= 5) {
      const newEmbed = new EmbedBuilder()
        .setColor(LOG_COLORS.INFO)
        .setTitle(`📋 AKTIVE ABMELDUNGEN (Fortsetzung ${embedCount + 1})`)
        .setFooter({ text: 'Sakura Abmeldungs-Verwaltung', iconURL: LOGO_URL })
        .setTimestamp();
      
      embeds.push(newEmbed);
      embedCount++;
      fieldCount = 0;
    }
    
    embeds[embeds.length - 1].addFields(newField);
    fieldCount++;
  }
  
  await interaction.editReply({ embeds: embeds });
}

async function handleEntfernenCommand(interaction) {
  const user = interaction.options.getUser('user');
  await interaction.deferReply();
  
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    return await interaction.editReply({
      content: '❌ Benutzer nicht gefunden!'
    });
  }
  
  const displayName = member.nickname || user.globalName || user.username;
  
  // Dummy-Funktion
  // const activeAbmeldung = await getActiveAbmeldung(user.id);
  const activeAbmeldung = null; // Temporär
  
  if (!activeAbmeldung) {
    const hasRole = member.roles.cache.has(ABMELDUNG_ROLE_ID);
    
    if (hasRole) {
      await member.roles.remove(ABMELDUNG_ROLE_ID);
      return await interaction.editReply({
        content: `ℹ️ ${displayName} hatte keine aktive Abmeldung im System, aber die Abmeldungs-Rolle wurde entfernt.`
      });
    }
    
    return await interaction.editReply({
      content: `❌ ${displayName} hat keine aktive Abmeldung.`
    });
  }
  
  try {
    await member.roles.remove(ABMELDUNG_ROLE_ID);
  } catch (error) {
    console.error('❌ Fehler beim Entfernen der Rolle:', error);
    return await interaction.editReply({
      content: '❌ Fehler beim Entfernen der Abmeldungsrolle.'
    });
  }
  
  // Führungsbenachrichtigung senden
  try {
    const channel = interaction.guild.channels.cache.get(FUHRUNG_CHANNEL_ID);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor(LOG_COLORS.SUCCESS)
        .setTitle('✅ Abmeldung beendet')
        .setDescription(`${displayName} ist wieder verfügbar!`)
        .addFields(
          { name: '👤 Mitglied', value: `${member.user}`, inline: true },
          { name: '📅 Zeitraum', value: `${formatDate(new Date(activeAbmeldung.start_date))} bis ${formatDate(new Date(activeAbmeldung.end_date))}`, inline: false },
          { name: '⏱️ Dauer', value: `${calculateDurationDays(new Date(activeAbmeldung.start_date), new Date(activeAbmeldung.end_date))} Tage`, inline: true },
          { name: '🕒 Beendet', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'Sakura Abmeldungssystem', iconURL: LOGO_URL })
        .setTimestamp();
      
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('❌ Fehler beim Senden der Benachrichtigung:', error);
  }
  
  const embed = new EmbedBuilder()
    .setColor(LOG_COLORS.SUCCESS)
    .setTitle('✅ ABMELDUNG ENTFERNT')
    .setDescription(`Die Abmeldung von **${displayName}** wurde manuell entfernt.`)
    .addFields(
      { name: '👤 User', value: displayName, inline: true },
      { name: '👨‍💼 Ausgeführt von', value: interaction.member.nickname || interaction.user.globalName || interaction.user.username, inline: true },
      { name: '📅 Ursprüngliches Ende', value: formatDate(new Date(activeAbmeldung.end_date)), inline: false },
      { name: '📝 Grund war', value: activeAbmeldung.reason || 'Kein Grund', inline: false }
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Sakura Abmeldungs-Verwaltung', iconURL: LOGO_URL })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

async function handleInfoCommand(interaction) {
  const user = interaction.options.getUser('user');
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  const displayName = member ? (member.nickname || user.globalName || user.username) : user.username;
  
  // Dummy-Funktion
  // const activeAbmeldung = await getActiveAbmeldung(user.id);
  const activeAbmeldung = null; // Temporär
  
  if (!activeAbmeldung) {
    const hasRole = member?.roles.cache.has(ABMELDUNG_ROLE_ID);
    
    if (hasRole) {
      return await interaction.editReply({
        content: `ℹ️ ${displayName} hat die Abmeldungs-Rolle, aber keine aktive Abmeldung im System.\n` +
                `Möglicherweise wurde die Abmeldung manuell hinzugefügt.`
      });
    }
    
    return await interaction.editReply({
      content: `❌ ${displayName} hat keine aktive Abmeldung.`
    });
  }
  
  const startDate = new Date(activeAbmeldung.start_date);
  const endDate = new Date(activeAbmeldung.end_date);
  const durationDays = calculateDurationDays(startDate, endDate);
  const daysLeft = calculateDurationDays(new Date(), endDate);
  const hasRole = member?.roles.cache.has(ABMELDUNG_ROLE_ID);
  
  const embed = new EmbedBuilder()
    .setColor(hasRole ? LOG_COLORS.INFO : LOG_COLORS.WARNING)
    .setTitle('ℹ️ ABMELDUNGS-INFO')
    .setDescription(`Informationen zur Abmeldung von **${displayName}**`)
    .addFields(
      { name: '👤 User', value: displayName, inline: true },
      { name: '🎭 Rolle', value: hasRole ? '✅ Vorhanden' : '❌ Fehlt', inline: true },
      { name: '📅 Start', value: formatDate(startDate), inline: false },
      { name: '📅 Geplantes Ende', value: formatDate(endDate), inline: false },
      { name: '⏱️ Geplante Dauer', value: `${durationDays} Tage`, inline: true },
      { name: '⏳ Noch übrig', value: `${daysLeft} Tage`, inline: true },
      { name: '📝 Grund', value: activeAbmeldung.reason || 'Kein Grund', inline: false },
      { name: '📊 Status', value: activeAbmeldung.status === 'active' ? '🟢 Aktiv' : '🔴 Abgeschlossen', inline: true }
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: 'Sakura Abmeldungs-Verwaltung', iconURL: LOGO_URL })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

// ===============================
// RANKS FUNKTIONEN
// ===============================

function buildRanksEmbed(type, data) {
  const colors = {
    'einstellung': '#3498db',
    'up-rank': '#27ae60',
    'down-rank': '#e74c3c'
  };

  const titles = {
    'einstellung': 'NEUEINSTELLUNG',
    'up-rank': 'BEFÖRDERUNG',
    'down-rank': 'DEGRADIERUNG'
  };

  const embed = new EmbedBuilder()
    .setColor(colors[type])
    .setTitle(titles[type])
    .setThumbnail(LOGO_URL)
    .setFooter({ text: 'Sakura Personalwesen', iconURL: LOGO_URL })
    .setTimestamp();

  switch (type) {
    case 'einstellung':
      embed.setDescription(
        `**Mitarbeiter:** ${data.name}\n` +
        `**Rang:** ${data.rang}\n` +
        `**Grund:** ${data.grund}\n\n` +
        `**Ausführender:** ${data.ausführender}\n` +
        `**Datum:** ${getBerlinTime()}`
      );
      break;

    case 'up-rank':
    case 'down-rank':
      embed.setDescription(
        `**Mitarbeiter:** ${data.name}\n` +
        `**Alter Rang:** ${data.alterRang}\n` +
        `**Neuer Rang:** ${data.neuerRang}\n` +
        `**Grund:** ${data.grund}\n\n` +
        `**Ausführender:** ${data.ausführender}\n` +
        `**Datum:** ${getBerlinTime()}`
      );
      break;
  }

  return embed;
}

async function validateUserAndRoles(interaction) {
  const hasPermission = interaction.member.roles.cache.some(r => 
    ALLOWED_ROLES.includes(r.id)
  );
  
  if (!hasPermission) {
    await interaction.reply({ 
      content: '❌ Du hast keine Berechtigung für diesen Befehl.', 
      ephemeral: true 
    });
    return false;
  }

  return true;
}

async function getValidatedMember(interaction, userId) {
  try {
    const member = await interaction.guild.members.fetch(userId);
    return member;
  } catch (error) {
    if (error.code === 10007) {
      await interaction.editReply({ 
        content: '❌ Dieser Benutzer ist nicht auf diesem Server.' 
      });
    } else {
      await interaction.editReply({ 
        content: '❌ Fehler beim Abrufen des Benutzers.' 
      });
    }
    return null;
  }
}

async function removeSpecificRoleIfPresent(guildMember) {
  try {
    const hasSpecificRole = guildMember.roles.cache.has(SPECIFIC_ROLE_TO_REMOVE);
    
    if (hasSpecificRole) {
      await guildMember.roles.remove(SPECIFIC_ROLE_TO_REMOVE);
      console.log(`✅ Spezifische Rolle ${SPECIFIC_ROLE_TO_REMOVE} wurde von ${guildMember.user.tag} entfernt.`);
      return { removed: true, roleId: SPECIFIC_ROLE_TO_REMOVE };
    } else {
      console.log(`ℹ️  ${guildMember.user.tag} hat die spezifische Rolle ${SPECIFIC_ROLE_TO_REMOVE} nicht. Wird übersprungen.`);
      return { removed: false, roleId: SPECIFIC_ROLE_TO_REMOVE };
    }
  } catch (error) {
    console.warn(`⚠️  Konnte spezifische Rolle ${SPECIFIC_ROLE_TO_REMOVE} nicht prüfen/entfernen:`, error.message);
    return { removed: false, roleId: SPECIFIC_ROLE_TO_REMOVE, error: error.message };
  }
}

async function addAutomaticAdditionalRoles(guildMember, mainRoleId) {
  try {
    const additionalRoles = AUTOMATIC_ADDITIONAL_ROLES[mainRoleId];
    
    if (!additionalRoles || additionalRoles.length === 0) {
      return { success: true, added: [], skipped: [] };
    }

    const addedRoles = [];
    const skippedRoles = [];

    for (const roleId of additionalRoles) {
      try {
        if (!guildMember.roles.cache.has(roleId)) {
          await guildMember.roles.add(roleId);
          addedRoles.push(roleId);
          console.log(`✅ Automatische Zusatzrolle ${roleId} hinzugefügt für ${guildMember.user.tag}`);
        } else {
          skippedRoles.push({ roleId, reason: 'already has role' });
        }
      } catch (error) {
        console.warn(`⚠️ Konnte automatische Zusatzrolle ${roleId} nicht hinzufügen:`, error.message);
        skippedRoles.push({ roleId, error: error.message });
      }
    }
    
    return { success: true, added: addedRoles, skipped: skippedRoles };
  } catch (error) {
    console.error('Fehler beim Hinzufügen automatischer Zusatzrollen:', error);
    return { success: false, error: error.message };
  }
}

async function addEinstellungRoles(guildMember) {
  try {
    const results = [];
    
    for (const roleId of ADDITIONAL_EINSTELLUNG_ROLES) {
      try {
        if (!guildMember.roles.cache.has(roleId)) {
          await guildMember.roles.add(roleId);
          results.push({ roleId, added: true });
        } else {
          results.push({ roleId, added: false, reason: 'already has role' });
        }
      } catch (error) {
        console.warn(`Konnte Rolle ${roleId} nicht hinzufügen:`, error.message);
        results.push({ roleId, added: false, error: error.message });
      }
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Einstellungsrollen:', error);
    return { success: false, error: error.message };
  }
}

async function sendRankEmbed(interaction, type, data, userId) {
  try {
    if (type === 'einstellung') {
      return true;
    }

    const channel = await interaction.client.channels.fetch(RANKS_CHANNEL_ID);
    const embed = buildRanksEmbed(type, data);
    
    await channel.send({ 
      content: `<@${userId}>`, 
      embeds: [embed] 
    });
    
    return true;
  } catch (error) {
    console.error('Fehler beim Senden des Embeds:', error);
    return false;
  }
}

async function sendEinstellungLog(interaction, data, userId) {
  try {
    const channel = await interaction.client.channels.fetch(EINSTELLUNG_LOG_CHANNEL_ID);
    if (!channel) return false;

    const embed = buildRanksEmbed('einstellung', data);
    await channel.send({
      content: `<@${userId}>`,
      embeds: [embed]
    });

    return true;
  } catch (error) {
    console.error('Fehler beim Senden des Einstellungs-Logs:', error);
    return false;
  }
}

async function handleRanksInteraction(interaction) {
  try {
    if (!await validateUserAndRoles(interaction)) return;

    await interaction.deferReply({ ephemeral: true });

    const commandName = interaction.commandName;
    const mitarbeiter = interaction.options.getUser('mitarbeiter');
    const ausführender = `<@${interaction.user.id}>`;

    if (mitarbeiter.id === interaction.user.id) {
      return await interaction.editReply({ 
        content: '❌ Du kannst dich nicht selbst bearbeiten.' 
      });
    }

    const guildMember = await getValidatedMember(interaction, mitarbeiter.id);
    if (!guildMember) return;

    switch (commandName) {
      case 'einstellung':
        await handleEinstellungRank(interaction, guildMember, ausführender);
        break;

      case 'up-rank':
        await handleRankChange(interaction, guildMember, ausführender, 'up-rank');
        break;

      case 'down-rank':
        await handleRankChange(interaction, guildMember, ausführender, 'down-rank');
        break;
    }

  } catch (error) {
    console.error('Unerwarteter Fehler im Ranks-Command:', error);
    
    if (interaction.deferred) {
      await interaction.editReply({ 
        content: '❌ Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.' 
      });
    } else {
      await interaction.reply({ 
        content: '❌ Ein unerwarteter Fehler ist aufgetreten.', 
        ephemeral: true 
      });
    }
  }
}

async function handleEinstellungRank(interaction, guildMember, ausführender) {
  const rang = interaction.options.getString('rang');
  const grund = interaction.options.getString('grund');

  try {
    const roleRemovalResult = await removeSpecificRoleIfPresent(guildMember);
    
    let removalMessage = '';
    if (roleRemovalResult.removed) {
      removalMessage = ` (Bewerber-Rolle entfernt)`;
    } else {
      removalMessage = ` (Bewerber-Rolle war nicht vorhanden)`;
    }

    const roleId = ROLE_MAPPING[rang];
    if (roleId) {
      await guildMember.roles.add(roleId);
      
      const autoRolesResult = await addAutomaticAdditionalRoles(guildMember, roleId);
      if (autoRolesResult.added.length > 0) {
        removalMessage += ` (+${autoRolesResult.added.length} automatische Zusatzrolle(n))`;
      }
    }

    const addRolesResult = await addEinstellungRoles(guildMember);

    const embedData = {
      name: `<@${guildMember.id}>`,
      rang,
      grund,
      ausführender
    };

    const embedSent = await sendRankEmbed(interaction, 'einstellung', embedData, guildMember.id);
    await sendEinstellungLog(interaction, embedData, guildMember.id);
    
    if (embedSent) {
      await interaction.editReply({ 
        content: `✅ ${guildMember.user.tag} wurde als ${rang} eingestellt.${removalMessage}` 
      });
    } else {
      await interaction.editReply({ 
        content: `✅ ${guildMember.user.tag} wurde als ${rang} eingestellt${removalMessage}, aber das Embed konnte nicht gesendet werden.` 
      });
    }

  } catch (error) {
    console.error('Fehler bei Einstellung:', error);
    await interaction.editReply({ 
      content: '❌ Fehler bei der Einstellung. Bitte überprüfe die Bot-Berechtigungen.' 
    });
  }
}

async function handleRankChange(interaction, guildMember, ausführender, type) {
  const alterRang = interaction.options.getString('alter_rang');
  const neuerRang = interaction.options.getString('neuer_rang');
  const grund = interaction.options.getString('grund');

  if (alterRang === neuerRang) {
    return await interaction.editReply({ 
      content: '❌ Alter und neuer Rang können nicht identisch sein.' 
    });
  }

  const oldRoleId = ROLE_MAPPING[alterRang];
  const hasOldRole = oldRoleId && guildMember.roles.cache.has(oldRoleId);
  
  if (!hasOldRole) {
    return await interaction.editReply({ 
      content: `❌ ${guildMember.user.tag} hat nicht den Rang "${alterRang}".` 
    });
  }

  try {
    await guildMember.roles.remove(oldRoleId);
    
    const newRoleId = ROLE_MAPPING[neuerRang];
    if (newRoleId) {
      await guildMember.roles.add(newRoleId);
      await addAutomaticAdditionalRoles(guildMember, newRoleId);
    }

    const embedData = {
      name: `<@${guildMember.id}>`,
      alterRang,
      neuerRang,
      grund,
      ausführender
    };

    const actionText = type === 'up-rank' ? 'befördert' : 'degradiert';
    const embedSent = await sendRankEmbed(interaction, type, embedData, guildMember.id);
    
    let extraMessage = '';
    if (newRoleId === '1096402401407279149') {
      extraMessage = ' (Automatisch: Zusatzrolle 1097403678715031612 wurde hinzugefügt)';
    }
    
    if (embedSent) {
      await interaction.editReply({ 
        content: `✅ ${guildMember.user.tag} wurde von ${alterRang} zu ${neuerRang} ${actionText}.${extraMessage}` 
      });
    } else {
      await interaction.editReply({ 
        content: `⚠️ ${guildMember.user.tag} wurde ${actionText}, aber das Embed konnte nicht gesendet werden.${extraMessage}` 
      });
    }

  } catch (error) {
    console.error(`Fehler bei ${type}:`, error);
    await interaction.editReply({ 
      content: `❌ Fehler bei der ${type === 'up-rank' ? 'Beförderung' : 'Degradierung'}.` 
    });
  }
}

// ===============================
// SANKTION FUNKTIONEN
// ===============================

function buildSanktionEmbed({ betrag, grund, userMention, datum }) {
  return new EmbedBuilder()
    .setColor('#3b0000')
    .setTitle('🚨 Sanktion')
    .setThumbnail(LOGO_URL)
    .setDescription(
      `💰 **Betrag:** ${betrag} $\n` +
      `📄 **Grund:** ${grund}\n` +
      `👤 **Betroffener:** ${userMention}\n` +
      `📅 **Datum:** ${datum}\n\n` +
      `⏳ **Zahlungsfrist:** bis in **5 Tagen**`
    )
    .setFooter({ text: 'Sakura-bot', iconURL: LOGO_URL })
    .setTimestamp();
}

function buildBezahltEmbed({ userMention, bearbeiter }) {
  return new EmbedBuilder()
    .setColor('#00ff00')
    .setTitle('✅ Sanktion bezahlt')
    .setThumbnail(LOGO_URL)
    .setDescription(
      `👤 **User:** ${userMention}\n` +
      `🛠️ **Bearbeiter:** ${bearbeiter}`
    )
    .setFooter({ text: 'Sakura-bot', iconURL: LOGO_URL })
    .setTimestamp();
}

async function handleSanktionCommands(interaction) {
  if (interaction.commandName === 'sanki') {
    await handleSankiInteraction(interaction);
  } else if (interaction.commandName === 'bezahlt') {
    await handleBezahltInteraction(interaction);
  }
}

async function handleSankiInteraction(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const hasRole = interaction.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasRole) {
      return await interaction.editReply({ content: '❌ Du hast keine Berechtigung für diesen Befehl.' });
    }

    const user = interaction.options.getUser('user');
    const betrag = interaction.options.getString('betrag');
    const grund = interaction.options.getString('grund');
    
    const heute = new Date();
    const datum = heute.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const guild = interaction.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    
    if (!member) {
      return await interaction.editReply({ content: '❌ User nicht auf dem Server gefunden.' });
    }

    const embed = buildSanktionEmbed({
      betrag,
      grund,
      userMention: `<@${user.id}>`,
      datum
    });

    const channel = await interaction.client.channels.fetch(SANKTION_CHANNEL_ID);
    await channel.send({ 
      content: `<@${user.id}>`,
      embeds: [embed] 
    });

    return await interaction.editReply({ 
      content: `✅ Sanktion wurde erfolgreich erstellt.` 
    });

  } catch (err) {
    console.error('Fehler im Sanktion-Command:', err);
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Es ist ein Fehler aufgetreten.' });
      } else {
        await interaction.reply({ content: '❌ Es ist ein Fehler aufgetreten.', ephemeral: true });
      }
    } catch (e) {
      console.error('Konnte Fehler nicht senden:', e);
    }
  }
}

async function handleBezahltInteraction(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const hasRole = interaction.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasRole) {
      return await interaction.editReply({ content: '❌ Du hast keine Berechtigung für diesen Befehl.' });
    }

    const user = interaction.options.getUser('user');
    
    try {
      const channel = await interaction.client.channels.fetch(SANKTION_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 100 });
      
      const sanktionsMessages = messages.filter(msg => 
        msg.embeds.length > 0 &&
        msg.embeds[0].description &&
        msg.embeds[0].description.includes(`<@${user.id}>`) &&
        (msg.embeds[0].title.includes('Sanktion') || msg.embeds[0].title.includes('🚨'))
      );
      
      let deletedCount = 0;
      for (const message of sanktionsMessages.values()) {
        try {
          await message.delete();
          deletedCount++;
        } catch (deleteError) {
          console.error('Fehler beim Löschen einer Nachricht:', deleteError);
        }
      }
      
      console.log(`🗑️ ${deletedCount} Sanktionsnachrichten für ${user.tag} gelöscht`);
      
      if (deletedCount === 0) {
        return await interaction.editReply({ 
          content: 'ℹ️ Es wurden keine Sanktionsnachrichten für diesen User gefunden.' 
        });
      }
      
    } catch (deleteError) {
      console.error('Fehler beim Löschen der Sanktionsnachrichten:', deleteError);
      return await interaction.editReply({ 
        content: '❌ Es gab einen Fehler beim Löschen der Sanktionsnachrichten.' 
      });
    }

    const embed = buildBezahltEmbed({
      userMention: `<@${user.id}>`,
      bearbeiter: `<@${interaction.user.id}>`
    });

    try {
      const channel = await interaction.client.channels.fetch(SANKTION_CHANNEL_ID);
      await channel.send({ embeds: [embed] });
    } catch (postError) {
      console.error('Fehler beim Posten der Bezahl-Bestätigung:', postError);
    }

    return await interaction.editReply({ 
      content: `✅ Sanktionsnachrichten wurden erfolgreich gelöscht und Bezahlung bestätigt.` 
    });

  } catch (err) {
    console.error('Fehler im Bezahlt-Command:', err);
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ Es ist ein Fehler aufgetreten.' });
      } else {
        await interaction.reply({ content: '❌ Es ist ein Fehler aufgetreten.', ephemeral: true });
      }
    } catch (e) {
      console.error('Konnte Fehler nicht senden:', e);
    }
  }
}

// ===============================
// INITIALISIERUNG
// ===============================

export async function initAbmeldungSystem(client) {
  try {
    console.log('🚀 Starte Abmeldungssystem...');
    
    // Starte regelmäßige Überprüfung nach 10 Sekunden
    setTimeout(() => {
      checkAbmeldungen(client);
    }, 10000);
    
    console.log('✅ Abmeldungssystem initialisiert');
    
  } catch (error) {
    console.error('❌ Fehler bei der Initialisierung des Abmeldungssystems:', error);
  }
}

async function checkAbmeldungen(client) {
  try {
    console.log('🔍 Prüfe aktive Abmeldungen...');
    
    // Hier würde die Datenbankabfrage stattfinden
    // const activeAbmeldungen = await getAllActiveAbmeldungen();
    const activeAbmeldungen = []; // Temporär
    
    console.log(`📊 ${activeAbmeldungen.length} aktive Abmeldungen gefunden`);
    
    for (const abmeldung of activeAbmeldungen) {
      const endDate = new Date(abmeldung.end_date);
      
      if (endDate < new Date()) {
        console.log(`⏰ Abmeldung abgelaufen für User: ${abmeldung.user_name}`);
        
        const guild = client.guilds.cache.get(process.env.GUILD_ID || '1096402401382109237');
        if (!guild) continue;
        
        const member = await guild.members.fetch(abmeldung.user_id).catch(() => null);
        if (!member) continue;
        
        try {
          await member.roles.remove(ABMELDUNG_ROLE_ID);
        } catch (error) {
          console.error('❌ Fehler beim Entfernen der Abmeldungsrolle:', error);
        }
        
        console.log(`✅ Abmeldung automatisch beendet`);
      }
    }
    
    setTimeout(() => checkAbmeldungen(client), 5 * 60 * 1000);
    
  } catch (error) {
    console.error('❌ Fehler beim Überprüfen der Abmeldungen:', error);
    setTimeout(() => checkAbmeldungen(client), 5 * 60 * 1000);
  }
}