# How to Use AI-CC-Bridge

## Step 1: Install

```bash
npm install github:Grande-Tools/AI_CC_Bridge
npm install -g @anthropic-ai/claude-code
```

## Step 2: Basic Setup

```javascript
const { CCModules } = require('@grande-tools/ai-cc-bridge');
const { randomUUID } = require('crypto');

const ccModules = CCModules.create();
await ccModules.initialize();
```

## Step 3: Use with Sessions

```javascript
// Create session ID
const sessionId = randomUUID();

// Ask questions
const response1 = await ccModules.ask('My name is John', sessionId);
const response2 = await ccModules.ask('What is my name?', sessionId);
// Claude remembers: "Your name is John"

console.log(response2.data);
```

## Real Examples

### Telegram Bot
```javascript
const TelegramBot = require('node-telegram-bot-api');
const { CCModules } = require('@grande-tools/ai-cc-bridge');

const bot = new TelegramBot('YOUR_BOT_TOKEN', { polling: true });
const ccModules = CCModules.create();
const sessions = new Map(); // chatId -> sessionId

bot.on('message', async (msg) => {
  if (!msg.text) return;
  
  // Get session for this chat
  let sessionId = sessions.get(msg.chat.id);
  if (!sessionId) {
    sessionId = randomUUID();
    sessions.set(msg.chat.id, sessionId);
  }
  
  const response = await ccModules.ask(msg.text, sessionId);
  bot.sendMessage(msg.chat.id, response.data);
});
```

### Express API
```javascript
const express = require('express');
const { CCModules } = require('@grande-tools/ai-cc-bridge');

const app = express();
const ccModules = CCModules.create();
const sessions = new Map(); // userId -> sessionId

app.post('/chat', async (req, res) => {
  const { message, userId } = req.body;
  
  let sessionId = sessions.get(userId);
  if (!sessionId) {
    sessionId = randomUUID();
    sessions.set(userId, sessionId);
  }
  
  const response = await ccModules.ask(message, sessionId);
  res.json({ message: response.data });
});
```

## Options

```javascript
// With configuration
const ccModules = CCModules.create({
  model: 'claude-3-5-sonnet-20241022',
  timeout: 60000,
  verbose: false
});

// Error handling
const response = await ccModules.ask('question', sessionId);
if (response.success) {
  console.log(response.data);
} else {
  console.log(response.error);
}
```

## Key Points

- **Sessions**: Use same sessionId to continue conversation
- **Memory**: Claude remembers within same session
- **Multiple Users**: Different sessionId for each user
- **Storage**: Store sessionId in your database for production