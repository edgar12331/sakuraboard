import { initAI, handleAIIntersection } from './src/services/ai.js';

async function testDiscordCommand() {
    console.log('Bot starting test...');
    initAI();

    // Mock interaction
    const interaction = {
        commandName: 'chat',
        user: { id: '123456789', tag: 'TestUser#1234' },
        options: {
            getString: (name) => {
                if (name === 'frage') return 'Hallo, kannst du ein Bild erstellen?';
                return null;
            }
        },
        replied: false,
        deferred: false,
        deferReply: async () => { console.log('[Mock] interaction.deferReply() called'); interaction.deferred = true; },
        editReply: async (data) => { console.log('[Mock] interaction.editReply() called with:', JSON.stringify(data, null, 2)); },
        reply: async (data) => { console.log('[Mock] interaction.reply() called with:', data); }
    };

    try {
        await handleAIIntersection(null, interaction);
    } catch (e) {
        console.error('Test script caught error:', e);
    }
}

testDiscordCommand();
