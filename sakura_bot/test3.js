import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from './config.js';

const SYSTEM_INSTRUCTION = `Du bist SakuraAI.`; // Short version first

async function testExactAi() {
    console.log('Key:', GEMINI_API_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const aiModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_INSTRUCTION
    });

    const chatHistories = new Map();
    const userId = '123';
    chatHistories.set(userId, []);

    try {
        const history = chatHistories.get(userId);
        const chat = aiModel.startChat({ history });
        const result = await chat.sendMessage('Hallo');
        console.log('Antwort:', result.response.text());
    } catch (apiError) {
        console.error('API Error details:', apiError);
    }
}
testExactAi();
