// Sakura Bot – functions/ranks.js
// /einstellung, /up-rank, /down-rank – Vereinfachtes Rang-System
// ===============================

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// KONSTANTEN
const RANKS_CHANNEL_ID = '1096402402107727943';
const LOGO_URL = 'https://i.postimg.cc/1381yM8G/grafik.png';

const ALLOWED_ROLES = [
  '1096402401407279152',
  '1096402401382109245',
  '1427766432414044160',
  '1096402401407279150',
  '1097403678715031612',
  '1360267078321311836',
  '1136028969481797743',
  '1096402401407279149'
];

// SPEZIFISCHE ROLLE ZUM ENTFERNEN BEI EINSTELLUNG (NUR DIESE!)
const SPECIFIC_ROLE_TO_REMOVE = '1114997406669475850'; // Die spezifische Bewerber-Rolle

// ROLLEN-MAPPING
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

// AUTOMATISCHE ZUSATZROLLEN (WENN HAUPTROLLE, DANN AUCH DIESE)
const AUTOMATIC_ADDITIONAL_ROLES = {
  '1096402401407279149': ['1097403678715031612'], // Wenn Ausbilder, dann auch 1097403678715031612
};

// ZUSÄTZLICHE ROLLEN BEI EINSTELLUNG
const ADDITIONAL_EINSTELLUNG_ROLES = [
  '1096402401382109246',
  '1096402401382109244',
  '1096413941690810379',
  '1097402977670680588',
  '1096402401382109239'
];

// HELPER: SPEZIFISCHE ROLLE ENTFERNEN NUR WENN VORHANDEN
async function removeSpecificRoleIfPresent(guildMember) {
  try {
    // PRÜFEN ob der User die spezifische Rolle hat
    const hasSpecificRole = guildMember.roles.cache.has(SPECIFIC_ROLE_TO_REMOVE);
    
    if (hasSpecificRole) {
      // Wenn JA: Rolle entfernen
      await guildMember.roles.remove(SPECIFIC_ROLE_TO_REMOVE);
      console.log(`✅ Spezifische Rolle ${SPECIFIC_ROLE_TO_REMOVE} wurde von ${guildMember.user.tag} entfernt.`);
      return { removed: true, roleId: SPECIFIC_ROLE_TO_REMOVE };
    } else {
      // Wenn NEIN: Skip und weiter
      console.log(`ℹ️  ${guildMember.user.tag} hat die spezifische Rolle ${SPECIFIC_ROLE_TO_REMOVE} nicht. Wird übersprungen.`);
      return { removed: false, roleId: SPECIFIC_ROLE_TO_REMOVE };
    }
  } catch (error) {
    console.warn(`⚠️  Konnte spezifische Rolle ${SPECIFIC_ROLE_TO_REMOVE} nicht prüfen/entfernen:`, error.message);
    return { removed: false, roleId: SPECIFIC_ROLE_TO_REMOVE, error: error.message };
  }
}

// NEUE FUNKTION: Automatische Zusatzrollen hinzufügen
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
        // Prüfen ob User die Rolle bereits hat
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

// HELPER-FUNKTIONEN
function getBerlinTime() {
  return new Date().toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function buildEmbed(type, data) {
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
  // Berechtigung prüfen
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

async function addEinstellungRoles(guildMember) {
  try {
    const results = [];
    
    for (const roleId of ADDITIONAL_EINSTELLUNG_ROLES) {
      try {
        // Prüfen ob User die Rolle bereits hat (optional)
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
    const channel = await interaction.client.channels.fetch(RANKS_CHANNEL_ID);
    const embed = buildEmbed(type, data);
    
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

// COMMAND REGISTRIERUNG
export function registerRanksCommands() {
  // Rang-Auswahl für alle Commands
  const rankChoices = Object.keys(ROLE_MAPPING).map(rank => ({
    name: rank,
    value: rank
  }));

  const commands = [
    new SlashCommandBuilder()
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
          .setMaxLength(500)),

    new SlashCommandBuilder()
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
          .setMaxLength(500)),

    new SlashCommandBuilder()
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
  ];

  return commands.map(cmd => cmd.toJSON());
}

// INTERACTION HANDLER
export async function handleRanksInteraction(interaction) {
  try {
    // Grundlegende Validierung
    if (!await validateUserAndRoles(interaction)) return;

    await interaction.deferReply({ ephemeral: true });

    const commandName = interaction.commandName;
    const mitarbeiter = interaction.options.getUser('mitarbeiter');
    const ausführender = `<@${interaction.user.id}>`;

    // Prüfen ob Benutzer sich selbst bearbeitet (optional)
    if (mitarbeiter.id === interaction.user.id) {
      return await interaction.editReply({ 
        content: '❌ Du kannst dich nicht selbst bearbeiten.' 
      });
    }

    // Mitarbeiter vom Server abrufen
    const guildMember = await getValidatedMember(interaction, mitarbeiter.id);
    if (!guildMember) return;

    // Command-spezifische Logik
    switch (commandName) {
      case 'einstellung':
        await handleEinstellung(interaction, guildMember, ausführender);
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

async function handleEinstellung(interaction, guildMember, ausführender) {
  const rang = interaction.options.getString('rang');
  const grund = interaction.options.getString('grund');

  try {
    // SPEZIFISCHE PRÜFUNG: Diese eine Rolle entfernen, NUR wenn vorhanden
    const roleRemovalResult = await removeSpecificRoleIfPresent(guildMember);
    
    let removalMessage = '';
    if (roleRemovalResult.removed) {
      removalMessage = ` (Bewerber-Rolle entfernt)`;
    } else {
      removalMessage = ` (Bewerber-Rolle war nicht vorhanden)`;
    }

    // Rang-Rolle hinzufügen
    const roleId = ROLE_MAPPING[rang];
    if (roleId) {
      await guildMember.roles.add(roleId);
      
      // Automatische Zusatzrollen für diese Hauptrolle hinzufügen
      const autoRolesResult = await addAutomaticAdditionalRoles(guildMember, roleId);
      if (autoRolesResult.added.length > 0) {
        removalMessage += ` (+${autoRolesResult.added.length} automatische Zusatzrolle(n))`;
      }
    }

    // Zusätzliche Einstellungsrollen hinzufügen
    const addRolesResult = await addEinstellungRoles(guildMember);

    // Embed erstellen und senden
    const embedData = {
      name: `<@${guildMember.id}>`,
      rang,
      grund,
      ausführender
    };

    const embedSent = await sendRankEmbed(interaction, 'einstellung', embedData, guildMember.id);
    
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

  // Prüfen ob alte und neue Rolle gleich sind
  if (alterRang === neuerRang) {
    return await interaction.editReply({ 
      content: '❌ Alter und neuer Rang können nicht identisch sein.' 
    });
  }

  // Prüfen ob Mitarbeiter den alten Rang wirklich hat
  const oldRoleId = ROLE_MAPPING[alterRang];
  const hasOldRole = oldRoleId && guildMember.roles.cache.has(oldRoleId);
  
  if (!hasOldRole) {
    return await interaction.editReply({ 
      content: `❌ ${guildMember.user.tag} hat nicht den Rang "${alterRang}".` 
    });
  }

  try {
    // Alte Rolle entfernen
    await guildMember.roles.remove(oldRoleId);
    
    // Neue Rolle hinzufügen
    const newRoleId = ROLE_MAPPING[neuerRang];
    if (newRoleId) {
      await guildMember.roles.add(newRoleId);
      
      // Automatische Zusatzrollen für die neue Hauptrolle hinzufügen
      const autoRolesResult = await addAutomaticAdditionalRoles(guildMember, newRoleId);
      
      // Wenn alte Rolle auch automatische Zusatzrollen hatte, sollten diese eventuell entfernt werden?
      // Hier könntest du bei Bedarf Logik hinzufügen, um alte Zusatzrollen zu entfernen
    }

    // Embed erstellen und senden
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