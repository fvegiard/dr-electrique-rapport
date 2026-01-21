#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, 'mcp-router-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

class MCPPouterServer {
  constructor() {
    this.activeProcesses = new Map();
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // Main routing tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'route_request':
          return await this.handleRouteRequest(args.query || args.text || '');

        case 'list_servers':
          return await this.handleListServers();

        case 'get_server_status':
          return await this.handleGetServerStatus(args.serverName);

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    });
  }

  async handleRouteRequest(query) {
    const query_lower = query.toLowerCase();

    // Find best matching server based on routing rules
    let bestMatch = null;
    let highestConfidence = 0;

    for (const [ruleName, rule] of Object.entries(config.routing_rules)) {
      for (const pattern of rule.patterns) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
        if (regex.test(query_lower)) {
          if (rule.confidence > highestConfidence) {
            highestConfidence = rule.confidence;
            bestMatch = {
              rule: ruleName,
              server: rule.server,
              confidence: rule.confidence
            };
          }
        }
      }
    }

    if (!bestMatch) {
      // Fallback: try keyword matching
      bestMatch = this.findServerByKeywords(query_lower);
    }

    if (bestMatch) {
      const serverConfig = config.servers[bestMatch.server];
      if (serverConfig) {
        return {
          content: [
            {
              type: 'text',
              text: `🔄 Routing to **${serverConfig.name}**\n\n**Request:** ${query}\n**Server:** ${bestMatch.server}\n**Capabilities:** ${serverConfig.capabilities.join(', ')}\n**Confidence:** ${(bestMatch.confidence * 100).toFixed(1)}%\n\n${serverConfig.description}`
            }
          ],
          isError: false
        };
      }
    }

    // No match found
    return {
      content: [
        {
          type: 'text',
          text: `❓ **No suitable server found for:** "${query}"\n\nAvailable servers:\n${Object.entries(config.servers).map(([key, server]) =>
            `- **${server.name}** (${key}): ${server.capabilities.join(', ')}`
          ).join('\n')}\n\nTry rephrasing your request or specify the server directly.`
        }
      ],
      isError: false
    };
  }

  findServerByKeywords(query) {
    let bestMatch = null;
    let maxMatches = 0;

    for (const [serverKey, server] of Object.entries(config.servers)) {
      const matches = server.keywords.filter(keyword =>
        query.includes(keyword.toLowerCase())
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = {
          server: serverKey,
          confidence: Math.min(maxMatches / server.keywords.length, 0.7)
        };
      }
    }

    return bestMatch;
  }

  async handleListServers() {
    const servers = Object.entries(config.servers).map(([key, server]) => ({
      name: server.name,
      key: key,
      capabilities: server.capabilities,
      description: server.description,
      status: this.activeProcesses.has(key) ? 'active' : 'inactive'
    }));

    return {
      content: [
        {
          type: 'text',
          text: `# 🛠️ Available MCP Servers\n\n${servers.map(server =>
            `## ${server.name} (${server.key})\n` +
            `**Status:** ${server.status === 'active' ? '🟢 Active' : '⚪ Inactive'}\n` +
            `**Capabilities:** ${server.capabilities.join(', ')}\n` +
            `**Description:** ${server.description}\n`
          ).join('\n')}`
        }
      ],
      isError: false
    };
  }

  async handleGetServerStatus(serverName) {
    const server = config.servers[serverName];
    if (!server) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Server "${serverName}" not found`
      );
    }

    const isActive = this.activeProcesses.has(serverName);

    return {
      content: [
        {
          type: 'text',
          text: `## Server Status: ${server.name}\n\n` +
                `**Status:** ${isActive ? '🟢 Active' : '⚪ Inactive'}\n` +
                `**Key:** ${serverName}\n` +
                `**Capabilities:** ${server.capabilities.join(', ')}\n` +
                `**Keywords:** ${server.keywords.join(', ')}\n` +
                `**Description:** ${server.description}`
        }
      ],
      isError: false
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Router Server started');
  }
}

// Start the server
const router = new MCPPouterServer();
router.run().catch(console.error);