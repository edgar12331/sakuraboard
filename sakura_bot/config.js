// config.js - Liest Werte aus Environment Variables (für Production)
// Für lokale Entwicklung: Setze DIESE Werte direkt oder nutze eine .env Datei

export const TOKEN = process.env.TOKEN || "MTQ2MDM2MjQ0NjM5MjAwMDYwNQ.G7eopx.BOvMvpGdqkTK_T9pm3BeE_OrEkISjUAbzwF1Uk";
export const CLIENT_ID = process.env.CLIENT_ID || "1460362446392000605";

export const GUILD_ID = process.env.GUILD_ID || "1096402401382109237";
export const LOGO_URL = process.env.LOGO_URL || "https://i.postimg.cc/1381yM8G/grafik.png";

// Role IDs
export const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || '1096402401424060516'; // Inhaber
export const MOD_ROLE_ID = process.env.MOD_ROLE_ID || '1136028969481797743'; // B. King

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyB0lHzkYVClf50W7jSqqVTeFFh__QZKmZI';
