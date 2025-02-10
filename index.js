require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not found in .env file');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2';

const SPAM_THRESHOLD = 5;
const SPAM_WINDOW = 60000;
const MESSAGE_COOLDOWN = 3000;

const userStates = new Map();
const processingUsers = new Set();

function getUserState(userId) {
    if (!userStates.has(userId)) {
        userStates.set(userId, {
            messageCount: 0,
            lastMessageTime: 0,
            warnings: 0,
            spamTimer: null,
            messageQueue: [],
            isProcessing: false
        });
    }
    return userStates.get(userId);
}

function resetSpamCount(userId) {
    const userState = getUserState(userId);
    userState.messageCount = 0;
    userState.spamTimer = null;
}

const SPEED_CHARACTERISTICS = {
    catchphrases: [
        "SEWEY!",
        "Let's go!",
        "Yo, what's good?",
        "Nah bro, you wildin'",
        "That's crazy!",
        "SIUUUU!",
        "CR7 THE GOAT!"
    ],
    interests: [
        "soccer",
        "cristiano ronaldo",
        "gaming",
        "streaming",
        "fifa",
        "football",
        "manchester united",
        "portugal"
    ],
    personality: {
        traits: [
            "energetic",
            "loud",
            "dramatic",
            "enthusiastic",
            "passionate"
        ]
    }
};

function addSpeedPersonality(response) {
    let modifiedResponse = response;
    
    SPEED_CHARACTERISTICS.catchphrases.forEach(phrase => {
        modifiedResponse = modifiedResponse.replace(new RegExp(phrase, 'gi'), '');
    });
    
    const random = Math.random();
    
    if (random < 0.4) {
        const catchphrase = SPEED_CHARACTERISTICS.catchphrases[
            Math.floor(Math.random() * SPEED_CHARACTERISTICS.catchphrases.length)
        ];
        modifiedResponse = `${catchphrase} ${modifiedResponse}`;
    }
    
    if (random < 0.3) {
        const words = modifiedResponse.split(' ');
        const randomWordIndex = Math.floor(Math.random() * words.length);
        words[randomWordIndex] = words[randomWordIndex].toUpperCase();
        modifiedResponse = words.join(' ');
    }

    if (random < 0.35) {
        const interjections = ['Yo', 'Bro', 'Fam'];
        const randomInterjection = interjections[Math.floor(Math.random() * interjections.length)];
        modifiedResponse = `${randomInterjection}, ${modifiedResponse}`;
    }

    return modifiedResponse.trim();
}

function isAboutSpeedInterests(message) {
    return SPEED_CHARACTERISTICS.interests.some(interest => 
        message.toLowerCase().includes(interest.toLowerCase())
    );
}

function generatePrompt(userMessage) {
    return `You are IShowSpeed (Speed), a 19-year-old energetic YouTuber and streamer known for your dramatic personality and love for Cristiano Ronaldo. You are extremely passionate about football/soccer, particularly about Ronaldo, and you often get very excited and use caps lock. You like to use words like "bro" and "fam". Keep your response concise and energetic.

Current message to respond to: "${userMessage}"`;
}

async function checkOllamaConnection() {
    try {
        await axios.post(OLLAMA_API_URL, {
            model: OLLAMA_MODEL,
            prompt: "test",
            stream: false
        });
        return true;
    } catch (error) {
        console.error('Ollama connection test failed:', error.message);
        return false;
    }
}

async function generateResponse(prompt) {
    try {
        const response = await axios.post(OLLAMA_API_URL, {
            model: OLLAMA_MODEL,
            prompt: generatePrompt(prompt),
            stream: false
        }, {
            timeout: 30000
        });
        
        let reply = response.data.response;
        
        if (isAboutSpeedInterests(prompt)) {
            reply = addSpeedPersonality(reply);
        }
        
        return reply;
    } catch (error) {
        console.error('Error calling Ollama API:', error.message);
        if (error.code === 'ECONNREFUSED') {
            return 'Yo, my bad bro! Looks like my brain (Ollama) isn\'t running! Tell my developer to start it up! SEWEY!';
        }
        return 'Yo, my bad bro! Something went wrong. Try again?';
    }
}

async function processMessageQueue(userId, chatId) {
    const userState = getUserState(userId);
    
    if (userState.isProcessing || userState.messageQueue.length === 0) {
        return;
    }

    userState.isProcessing = true;
    
    try {
        const message = userState.messageQueue.shift();
        const response = await generateResponse(message);
        await bot.sendMessage(chatId, response);
    } catch (error) {
        console.error('Error processing message queue:', error);
    } finally {
        userState.isProcessing = false;
        userState.lastMessageTime = Date.now();
        
        setTimeout(() => {
            processMessageQueue(userId, chatId);
        }, MESSAGE_COOLDOWN);
    }
}

async function handleSpamProtection(userId, chatId) {
    const userState = getUserState(userId);
    userState.messageCount++;

    if (!userState.spamTimer) {
        userState.spamTimer = setTimeout(() => resetSpamCount(userId), SPAM_WINDOW);
    }

    if (userState.messageCount >= SPAM_THRESHOLD && userState.warnings < 2) {
        userState.warnings++;
        await bot.sendMessage(chatId, "Yo bro, you're sending messages TOO FAST! Chill out! SEWEY! ⚠️");
    }

    return userState.messageCount > SPAM_THRESHOLD;
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userMessage = msg.text;
    
    if (userMessage === '/start') {
        return;
    }
    
    if (!userMessage) {
        await bot.sendMessage(chatId, "Yo bro, send me some text to respond to!");
        return;
    }

    const userState = getUserState(userId);
    
    const isSpamming = await handleSpamProtection(userId, chatId);
    if (isSpamming) return;

    const timeSinceLastMessage = Date.now() - userState.lastMessageTime;
    if (timeSinceLastMessage < MESSAGE_COOLDOWN && userState.isProcessing) {
        await bot.sendMessage(chatId, "Yo fam, let me answer your first message before sending another one! SEWEY!");
        return;
    }

    userState.messageQueue.push(userMessage);
    
    bot.sendChatAction(chatId, 'typing');
    
    processMessageQueue(userId, chatId);
});

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = "SEWEY! What's good bro! I'm Speed, and I'm here to chat with you! Let's talk about soccer, gaming, or whatever you want! CR7 THE GOAT!";
    await bot.sendMessage(chatId, welcomeMessage);
});

async function startBot() {
    console.log('Checking Ollama connection...');
    const ollamaAvailable = await checkOllamaConnection();
    
    if (!ollamaAvailable) {
        console.error('ERROR: Cannot connect to Ollama. Please make sure:');
        console.error('1. Ollama is installed (https://ollama.ai/)');
        console.error('2. Ollama is running locally');
        console.error('3. You have pulled the Llama 2 model (run: ollama pull llama2)');
        process.exit(1);
    }
    
    console.log('Ollama connection successful!');
    console.log('Speed bot is running... SEWEY!');
}

bot.on('error', (error) => {
    console.error('Telegram bot error:', error);
});

setInterval(() => {
    const now = Date.now();
    for (const [userId, state] of userStates.entries()) {
        if (now - state.lastMessageTime > SPAM_WINDOW * 2) {
            userStates.delete(userId);
        }
    }
}, SPAM_WINDOW * 2);

startBot();