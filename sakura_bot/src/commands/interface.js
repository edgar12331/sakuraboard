// Sakura Bot – functions/interface.js
// /clear – Channel komplett leeren
// ===============================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

// KONSTANTEN
const ALLOWED_ROLES = [
    '1096402401424060516'  // Nur diese eine Rolle hat Zugriff
];

// COMMAND REGISTRIERUNG
export function registerInterfaceCommands() {
    return [
        new SlashCommandBuilder()
            .setName('clear')
            .setDescription('Löscht ALLE Nachrichten in einem Channel')
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('Channel der geleert werden soll')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('bestätigung')
                    .setDescription('Zur Sicherheit: Gib "JA-LÖSCHEN" ein')
                    .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
            .toJSON()
    ];
}

// INTERACTION HANDLER
export async function handleClearInteraction(interaction) {
    try {
        // Rollencheck - nur die spezifische Rolle erlauben
        const hasRole = interaction.member.roles.cache.has('1096402401424060516');
        
        if (!hasRole) {
            return await interaction.reply({
                content: '❌ Du hast keine Berechtigung für diesen Befehl. Nur spezielle Rollen können Channels leeren.',
                ephemeral: true
            });
        }

        const channel = interaction.options.getChannel('channel');
        const confirmation = interaction.options.getString('bestätigung');

        // Sicherheitscheck
        if (confirmation !== 'JA-LÖSCHEN') {
            return await interaction.reply({
                content: '❌ Falsche Bestätigung! Gib genau "JA-LÖSCHEN" ein, um fortzufahren.',
                ephemeral: true
            });
        }

        // Channel-Typ prüfen (nur Text-Channels)
        if (!channel.isTextBased()) {
            return await interaction.reply({
                content: '❌ Dieser Befehl funktioniert nur mit Text-Channels.',
                ephemeral: true
            });
        }

        // Anfangsnachricht senden
        await interaction.reply({
            content: `⚠️ **ACHTUNG** - Starte Löschung von ALLEN Nachrichten in <#${channel.id}>\nDies kann einige Minuten dauern...`,
            ephemeral: true
        });

        let deletedCount = 0;
        let errorCount = 0;
        let hasMoreMessages = true;
        
        console.log(`🧹 Starte Löschung in Channel: ${channel.name} (${channel.id})`);

        // Alle Nachrichten löschen
        while (hasMoreMessages && deletedCount < 10000) {
            try {
                // Batch von Nachrichten abrufen (max. 100)
                const messages = await channel.messages.fetch({ limit: 100 });
                
                if (messages.size === 0) {
                    hasMoreMessages = false;
                    break;
                }

                // Alte Nachrichten können nur einzeln gelöscht werden
                const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
                const oldMessages = messages.filter(m => m.createdTimestamp < twoWeeksAgo);
                const newMessages = messages.filter(m => m.createdTimestamp >= twoWeeksAgo);

                // Neue Nachrichten (unter 14 Tage) batch-löschen
                if (newMessages.size > 0) {
                    try {
                        await channel.bulkDelete(newMessages, true);
                        deletedCount += newMessages.size;
                        console.log(`✅ ${newMessages.size} neue Nachrichten gelöscht (Total: ${deletedCount})`);
                    } catch (bulkError) {
                        console.log('⚠️ Bulk-Delete fehlgeschlagen, lösche einzeln...');
                    }
                }

                // Alte Nachrichten einzeln löschen
                for (const [, message] of oldMessages) {
                    try {
                        await message.delete();
                        deletedCount++;
                        await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit vermeiden
                    } catch (err) {
                        errorCount++;
                        if (errorCount > 10) break;
                    }
                }

                // Kurze Pause zwischen Batches
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (batchError) {
                console.error('Fehler beim Nachrichten-Batch:', batchError);
                errorCount++;
                if (errorCount > 5) {
                    hasMoreMessages = false;
                    break;
                }
            }
        }

        // Abschlussnachricht
        const finalMessage = deletedCount > 0 
            ? `✅ **Channel geleert!** ${deletedCount} Nachrichten wurden aus <#${channel.id}> gelöscht.`
            : `❌ Keine Nachrichten gelöscht. Möglicherweise ist der Channel bereits leer oder es gab Berechtigungsprobleme.`;

        await interaction.followUp({
            content: finalMessage,
            ephemeral: true
        });

        console.log(`✅ Löschung abgeschlossen. Gelöscht: ${deletedCount}, Fehler: ${errorCount}`);

    } catch (err) {
        console.error('Fehler im Clear-Command:', err);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Es ist ein schwerer Fehler aufgetreten.',
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: '❌ Löschvorgang wurde aufgrund eines Fehlers abgebrochen.',
                ephemeral: true
            });
        }
    }
}