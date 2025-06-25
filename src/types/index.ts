import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ChatOptions {
  model: string;
  server?: string;
  config?: string;
}

export interface MCPTool extends Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface AppConfig {
  openai: {
    apiKey?: string;
    model?: string;
  };
  mcpServers: MCPServerConfig[];
} 