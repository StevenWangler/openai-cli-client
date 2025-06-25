import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPTool, MCPServerConfig } from '../types/index.js';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private serverConfig: MCPServerConfig | null = null;
  private tools: MCPTool[] = [];

  async connect(serverConfig: MCPServerConfig): Promise<void> {
    try {
      this.serverConfig = serverConfig;
      
      // Create transport and client
      this.transport = new StdioClientTransport({
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env
      });

      this.client = new Client(
        {
          name: 'openai-cli-client',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      // Connect to the server
      await this.client.connect(this.transport);

      // Get available tools
      await this.refreshTools();

      console.log(`Connected to MCP server: ${serverConfig.name}`);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${serverConfig.name}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async refreshTools(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      const response = await this.client.listTools();
      this.tools = response.tools.map(tool => ({
        ...tool,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as any
      }));
    } catch (error) {
      console.error('Failed to refresh tools:', error);
      this.tools = [];
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  async callTool(name: string, args: any): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      const response = await this.client.callTool({
        name,
        arguments: args
      });

      return response.content;
    } catch (error) {
      console.error(`Failed to call tool ${name}:`, error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getServerName(): string {
    return this.serverConfig?.name || 'Unknown';
  }
} 