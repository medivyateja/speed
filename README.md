# Speed Telegram Bot 🚀

A Telegram bot that embodies the energetic personality of IShowSpeed, powered by Ollama's LLM. The bot responds to messages with Speed's characteristic enthusiasm, especially when talking about football, Cristiano Ronaldo, or gaming.

## Features

- Personality mirroring IShowSpeed's energetic style
- Special responses for topics like CR7, football, and gaming
- Anti-spam protection
- Message queue system
- Rate limiting
- Customizable responses through Ollama

## Prerequisites

- Node.js (v14 or higher)
- npm
- [Ollama](https://ollama.ai/) installed and running locally
- Telegram Bot Token (get it from [@BotFather](https://t.me/botfather))

## Installation

1. Clone the repository:
```bash
git clone 
cd speed-telegram-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama2
```

4. Pull the Llama 2 model in Ollama:
```bash
ollama pull llama2
```

5. Start the bot:
```bash
node index.js
```

## Configuration

You can modify the following constants in `index.js` to adjust the bot's behavior:

- `SPAM_THRESHOLD`: Number of rapid messages before warning
- `SPAM_BAN_THRESHOLD`: Number of rapid messages before ban
- `SPAM_WINDOW`: Time window for spam detection
- `MESSAGE_COOLDOWN`: Minimum time between messages

## Contributing

Feel free to contribute to this project by submitting pull requests or creating issues.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.