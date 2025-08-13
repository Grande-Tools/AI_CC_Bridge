# AI-CC-Bridge

> 📖 **Quick Start**: See [HOW-TO-USE.md](./HOW-TO-USE.md) for step-by-step integration examples.

A TypeScript library that bridges any project with your local Claude Code CLI, enabling seamless AI-powered assistance in your applications.

## Features

- 🚀 **Easy Integration**: Drop-in library for any Node.js/TypeScript project
- 🔄 **External Session Management**: Your application controls session UUIDs and lifecycle
- 🎯 **Smart Session Logic**: Auto-resume existing sessions or create new ones
- 🧩 **MCP Ready**: Works seamlessly with your MCP configurations
- 🛡️ **Error Handling**: Comprehensive error handling and logging
- 📝 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🔧 **Zero Configuration**: Just install and use

## Installation

```bash
npm install github:Grande-Tools/AI_CC_Bridge
```

**Prerequisites**: Claude Code CLI must be installed and available in your system PATH:

```bash
npm install -g @anthropic-ai/claude-code
```

**Auto-Setup**: When you install AI-CC-Bridge, it automatically creates:
- `.mcp.json` (empty - configure your MCP servers here)
- `.claude/settings.json` (enables MCP permissions automatically)

## Quick Start

### Basic Usage
```typescript
import { CCModules } from '@grande-tools/ai-cc-bridge';
import { randomUUID } from 'crypto';

// Initialize AI-CC-Bridge
const ccModules = CCModules.create();
await ccModules.initialize();

// Your application manages session IDs
const sessionId = randomUUID();

// First message creates new session
const response1 = await ccModules.ask('What is TypeScript?', sessionId);

// Second message resumes existing session
const response2 = await ccModules.ask('Give me an example', sessionId);
```

### With MCP Support
```typescript
import { CCModules } from '@grande-tools/ai-cc-bridge';
import { randomUUID } from 'crypto';

// Create with MCP permission handling
const ccModules = CCModules.createWithMCPSupport();
await ccModules.initialize();

const sessionId = randomUUID();

// Use any MCP servers you've configured in .mcp.json
const response = await ccModules.ask('your question here', sessionId);
```

## API Reference

### CCModules Class

#### Static Methods

- `CCModules.create(config?, silent?)` - Create a new instance
- `CCModules.createWithMCPSupport(config?, silent?)` - Create with MCP permission handling

#### Instance Methods

- `initialize()` - Initialize and verify Claude Code CLI availability
- `ask(prompt, sessionId, config?)` - Send a query to Claude Code with session management
- `isReady()` - Check if Claude Code CLI is available
- `getClaudeVersion()` - Get Claude Code CLI version

### Configuration Options

```typescript
interface ClaudeCodeConfig {
  model?: string;                    // Claude model to use
  outputFormat?: 'text' | 'json' | 'stream-json';
  verbose?: boolean;                 // Enable verbose logging
  timeout?: number;                  // Request timeout in milliseconds
  dangerouslySkipPermissions?: boolean; // Skip MCP permission prompts
}
```

### Response Format

```typescript
interface ClaudeCodeResponse {
  success: boolean;
  data?: string;                     // Response content
  error?: string;                    // Error message if failed
  executionTime?: number;            // Execution time in milliseconds
}
```

## MCP Configuration (Optional)

If you want to use MCP servers, configure them in `.mcp.json`:

```json
{
  "mcpServers": {
    "your-server": {
      "type": "http",
      "url": "https://your-mcp-server.com/mcp"
    }
  }
}
```

The library handles MCP permissions automatically - no additional setup needed.

## Examples

### Basic Usage with Session Management

```javascript
const { CCModules } = require('@grande-tools/ai-cc-bridge');
const { randomUUID } = require('crypto');

async function basicExample() {
  const ccModules = CCModules.create();
  await ccModules.initialize();
  
  // Your application manages the session ID
  const sessionId = randomUUID();
  
  const response = await ccModules.ask('Explain async/await in JavaScript', sessionId);
  console.log(response.data);
  
  // Continue the same session
  const followUp = await ccModules.ask('Give me an example', sessionId);
  console.log(followUp.data);
}
```

### With Custom Configuration

```typescript
import { CCModules } from '@grande-tools/ai-cc-bridge';
import { randomUUID } from 'crypto';

const ccModules = CCModules.create({
  model: 'claude-3-5-sonnet-20241022',
  outputFormat: 'text',
  verbose: true,
  timeout: 45000
});

// Session management still required
const sessionId = randomUUID();
const response = await ccModules.ask('Your question', sessionId);
```

### Session Management

```typescript
import { randomUUID } from 'crypto';

// Your application manages session IDs
const sessionId = randomUUID();

// First message creates the session
const firstResponse = await ccModules.ask('Tell me about React hooks', sessionId);

// Subsequent messages with same sessionId continue the conversation
const followUp = await ccModules.ask('Give me an example of useState', sessionId);

// Use different sessionId for different conversations
const anotherSessionId = randomUUID();
const newConversation = await ccModules.ask('What is TypeScript?', anotherSessionId);
```

### Error Handling

```typescript
import { randomUUID } from 'crypto';

const sessionId = randomUUID();
const response = await ccModules.ask('Your question here', sessionId);

if (response.success) {
  console.log('✅ Success:', response.data);
  console.log('⏱️ Execution time:', response.executionTime, 'ms');
} else {
  console.error('❌ Error:', response.error);
}
```

## Use Cases

### Telegram Bot Integration

```typescript
import TelegramBot from 'node-telegram-bot-api';
import { CCModules } from '@grande-tools/ai-cc-bridge';
import { randomUUID } from 'crypto';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });
const ccModules = CCModules.create();

// Store session per chat ID
const chatSessions = new Map<number, string>();

bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    // Get or create session for this chat
    let sessionId = chatSessions.get(msg.chat.id);
    if (!sessionId) {
      sessionId = randomUUID();
      chatSessions.set(msg.chat.id, sessionId);
    }
    
    const response = await ccModules.ask(msg.text, sessionId);
    if (response.success) {
      await bot.sendMessage(msg.chat.id, response.data!);
    }
  }
});
```

### Express.js API

```typescript
import express from 'express';
import { CCModules } from '@grande-tools/ai-cc-bridge';
import { randomUUID } from 'crypto';

const app = express();
const ccModules = CCModules.create();

app.post('/api/ask', async (req, res) => {
  const { prompt, sessionId } = req.body;
  
  // Use provided sessionId or create new one
  const actualSessionId = sessionId || randomUUID();
  
  const response = await ccModules.ask(prompt, actualSessionId);
  res.json({ ...response, sessionId: actualSessionId });
});
```

### Discord Bot

```typescript
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { CCModules } from '@grande-tools/ai-cc-bridge';
import { randomUUID } from 'crypto';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const ccModules = CCModules.create();

// Store session per channel/thread
const channelSessions = new Map<string, string>();

client.on(Events.MessageCreate, async (message) => {
  if (message.content.startsWith('!ask ')) {
    const prompt = message.content.slice(5);
    
    // Get or create session for this channel
    let sessionId = channelSessions.get(message.channelId);
    if (!sessionId) {
      sessionId = randomUUID();
      channelSessions.set(message.channelId, sessionId);
    }
    
    const response = await ccModules.ask(prompt, sessionId);
    if (response.success) {
      await message.reply(response.data!);
    }
  }
});
```


## How Session Management Works

AI-CC-Bridge uses a smart session strategy:

1. **First call with UUID**: Tries `--resume UUID`, falls back to `--session-id UUID` (creates new)
2. **Subsequent calls**: Uses `--resume UUID` to continue existing conversation
3. **Context preserved**: Claude remembers previous messages within the same session
4. **External control**: Your application manages session UUIDs and lifecycle

## Development

```bash
npm install    # Install dependencies
npm run build  # Build the library
npm test       # Run tests
npm run dev    # Watch mode
```

## Requirements

- Node.js >= 16.0.0
- Claude Code CLI installed and configured
- Valid Claude API credentials

## Documentation

See [HOW-TO-USE.md](./HOW-TO-USE.md) for detailed integration examples.

## License

MIT