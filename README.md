# AI-CC-Bridge

> 📖 **Quick Start**: See [HOW-TO-USE.md](./HOW-TO-USE.md) for step-by-step integration examples.

A TypeScript library that bridges any project with your local Claude Code CLI, enabling seamless AI-powered assistance in your applications.

## Features

- 🚀 **Easy Integration**: Drop-in library for any Node.js/TypeScript project
- 🔄 **External Session Management**: Your application controls session UUIDs and lifecycle
- 🎯 **Smart Session Logic**: Auto-resume existing sessions or create new ones
- 🧩 **MCP Ready**: Works seamlessly with your MCP configurations
- 🔍 **Auto MCP Discovery**: Automatically discovers and configures MCP tools from all transport types
- 🛡️ **Security by Default**: Blocks dangerous bash commands with built-in deny list
- 🚀 **All Transports**: Supports stdio, HTTP, SSE, and WebSocket MCP transports
- 📝 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🔧 **Zero Configuration**: Just install and use
- 📄 **CLAUDE.md Support**: Automatically reads and includes project context from CLAUDE.md files

## Installation

```bash
npm install github:Grande-Tools/AI_CC_Bridge
```

**Prerequisites**: Claude Code CLI must be installed and available in your system PATH:

```bash
npm install -g @anthropic-ai/claude-code
```

**Auto-Setup**: When you install AI-CC-Bridge, it automatically:
- Creates `.mcp.json` (empty - configure your MCP servers here)
- Discovers all MCP tools from existing `.mcp.json` files
- Creates `.claude/settings.json` with:
  - Allow list for discovered MCP tools
  - Deny list blocking all Bash commands (`Bash(*)`)
  - MCP auto-approval enabled

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
- `getClaudeContext(startDir?)` - Read and format CLAUDE.md files for context

### Configuration Options

```typescript
interface ClaudeCodeConfig {
  model?: string;                    // Claude model to use
  outputFormat?: 'text' | 'json' | 'stream-json';
  verbose?: boolean;                 // Enable verbose logging
  timeout?: number;                  // Request timeout in milliseconds
  dangerouslySkipPermissions?: boolean; // Skip MCP permission prompts
  includeClaude?: boolean;           // Include CLAUDE.md context (default: true)
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

## MCP Configuration & Auto-Discovery

### Supported Transport Types

AI-CC-Bridge supports all MCP transport types:

```json
{
  "mcpServers": {
    "http-server": {
      "type": "http",
      "url": "https://your-mcp-server.com/mcp"
    },
    "websocket-server": {
      "type": "websocket", 
      "url": "wss://ws-server.com/mcp"
    },
    "sse-server": {
      "type": "sse",
      "url": "https://sse-server.com/mcp"
    },
    "local-server": {
      "type": "stdio",
      "command": "node",
      "args": ["server.js"]
    }
  }
}
```

### Automatic Tool Discovery

The library automatically:
1. **Discovers**: Connects to each MCP server using proper transport
2. **Lists Tools**: Calls `listTools()` to get actual tool names
3. **Smart Fallback**: Tries multiple transports if one fails
4. **Security**: Adds individual tools to allow list, blocks all Bash commands

### Manual Discovery

```typescript
import { setupMcpPermissions, discoverMcpTools } from '@grande-tools/ai-cc-bridge';

// Complete setup (recommended)
await setupMcpPermissions('./project-path');

// Discovery only (no settings update)  
const result = await discoverMcpTools('./project-path');
console.log(result.tools); // Individual tool names
```

### Security Features

- **Auto Bash Deny**: Adds `Bash(*)` to deny list by default
- **Individual Tool Allow**: Discovers specific tools like `mcp__context7__resolve-library-id`
- **Transport Fallback**: Tries HTTP → SSE → WebSocket automatically

## CLAUDE.md Support

AI-CC-Bridge automatically detects and includes CLAUDE.md files to provide project context to Claude. This enables better, more contextual responses.

### How it Works

1. **Auto-Detection**: Searches for `CLAUDE.md` or `CLAUDE.local.md` files starting from current directory up to project root
2. **Hierarchical Context**: Combines multiple CLAUDE.md files (project root, subdirectories)
3. **Smart Integration**: Automatically prepends context to your prompts unless disabled

### Example CLAUDE.md Structure

```markdown
# My Project

Brief overview of what this project does.

## Tech Stack
- Framework: Next.js 14
- Language: TypeScript 5.2
- Database: PostgreSQL

## Project Structure
- `src/app`: Next.js App Router pages
- `src/components`: Reusable React components
- `src/lib`: Core utilities

## Commands
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm test`: Run tests

## Code Style
- Use ES modules (import/export)
- Prefer functional components
- Follow conventional commits
```

### Configuration Options

```typescript
// Include CLAUDE.md context (default)
const response = await ccModules.ask('Help me implement a user component', sessionId);

// Disable CLAUDE.md context for specific requests
const response = await ccModules.ask('Generic question', sessionId, { includeClaude: false });

// Manually get CLAUDE.md context
const context = await ccModules.getClaudeContext();
```

### Using ClaudeMemoryReader Directly

```typescript
import { ClaudeMemoryReader } from '@grande-tools/ai-cc-bridge';

// Find and read all CLAUDE.md files
const memoryFiles = await ClaudeMemoryReader.findAndReadClaudeFiles();

// Get formatted context string
const context = ClaudeMemoryReader.formatForClaudeContext(memoryFiles);

// Search for specific sections
const techStackSections = ClaudeMemoryReader.getSectionsByTitle(memoryFiles, 'tech stack');
```

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