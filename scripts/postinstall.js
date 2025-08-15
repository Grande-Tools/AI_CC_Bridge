#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Post-install script to create .mcp.json if it doesn't exist and setup MCP permissions
 * This runs when someone installs the AI-CC-Bridge package
 */

async function discoverAndSetupMcp(targetDir) {
  // Try to use the compiled MCP discovery functionality
  try {
    console.log('🔧 Using MCP discovery for target directory:', targetDir);
    const { setupMcpPermissions } = require('../dist/mcp-discovery');
    const result = await setupMcpPermissions(targetDir);
    
    if (result.tools.length > 0) {
      console.log(`🔍 Discovered ${result.tools.length} MCP tools:`);
      result.tools.forEach(tool => {
        console.log(`   - ${tool.fullToolName}`);
      });
      console.log(`✅ Updated ${targetDir}/.claude/settings.json with MCP permissions`);
    } else {
      console.log('📄 No MCP tools found in project');
    }
    
    return true;
  } catch (error) {
    console.log('⚠️ Could not use MCP discovery (library may not be built yet):', error.message);
    console.log('⚠️ Error details:', error);
    return false;
  }
}

async function fallbackSetup(targetDir) {
  const claudeDir = path.join(targetDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  // Handle .claude/settings.json (add enableAllProjectMcpServers if not set)
  try {
    // Check if settings.json exists
    const existingSettings = await fs.promises.readFile(settingsPath, 'utf8');
    const settings = JSON.parse(existingSettings);
    
    // Initialize permissions if not present
    if (!settings.permissions) {
      settings.permissions = { allow: [], deny: [] };
    }
    
    // Only add enableAllProjectMcpServers if it's not already set
    if (settings.enableAllProjectMcpServers === undefined) {
      settings.enableAllProjectMcpServers = true;
      await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      console.log('✅ Added enableAllProjectMcpServers to existing .claude/settings.json');
    } else {
      console.log('📄 .claude/settings.json already has enableAllProjectMcpServers configured');
    }
  } catch (error) {
    // File doesn't exist, create new one
    const defaultSettings = {
      enableAllProjectMcpServers: true,
      permissions: {
        allow: [],
        deny: []
      }
    };

    try {
      // Ensure .claude directory exists
      await fs.promises.mkdir(claudeDir, { recursive: true });
      
      await fs.promises.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
      console.log('✅ Created .claude/settings.json with MCP auto-approval');
    } catch (createError) {
      console.log('⚠️ Could not create .claude/settings.json:', createError.message);
    }
  }
}

async function postInstall() {
  // Get the directory where npm install was called from
  const targetDir = process.env.INIT_CWD || process.cwd();
  
  console.log('🎯 Target directory:', targetDir);
  const mcpPath = path.join(targetDir, '.mcp.json');

  // Create .mcp.json if it doesn't exist (EMPTY FILE ONLY)
  try {
    await fs.promises.access(mcpPath);
    console.log('📄 .mcp.json already exists, skipping creation');
  } catch {
    try {
      await fs.promises.writeFile(mcpPath, '', 'utf8');
      console.log('✅ Created empty .mcp.json file');
    } catch (error) {
      console.log('⚠️ Could not create .mcp.json:', error.message);
    }
  }

  // Try to discover and setup MCP permissions
  const mcpSetupSuccess = await discoverAndSetupMcp(targetDir);
  
  // If MCP discovery failed, use fallback setup
  if (!mcpSetupSuccess) {
    await fallbackSetup(targetDir);
  }

  console.log('🎉 AI-CC-Bridge setup complete! MCP integration ready.');
}

// Only run if this is being executed directly (not imported)
if (require.main === module) {
  postInstall().catch(console.error);
}

module.exports = { postInstall };