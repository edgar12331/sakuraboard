// Sakura Bot – functions/logs.js
// Zentrales Logging-System für alle Aktionen
// ===============================

import { EmbedBuilder, AuditLogEvent } from 'discord.js';

// KONSTANTEN
const LOG_CHANNEL_ID = '1328003005949415474';
const LOGO_URL = 'https://i.postimg.cc/1381yM8G/grafik.png';

// EMBED FARBEN
const LOG_COLORS = {
  INFO: '#3498db',      // Blau für Info
  SUCCESS: '#27ae60',   // Grün für Erfolg
  WARNING: '#f39c12',   // Orange für Warnung
  ERROR: '#e74c3c',     // Rot für Fehler
  MODERATION: '#9b59b6', // Lila für Moderation
  SYSTEM: '#95a5a6'     // Grau für System
};

// BERLINER ZEIT
function getBerlinTime() {
  const now = new Date();
  const options = {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  return new Intl.DateTimeFormat('de-DE', options).format(now);
}

// LOG FUNKTIONEN
export async function logCommand(client, interaction) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    const commandName = interaction.commandName;
    const user = interaction.user;
    const guild = interaction.guild;
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.INFO)
      .setTitle('📝 **BEFEHL AUSGEFÜHRT**')
      .setThumbnail(LOGO_URL)
      .setDescription(
        `**Befehl:** \`/${commandName}\`\n` +
        `**Ausführender:** ${user} (${user.tag})\n` +
        `**User-ID:** \`${user.id}\`\n` +
        `**Server:** ${guild.name}\n` +
        `**Channel:** <#${interaction.channel.id}>\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .addFields(
        { 
          name: '📋 **Optionen**', 
          value: interaction.options.data.length > 0 
            ? interaction.options.data.map(opt => `\`${opt.name}\`: ${opt.value}`).join('\n')
            : 'Keine Optionen'
        }
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen des Befehls:', error);
  }
}

export async function logMemberKick(client, guild, member, moderator, reason) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.MODERATION)
      .setTitle('🚪 **MITGLIED GEKICKT**')
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(
        `**Mitglied:** ${member} (${member.user.tag})\n` +
        `**User-ID:** \`${member.id}\`\n` +
        `**Moderator:** ${moderator}\n` +
        `**Grund:** ${reason || 'Kein Grund angegeben'}\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen des Kicks:', error);
  }
}

export async function logMemberBan(client, guild, user, moderator, reason) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.ERROR)
      .setTitle('🔨 **MITGLIED GEBANNT**')
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
        `**Mitglied:** ${user} (${user.tag})\n` +
        `**User-ID:** \`${user.id}\`\n` +
        `**Moderator:** ${moderator}\n` +
        `**Grund:** ${reason || 'Kein Grund angegeben'}\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen des Bans:', error);
  }
}

export async function logMemberUnban(client, guild, user, moderator, reason) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.SUCCESS)
      .setTitle('✅ **MITGLIED ENTBAUNT**')
      .setThumbnail(user.displayAvatarURL())
      .setDescription(
        `**Mitglied:** ${user} (${user.tag})\n` +
        `**User-ID:** \`${user.id}\`\n` +
        `**Moderator:** ${moderator}\n` +
        `**Grund:** ${reason || 'Kein Grund angegeben'}\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen des Unbans:', error);
  }
}

export async function logRoleAdd(client, guild, member, role, moderator) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.SUCCESS)
      .setTitle('➕ **ROLLE HINZUGEFÜGT**')
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(
        `**Mitglied:** ${member} (${member.user.tag})\n` +
        `**User-ID:** \`${member.id}\`\n` +
        `**Rolle:** <@&${role.id}> (\`${role.name}\`)\n` +
        `**Moderator:** ${moderator || 'System'}\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen der Rollenänderung (Add):', error);
  }
}

export async function logRoleRemove(client, guild, member, role, moderator) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.WARNING)
      .setTitle('➖ **ROLLE ENTFERNT**')
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(
        `**Mitglied:** ${member} (${member.user.tag})\n` +
        `**User-ID:** \`${member.id}\`\n` +
        `**Rolle:** <@&${role.id}> (\`${role.name}\`)\n` +
        `**Moderator:** ${moderator || 'System'}\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen der Rollenänderung (Remove):', error);
  }
}

export async function logMemberJoin(client, member) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.SUCCESS)
      .setTitle('👋 **NEUES MITGLIED**')
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(
        `**Mitglied:** ${member} (${member.user.tag})\n` +
        `**User-ID:** \`${member.id}\`\n` +
        `**Account erstellt:** ${member.user.createdAt.toLocaleDateString('de-DE')}\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen des Mitgliedsbeitritts:', error);
  }
}

export async function logMemberLeave(client, member) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.WARNING)
      .setTitle('👋 **MITGLIED VERLASSEN**')
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(
        `**Mitglied:** ${member.user.tag}\n` +
        `**User-ID:** \`${member.id}\`\n` +
        `**Rollen:** ${member.roles.cache.size > 1 
          ? member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') 
          : 'Keine Rollen'}\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen des Mitgliedsaustritts:', error);
  }
}

export async function logMessageDelete(client, message) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.WARNING)
      .setTitle('🗑️ **NACHRICHT GELÖSCHT**')
      .setThumbnail(message.author.displayAvatarURL())
      .setDescription(
        `**Autor:** ${message.author} (${message.author.tag})\n` +
        `**Channel:** <#${message.channel.id}>\n` +
        `**Nachricht-ID:** \`${message.id}\`\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .addFields(
        { 
          name: '📝 **Inhalt**', 
          value: message.content.length > 0 
            ? (message.content.length > 1024 
                ? message.content.substring(0, 1021) + '...' 
                : message.content)
            : '*(Kein Textinhalt)*'
        }
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen der gelöschten Nachricht:', error);
  }
}

export async function logMessageEdit(client, oldMessage, newMessage) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.INFO)
      .setTitle('✏️ **NACHRICHT BEARBEITET**')
      .setThumbnail(newMessage.author.displayAvatarURL())
      .setDescription(
        `**Autor:** ${newMessage.author} (${newMessage.author.tag})\n` +
        `**Channel:** <#${newMessage.channel.id}>\n` +
        `**Nachricht-ID:** \`${newMessage.id}\`\n` +
        `**[Zur Nachricht](${newMessage.url})**\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .addFields(
        { 
          name: '📝 **Alter Inhalt**', 
          value: oldMessage.content.length > 0 
            ? (oldMessage.content.length > 500 
                ? oldMessage.content.substring(0, 497) + '...' 
                : oldMessage.content)
            : '*(Kein Textinhalt)*'
        },
        { 
          name: '📝 **Neuer Inhalt**', 
          value: newMessage.content.length > 0 
            ? (newMessage.content.length > 500 
                ? newMessage.content.substring(0, 497) + '...' 
                : newMessage.content)
            : '*(Kein Textinhalt)*'
        }
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen der bearbeiteten Nachricht:', error);
  }
}

export async function logBotError(client, error, context) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(LOG_COLORS.ERROR)
      .setTitle('❌ **BOT FEHLER**')
      .setDescription(
        `**Kontext:** ${context}\n` +
        `**Zeit:** ${getBerlinTime()}`
      )
      .addFields(
        { 
          name: '💥 **Fehler**', 
          value: error.message.length > 1024 
            ? error.message.substring(0, 1021) + '...' 
            : error.message
        },
        { 
          name: '📋 **Stack Trace**', 
          value: error.stack.length > 1024 
            ? `\`\`\`${error.stack.substring(0, 1000)}...\`\`\`` 
            : `\`\`\`${error.stack}\`\`\``
        }
      )
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen des Bot-Fehlers:', error);
  }
}

export async function logCustom(client, title, description, color = LOG_COLORS.INFO) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setFooter({ text: 'Sakura Logging System', iconURL: LOGO_URL })
      .setTimestamp();
    
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Fehler beim Loggen der benutzerdefinierten Nachricht:', error);
  }
}

// Export der LOG_COLORS als Default-Export oder benannten Export
export { LOG_COLORS };