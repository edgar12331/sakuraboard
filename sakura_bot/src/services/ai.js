// ===============================
// Sakura Bot – ai.js
// KI-Chatbot mit DeepSeek Integration (lokale Fallback-Version)
// ===============================

import { EmbedBuilder, MessageFlags } from 'discord.js';
import { LOG_COLORS } from './logs.js';

// Logo URL
const LOGO_URL = 'https://i.postimg.cc/1381yM8G/grafik.png';

// Initialisiere DeepSeek Client
let openai = null;
let aiInitialized = false;
let usingLocalAI = true; // Standardmäßig lokale KI verwenden

// Initialisiere die KI
export function initAI() {
    try {
        console.log('🤖 Initialisiere KI-System...');
        
        // Immer erfolgreich, da wir lokale KI verwenden
        aiInitialized = true;
        usingLocalAI = true;
        console.log('✅ Lokale KI initialisiert (keine externe API benötigt)');
        return true;
        
    } catch (error) {
        console.error('❌ Fehler bei KI-Initialisierung:', error);
        return false;
    }
}

// Lokale Wissensdatenbank für häufige Fragen
const LOCAL_KNOWLEDGE_BASE = {
    // Allgemeine Discord Fragen
    'wie funktioniert discord': 'Discord ist eine Kommunikationsplattform mit Text-, Sprach- und Video-Chats. Auf diesem Server kannst du verschiedene Channels nutzen und mit anderen Mitgliedern interagieren.',
    'was ist ein bot': 'Ein Bot ist ein automatisiertes Programm, das bestimmte Aufgaben erledigt. Der Sakura-Bot hilft bei Abmeldungen, Kündigungen, Rollenverwaltung und mehr.',
    'wie verwende ich commands': 'Tippe `/` in die Chatleiste und wähle einen Befehl aus der Liste. Folge den Anweisungen oder verwende `/help` für mehr Informationen.',
    
    // Server-spezifische Fragen
    'wie mache ich eine abmeldung': 'Verwende den Befehl `/abmeldung` um dich für eine bestimmte Zeit abzumelden. Du musst Grund und Dauer angeben.',
    'wie kündige ich': 'Verwende `/kündigung [grund]` um eine Kündigung einzureichen. Diese wird dann von den Admins bearbeitet.',
    'wie ändere ich meine farbe': 'Verwende `/fraktionen-liste` um verfügbare Farben zu sehen und `/fraktion-aktualisieren` um deine Farbe zu ändern.',
    'was ist das funksystem': 'Das Funk-System verbindet verschiedene Voice-Channels. Verwende `/funk [nachricht]` um Nachrichten an alle verbundenen Channels zu senden.',
    
    // Bot Befehle
    'welche befehle gibt es': 'Verwende `/help all` um alle verfügbaren Befehle zu sehen. Es gibt KI-Chat, Abmeldung, Kündigung, Farben, Funk und Admin-Befehle.',
    'was macht der bot': 'Der Sakura-Bot hilft bei Server-Verwaltung, Abmeldungen, Kündigungen, Rollen/Farben, Funk-Kommunikation und bietet einen KI-Chat.',
    
    // Hilfe
    'hilfe': 'Ich bin SakuraAI, der Assistent des Sakura-Bots. Frag mich etwas über Discord, Server-Funktionen oder Bot-Befehle! Verwende `/help` für eine vollständige Liste.',
    'was kannst du': 'Ich kann Fragen zu Discord, Server-Funktionen und Bot-Befehlen beantworten. Verwende `/help` für eine Liste aller Befehle.',
    'hallo': 'Hallo! Ich bin SakuraAI. Wie kann ich dir helfen? Frag mich etwas über Discord oder Server-Funktionen!',
    'guten tag': 'Guten Tag! Ich bin SakuraAI, dein Assistent für Discord-Fragen. Wie kann ich helfen?',
    
    // Admin
    'wer ist admin': 'Für Fragen zur Server-Verwaltung bitte direkt die Server-Admins kontaktieren.',
    'server besitzer': 'Informationen zur Server-Verwaltung erhältst du von den Admins.',
};

// Intelligente Antworten basierend auf Keywords
function getLocalResponse(question) {
    const lowerQuestion = question.toLowerCase();
    
    // Prüfe auf exakte Übereinstimmungen
    for (const [key, answer] of Object.entries(LOCAL_KNOWLEDGE_BASE)) {
        if (lowerQuestion.includes(key)) {
            return answer;
        }
    }
    
    // Prüfe auf Keywords mit intelligenten Antworten
    if (lowerQuestion.includes('abmeldung') || lowerQuestion.includes('abmelden')) {
        return '**Für Abmeldungen:**\nVerwende `/abmeldung` um dich für eine bestimmte Zeit abzumelden.\n\n**Optionen:**\n- Grund angeben\n- Dauer wählen (Stunden/Tage)\n- Automatische Rückkehr\n\nVerwende `/help abmeldung` für mehr Details.';
    }
    
    if (lowerQuestion.includes('kündigung') || lowerQuestion.includes('kündigen')) {
        return '**Für Kündigungen:**\nVerwende `/kündigung [grund]` um eine Kündigung einzureichen.\n\n**Wichtig:**\n- Kündigungen werden von Admins bearbeitet\n- Gib einen klaren Grund an\n- Warte auf Rückmeldung der Admins';
    }
    
    if (lowerQuestion.includes('farbe') || lowerQuestion.includes('rolle') || lowerQuestion.includes('fraktion')) {
        return '**Für Farben/Rollen:**\n1. `/fraktionen-liste` - Zeige alle verfügbaren Farben\n2. `/fraktion-aktualisieren` - Ändere deine Farbe\n\nJede Fraktion hat eine spezielle Farbe für deinen Namen!';
    }
    
    if (lowerQuestion.includes('funk') || lowerQuestion.includes('sprachchat') || lowerQuestion.includes('voice')) {
        return '**Funk-System:**\nVerwende `/funk [nachricht]` um eine Nachricht an alle verbundenen Voice-Channels zu senden.\n\n**Für Admins:**\n`/setup` - Richtet das Funk-System ein';
    }
    
    if (lowerQuestion.includes('befehl') || lowerQuestion.includes('command') || lowerQuestion.includes('/')) {
        return '**Verfügbare Befehle:**\n`/help all` - Alle Befehle anzeigen\n`/chat [frage]` - Frage die KI\n`/abmeldung` - Abmelden\n`/kündigung` - Kündigen\n`/farben` - Farben ändern\n`/funk` - Funk-Nachricht senden';
    }
    
    if (lowerQuestion.includes('danke') || lowerQuestion.includes('thanks') || lowerQuestion.includes('thx')) {
        return 'Gern geschehen! Bei weiteren Fragen stehe ich gerne zur Verfügung. 😊\nVerwende `/help` wenn du Hilfe brauchst!';
    }
    
    // Standardantwort für unbekannte Fragen
    return `Ich habe deine Frage verstanden: "${question.substring(0, 50)}..."\n\nAls lokale KI kann ich dir zu folgenden Themen helfen:\n\n` +
           `• **Discord & Server:** Wie funktioniert Discord, Bot-Befehle\n` +
           `• **Abmeldungen:** Wie melde ich mich ab? (/abmeldung)\n` +
           `• **Kündigungen:** Wie kündige ich? (/kündigung)\n` +
           `• **Farben/Rollen:** Wie ändere ich meine Farbe? (/fraktionen)\n` +
           `• **Funk-System:** Wie funktioniert das Funk-System? (/funk)\n\n` +
           `Verwende **/help [thema]** für detaillierte Hilfe zu einem bestimmten Thema!`;
}

// KI-Chatverlauf speichern (pro User)
const chatHistories = new Map();
const MAX_HISTORY_LENGTH = 5; // Kürzer für lokale KI

// Command für die Registrierung
export function registerAICommands() {
    const commands = [
        {
            name: 'chat',
            description: 'Chatte mit der KI über Discord-Themen',
            options: [
                {
                    name: 'frage',
                    description: 'Deine Frage an die KI',
                    type: 3, // STRING
                    required: true,
                    max_length: 500
                }
            ]
        },
        {
            name: 'help',
            description: 'Zeigt alle verfügbaren Befehle an',
            options: [
                {
                    name: 'thema',
                    description: 'Spezifisches Thema für Hilfe',
                    type: 3, // STRING
                    required: false,
                    choices: [
                        { name: 'Alle Befehle', value: 'all' },
                        { name: 'Abmeldung', value: 'abmeldung' },
                        { name: 'Kündigung', value: 'kündigung' },
                        { name: 'Farben/Rollen', value: 'farben' },
                        { name: 'Funk-System', value: 'funk' },
                        { name: 'KI-Chat', value: 'ai' }
                    ]
                }
            ]
        }
    ];
    
    // Konvertiere zu Discord.js Format
    return commands.map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        options: cmd.options || []
    }));
}

// Handler für KI-Interaktionen
export async function handleAIIntersection(client, interaction) {
    const { commandName } = interaction;
    
    // Debug-Log
    console.log(`🤖 KI-Command: /${commandName} von ${interaction.user.tag}`);
    
    try {
        // Prüfe ob die Interaktion bereits beantwortet wurde
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Interaktion wurde bereits beantwortet, ignoriere...');
            return;
        }

        // KI-Chat Befehl
        if (commandName === 'chat') {
            if (!aiInitialized) {
                const notAvailableEmbed = new EmbedBuilder()
                    .setColor(LOG_COLORS.WARNING)
                    .setTitle('⚠️ KI-Chat nicht verfügbar')
                    .setDescription('Der KI-Chat ist derzeit nicht verfügbar. Bitte versuche es später erneut.')
                    .setFooter({ text: 'SakuraAI • Chat-System', iconURL: LOGO_URL })
                    .setTimestamp();
                
                return await interaction.reply({ 
                    embeds: [notAvailableEmbed], 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            const question = interaction.options.getString('frage');
            const userId = interaction.user.id;
            
            // Verwende lokale KI
            const aiResponse = getLocalResponse(question);
            
            // Erstelle Embed für die Antwort
            const responseEmbed = new EmbedBuilder()
                .setColor(LOG_COLORS.INFO)
                .setTitle('💬 SakuraAI Antwort')
                .setDescription(aiResponse)
                .addFields(
                    { 
                        name: '📝 Frage', 
                        value: question.length > 100 ? question.substring(0, 100) + '...' : question, 
                        inline: false 
                    },
                    { 
                        name: '👤 Gefragt von', 
                        value: interaction.user.tag, 
                        inline: true 
                    },
                    {
                        name: '🔧 KI-Modus',
                        value: '🤖 Lokale KI (Keine externe API benötigt)',
                        inline: true
                    }
                )
                .setFooter({ 
                    text: 'SakuraAI • Lokale KI • Nutze /help für mehr Befehle', 
                    iconURL: LOGO_URL 
                })
                .setTimestamp();
            
            await interaction.reply({ embeds: [responseEmbed] });
            console.log(`✅ Lokale KI-Antwort für ${interaction.user.tag}`);
        }
        
        // Help Befehl
        else if (commandName === 'help') {
            const thema = interaction.options.getString('thema') || 'all';
            
            const helpEmbed = new EmbedBuilder()
                .setColor(LOG_COLORS.SUCCESS)
                .setTitle('🆘 Sakura Bot Hilfe')
                .setFooter({ text: 'Sakura Bot • Hilfe-System', iconURL: LOGO_URL })
                .setTimestamp();
            
            switch (thema) {
                case 'all':
                    helpEmbed
                        .setDescription('**📋 ALLE VERFÜGBAREN BEFEHLE**\nHier sind alle Befehle des Sakura-Bots:')
                        .addFields(
                            { 
                                name: '🤖 KI-Chat Befehle', 
                                value: '`/chat [frage]` - Chatte mit der KI\n`/help [thema]` - Zeige diese Hilfe', 
                                inline: false 
                            },
                            { 
                                name: '👤 Mitglieder Befehle', 
                                value: '`/abmeldung` - Für Abmeldungen\n`/kündigung` - Für Kündigungen\n`/abmeldung_list` - Aktive Abmeldungen', 
                                inline: false 
                            },
                            { 
                                name: '🎨 Rollen/Farben', 
                                value: '`/fraktionen-liste` - Zeige alle Fraktionen\n`/fraktion-aktualisieren` - Ändere deine Farbe', 
                                inline: false 
                            },
                            { 
                                name: '📻 Funk-System', 
                                value: '`/funk [nachricht]` - Sende Funknachricht\n`/setup` - Funk-System Setup (Admin)', 
                                inline: false 
                            },
                            { 
                                name: '👑 Spezial-Befehl', 
                                value: '`/beleidigung [ziel]` - "Beleidige" jemanden (nur B.King/Inhaber)', 
                                inline: false 
                            },
                            { 
                                name: '👨‍💼 Admin Befehle', 
                                value: '`/abmeldung-admin` - Admin Abmeldungen\n`/abmeldung-verwaltung` - Verwaltung\n`/einstellung` - Einstellungen\n`/up-rank` / `/down-rank` - Ränge\n`/sanki` - Sanktionen\n`/bezahlt` - Bezahlung', 
                                inline: false 
                            }
                        );
                    break;
                    
                case 'abmeldung':
                    helpEmbed
                        .setDescription('**📋 ABMELDUNGSSYSTEM**')
                        .addFields(
                            { name: '👤 Für Mitglieder', value: '`/abmeldung` - Melde dich für eine bestimmte Zeit ab', inline: false },
                            { name: '👨‍💼 Für Admins', value: '`/abmeldung-admin` - Abmeldung für andere Mitglieder\n`/abmeldung-verwaltung` - Verwaltungstools', inline: false },
                            { name: '📊 Liste', value: '`/abmeldung_list` - Zeige aktive Abmeldungen', inline: false },
                            { name: 'ℹ️ Info', value: 'Das Abmeldungssystem erlaubt es, sich temporär von Server-Aktivitäten abzumelden.', inline: false }
                        );
                    break;
                    
                case 'kündigung':
                    helpEmbed
                        .setDescription('**📋 KÜNDIGUNGSSYSTEM**')
                        .addFields(
                            { name: '👤 Befehl', value: '`/kündigung [grund]` - Reiche eine Kündigung ein', inline: false },
                            { name: '⚠️ Wichtig', value: 'Kündigungen werden an die Admins weitergeleitet und bearbeitet.', inline: false }
                        );
                    break;
                    
                case 'farben':
                    helpEmbed
                        .setDescription('**🎨 FARBEN/ROLLEN SYSTEM**')
                        .addFields(
                            { name: '📋 Befehle', value: '`/fraktionen-liste` - Zeige alle verfügbaren Fraktionen/Farben\n`/fraktion-aktualisieren` - Ändere deine Fraktionsfarbe', inline: false },
                            { name: 'ℹ️ Info', value: 'Jede Fraktion hat eine bestimmte Farbe. Wähle deine bevorzugte Farbe!', inline: false }
                        );
                    break;
                    
                case 'funk':
                    helpEmbed
                        .setDescription('**📻 FUNK-SYSTEM**')
                        .addFields(
                            { name: '👤 Befehl', value: '`/funk [nachricht]` - Sende eine Funknachricht an alle verbundenen Channels', inline: false },
                            { name: '👨‍💼 Admin', value: '`/setup` - Richte das Funk-System ein (nur für Admins)', inline: false },
                            { name: '🔗 Verbindung', value: 'Das Funk-System verbindet verschiedene Voice-Channels für Kommunikation.', inline: false }
                        );
                    break;
                    
                case 'ai':
                    helpEmbed
                        .setDescription('**🤖 KI-CHAT SYSTEM**')
                        .addFields(
                            { 
                                name: '💬 Chatten', 
                                value: '`/chat [frage]` - Stelle eine Frage an die KI', 
                                inline: false 
                            },
                            { name: '❓ Hilfe', value: '`/help` - Zeige alle Befehle', inline: false },
                            { name: '⚠️ Einschränkungen', value: 'Die KI kann nur allgemeine Fragen zu Discord und Server-Themen beantworten. Keine kritischen oder privaten Fragen!', inline: false },
                            { name: '🤝 Unterstützung', value: 'Bei spezifischen Problemen: Kontaktiere bitte die Server-Admins direkt.', inline: false },
                            { 
                                name: '🔧 Status', 
                                value: '✅ **Lokale KI aktiv** - Keine externe API benötigt\n💡 **Kann Fragen zu:** Discord, Abmeldungen, Kündigungen, Farben, Funk-System', 
                                inline: false 
                            }
                        );
                    break;
                    
                default:
                    helpEmbed
                        .setDescription('**🆘 ALLGEMEINE HILFE**\nWähle ein Thema mit `/help [thema]` für detaillierte Informationen:')
                        .addFields(
                            { name: '🤖 KI-Chat', value: '`/help ai` - Informationen zum KI-Chat', inline: true },
                            { name: '👤 Abmeldung', value: '`/help abmeldung` - Abmeldungssystem', inline: true },
                            { name: '📋 Kündigung', value: '`/help kündigung` - Kündigungssystem', inline: true },
                            { name: '🎨 Farben', value: '`/help farben` - Rollen/Farben System', inline: true },
                            { name: '📻 Funk', value: '`/help funk` - Funk-System', inline: true },
                            { name: '📋 Alle Befehle', value: '`/help all` - Alle verfügbaren Befehle', inline: true }
                        );
                    break;
            }
            
            await interaction.reply({ embeds: [helpEmbed] });
        }
        
    } catch (error) {
        console.error(`❌ Fehler bei /${commandName}:`, error.message);
        
        // Ignoriere Fehler wenn Interaktion bereits beantwortet
        if (error.code === 40060 || error.code === 10062) {
            console.log('⚠️ Interaktion bereits beantwortet oder abgelaufen');
            return;
        }
        
        // Nur antworten wenn noch nicht beantwortet
        if (!interaction.replied && !interaction.deferred) {
            const errorEmbed = new EmbedBuilder()
                .setColor(LOG_COLORS.ERROR)
                .setTitle('❌ Fehler')
                .setDescription('Entschuldige, es gab einen Fehler bei der Verarbeitung deiner Anfrage.')
                .setFooter({ text: 'SakuraAI • Fehler', iconURL: LOGO_URL })
                .setTimestamp();
            
            try {
                await interaction.reply({ 
                    embeds: [errorEmbed], 
                    flags: MessageFlags.Ephemeral 
                });
            } catch (replyError) {
                console.error('❌ Konnte nicht auf Interaktion antworten:', replyError.message);
            }
        }
    }
}

// Chatverlauf für einen User löschen
export function clearUserChatHistory(userId) {
    if (chatHistories.has(userId)) {
        chatHistories.delete(userId);
        return true;
    }
    return false;
}

// Alle Chatverläufe löschen (für Admin)
export function clearAllChatHistories() {
    const count = chatHistories.size;
    chatHistories.clear();
    return count;
}

// Debug-Info
export function getAIStatus() {
    return {
        initialized: aiInitialized,
        usingLocalAI: usingLocalAI,
        openaiAvailable: !!openai,
        chatHistories: chatHistories.size
    };
}