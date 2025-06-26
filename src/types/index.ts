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
  memory?: {
    enabled?: boolean;
    filePath?: string;
    autoSave?: boolean;
  };
}

// Memory-specific types
export interface MemoryEntity {
  name: string;
  entityType: string;
  observations?: string[];
}

export interface MemoryRelation {
  from: string;
  to: string;
  relationType: string;
}

export interface MemoryNode {
  name: string;
  entityType: string;
  observations: string[];
  relations: MemoryRelation[];
}

export interface MemoryGraph {
  entities: Record<string, MemoryNode>;
}

export interface MemorySearchResult {
  name: string;
  entityType: string;
  observations: string[];
  relations: MemoryRelation[];
  score?: number;
}

// Filesystem-specific types
export interface FileInfo {
  path: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  permissions: number;
  created: Date;
  modified: Date;
  accessed: Date;
}

export interface DirectoryEntry {
  name: string;
  size: number;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileEdit {
  oldText: string;
  newText: string;
}

export interface SearchResult {
  pattern: string;
  matches: string[];
  totalFound: number;
  showing: number;
} 