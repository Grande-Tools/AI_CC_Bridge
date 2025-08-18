import { promises as fs } from 'fs';
import * as path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';

export interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: 'stdio' | 'http' | 'sse' | 'websocket' | 'ws';
  url?: string;
}

export interface McpConfig {
  mcpServers?: Record<string, McpServerConfig>;
}

export interface McpToolInfo {
  serverName: string;
  toolName: string;
  fullToolName: string;
}

export interface McpDiscoveryResult {
  tools: McpToolInfo[];
  allowList: string[];
  mcpConfigs: Array<{ path: string; config: McpConfig }>;
}

export class McpDiscovery {
  
  static async discoverServerToolsUsingSDK(serverName: string, serverConfig: McpServerConfig): Promise<string[]> {
    console.log(`🔍 Discovering tools for MCP server: ${serverName}`);
    
    try {
      let client: Client;
      let transport: any;
      
      if (serverConfig.url && ['http', 'sse', 'websocket', 'ws'].includes(serverConfig.type || 'http')) {
        console.log(`🌐 Connecting to ${serverConfig.type || 'HTTP'} MCP server: ${serverName} at ${serverConfig.url}`);
        
        client = new Client({
          name: "ai-cc-bridge-discovery",
          version: "1.0.0"
        }, {
          capabilities: {}
        });
        
        // Try specific transport type first, then fallbacks
        if (serverConfig.type === 'websocket' || serverConfig.type === 'ws') {
          try {
            const wsUrl = new URL(serverConfig.url);
            if (wsUrl.protocol === 'http:') wsUrl.protocol = 'ws:';
            if (wsUrl.protocol === 'https:') wsUrl.protocol = 'wss:';
            transport = new WebSocketClientTransport(wsUrl);
            console.log(`🔗 Attempting WebSocket connection to ${serverName}`);
          } catch (wsError) {
            console.log(`⚠️ WebSocket failed for ${serverName}, trying HTTP fallback`);
            transport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
          }
        } else if (serverConfig.type === 'sse') {
          try {
            transport = new SSEClientTransport(new URL(serverConfig.url));
            console.log(`🔗 Attempting SSE connection to ${serverName}`);
          } catch (sseError) {
            console.log(`⚠️ SSE failed for ${serverName}, trying HTTP fallback`);
            transport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
          }
        } else {
          // Default to HTTP with SSE fallback
          try {
            transport = new StreamableHTTPClientTransport(new URL(serverConfig.url));
            console.log(`🔗 Attempting Streamable HTTP connection to ${serverName}`);
          } catch (streamableError) {
            console.log(`⚠️ Streamable HTTP failed for ${serverName}, trying SSE fallback`);
            try {
              transport = new SSEClientTransport(new URL(serverConfig.url));
              console.log(`🔗 Attempting SSE connection to ${serverName}`);
            } catch (sseError) {
              console.log(`⚠️ Both Streamable HTTP and SSE failed for ${serverName}, trying WebSocket fallback`);
              try {
                const wsUrl = new URL(serverConfig.url);
                if (wsUrl.protocol === 'http:') wsUrl.protocol = 'ws:';
                if (wsUrl.protocol === 'https:') wsUrl.protocol = 'wss:';
                transport = new WebSocketClientTransport(wsUrl);
                console.log(`🔗 Attempting WebSocket connection to ${serverName}`);
              } catch (wsError) {
                console.log(`⚠️ All HTTP-based transports failed for ${serverName}, using fallback pattern`);
                return [`mcp__${serverName}__*`];
              }
            }
          }
        }
      } else if (serverConfig.command) {
        console.log(`💻 Connecting to stdio MCP server: ${serverName} with command: ${serverConfig.command}`);
        
        client = new Client({
          name: "ai-cc-bridge-discovery",
          version: "1.0.0"
        }, {
          capabilities: {}
        });
        
        const transportConfig: any = {
          command: serverConfig.command,
          args: serverConfig.args || []
        };
        
        if (serverConfig.env) {
          transportConfig.env = serverConfig.env;
        }
        
        transport = new StdioClientTransport(transportConfig);
      } else {
        console.log(`⚠️ Invalid server config for ${serverName}, using fallback pattern`);
        return [`mcp__${serverName}__*`];
      }
      
      // Set a timeout for the connection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });
      
      const connectPromise = (async () => {
        await client.connect(transport);
        
        // List tools
        const toolsResult = await client.listTools();
        const tools = toolsResult.tools || [];
        
        const toolNames = tools.map(tool => `mcp__${serverName}__${tool.name}`);
        
        // Clean up
        await client.close();
        
        if (toolNames.length > 0) {
          console.log(`✅ Found ${toolNames.length} tools for ${serverName}: ${toolNames.join(', ')}`);
        } else {
          console.log(`📄 No tools found for ${serverName}`);
        }
        
        return toolNames;
      })();
      
      // Race between connection and timeout
      const result = await Promise.race([connectPromise, timeoutPromise]);
      return result.length > 0 ? result : [`mcp__${serverName}__*`];
      
    } catch (error) {
      console.log(`⚠️ Failed to discover tools for ${serverName}:`, error instanceof Error ? error.message : String(error));
      return [`mcp__${serverName}__*`];
    }
  }

  static async findMcpConfigs(startDir: string = process.cwd()): Promise<Array<{ path: string; config: McpConfig }>> {
    const configs: Array<{ path: string; config: McpConfig }> = [];
    
    async function searchDirectory(dir: string): Promise<void> {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          if (item.name === 'node_modules' || item.name === '.git') {
            continue;
          }
          
          const fullPath = path.join(dir, item.name);
          
          if (item.isFile() && item.name === '.mcp.json') {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              if (content.trim()) {
                const config = JSON.parse(content);
                configs.push({ path: fullPath, config });
              }
            } catch (error) {
              console.warn(`Warning: Failed to parse MCP config at ${fullPath}:`, error);
            }
          } else if (item.isDirectory()) {
            await searchDirectory(fullPath);
          }
        }
      } catch (error) {
        // Silently skip directories we can't read
      }
    }
    
    await searchDirectory(startDir);
    return configs;
  }

  static async discoverMcpTools(startDir: string = process.cwd()): Promise<McpDiscoveryResult> {
    const mcpConfigs = await this.findMcpConfigs(startDir);
    const tools: McpToolInfo[] = [];
    const allToolNames: string[] = [];
    
    for (const { config } of mcpConfigs) {
      if (config.mcpServers) {
        for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
          try {
            console.log(`🔧 Processing server ${serverName} with config:`, JSON.stringify(serverConfig));
            const toolNames = await this.discoverServerToolsUsingSDK(serverName, serverConfig);
            
            for (const fullToolName of toolNames) {
              const toolName = fullToolName.replace(`mcp__${serverName}__`, '');
              const toolInfo: McpToolInfo = {
                serverName,
                toolName,
                fullToolName
              };
              tools.push(toolInfo);
              allToolNames.push(fullToolName);
            }
          } catch (error) {
            console.log(`⚠️ Failed to discover tools for ${serverName}:`, error instanceof Error ? error.message : String(error));
            // Fallback to wildcard pattern
            const fallbackToolName = `mcp__${serverName}__*`;
            const toolInfo: McpToolInfo = {
              serverName,
              toolName: '*',
              fullToolName: fallbackToolName
            };
            tools.push(toolInfo);
            allToolNames.push(fallbackToolName);
          }
        }
      }
    }
    
    return {
      tools,
      allowList: allToolNames,
      mcpConfigs
    };
  }

  static async updateClaudeSettings(discoveryResult: McpDiscoveryResult, startDir: string = process.cwd(), settingsPath?: string): Promise<void> {
    const targetDir = settingsPath ? path.dirname(settingsPath) : path.join(startDir, '.claude');
    const finalSettingsPath = settingsPath || path.join(targetDir, 'settings.json');
    
    console.log(`🔧 MCP Discovery: Creating .claude directory at: ${targetDir}`);
    console.log(`🔧 MCP Discovery: Settings file will be: ${finalSettingsPath}`);
    
    // Ensure .claude directory exists
    await fs.mkdir(targetDir, { recursive: true });
    
    let settings: any = {};
    
    // Read existing settings if they exist
    try {
      const existingContent = await fs.readFile(finalSettingsPath, 'utf8');
      settings = JSON.parse(existingContent);
    } catch (error) {
      // File doesn't exist or is invalid, use empty object
    }
    
    // Initialize permissions if not present
    if (!settings.permissions) {
      settings.permissions = { allow: [], deny: [] };
    }
    
    // Ensure allow and deny arrays exist
    if (!Array.isArray(settings.permissions.allow)) {
      settings.permissions.allow = [];
    }
    if (!Array.isArray(settings.permissions.deny)) {
      settings.permissions.deny = [];
    }
    
    // Add discovered MCP tools to allow list (avoiding duplicates)
    const currentAllow = new Set(settings.permissions.allow);
    for (const toolName of discoveryResult.allowList) {
      currentAllow.add(toolName);
    }
    settings.permissions.allow = Array.from(currentAllow);
    
    // Block ALL Bash functionality and other potentially dangerous tools
    const bashDenyPatterns = [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "Grep(*)",
      "Glob(*)",
      "List(*)",
      "View(*)"
    ];
    
    const currentDeny = new Set(settings.permissions.deny);
    for (const pattern of bashDenyPatterns) {
      currentDeny.add(pattern);
    }
    settings.permissions.deny = Array.from(currentDeny);
    
    // Ensure enableAllProjectMcpServers is set
    settings.enableAllProjectMcpServers = true;
    
    // Write updated settings
    await fs.writeFile(finalSettingsPath, JSON.stringify(settings, null, 2), 'utf8');
  }

  static async setupMcpPermissions(startDir: string = process.cwd(), settingsPath?: string): Promise<McpDiscoveryResult> {
    const discoveryResult = await this.discoverMcpTools(startDir);
    await this.updateClaudeSettings(discoveryResult, startDir, settingsPath);
    return discoveryResult;
  }
}

export async function discoverMcpTools(startDir?: string): Promise<McpDiscoveryResult> {
  return McpDiscovery.discoverMcpTools(startDir);
}

export async function setupMcpPermissions(startDir?: string, settingsPath?: string): Promise<McpDiscoveryResult> {
  return McpDiscovery.setupMcpPermissions(startDir || process.cwd(), settingsPath);
}