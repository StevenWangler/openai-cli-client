import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  TextContent
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { MemoryClient } from './memory-client.js';

export class FilesystemServerWithMemory {
  private server: Server;
  private allowedDirectories: string[] = [];
  private memoryClient: MemoryClient;
  private memoryEnabled: boolean = false;
  private memoryFilePath: string;
  private configFilePath: string;

  constructor(allowedDirectories: string[] = [], memoryFilePath?: string, configFilePath: string = './filesystem-memory-config.json') {
    // Resolve and normalize allowed directories
    this.allowedDirectories = allowedDirectories.map(dir => path.resolve(dir));
    this.memoryFilePath = memoryFilePath || './filesystem-memory.json';
    this.configFilePath = configFilePath;
    
    // Load configuration if it exists
    this.loadConfiguration();
    
    this.server = new Server(
      {
        name: 'filesystem-server-with-memory',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.memoryClient = new MemoryClient();
    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configFilePath, 'utf-8');
      const config = JSON.parse(configData);
      if (config.allowedDirectories && Array.isArray(config.allowedDirectories)) {
        // Merge with initial directories and remove duplicates
        const allDirectories = [...this.allowedDirectories, ...config.allowedDirectories];
        this.allowedDirectories = [...new Set(allDirectories.map(dir => path.resolve(dir)))];
        console.error(`Loaded ${config.allowedDirectories.length} directories from configuration file`);
      }
    } catch (error) {
      // Configuration file doesn't exist or is invalid, that's okay
      console.error('No existing configuration file found, using provided directories only');
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      const config = {
        allowedDirectories: this.allowedDirectories,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(this.configFilePath, JSON.stringify(config, null, 2));
      console.error(`Saved ${this.allowedDirectories.length} directories to configuration file`);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw new Error('Failed to save directory configuration');
    }
  }

  private async initializeMemory(): Promise<void> {
    try {
      await this.memoryClient.connect(this.memoryFilePath);
      this.memoryEnabled = true;
      
      // Create entities for allowed directories
      await this.rememberAllowedDirectories();
      
      console.error('Memory integration enabled for filesystem server');
    } catch (error) {
      console.error('Failed to initialize memory integration:', error);
      this.memoryEnabled = false;
    }
  }

  private async rememberAllowedDirectories(): Promise<void> {
    if (!this.memoryEnabled) return;

    try {
      const directoryEntities = this.allowedDirectories.map(dir => ({
        name: `directory:${dir}`,
        entityType: 'filesystem_directory',
        observations: [
          `Allowed directory: ${dir}`,
          `Resolved path: ${path.resolve(dir)}`,
          `Added at: ${new Date().toISOString()}`
        ]
      }));

      await this.memoryClient.createEntities(directoryEntities);

      // Create relationship between directories
      const relations = [];
      for (let i = 0; i < this.allowedDirectories.length - 1; i++) {
        relations.push({
          from: `directory:${this.allowedDirectories[i]}`,
          to: `directory:${this.allowedDirectories[i + 1]}`,
          relationType: 'sibling_directory'
        });
      }

      if (relations.length > 0) {
        await this.memoryClient.createRelations(relations);
      }
    } catch (error) {
      console.error('Failed to remember allowed directories:', error);
    }
  }

  private async rememberFileAccess(filePath: string, operation: string, metadata?: any): Promise<void> {
    if (!this.memoryEnabled) return;

    try {
      const fileEntityName = `file:${filePath}`;
      const dirPath = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const directoryEntityName = `directory:${dirPath}`;

      // Create or update file entity
      const observations = [
        `Operation: ${operation}`,
        `Accessed at: ${new Date().toISOString()}`,
        `File name: ${fileName}`,
        `Directory: ${dirPath}`
      ];

      if (metadata) {
        if (metadata.size !== undefined) observations.push(`Size: ${metadata.size} bytes`);
        if (metadata.isDirectory !== undefined) observations.push(`Is directory: ${metadata.isDirectory}`);
        if (metadata.modified) observations.push(`Last modified: ${metadata.modified}`);
        if (metadata.content && operation === 'read') {
          const contentPreview = metadata.content.length > 200 
            ? metadata.content.substring(0, 200) + '...'
            : metadata.content;
          observations.push(`Content preview: ${contentPreview}`);
        }
      }

      await this.memoryClient.createEntity(fileEntityName, 'filesystem_file', observations);

      // Create relationship between file and directory
      await this.memoryClient.createRelation(directoryEntityName, fileEntityName, 'contains');

      // If this is a recently accessed file, create time-based relationship
      const recentFiles = await this.memoryClient.searchNodes('filesystem_file');
      const recentlyAccessed = recentFiles.filter(f => 
        f.observations.some(obs => obs.includes('Accessed at:') && 
          new Date(obs.split('Accessed at: ')[1]) > new Date(Date.now() - 24 * 60 * 60 * 1000))
      );

      if (recentlyAccessed.length > 1) {
        await this.memoryClient.createRelation(
          fileEntityName, 
          recentlyAccessed[recentlyAccessed.length - 2].name, 
          'accessed_after'
        );
      }

    } catch (error) {
      console.error('Failed to remember file access:', error);
    }
  }

  private async rememberDirectoryStructure(dirPath: string, structure: any): Promise<void> {
    if (!this.memoryEnabled) return;

    try {
      const directoryEntityName = `directory:${dirPath}`;
      
      await this.memoryClient.addObservation(
        directoryEntityName,
        `Directory structure explored at: ${new Date().toISOString()}`
      );

      // Remember subdirectories and files
      if (Array.isArray(structure)) {
        for (const item of structure) {
          if (typeof item === 'string') {
            const itemPath = path.join(dirPath, item);
            await this.rememberFileAccess(itemPath, 'discovered');
          }
        }
      }
    } catch (error) {
      console.error('Failed to remember directory structure:', error);
    }
  }

  private setupToolHandlers() {
    // Define all available filesystem tools with memory tracking
    const tools: Tool[] = [
      {
        name: 'read_file',
        description: 'Read complete file contents (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Create or overwrite files (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_directory',
        description: 'List directory contents (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
        }
      },
      {
        name: 'search_files',
        description: 'Recursive file search with glob patterns (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            pattern: { type: 'string' },
            maxResults: { type: 'number' }
          },
          required: ['path', 'pattern']
        }
      },
      {
        name: 'get_file_info',
        description: 'File metadata and stats (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
        }
      },
      {
        name: 'list_allowed_directories',
        description: 'List the allowed directories for this server',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'add_allowed_directory',
        description: 'Add a new directory to the allowed directories list',
        inputSchema: {
          type: 'object',
          properties: {
            path: { 
              type: 'string',
              description: 'The directory path to add to allowed directories'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'remove_allowed_directory',
        description: 'Remove a directory from the allowed directories list',
        inputSchema: {
          type: 'object',
          properties: {
            path: { 
              type: 'string',
              description: 'The directory path to remove from allowed directories'
            }
          },
          required: ['path']
        }
      },
      // Memory-specific tools
      {
        name: 'recall_file_history',
        description: 'Recall the access history of a specific file',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string' }
          },
          required: ['filePath']
        }
      },
      {
        name: 'find_similar_files',
        description: 'Find files similar to the given query based on memory',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_filesystem_memory_stats',
        description: 'Get statistics about the filesystem memory',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_file':
            return await this.readFile((args as any).path);
          case 'write_file':
            return await this.writeFile((args as any).path, (args as any).content);
          case 'list_directory':
            return await this.listDirectory((args as any).path);
          case 'search_files':
            return await this.searchFiles((args as any).path, (args as any).pattern, (args as any).maxResults);
          case 'get_file_info':
            return await this.getFileInfo((args as any).path);
          case 'list_allowed_directories':
            return await this.listAllowedDirectories();
          case 'add_allowed_directory':
            return await this.addAllowedDirectory((args as any).path);
          case 'remove_allowed_directory':
            return await this.removeAllowedDirectory((args as any).path);
          case 'recall_file_history':
            return await this.recallFileHistory((args as any).filePath);
          case 'find_similar_files':
            return await this.findSimilarFiles((args as any).query, (args as any).limit);
          case 'get_filesystem_memory_stats':
            return await this.getFilesystemMemoryStats();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`
            } as TextContent
          ],
          isError: true
        };
      }
    });
  }

  private setupRequestHandlers() {
    // Additional request handlers can be added here if needed
  }

  private validatePath(targetPath: string): string {
    const resolvedPath = path.resolve(targetPath);
    
    // Check if the path is within any of the allowed directories
    const isAllowed = this.allowedDirectories.some(allowedDir => {
      return resolvedPath.startsWith(allowedDir);
    });

    if (!isAllowed) {
      throw new Error(`Access denied: Path ${targetPath} is not within allowed directories`);
    }

    return resolvedPath;
  }

  private async readFile(filePath: string): Promise<CallToolResult> {
    const validatedPath = this.validatePath(filePath);
    
    try {
      const content = await fs.readFile(validatedPath, 'utf-8');
      
      // Remember this file access
      await this.rememberFileAccess(filePath, 'read', { 
        size: content.length,
        content: content
      });

      return {
        content: [
          {
            type: 'text',
            text: content
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<CallToolResult> {
    const validatedPath = this.validatePath(filePath);
    
    try {
      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(validatedPath, content, 'utf-8');
      
      // Remember this file access
      await this.rememberFileAccess(filePath, 'write', { 
        size: content.length,
        content: content.length > 1000 ? content.substring(0, 1000) + '...' : content
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully wrote to ${filePath}`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listDirectory(dirPath: string): Promise<CallToolResult> {
    const validatedPath = this.validatePath(dirPath);
    
    try {
      const entries = await fs.readdir(validatedPath);
      
      // Remember this directory access and its structure
      await this.rememberFileAccess(dirPath, 'list_directory', { isDirectory: true });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(entries, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async searchFiles(searchPath: string, pattern: string, maxResults: number = 100): Promise<CallToolResult> {
    const validatedPath = this.validatePath(searchPath);
    
    try {
      const searchPattern = path.join(validatedPath, '**', pattern);
      const matches = await glob(searchPattern, { maxDepth: 10 });
      
      const limitedMatches = matches.slice(0, maxResults);
      
      // Remember this search operation
      await this.rememberFileAccess(searchPath, 'search_files', { 
        pattern,
        resultsFound: matches.length,
        limitedTo: maxResults
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              pattern,
              matches: limitedMatches,
              totalFound: matches.length,
              showing: limitedMatches.length
            }, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getFileInfo(filePath: string): Promise<CallToolResult> {
    const validatedPath = this.validatePath(filePath);
    
    try {
      const stats = await fs.stat(validatedPath);
      const info = {
        path: filePath,
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        isSymbolicLink: stats.isSymbolicLink(),
        permissions: stats.mode,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime
      };

      // Remember this file info access
      await this.rememberFileAccess(filePath, 'get_file_info', info);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(info, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Memory-specific methods
  private async recallFileHistory(filePath: string): Promise<CallToolResult> {
    if (!this.memoryEnabled) {
      return {
        content: [
          {
            type: 'text',
            text: 'Memory is not enabled for this filesystem server'
          } as TextContent
        ]
      };
    }

    try {
      const fileEntityName = `file:${filePath}`;
      const fileNode = await this.memoryClient.openNode(fileEntityName);
      
      if (!fileNode) {
        return {
          content: [
            {
              type: 'text',
              text: `No memory found for file: ${filePath}`
            } as TextContent
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              file: filePath,
              entityType: fileNode.entityType,
              accessHistory: fileNode.observations,
              relationships: fileNode.relations
            }, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to recall file history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async findSimilarFiles(query: string, limit: number = 10): Promise<CallToolResult> {
    if (!this.memoryEnabled) {
      return {
        content: [
          {
            type: 'text',
            text: 'Memory is not enabled for this filesystem server'
          } as TextContent
        ]
      };
    }

    try {
      const searchResults = await this.memoryClient.searchNodes(query);
      const fileResults = searchResults
        .filter(result => result.entityType === 'filesystem_file')
        .slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query,
              results: fileResults.map(result => ({
                filePath: result.name.replace('file:', ''),
                relevance: result.score,
                recentObservations: result.observations.slice(-3)
              }))
            }, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to find similar files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getFilesystemMemoryStats(): Promise<CallToolResult> {
    if (!this.memoryEnabled) {
      return {
        content: [
          {
            type: 'text',
            text: 'Memory is not enabled for this filesystem server'
          } as TextContent
        ]
      };
    }

    try {
      const graph = await this.memoryClient.readGraph();
      const fileEntities = Object.values(graph.entities).filter(e => e.entityType === 'filesystem_file');
      const dirEntities = Object.values(graph.entities).filter(e => e.entityType === 'filesystem_directory');
      
      const stats = {
        memoryEnabled: this.memoryEnabled,
        memoryFilePath: this.memoryFilePath,
        allowedDirectories: this.allowedDirectories,
        totalFilesTracked: fileEntities.length,
        totalDirectoriesTracked: dirEntities.length,
        totalMemoryEntities: Object.keys(graph.entities).length,
        recentlyAccessedFiles: fileEntities
          .filter(f => f.observations.some(obs => 
            obs.includes('Accessed at:') && 
            new Date(obs.split('Accessed at: ')[1]) > new Date(Date.now() - 24 * 60 * 60 * 1000)
          ))
          .length
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to get filesystem memory stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listAllowedDirectories(): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            allowedDirectories: this.allowedDirectories,
            count: this.allowedDirectories.length,
            memoryEnabled: this.memoryEnabled,
            memoryFilePath: this.memoryFilePath,
            configFile: this.configFilePath
          }, null, 2)
        } as TextContent
      ]
    };
  }

  private async addAllowedDirectory(dirPath: string): Promise<CallToolResult> {
    try {
      const resolvedPath = path.resolve(dirPath);
      
      // Check if directory exists
      try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory()) {
          throw new Error(`Path ${dirPath} is not a directory`);
        }
      } catch (error) {
        throw new Error(`Directory ${dirPath} does not exist or is not accessible`);
      }

      // Check if already in allowed directories
      if (this.allowedDirectories.includes(resolvedPath)) {
        return {
          content: [
            {
              type: 'text',
              text: `Directory ${dirPath} is already in the allowed directories list`
            } as TextContent
          ]
        };
      }

      // Add to allowed directories
      this.allowedDirectories.push(resolvedPath);
      
      // Save configuration
      await this.saveConfiguration();

      // Remember this directory addition in memory
      if (this.memoryEnabled) {
        await this.memoryClient.createEntity(
          `directory:${resolvedPath}`,
          'filesystem_directory',
          [
            `Allowed directory: ${resolvedPath}`,
            `Resolved path: ${path.resolve(resolvedPath)}`,
            `Added dynamically at: ${new Date().toISOString()}`
          ]
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added directory ${dirPath} to allowed directories. Total directories: ${this.allowedDirectories.length}`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to add directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async removeAllowedDirectory(dirPath: string): Promise<CallToolResult> {
    try {
      const resolvedPath = path.resolve(dirPath);
      
      // Find the directory in the allowed list
      const initialCount = this.allowedDirectories.length;
      this.allowedDirectories = this.allowedDirectories.filter(dir => dir !== resolvedPath);
      
      if (this.allowedDirectories.length === initialCount) {
        return {
          content: [
            {
              type: 'text',
              text: `Directory ${dirPath} was not found in the allowed directories list`
            } as TextContent
          ]
        };
      }

      // Ensure at least one directory remains
      if (this.allowedDirectories.length === 0) {
        this.allowedDirectories.push(resolvedPath); // Add it back
        throw new Error('Cannot remove the last allowed directory. At least one directory must remain for security.');
      }

      // Save configuration
      await this.saveConfiguration();

      // Remember this directory removal in memory
      if (this.memoryEnabled) {
        const directoryEntityName = `directory:${resolvedPath}`;
        await this.memoryClient.addObservation(
          directoryEntityName,
          `Directory access removed at: ${new Date().toISOString()}`
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: `Successfully removed directory ${dirPath} from allowed directories. Remaining directories: ${this.allowedDirectories.length}`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to remove directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Initialize memory after server starts
    await this.initializeMemory();
  }

  async stop() {
    if (this.memoryEnabled) {
      await this.memoryClient.disconnect();
    }
    await this.server.close();
  }
} 