// ===============================
// Sakura Bot – src/funk.js
// Vollständig zurückgesetzt mit Role-Check Fix
// ===============================

import discord from 'discord.js';
const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = discord;
import { getFunkSettings, upsertFunkSettings, updateFunkMessageId } from '../db/database.js';

// ===============================
// KONSTANTEN
// ===============================

const GUILD_ID = "1096402401382109237";
const FUNK_CHANNEL_ID = "1416920966004478063";
const ANNOUNCE_CHANNEL_ID = "1096402401898008621";

const ROLE_SAKURA = "1096402401382109244";
const ROLE_NEON = "1441777254953779282";
const ROLE_BLACKLIST = "1360267078321311836";
const ROLE_SAKURA_NAME = "Sakura Mitarbeiter ,";

const LOGO_URL = "https://i.postimg.cc/1381yM8G/grafik.png";
const DEFAULT_FUNK_DATA = {
    messageId: null,
    sakura: 205473,
    neon: 6969,
    blacklist: 18747
};

// Rollen, die /funk nutzen dürfen
const ALLOWED_ROLES = [
    "1096402401407279152",  // Vice-President
    "1096402401382109245",  // Co-Owner
    "1427766432414044160",  // Manager
    "1096402401407279150",  // Admin
    "1097403678715031612",  // Leitung
    "1360267078321311836",  // B.King
    "1136028969481797743",  // Inhaber
    "1096402401407279149",  // Bot Dev
    "1096402401382109243"   // Zusatzrolle (laut Server-Konfig)
];

// ===============================
// DATA
// ===============================

async function loadData() {
    try {
        const row = await getFunkSettings(GUILD_ID);
        if (!row) {
            await upsertFunkSettings(GUILD_ID, DEFAULT_FUNK_DATA);
            return { ...DEFAULT_FUNK_DATA };
        }

        return {
            messageId: row.message_id ?? null,
            sakura: Number(row.sakura) || DEFAULT_FUNK_DATA.sakura,
            neon: Number(row.neon) || DEFAULT_FUNK_DATA.neon,
            blacklist: Number(row.blacklist) || DEFAULT_FUNK_DATA.blacklist
        };
    } catch (error) {
        console.error("❌ Fehler beim Laden der Funk-Daten:", error);
        return { ...DEFAULT_FUNK_DATA };
    }
}

async function saveData(data) {
    try {
        await upsertFunkSettings(GUILD_ID, data);
    } catch (error) {
        console.error("❌ Fehler beim Speichern der Funk-Daten:", error);
    }
}

let funkData = { ...DEFAULT_FUNK_DATA };

async function resolveRoleId(client, roleId, roleName) {
    if (roleId) return roleId;
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const role = guild.roles.cache.find(r => r.name === roleName);
        return role ? role.id : null;
    } catch (error) {
        console.error("❌ Fehler beim Rollen-Resolve:", error);
        return null;
    }
}

// ===============================
// EMBED
// ===============================

function buildEmbed(data) {
    return new EmbedBuilder()
        .setColor("#3b0000")
        .setTitle("🌸 Sakura Funk System")
        .setThumbnail(LOGO_URL)
        .setDescription(
            "**Aktuelle Funk-Nummern:**\n\n" +
            `🔢 **Sakura Funk:** \`${data.sakura}\`\n` +
            `🌌 **Neon Lotus Funk:** \`${data.neon}\`\n` +
            `🚫 **Blacklist Funk:** \`${data.blacklist}\``
        )
        .addFields(
            { 
                name: "ℹ️ Info", 
                value: "Funks werden durch `/funk` Befehle aktualisiert und automatisch angekündigt.", 
                inline: false 
            }
        )
        .setFooter({ 
            text: "Sakura Funk System • Nur autorisierte Rollen können Funks aktualisieren", 
            iconURL: LOGO_URL 
        })
        .setTimestamp();
}

// ===============================
// COMMANDS EXPORT
// ===============================

export function registerFunkCommands() {
    const commands = [];
    
    // Setup Command
    const setupCommand = new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Erstellt das Sakura Funk System im aktuellen Channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .toJSON();
    
    commands.push(setupCommand);
    
    // Funk Update Command
    const funkCommand = new SlashCommandBuilder()
        .setName("funk")
        .setDescription("Aktualisiert einen Funk")
        .addStringOption(option =>
            option
                .setName("typ")
                .setDescription("Welcher Funk soll geändert werden")
                .setRequired(true)
                .addChoices(
                    { name: "🌸 Sakura Funk", value: "sakura" },
                    { name: "🌌 Neon Lotus Funk", value: "neon" },
                    { name: "🚫 Blacklist Funk", value: "blacklist" }
                )
        )
        .toJSON();
    
    commands.push(funkCommand);
    
    return commands;
}

// ===============================
// INTERACTION HANDLER
// ===============================

export async function handleFunkInteraction(client, interaction) {
    try {
        console.log(`🔧 Funk-Befehl: /${interaction.commandName} von ${interaction.user.tag}`);
        funkData = await loadData();

        const isPanelRequest = interaction.fromPanel === true;
        const targetChannelId = FUNK_CHANNEL_ID;
        const targetChannel = isPanelRequest
            ? await client.channels.fetch(targetChannelId).catch(() => null)
            : interaction.channel;
        
        // Role Check für /funk (nicht für /setup)
        if (interaction.commandName === "funk") {
            const hasRole = interaction.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
            if (!hasRole) {
                return await interaction.reply({ 
                    content: "❌ **Keine Berechtigung!**\n\nNur autorisierte Rollen können Funks aktualisieren.", 
                    ephemeral: true 
                });
            }
        }
        
        // Admin Check für /setup
        if (interaction.commandName === "setup") {
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            if (!isAdmin) {
                return await interaction.reply({ 
                    content: "❌ **Admin-Rechte erforderlich!**\nNur Administratoren können das Funk-System einrichten.", 
                    ephemeral: true 
                });
            }
        }

        // /setup Command
        if (interaction.commandName === "setup") {
            // Channel Check
            if (interaction.channelId !== FUNK_CHANNEL_ID) {
                return await interaction.reply({ 
                    content: `❌ **Falscher Channel!**\n\nBitte verwende diesen Befehl nur im Funk-Channel: <#${FUNK_CHANNEL_ID}>`, 
                    ephemeral: true 
                });
            }

            // Antwort senden
            await interaction.reply({ 
                content: "🔄 Richte Funk-System ein...", 
                ephemeral: true 
            });

            // Daten zurücksetzen
            funkData = { ...DEFAULT_FUNK_DATA };

            // Embed erstellen
            const embed = buildEmbed(funkData);
            const channel = interaction.channel;

            // Nachricht senden oder aktualisieren
            let message;
            try {
                if (funkData.messageId) {
                    message = await channel.messages.fetch(funkData.messageId);
                    await message.edit({ embeds: [embed] });
                    console.log("✅ Bestehende Funk-Nachricht aktualisiert");
                } else {
                    message = await channel.send({ embeds: [embed] });
                    funkData.messageId = message.id;
                    await updateFunkMessageId(GUILD_ID, message.id);
                    console.log("✅ Neue Funk-Nachricht erstellt:", message.id);
                }
            } catch (error) {
                console.error("❌ Fehler beim Bearbeiten der Nachricht:", error);
                message = await channel.send({ embeds: [embed] });
                funkData.messageId = message.id;
                await updateFunkMessageId(GUILD_ID, message.id);
                console.log("✅ Neue Funk-Nachricht erstellt (nach Fehler):", message.id);
            }

            // Daten speichern
            await saveData(funkData);

            // Antwort aktualisieren
            await interaction.editReply({ 
                content: `✅ **Funk-System erfolgreich eingerichtet!**\n\nDie Funk-Nummern werden nun in <#${FUNK_CHANNEL_ID}> angezeigt.\n\nVerwende \`/funk\` um Nummern zu aktualisieren.` 
            });

            return;
        }

        // /funk Command
        if (interaction.commandName === "funk") {
            // Channel Check (nur bei normalem /funk, nicht beim Panel)
            if (!isPanelRequest && interaction.channelId !== FUNK_CHANNEL_ID) {
                return await interaction.reply({ 
                    content: `❌ **Falscher Channel!**\n\nBitte verwende diesen Befehl nur im Funk-Channel: <#${FUNK_CHANNEL_ID}>`, 
                    ephemeral: true 
                });
            }

            if (isPanelRequest && (!targetChannel || !targetChannel.isTextBased())) {
                return await interaction.reply({
                    content: "❌ Funk-Channel nicht gefunden oder kein Text-Channel.",
                    ephemeral: true
                });
            }

            // Prüfe ob System eingerichtet ist
            if (!funkData.messageId) {
                return await interaction.reply({ 
                    content: "❌ **Funk-System nicht eingerichtet!**\n\nBitte führe zuerst `/setup` im Funk-Channel aus.", 
                    ephemeral: true 
                });
            }

            const type = interaction.options.getString("typ");
            let label = "";
            let rolePing = "";
            let newValue = 0;

            // Werte aktualisieren
            if (type === "sakura") {
                newValue = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
                funkData.sakura = newValue;
                label = "🌸 Sakura Funk";
                rolePing = await resolveRoleId(client, ROLE_SAKURA, ROLE_SAKURA_NAME);
            } else if (type === "neon") {
                newValue = Math.floor(Math.random() * 900000) + 100000;
                funkData.neon = newValue;
                label = "🌌 Neon Lotus Funk";
                rolePing = ROLE_NEON;
            } else if (type === "blacklist") {
                newValue = Math.floor(Math.random() * 900000) + 100000;
                funkData.blacklist = newValue;
                label = "🚫 Blacklist Funk";
                rolePing = ROLE_BLACKLIST;
            }

            console.log(`🔄 ${label} aktualisiert auf: ${newValue}`);

            // Sofortige Antwort
            await interaction.reply({ 
                content: `🔄 Aktualisiere ${label}...`, 
                ephemeral: true 
            });

            // Embed aktualisieren
            try {
                const embed = buildEmbed(funkData);
                const message = await targetChannel.messages.fetch(funkData.messageId);
                await message.edit({ embeds: [embed] });
                console.log("✅ Funk-Embed aktualisiert");
            } catch (error) {
                console.error("❌ Fehler beim Aktualisieren des Embeds:", error);
                // Versuche neue Nachricht zu erstellen
                const embed = buildEmbed(funkData);
                const message = await targetChannel.send({ embeds: [embed] });
                funkData.messageId = message.id;
                await updateFunkMessageId(GUILD_ID, message.id);
                console.log("✅ Neue Funk-Nachricht erstellt:", message.id);
            }

            // Daten speichern
            await saveData(funkData);

            // Ankündigung senden
            try {
                const announceChannel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
                if (announceChannel) {
                    const announceEmbed = new EmbedBuilder()
                        .setColor(type === "sakura" ? "#FF69B4" : type === "neon" ? "#00FFFF" : "#FF0000")
                        .setTitle("🔔 Funk-Update")
                        .setDescription(`Der **${label}** wurde aktualisiert!`)
                        .addFields(
                            { name: "👤 Ausgeführt von", value: `${interaction.user}`, inline: true },
                            { name: "🔢 Neue Nummer", value: `\`${newValue}\``, inline: true },
                            { name: "📅 Uhrzeit", value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
                            { 
                                name: "🔗 Direktlink", 
                                value: `[Zum Funk-Channel](https://discord.com/channels/${GUILD_ID}/${FUNK_CHANNEL_ID})`, 
                                inline: false 
                            }
                        )
                        .setThumbnail(LOGO_URL)
                        .setFooter({ text: "Sakura Funk System", iconURL: LOGO_URL })
                        .setTimestamp();

                    const rolePingContent = rolePing ? `<@&${rolePing}>` : '';
                    const allowedMentions = rolePing ? { roles: [rolePing] } : { roles: [] };

                    if (!rolePing && type === "sakura") {
                        console.warn("⚠️ Sakura-Rolle nicht gefunden, sende Ankuendigung ohne Ping.");
                    }

                    await announceChannel.send({ 
                        content: rolePingContent,
                        embeds: [announceEmbed],
                        allowedMentions
                    });
                    console.log(`📢 Ankündigung für ${label} gesendet`);
                }
            } catch (error) {
                console.error("❌ Fehler beim Senden der Ankündigung:", error);
            }

            // Antwort aktualisieren
            await interaction.editReply({ 
                content: `✅ **${label} erfolgreich aktualisiert!**\n\n**Neue Nummer:** \`${newValue}\`\n\nDie Änderung wurde angekündigt und ist jetzt im Funk-Channel sichtbar.` 
            });

            return;
        }

    } catch (error) {
        console.error("❌ Fehler im Funk-Command:", error);
        
        if (!interaction.replied) {
            await interaction.reply({ 
                content: "❌ **Es ist ein Fehler aufgetreten.**\n\nBitte kontaktiere einen Administrator oder Bot-Developer.", 
                ephemeral: true 
            });
        } else if (interaction.deferred) {
            await interaction.editReply({ 
                content: "❌ **Fehler bei der Verarbeitung.**\n\nDie Änderung konnte nicht vollständig durchgeführt werden." 
            });
        }
    }
}

// ===============================
// EXPORT FÜR MAIN.JS
// ===============================

export default {
    registerFunkCommands,
    handleFunkInteraction
};