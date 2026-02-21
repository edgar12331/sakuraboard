// ===============================
// Sakura Bot – ai.js
// KI-Chatbot mit Google Gemini Integration
// ===============================

import { EmbedBuilder, MessageFlags } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LOG_COLORS } from './logs.js';
import { GEMINI_API_KEY } from '../../config.js';

// Logo URL
const LOGO_URL = 'https://i.postimg.cc/1381yM8G/grafik.png';

// Initialisiere Gemini Client
let genAI = null;
let aiModel = null;
let aiInitialized = false;

const SYSTEM_INSTRUCTION = `Du bist SakuraAI, der offizielle, freundliche Support-Chatbot für den Sakura Discord-Server.
Deine Aufgabe ist es, Usern bei Fragen zum Server zu helfen. 
Befehle des Servers, die du erklären kannst:
- /abmeldung: Melde dich für bestimmte Zeit ab (Grund und Dauer nötig). Liste der Abmeldungen unter /abmeldung_list
- /kündigung: Reiche eine Kündigung ein (Grund angeben). Admins kümmern sich darum.
- /fraktionen-liste: Zeigt verfügbare Fraktionen/Farben.
- /fraktion-aktualisieren: Ändere deine Farbe.
- /funk: Sende eine Sprach-Text-Nachricht an verbundene Voice-Channels.
- /chat: Sprich mit dir (SakuraAI).
Wichtig:
1. Halte deine Antworten extrem präzise und hilfsbereit, aber nicht zu lang (Discord Limit).
2. Erwähne bei technischen Fragen oder Server-Bans, dass sich der User an die Admins wenden soll.
3. Du sprichst Deutsch. Keine Formatierungen nutzen, die Discord zerschießen (vermeide extrem viele Sternchen, halte es simpel mit Bold).
`;

// Initialisiere die KI
export function initAI() {
    try {
        console.log('🤖 Initialisiere KI-System (Google Gemini)...');

        if (!GEMINI_API_KEY) {
            console.error('❌ Kein GEMINI_API_KEY in der Config gefunden.');
            return false;
        }

        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        // Wir nutzen Flash, da es am schnellsten ist und für Chatbots empfohlen wird
        aiModel = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: SYSTEM_INSTRUCTION
        });

        aiInitialized = true;
        console.log('✅ Google Gemini KI initialisiert');
        return true;
    } catch (error) {
        console.error('❌ Fehler bei KI-Initialisierung:', error);
        return false;
    }
}

// KI-Chatverlauf speichern (pro User)
const chatHistories = new Map();
const MAX_HISTORY_LENGTH = 10;

// Chat Verlauf für Gemini formatieren
function getHistoryForGemini(userId) {
    if (!chatHistories.has(userId)) {
        return [];
    }
    return chatHistories.get(userId);
}

// Nachricht zum Verlauf hinzufügen
function addToHistory(userId, role, text) {
    if (!chatHistories.has(userId)) {
        chatHistories.set(userId, []);
    }

    const history = chatHistories.get(userId);
    // Gemini API benötigt 'user' oder 'model'
    history.push({ role, parts: [{ text }] });

    // Halte Verlauf kurz
    if (history.length > MAX_HISTORY_LENGTH * 2) {
        history.splice(0, 2); // Lösche das älteste Frage-Antwort-Paar
    }
}

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

    console.log(`🤖 KI-Command: /${commandName} von ${interaction.user.tag}`);

    try {
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Interaktion wurde bereits beantwortet, ignoriere...');
            return;
        }

        // KI-Chat Befehl
        if (commandName === 'chat') {
            if (!aiInitialized || !aiModel) {
                const notAvailableEmbed = new EmbedBuilder()
                    .setColor(LOG_COLORS.WARNING)
                    .setTitle('⚠️ KI-Chat nicht verfügbar')
                    .setDescription('Der KI-Chat ist derzeit nicht verfügbar (Gemini nicht initialisiert). Bitte versuche es später erneut.')
                    .setFooter({ text: 'SakuraAI • Chat-System', iconURL: LOGO_URL })
                    .setTimestamp();

                return await interaction.reply({
                    embeds: [notAvailableEmbed],
                    flags: MessageFlags.Ephemeral
                });
            }

            const question = interaction.options.getString('frage');
            const userId = interaction.user.id;

            // WICHTIG: API Aufrufe dauern länger als 3 Sekunden. Wir müssen deferReply nutzen!
            await interaction.deferReply();

            try {
                // Hole bisherigen Verlauf und starte Chat-Session
                const history = getHistoryForGemini(userId);
                const chat = aiModel.startChat({ history });

                // Sende Nachricht an Gemini
                const result = await chat.sendMessage(question);
                const aiResponse = result.response.text();

                // Aktualisiere lokalen Verlauf
                addToHistory(userId, 'user', question);
                addToHistory(userId, 'model', aiResponse);

                // Erstelle Embed für die Antwort
                const responseEmbed = new EmbedBuilder()
                    .setColor(LOG_COLORS.INFO)
                    .setTitle('💬 SakuraAI Antwort')
                    .setDescription(aiResponse)
                    .addFields(
                        {
                            name: '📝 Frage',
                            value: question.length > 200 ? question.substring(0, 200) + '...' : question,
                            inline: false
                        },
                        {
                            name: '👤 Gefragt von',
                            value: interaction.user.tag,
                            inline: true
                        },
                        {
                            name: '✨ KI-Modell',
                            value: 'Google Gemini 2.5',
                            inline: true
                        }
                    )
                    .setFooter({
                        text: 'SakuraAI • Nutze /help für mehr Befehle',
                        iconURL: LOGO_URL
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [responseEmbed] });
                console.log(`✅ Gemini KI-Antwort für ${interaction.user.tag}`);

            } catch (apiError) {
                console.error('FEHLER BEIM GEMINI AUFRUF:', apiError);
                await interaction.editReply({
                    content: 'Entschuldige, ich konnte gerade nicht nachdenken. Bitte versuche es später noch einmal.'
                });
            }
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
                                value: '`/chat [frage]` - Chatte mit der echten KI\n`/help [thema]` - Zeige diese Hilfe',
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
                            {
                                name: '🔧 Status',
                                value: '✅ **Online (Google Gemini 2.5)**\n💡 Kann frei und intelligent auf alle Discord- und Serverfragen antworten.',
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

        if (error.code === 40060 || error.code === 10062) {
            return;
        }

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
                console.error('Konnnte nicht antworten:', replyError.message);
            }
        }
    }
}

// Chatverlauf löschen
export function clearUserChatHistory(userId) {
    if (chatHistories.has(userId)) {
        chatHistories.delete(userId);
        return true;
    }
    return false;
}

export function clearAllChatHistories() {
    const count = chatHistories.size;
    chatHistories.clear();
    return count;
}

export function getAIStatus() {
    return {
        initialized: aiInitialized,
        usingLocalAI: false, // Jetzt generativ
        openaiAvailable: true, // Alias f. Gemini Verfügbarkeit
        chatHistories: chatHistories.size
    };
}