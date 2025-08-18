# How to Use AI-CC-Bridge

## Step 1: Install

```bash
npm install github:Grande-Tools/AI_CC_Bridge
npm install -g @anthropic-ai/claude-code
```

**Auto-Setup**: Installation automatically:
- Creates `.mcp.json` (empty - configure your MCP servers if needed)
- Discovers all MCP tools from existing `.mcp.json` files  
- Creates `.claude/settings.json` with:
  - Individual MCP tools in allow list
  - Bash commands blocked with `Bash(*)` deny pattern
  - Auto MCP approval enabled

**CLAUDE.md Support**: Automatically detects and includes project context from CLAUDE.md files

## Step 2: Basic Usage

```javascript
const { CCModules } = require('@grande-tools/ai-cc-bridge');
const { randomUUID } = require('crypto');

// Basic setup
const ccModules = CCModules.create();
await ccModules.initialize();

// Create session ID
const sessionId = randomUUID();

// Ask questions
const response1 = await ccModules.ask('My name is John', sessionId);
const response2 = await ccModules.ask('What is my name?', sessionId);
// Claude remembers: "Your name is John"

console.log(response2.data);
```

## Step 3: With MCP Support

```javascript
const { CCModules } = require('@grande-tools/ai-cc-bridge');
const { randomUUID } = require('crypto');

// Enable MCP permission handling
const ccModules = CCModules.createWithMCPSupport();
await ccModules.initialize();

const sessionId = randomUUID();

// Works with any MCP servers you've configured
const response = await ccModules.ask('your question', sessionId);
console.log(response.data);
```

## Step 4: MCP Configuration & Discovery

### Supported MCP Transports

Configure any MCP server type in `.mcp.json`:

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    },
    "websocket-server": {
      "type": "websocket",
      "url": "wss://ws-mcp.example.com/mcp"  
    },
    "local-server": {
      "type": "stdio",
      "command": "node",
      "args": ["my-mcp-server.js"]
    },
    "sse-server": {
      "type": "sse", 
      "url": "https://sse-mcp.example.com/mcp"
    }
  }
}
```

### Automatic Tool Discovery

The library automatically discovers tools:

```javascript
const { setupMcpPermissions } = require('@grande-tools/ai-cc-bridge');

// Discover and configure all MCP tools
await setupMcpPermissions('./my-project');

// Creates .claude/settings.json with:
// {
//   "permissions": {
//     "allow": ["mcp__context7__resolve-library-id", "mcp__context7__get-library-docs"],
//     "deny": ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)", "Grep(*)", "Glob(*)", "List(*)", "View(*)"]
//   },
//   "enableAllProjectMcpServers": true
// }
```

### Manual Discovery

```javascript
const { discoverMcpTools } = require('@grande-tools/ai-cc-bridge');

// Just discover tools (no settings update)
const result = await discoverMcpTools('./my-project');

console.log('Found tools:');
result.tools.forEach(tool => {
  console.log(`- ${tool.fullToolName} (from ${tool.serverName})`);
});
```

### Security Features

- **Bash Blocking**: All `Bash(*)` commands are automatically denied
- **Individual Tools**: Only discovered MCP tools are allowed  
- **Smart Fallback**: Tries multiple transports if connection fails
- **Safe by Default**: Blocks dangerous commands while allowing legitimate tools

## Real-World Examples

### Telegram Bot

```javascript
const TelegramBot = require('node-telegram-bot-api');
const { CCModules } = require('@grande-tools/ai-cc-bridge');
const { randomUUID } = require('crypto');

const bot = new TelegramBot('YOUR_BOT_TOKEN', { polling: true });
const ccModules = CCModules.createWithMCPSupport();
await ccModules.initialize();

const sessions = new Map(); // chatId -> sessionId

bot.on('message', async (msg) => {
  if (!msg.text) return;
  
  // Get or create session for this chat
  let sessionId = sessions.get(msg.chat.id);
  if (!sessionId) {
    sessionId = randomUUID();
    sessions.set(msg.chat.id, sessionId);
  }
  
  const response = await ccModules.ask(msg.text, sessionId);
  if (response.success) {
    bot.sendMessage(msg.chat.id, response.data);
  }
});
```

### Express API

```javascript
const express = require('express');
const { CCModules } = require('@grande-tools/ai-cc-bridge');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());

const ccModules = CCModules.createWithMCPSupport();
await ccModules.initialize();

const sessions = new Map(); // userId -> sessionId

app.post('/chat', async (req, res) => {
  const { message, userId } = req.body;
  
  let sessionId = sessions.get(userId);
  if (!sessionId) {
    sessionId = randomUUID();
    sessions.set(userId, sessionId);
  }
  
  const response = await ccModules.ask(message, sessionId);
  res.json({ 
    message: response.data,
    success: response.success,
    executionTime: response.executionTime 
  });
});

app.listen(3000, () => console.log('Server running'));
```

### Discord Bot

```javascript
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { CCModules } = require('@grande-tools/ai-cc-bridge');
const { randomUUID } = require('crypto');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const ccModules = CCModules.createWithMCPSupport();

const channelSessions = new Map(); // channelId -> sessionId

client.on(Events.MessageCreate, async (message) => {
  if (message.content.startsWith('!ask ')) {
    const prompt = message.content.slice(5);
    
    let sessionId = channelSessions.get(message.channelId);
    if (!sessionId) {
      sessionId = randomUUID();
      channelSessions.set(message.channelId, sessionId);
    }
    
    const response = await ccModules.ask(prompt, sessionId);
    if (response.success) {
      await message.reply(response.data);
    }
  }
});

client.login('YOUR_BOT_TOKEN');
```

## Configuration Options

```javascript
// Basic configuration
const ccModules = CCModules.create({
  model: 'claude-3-5-sonnet-20241022',
  timeout: 60000,
  verbose: false
});

// With MCP support
const ccModules = CCModules.createWithMCPSupport({
  model: 'claude-3-5-sonnet-20241022',
  timeout: 45000,
  dangerouslySkipPermissions: true,  // Already enabled by default
  includeClaude: true                // Include CLAUDE.md context (default)
});
```

## MCP Setup (Optional)

If you want to use MCP servers, edit `.mcp.json`:

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

The library handles all MCP permissions automatically.

## CLAUDE.md Project Context

Add a `CLAUDE.md` file to your project root to provide context that will be automatically included:

```markdown
# My Project

This is a Node.js application that...

## Tech Stack
- Runtime: Node.js 18+
- Framework: Express.js
- Database: MongoDB

## Structure
- `src/routes/`: API endpoints
- `src/models/`: Database models
- `src/utils/`: Helper functions

## Commands
- `npm start`: Start the server
- `npm test`: Run tests
- `npm run dev`: Development mode

## Guidelines
- Use async/await syntax
- Follow REST API conventions
- Write tests for new features
```

The library will automatically include this context in your prompts for better responses.

## Error Handling

```javascript
const response = await ccModules.ask('question', sessionId);

if (response.success) {
  console.log('✅ Response:', response.data);
  console.log('⏱️ Time:', response.executionTime, 'ms');
} else {
  console.error('❌ Error:', response.error);
}
```

## Best Practices

### 1. Session Management
```javascript
// Store sessions in database for production
const sessions = new Map(); // For development only

// Use consistent session IDs per user/conversation
const sessionId = randomUUID(); 
```

### 2. Error Handling
```javascript
try {
  const response = await ccModules.ask(prompt, sessionId);
  if (!response.success) {
    console.error('Claude Error:', response.error);
  }
} catch (error) {
  console.error('System Error:', error.message);
}
```

### 3. Performance
```javascript
// Initialize once, reuse instance
const ccModules = CCModules.createWithMCPSupport();
await ccModules.initialize();

// Use reasonable timeouts
const config = { timeout: 30000 }; // 30 seconds
```

## Key Points

- **Session Management**: Use same sessionId to continue conversations
- **Memory**: Claude remembers context within sessions  
- **Multi-User**: Different sessionId for each user/conversation
- **MCP Ready**: Works with any MCP servers you configure
- **Auto-Setup**: Installation handles MCP permissions automatically
- **Production**: Store sessionIds in your database
- **Project Context**: Use CLAUDE.md files to provide automatic project context