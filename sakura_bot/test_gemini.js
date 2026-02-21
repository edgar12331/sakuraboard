import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'AIzaSyAh2iNqAkVTGO270JcmFL-7OwZO6cL6_Cc';

async function testGemini() {
    console.log('Testing with key:', GEMINI_API_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: 'Du bist ein Test-Bot.'
    });

    try {
        const chat = model.startChat({ history: [] });
        const result = await chat.sendMessage('Hallo, wer bist du?');
        console.log('Antwort:', result.response.text());
    } catch (e) {
        console.error('Fehler:', e);
    }
}

testGemini();
