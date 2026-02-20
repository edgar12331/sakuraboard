// ===============================
// Sakura Bot – functions/farben.js
// Fraktionsfarben-System - Einzelne Nachrichten Version
// ===============================

import { SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';
import { 
  listFraktionsfarben,
  getFraktionByKey,
  upsertFraktion,
  deleteFraktion,
  addFraktionLog
} from '../db/database.js';

// ===============================
// KONSTANTEN & CONFIG
// ===============================

const FRACTION_CHANNEL_ID = '1329517434599772200';
const LOGO_URL = 'https://i.postimg.cc/1381yM8G/grafik.png';
const ADMIN_ROLE_ID = '1096402401382109244'; // Admin Role ID


// ===============================
// RATE LIMITING SYSTEM
// ===============================

let deleteQueue = [];
const MAX_DELETES_PER_MINUTE = 5;
const MINUTE_IN_MS = 60 * 1000;

function canDeleteMore() {
  const now = Date.now();
  // Filtere alte Einträge (älter als 1 Minute)
  deleteQueue = deleteQueue.filter(timestamp => now - timestamp < MINUTE_IN_MS);
  
  // Prüfe ob Limit erreicht
  return deleteQueue.length < MAX_DELETES_PER_MINUTE;
}

function addDeleteToQueue() {
  const now = Date.now();
  deleteQueue.push(now);
  
  // Cleanup alle 5 Minuten
  if (deleteQueue.length > 0 && deleteQueue.length % 10 === 0) {
    deleteQueue = deleteQueue.filter(timestamp => now - timestamp < 5 * MINUTE_IN_MS);
  }
}

// ===============================
// ROLE CHECK FUNCTION
// ===============================

function hasAdminRole(member) {
  if (!member) return false;
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

// ===============================
// DATENVERWALTUNG
// ===============================

function mapRowToFraktion(row) {
  return {
    name: row.name,
    primär: row.primaer,
    sekundär: row.sekundaer,
    perlglanz: row.perlglanz,
    unterboden: row.unterboden,
    scheinwerfer: row.scheinwerfer,
    reifenqualm: row.reifenqualm,
    felgenfarbe: row.felgenfarbe,
    autor: row.autor,
    datum: row.datum instanceof Date ? row.datum.toISOString() : row.datum,
    nachrichtId: row.nachricht_id || null
  };
}

async function loadFraktionsDaten() {
  try {
    const rows = await listFraktionsfarben();
    const fraktionen = {};
    for (const row of rows) {
      fraktionen[row.name_key] = mapRowToFraktion(row);
    }
    return { fraktionen };
  } catch (error) {
    console.error('Fehler beim Laden der Fraktionsdaten:', error);
    return { fraktionen: {} };
  }
}

async function saveFraktionsDaten(data) {
  try {
    const fraktionen = data.fraktionen || {};
    const existingRows = await listFraktionsfarben();
    const existingKeys = new Set(existingRows.map(row => row.name_key));
    const nextKeys = new Set(Object.keys(fraktionen));

    for (const key of Object.keys(fraktionen)) {
      await upsertFraktion(fraktionen[key]);
    }

    for (const key of existingKeys) {
      if (!nextKeys.has(key)) {
        await deleteFraktion(key);
      }
    }
  } catch (error) {
    console.error('Fehler beim Speichern der Fraktionsdaten:', error);
  }
}

// ===============================
// NACHRICHTEN-PARSER (Verbessert)
// ===============================

function parseFraktionsNachricht(content, authorName) {
  try {
    console.log('📝 Parsing Nachricht:', content.substring(0, 100) + '...');
    
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    let fraktion = {
      name: '',
      primär: '',
      sekundär: '',
      perlglanz: '',
      unterboden: '',
      scheinwerfer: '',
      reifenqualm: '',
      felgenfarbe: '',
      autor: authorName,
      datum: new Date().toISOString(),
      nachrichtId: null
    };

    // 1. Versuche "Name der Fraktion: [Name]" zu finden
    for (let i = 0; i < lines.length; i++) {
      const nameMatch = lines[i].match(/Name (?:der )?(?:FR?aktion|Fraktion)[:\s]*([^-\n]+)/i);
      if (nameMatch) {
        fraktion.name = nameMatch[1].trim();
        break;
      }
    }

    // 2. Wenn nicht gefunden, erste Zeile als Name nehmen
    if (!fraktion.name && lines[0] && !lines[0].includes(':')) {
      fraktion.name = lines[0].trim();
    }

    // 3. Wenn immer noch kein Name, suche nach beliebiger Zeile ohne Doppelpunkt
    if (!fraktion.name) {
      for (const line of lines) {
        if (!line.includes(':') && line.length > 2) {
          fraktion.name = line.trim();
          break;
        }
      }
    }

    // Extrahiere Farben
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Primärfarbe
      if (lowerLine.includes('primär')) {
        const match = line.match(/Primär[:\s]*([^-\n]+)/i);
        if (match) fraktion.primär = match[1].trim();
      }
      
      // Sekundärfarbe
      if (lowerLine.includes('sekundär')) {
        const match = line.match(/Sekundär[:\s]*([^-\n]+)/i);
        if (match) fraktion.sekundär = match[1].trim();
      }
      
      // Perlglanz / Perleffekt
      if (lowerLine.includes('perlglanz') || lowerLine.includes('perleffekt')) {
        const match = line.match(/(?:Perlglanz|Perleffekt)[:\s]*([^-\n]+)/i);
        if (match) fraktion.perlglanz = match[1].trim();
      }
      
      // Unterboden
      if (lowerLine.includes('unterboden')) {
        const match = line.match(/Unterboden[:\s]*([^-\n]+)/i);
        if (match) fraktion.unterboden = match[1].trim();
      }
      
      // Scheinwerfer
      if (lowerLine.includes('scheinwerfer')) {
        const match = line.match(/Scheinwerfer[:\s]*([^-\n]+)/i);
        if (match) fraktion.scheinwerfer = match[1].trim();
      }
      
      // Reifenqualm
      if (lowerLine.includes('reifenqualm')) {
        const match = line.match(/Reifenqualm[:\s]*([^-\n]+)/i);
        if (match) fraktion.reifenqualm = match[1].trim();
      }
      
      // Felgenfarbe
      if (lowerLine.includes('felgenfarbe')) {
        const match = line.match(/Felgenfarbe[:\s]*([^-\n]+)/i);
        if (match) fraktion.felgenfarbe = match[1].trim();
      }
    }

    // Standardwerte für leere Felder
    if (!fraktion.primär) fraktion.primär = 'Nicht angegeben';
    if (!fraktion.sekundär) fraktion.sekundär = fraktion.primär;
    if (!fraktion.perlglanz) fraktion.perlglanz = 'Nicht angegeben';
    if (!fraktion.unterboden) fraktion.unterboden = 'Nicht angegeben';
    if (!fraktion.scheinwerfer) fraktion.scheinwerfer = 'Nicht angegeben';
    if (!fraktion.reifenqualm) fraktion.reifenqualm = 'Nicht angegeben';
    if (!fraktion.felgenfarbe) fraktion.felgenfarbe = 'Nicht angegeben';

    // Prüfe ob es eine gültige Fraktion ist
    if (!fraktion.name || fraktion.name.length < 2) {
      console.log('❌ Kein gültiger Fraktionsname gefunden');
      return null;
    }

    // Bereinige den Namen
    fraktion.name = fraktion.name.replace(/^["']|["']$/g, '').trim();

    console.log('✅ Fraktion geparsed:', fraktion.name);
    return fraktion;

  } catch (error) {
    console.error('Fehler beim Parsen der Fraktionsnachricht:', error);
    return null;
  }
}

// ===============================
// EMBED-ERSTELLUNG
// ===============================

function createFraktionsEmbed(fraktion) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`🎨 ${fraktion.name}`)
    .setThumbnail(LOGO_URL)
    .addFields(
      { 
        name: '🎨 Primär', 
        value: fraktion.primär || 'Nicht angegeben', 
        inline: true 
      },
      { 
        name: '🎨 Sekundär', 
        value: fraktion.sekundär || 'Nicht angegeben', 
        inline: true 
      },
      { 
        name: '✨ Perlglanz', 
        value: fraktion.perlglanz || 'Nicht angegeben', 
        inline: false 
      },
      { 
        name: '🔧 Unterboden', 
        value: fraktion.unterboden || 'Nicht angegeben', 
        inline: true 
      },
      { 
        name: '💡 Scheinwerfer', 
        value: fraktion.scheinwerfer || 'Nicht angegeben', 
        inline: true 
      },
      { 
        name: '💨 Reifenqualm', 
        value: fraktion.reifenqualm || 'Nicht angegeben', 
        inline: true 
      },
      { 
        name: '⚙️ Felgenfarbe', 
        value: fraktion.felgenfarbe || 'Nicht angegeben', 
        inline: true 
      }
    )
    .setFooter({ 
      text: `Eingereicht von ${fraktion.autor}`, 
      iconURL: LOGO_URL 
    })
    .setTimestamp(new Date(fraktion.datum));

  return embed;
}

// ===============================
// FRAKTIONEN-VERWALTUNG
// ===============================

async function getFraktionByName(name) {
  const row = await getFraktionByKey(name);
  return row ? mapRowToFraktion(row) : null;
}

async function updateFraktionByName(name, updatedData) {
  const existingFraktion = await getFraktionByName(name);
  if (!existingFraktion) {
    return { success: false, message: 'Fraktion nicht gefunden' };
  }

  const updatedFraktion = {
    ...existingFraktion,
    ...updatedData,
    name: existingFraktion.name,
    datum: existingFraktion.datum
  };

  await upsertFraktion(updatedFraktion);
  return { success: true, fraktion: updatedFraktion };
}

// ===============================
// SLASH-COMMANDS
// ===============================

export function registerFarbenCommands() {
  return [
    new SlashCommandBuilder()
      .setName('fraktionen')
      .setDescription('Zeigt alle Fraktionsfarben an')
      .toJSON(),
    
    new SlashCommandBuilder()
      .setName('fraktion-löschen')
      .setDescription('Löscht eine Fraktion')
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Name der zu löschenden Fraktion')
          .setRequired(true))
      .toJSON(),
    
    new SlashCommandBuilder()
      .setName('fraktion-aktualisieren')
      .setDescription('Aktualisiert die Farben einer Fraktion')
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Name der Fraktion')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('primär')
          .setDescription('Neue Primärfarbe')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('sekundär')
          .setDescription('Neue Sekundärfarbe')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('perlglanz')
          .setDescription('Neuer Perlglanz')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('unterboden')
          .setDescription('Neuer Unterboden')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('scheinwerfer')
          .setDescription('Neue Scheinwerferfarbe')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('reifenqualm')
          .setDescription('Neue Reifenqualmfarbe')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('felgenfarbe')
          .setDescription('Neue Felgenfarbe')
          .setRequired(false))
      .toJSON(),
    
    new SlashCommandBuilder()
      .setName('fraktion-hinzufügen')
      .setDescription('Fügt eine neue Fraktion hinzu')
      .addStringOption(option =>
        option.setName('name')
          .setDescription('Name der Fraktion')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('primär')
          .setDescription('Primärfarbe')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('sekundär')
          .setDescription('Sekundärfarbe')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('perlglanz')
          .setDescription('Perlglanz')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('unterboden')
          .setDescription('Unterboden')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('scheinwerfer')
          .setDescription('Scheinwerferfarbe')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('reifenqualm')
          .setDescription('Reifenqualmfarbe')
          .setRequired(false))
      .addStringOption(option =>
        option.setName('felgenfarbe')
          .setDescription('Felgenfarbe')
          .setRequired(false))
      .toJSON()
  ];
}

// ===============================
// INTERACTION HANDLER
// ===============================

export async function handleFarbenInteraction(interaction) {
  // ADMIN ROLEN PRÜFUNG für Löschen und Aktualisieren
  const isAdminCommand = interaction.commandName === 'fraktion-löschen' || 
                         interaction.commandName === 'fraktion-aktualisieren';
  
  if (isAdminCommand && !hasAdminRole(interaction.member)) {
    await interaction.reply({ 
      content: '❌ Nur Administratoren können diesen Befehl verwenden!',
      ephemeral: true
    });
    return;
  }

  // NEUER Befehl: fraktion-aktualisieren
  if (interaction.commandName === 'fraktion-aktualisieren') {
    await interaction.deferReply({ ephemeral: true });
    
    const name = interaction.options.getString('name');
    const fraktion = await getFraktionByName(name);
    
    if (!fraktion) {
      await interaction.editReply({ 
        content: `❌ Fraktion "${name}" nicht gefunden.` 
      });
      return;
    }
    
    // Sammle alle aktualisierten Felder
    const updates = {};
    const fields = ['primär', 'sekundär', 'perlglanz', 'unterboden', 'scheinwerfer', 'reifenqualm', 'felgenfarbe'];
    
    for (const field of fields) {
      const value = interaction.options.getString(field);
      if (value) {
        updates[field] = value;
      }
    }
    
    // Prüfe ob überhaupt etwas aktualisiert werden soll
    if (Object.keys(updates).length === 0) {
      await interaction.editReply({ 
        content: '❌ Keine Aktualisierungen angegeben.' 
      });
      return;
    }
    
    // Aktualisiere die Fraktion
    const result = await updateFraktionByName(name, updates);
    
    if (!result.success) {
      await interaction.editReply({ 
        content: result.message 
      });
      return;
    }
    
    // Aktualisiere die Nachricht im Channel
    try {
      const channel = await interaction.client.channels.fetch(FRACTION_CHANNEL_ID);
      const embed = createFraktionsEmbed(result.fraktion);
      
      if (result.fraktion.nachrichtId) {
        try {
          const message = await channel.messages.fetch(result.fraktion.nachrichtId);
          await message.edit({ embeds: [embed] });
        } catch (error) {
          // Nachricht nicht gefunden, erstelle neue
          const newMessage = await channel.send({ embeds: [embed] });
          result.fraktion.nachrichtId = newMessage.id;
          await updateFraktionByName(name, { nachrichtId: newMessage.id });
        }
      } else {
        // Keine Nachricht-ID vorhanden, erstelle neue
        const newMessage = await channel.send({ embeds: [embed] });
        result.fraktion.nachrichtId = newMessage.id;
        await updateFraktionByName(name, { nachrichtId: newMessage.id });
      }
      
      await interaction.editReply({ 
        content: `✅ Fraktion **${result.fraktion.name}** erfolgreich aktualisiert!` 
      });
      
      await addFraktionLog('update', fraktion.name, interaction.user.tag, interaction.user.id, { updates });
      
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Nachricht:', error);
      await interaction.editReply({ 
        content: `✅ Fraktion aktualisiert, aber Fehler beim Aktualisieren der Nachricht: ${error.message}` 
      });
    }
    return;
  }
  
  // NEUER Befehl: fraktion-hinzufügen
  if (interaction.commandName === 'fraktion-hinzufügen') {
    await interaction.deferReply({ ephemeral: true });
    
    const name = interaction.options.getString('name');
    const primär = interaction.options.getString('primär');
    
    // Prüfe ob Fraktion bereits existiert
    const existing = await getFraktionByName(name);
    if (existing) {
      await interaction.editReply({ 
        content: `❌ Fraktion "${name}" existiert bereits.` 
      });
      return;
    }
    
    // Erstelle neue Fraktion
    const newFraktion = {
      name: name,
      primär: primär,
      sekundär: interaction.options.getString('sekundär') || primär,
      perlglanz: interaction.options.getString('perlglanz') || 'Nicht angegeben',
      unterboden: interaction.options.getString('unterboden') || 'Nicht angegeben',
      scheinwerfer: interaction.options.getString('scheinwerfer') || 'Nicht angegeben',
      reifenqualm: interaction.options.getString('reifenqualm') || 'Nicht angegeben',
      felgenfarbe: interaction.options.getString('felgenfarbe') || 'Nicht angegeben',
      autor: interaction.member?.displayName || interaction.user.username,
      datum: new Date().toISOString(),
      nachrichtId: null
    };
    
    // Speichere Fraktion
    const daten = await loadFraktionsDaten();
    daten.fraktionen[name.toLowerCase()] = newFraktion;
    await saveFraktionsDaten(daten);
    
    // Erstelle Nachricht im Channel
    try {
      const channel = await interaction.client.channels.fetch(FRACTION_CHANNEL_ID);
      const embed = createFraktionsEmbed(newFraktion);
      const message = await channel.send({ embeds: [embed] });
      
      // Speichere Nachrichten-ID
      newFraktion.nachrichtId = message.id;
      daten.fraktionen[name.toLowerCase()] = newFraktion;
      await saveFraktionsDaten(daten);
      
      await interaction.editReply({ 
        content: `✅ Fraktion **${newFraktion.name}** erfolgreich hinzugefügt!` 
      });
      
    } catch (error) {
      console.error('Fehler beim Erstellen der Nachricht:', error);
      await interaction.editReply({ 
        content: `✅ Fraktion gespeichert, aber Fehler beim Erstellen der Nachricht: ${error.message}` 
      });
    }
    return;
  }
  
  // Befehl: fraktionen (Öffentlich)
  if (interaction.commandName === 'fraktionen') {
    await interaction.deferReply({ ephemeral: true });
    
    const daten = await loadFraktionsDaten();
    const fraktionen = Object.values(daten.fraktionen || {});
    
    if (fraktionen.length === 0) {
      await interaction.editReply({ 
        content: '📭 Noch keine Fraktionen eingetragen.' 
      });
      return;
    }
    
    const sorted = fraktionen.sort((a, b) => a.name.localeCompare(b.name));
    
    let response = `## 📋 **Fraktionsliste (${sorted.length})**\n\n`;
    
    sorted.forEach((fraktion, index) => {
      response += `${index + 1}. **${fraktion.name}**\n`;
    });
    
    await interaction.editReply({ 
      content: response
    });
  }
  
  // Befehl: fraktion-löschen (Nur für Admins mit Rate Limit)
  if (interaction.commandName === 'fraktion-löschen') {
    await interaction.deferReply({ ephemeral: true });
    
    // Rate Limit prüfen
    if (!canDeleteMore()) {
      const remainingTime = 60 - Math.floor((Date.now() - deleteQueue[0]) / 1000);
      await interaction.editReply({ 
        content: `⏰ Rate Limit erreicht! Es können nur ${MAX_DELETES_PER_MINUTE} Fraktionen pro Minute gelöscht werden.\nBitte warte ${remainingTime} Sekunden.` 
      });
      return;
    }
    
    const name = interaction.options.getString('name');
    const daten = await loadFraktionsDaten();
    const lowerName = name.toLowerCase();
    
    if (!daten.fraktionen || !daten.fraktionen[lowerName]) {
      await interaction.editReply({ 
        content: `❌ Fraktion "${name}" nicht gefunden.` 
      });
      return;
    }
    
    const fraktion = daten.fraktionen[lowerName];
    
    // Versuche Nachricht zu löschen
    try {
      const channel = await interaction.client.channels.fetch(FRACTION_CHANNEL_ID);
      if (fraktion.nachrichtId) {
        try {
          const message = await channel.messages.fetch(fraktion.nachrichtId);
          await message.delete();
          console.log(`🗑️ Nachricht für "${fraktion.name}" gelöscht`);
        } catch (error) {
          console.log(`Nachricht für "${fraktion.name}" konnte nicht gelöscht werden:`, error.message);
        }
      }
    } catch (error) {
      console.log('Channel Fehler:', error.message);
    }
    
    // Fraktion aus Daten entfernen
    delete daten.fraktionen[lowerName];
    await saveFraktionsDaten(daten);
    
    // Rate Limiting aktualisieren
    addDeleteToQueue();
    
    await addFraktionLog('delete', fraktion.name, interaction.user.tag, interaction.user.id);
    
    const deleteCount = deleteQueue.length;
    const remainingDeletes = MAX_DELETES_PER_MINUTE - deleteCount;
    
    await interaction.editReply({ 
      content: `✅ Fraktion **${fraktion.name}** wurde gelöscht.\n\n📊 **Rate Limit:** ${deleteCount}/${MAX_DELETES_PER_MINUTE} (Noch ${remainingDeletes} in dieser Minute)` 
    });
  }
}

// ===============================
// EVENT-HANDLER INITIALISIERUNG
// ===============================

export function initFarbenSystem(client) {
  console.log('🎨 Fraktionsfarben-System wird initialisiert...');
  
  // Rate Limiting Timer (alle Minute cleanup)
  setInterval(() => {
    const now = Date.now();
    deleteQueue = deleteQueue.filter(timestamp => now - timestamp < MINUTE_IN_MS);
  }, MINUTE_IN_MS);

  // Channel-Monitoring einrichten
  client.on('messageCreate', async (message) => {
    try {
      // Prüfe ob Nachricht im richtigen Channel
      if (message.channel.id !== FRACTION_CHANNEL_ID) return;
      
      // Ignoriere Bot-Nachrichten
      if (message.author.bot) return;

      console.log(`📥 Neue Nachricht von ${message.author.tag}:`, message.content.substring(0, 50) + '...');

      // Prüfe ob Nachricht Fraktionsdaten enthält
      const content = message.content;
      if (!content || content.trim().length < 10) {
        try {
          await message.delete();
          const infoMsg = await message.channel.send({
            content: `❌ <@${message.author.id}>, deine Nachricht ist zu kurz für eine Fraktion.`
          });
          setTimeout(async () => {
            try {
              await infoMsg.delete();
            } catch (e) {}
          }, 5000);
        } catch (error) {}
        return;
      }

      // Hole den Server-Namen des Users
      const authorName = message.member?.displayName || message.author.username;

      // Parse die Nachricht
      const fraktion = parseFraktionsNachricht(content, authorName);
      if (!fraktion) {
        try {
          await message.delete();
          const infoMsg = await message.channel.send({
            content: `❌ <@${message.author.id}>, deine Nachricht konnte nicht als Fraktion erkannt werden.\n\n**Format:**\nName der Fraktion: [Name]\nPrimär: [Farbe]\nSekundär: [Farbe]\n...`
          });
          setTimeout(async () => {
            try {
              await infoMsg.delete();
            } catch (e) {}
          }, 10000);
        } catch (error) {
          console.warn('Fehler bei ungültiger Nachricht:', error);
        }
        return;
      }

      console.log(`🎨 Fraktion erkannt: "${fraktion.name}" von ${authorName}`);

      // Lade existierende Daten
      const daten = await loadFraktionsDaten();
      if (!daten.fraktionen) daten.fraktionen = {};

      // Prüfe ob Fraktion bereits existiert
      const existingFraktion = daten.fraktionen[fraktion.name.toLowerCase()];
      let responseMessage;

      if (existingFraktion) {
        // Prüfe ob User Admin ist oder der ursprüngliche Autor
        const isAdmin = hasAdminRole(message.member);
        const isOriginalAuthor = existingFraktion.autor === authorName;
        
        if (!isAdmin && !isOriginalAuthor) {
          // Kein Admin und nicht der ursprüngliche Autor
          try {
            await message.delete();
            const infoMsg = await message.channel.send({
              content: `❌ <@${message.author.id}>, du kannst nur deine eigene Fraktion aktualisieren oder benötigst Admin-Rechte!`
            });
            setTimeout(async () => {
              try {
                await infoMsg.delete();
              } catch (e) {}
            }, 5000);
          } catch (error) {}
          return;
        }
        
        // Fraktion existiert bereits - bearbeite die vorhandene Nachricht
        console.log(`🔄 Fraktion "${fraktion.name}" existiert bereits, aktualisiere...`);
        
        // Füge neue Daten hinzu
        fraktion.datum = existingFraktion.datum; // Behalte ursprüngliches Datum
        fraktion.nachrichtId = existingFraktion.nachrichtId; // Behalte Nachrichten-ID
        
        // Lösche die alte Fraktionsnachricht
        if (existingFraktion.nachrichtId) {
          try {
            const oldMessage = await message.channel.messages.fetch(existingFraktion.nachrichtId);
            await oldMessage.delete();
            console.log(`🗑️ Alte Nachricht für "${fraktion.name}" gelöscht`);
          } catch (error) {
            console.log(`Alte Nachricht für "${fraktion.name}" nicht gefunden`);
          }
        }
        
        // Erstelle neue Nachricht
        const embed = createFraktionsEmbed(fraktion);
        const newMessage = await message.channel.send({ embeds: [embed] });
        fraktion.nachrichtId = newMessage.id;
        
        responseMessage = `✏️ Fraktion **${fraktion.name}** wurde aktualisiert!`;
        
      } else {
        // Neue Fraktion - erstelle Nachricht
        console.log(`🆕 Neue Fraktion: "${fraktion.name}"`);
        
        const embed = createFraktionsEmbed(fraktion);
        const newMessage = await message.channel.send({ embeds: [embed] });
        fraktion.nachrichtId = newMessage.id;
        
        responseMessage = `✅ Fraktion **${fraktion.name}** wurde hinzugefügt!`;
      }

      // Speichere Fraktion in Daten
      daten.fraktionen[fraktion.name.toLowerCase()] = fraktion;
      await saveFraktionsDaten(daten);

      // Lösche die Original-Nachricht
      try {
        await message.delete();
        console.log(`🗑️ Original-Nachricht von ${authorName} gelöscht`);
      } catch (deleteError) {
        console.warn('Konnte Original-Nachricht nicht löschen:', deleteError.message);
      }

      // Sende Bestätigung und lösche sie nach 5 Sekunden
      const confirmation = await message.channel.send(responseMessage);
      setTimeout(async () => {
        try {
          await confirmation.delete();
        } catch (e) {}
      }, 5000);

    } catch (error) {
      console.error('❌ Fehler im Fraktionen-System:', error);
    }
  });

  // Reagiere auf Nachrichten-Updates (falls bearbeitet)
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      if (newMessage.channel.id !== FRACTION_CHANNEL_ID) return;
      if (newMessage.author.bot) return;
      if (oldMessage.content === newMessage.content) return;

      console.log(`✏️ Nachricht wurde bearbeitet von ${newMessage.author.tag}`);

      // Gleiche Logik wie bei messageCreate
      const authorName = newMessage.member?.displayName || newMessage.author.username;
      const fraktion = parseFraktionsNachricht(newMessage.content, authorName);
      if (!fraktion) return;

      const daten = await loadFraktionsDaten();
      if (!daten.fraktionen) daten.fraktionen = {};

      const existingFraktion = daten.fraktionen[fraktion.name.toLowerCase()];
      
      if (existingFraktion) {
        // Prüfe ob User Admin ist oder der ursprüngliche Autor
        const isAdmin = hasAdminRole(newMessage.member);
        const isOriginalAuthor = existingFraktion.autor === authorName;
        
        if (!isAdmin && !isOriginalAuthor) {
          try {
            await newMessage.delete();
            const infoMsg = await newMessage.channel.send({
              content: `❌ <@${newMessage.author.id}>, du kannst nur deine eigene Fraktion aktualisieren oder benötigst Admin-Rechte!`
            });
            setTimeout(async () => {
              try {
                await infoMsg.delete();
              } catch (e) {}
            }, 5000);
          } catch (error) {}
          return;
        }
        
        // Aktualisiere vorhandene Fraktion
        fraktion.datum = existingFraktion.datum;
        fraktion.nachrichtId = existingFraktion.nachrichtId;
        
        // Lösche die alte Bot-Nachricht
        if (existingFraktion.nachrichtId) {
          try {
            const oldBotMessage = await newMessage.channel.messages.fetch(existingFraktion.nachrichtId);
            await oldBotMessage.delete();
          } catch (error) {}
        }
        
        // Erstelle neue Nachricht
        const embed = createFraktionsEmbed(fraktion);
        const newBotMessage = await newMessage.channel.send({ embeds: [embed] });
        fraktion.nachrichtId = newBotMessage.id;
        
        const confirmation = await newMessage.channel.send(`✏️ Fraktion **${fraktion.name}** wurde aktualisiert!`);
        setTimeout(async () => {
          try {
            await confirmation.delete();
          } catch (e) {}
        }, 5000);
      }

      // Lösche die bearbeitete User-Nachricht
      try {
        await newMessage.delete();
      } catch (error) {
        console.warn('Konnte bearbeitete Nachricht nicht löschen:', error.message);
      }

      // Speichere Daten
      daten.fraktionen[fraktion.name.toLowerCase()] = fraktion;
      await saveFraktionsDaten(daten);

    } catch (error) {
      console.error('Fehler bei Nachrichten-Update:', error);
    }
  });

  // Initialisiere beim Bot-Start
  client.once('ready', async () => {
    console.log('✅ Fraktionsfarben-System bereit');
    
    setTimeout(async () => {
      try {
        const channel = await client.channels.fetch(FRACTION_CHANNEL_ID);
        if (channel) {
          console.log(`📂 Channel ${channel.name} geladen`);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Channels:', error);
      }
    }, 3000);
  });
}