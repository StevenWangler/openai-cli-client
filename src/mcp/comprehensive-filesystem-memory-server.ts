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
import type { 
  MemoryEntity, 
  MemoryRelation, 
  MemoryNode, 
  MemoryGraph, 
  MemorySearchResult 
} from '../types/index.js';

export class ComprehensiveFilesystemMemoryServer {
  private server: Server;
  private allowedDirectories: string[] = [];
  private memoryFilePath: string;
  private configFilePath: string;
  private memoryGraph: MemoryGraph = { entities: {} };
  private isInitialized = false;

  constructor(allowedDirectories: string[] = [], memoryFilePath: string = './comprehensive-memory.json', configFilePath: string = './comprehensive-filesystem-config.json') {
    // Resolve and normalize allowed directories
    this.allowedDirectories = allowedDirectories.map(dir => path.resolve(dir));
    this.memoryFilePath = memoryFilePath;
    this.configFilePath = configFilePath;
    
    // Load configuration if it exists
    this.loadConfiguration();

    this.server = new Server(
      {
        name: 'comprehensive-filesystem-memory-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
    this.setupRequestHandlers();
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.loadMemoryGraph();
      await this.initializeAllowedDirectories();
      this.isInitialized = true;
    }
  }

  private async loadMemoryGraph() {
    try {
      const data = await fs.readFile(this.memoryFilePath, 'utf-8');
      this.memoryGraph = JSON.parse(data);
      console.error(`Loaded memory graph from ${this.memoryFilePath}`);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty graph
      this.memoryGraph = { entities: {} };
      console.error(`Starting with empty memory graph (${this.memoryFilePath})`);
    }
  }

  private async saveMemoryGraph() {
    try {
      const data = JSON.stringify(this.memoryGraph, null, 2);
      await fs.writeFile(this.memoryFilePath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save memory graph:', error);
    }
  }

  private async initializeAllowedDirectories(): Promise<void> {
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

      await this.createEntitiesInternal(directoryEntities);

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
        await this.createRelationsInternal(relations);
      }

      console.error('Initialized allowed directories in memory');
    } catch (error) {
      console.error('Failed to initialize allowed directories:', error);
    }
  }

  private async rememberFileAccess(filePath: string, operation: string, metadata?: any): Promise<void> {
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

      await this.createEntitiesInternal([{
        name: fileEntityName,
        entityType: 'filesystem_file',
        observations
      }]);

      // Create relationship between file and directory
      await this.createRelationsInternal([{
        from: directoryEntityName,
        to: fileEntityName,
        relationType: 'contains'
      }]);

      // If this is a recently accessed file, create time-based relationship
      const recentFiles = Object.values(this.memoryGraph.entities)
        .filter(entity => entity.entityType === 'filesystem_file' && 
          entity.observations.some(obs => obs.includes('Accessed at:') && 
            new Date(obs.split('Accessed at: ')[1]) > new Date(Date.now() - 24 * 60 * 60 * 1000)));

      if (recentFiles.length > 1) {
        await this.createRelationsInternal([{
          from: fileEntityName,
          to: recentFiles[recentFiles.length - 2].name,
          relationType: 'accessed_after'
        }]);
      }

    } catch (error) {
      console.error('Failed to remember file access:', error);
    }
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

  private setupToolHandlers() {
    // ALL FILESYSTEM TOOLS + ALL MEMORY TOOLS
    const tools: Tool[] = [
      // COMPLETE FILESYSTEM TOOLS (with memory tracking)
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
        name: 'read_multiple_files',
        description: 'Read multiple files simultaneously (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            paths: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['paths']
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
        name: 'edit_file',
        description: 'Make precise edits with diff preview (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            edits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  oldText: { type: 'string' },
                  newText: { type: 'string' }
                },
                required: ['oldText', 'newText']
              }
            },
            dryRun: { type: 'boolean' }
          },
          required: ['path', 'edits']
        }
      },
      {
        name: 'create_directory',
        description: 'Create directories (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
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
        name: 'list_directory_with_sizes',
        description: 'List directory contents with file sizes (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
        }
      },
      {
        name: 'directory_tree',
        description: 'Get recursive directory structure (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            maxDepth: { type: 'number' }
          },
          required: ['path']
        }
      },
      {
        name: 'move_file',
        description: 'Move/rename files and directories (tracked in memory)',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            destination: { type: 'string' }
          },
          required: ['source', 'destination']
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
      
      // FILESYSTEM-SPECIFIC MEMORY TOOLS
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
      },

      // ALL GENERAL MEMORY TOOLS
      {
        name: 'create_entities',
        description: 'Create new entities in the memory graph',
        inputSchema: {
          type: 'object',
          properties: {
            entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  entityType: { type: 'string' },
                  observations: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['name', 'entityType']
              }
            }
          },
          required: ['entities']
        }
      },
      {
        name: 'create_relations',
        description: 'Create relationships between entities',
        inputSchema: {
          type: 'object',
          properties: {
            relations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  relationType: { type: 'string' }
                },
                required: ['from', 'to', 'relationType']
              }
            }
          },
          required: ['relations']
        }
      },
      {
        name: 'add_observations',
        description: 'Add observations to existing entities',
        inputSchema: {
          type: 'object',
          properties: {
            entityName: { type: 'string' },
            observations: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['entityName', 'observations']
        }
      },
      {
        name: 'search_nodes',
        description: 'Search for entities by query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'read_graph',
        description: 'Read the entire memory graph',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'open_nodes',
        description: 'Retrieve specific entities by name',
        inputSchema: {
          type: 'object',
          properties: {
            names: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['names']
        }
      },
      {
        name: 'delete_entities',
        description: 'Delete entities and their relations',
        inputSchema: {
          type: 'object',
          properties: {
            entityNames: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['entityNames']
        }
      },
      {
        name: 'delete_observations',
        description: 'Delete specific observations from an entity',
        inputSchema: {
          type: 'object',
          properties: {
            entityName: { type: 'string' },
            observations: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['entityName', 'observations']
        }
      },
      {
        name: 'delete_relations',
        description: 'Delete specific relationships',
        inputSchema: {
          type: 'object',
          properties: {
            relations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  from: { type: 'string' },
                  to: { type: 'string' },
                  relationType: { type: 'string' }
                },
                required: ['from', 'to', 'relationType']
              }
            }
          },
          required: ['relations']
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
      }
    ];

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.ensureInitialized();

        switch (name) {
          // FILESYSTEM TOOLS
          case 'read_file':
            return await this.readFile((args as any).path);
          case 'read_multiple_files':
            return await this.readMultipleFiles((args as any).paths);
          case 'write_file':
            return await this.writeFile((args as any).path, (args as any).content);
          case 'edit_file':
            return await this.editFile((args as any).path, (args as any).edits, (args as any).dryRun);
          case 'create_directory':
            return await this.createDirectory((args as any).path);
          case 'list_directory':
            return await this.listDirectory((args as any).path);
          case 'list_directory_with_sizes':
            return await this.listDirectoryWithSizes((args as any).path);
          case 'directory_tree':
            return await this.directoryTree((args as any).path, (args as any).maxDepth);
          case 'move_file':
            return await this.moveFile((args as any).source, (args as any).destination);
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
            
          // FILESYSTEM-SPECIFIC MEMORY TOOLS
          case 'recall_file_history':
            return await this.recallFileHistory((args as any).filePath);
          case 'find_similar_files':
            return await this.findSimilarFiles((args as any).query, (args as any).limit);
          case 'get_filesystem_memory_stats':
            return await this.getFilesystemMemoryStats();
            
          // GENERAL MEMORY TOOLS
          case 'create_entities':
            return await this.createEntities((args as any).entities);
          case 'create_relations':
            return await this.createRelations((args as any).relations);
          case 'add_observations':
            return await this.addObservations((args as any).entityName, (args as any).observations);
          case 'search_nodes':
            return await this.searchNodes((args as any).query);
          case 'read_graph':
            return await this.readGraph();
          case 'open_nodes':
            return await this.openNodes((args as any).names);
          case 'delete_entities':
            return await this.deleteEntities((args as any).entityNames);
          case 'delete_observations':
            return await this.deleteObservations((args as any).entityName, (args as any).observations);
          case 'delete_relations':
            return await this.deleteRelations((args as any).relations);
            
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

  // FILESYSTEM METHODS (all with memory tracking)
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

  private async readMultipleFiles(filePaths: string[]): Promise<CallToolResult> {
    const results: Record<string, string> = {};
    
    for (const filePath of filePaths) {
      try {
        const validatedPath = this.validatePath(filePath);
        const content = await fs.readFile(validatedPath, 'utf-8');
        results[filePath] = content;
        
        // Remember this file access
        await this.rememberFileAccess(filePath, 'read', { 
          size: content.length,
          content: content
        });
      } catch (error) {
        results[filePath] = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        } as TextContent
      ]
    };
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

  private async editFile(filePath: string, edits: Array<{oldText: string, newText: string}>, dryRun: boolean = false): Promise<CallToolResult> {
    const validatedPath = this.validatePath(filePath);
    
    try {
      const originalContent = await fs.readFile(validatedPath, 'utf-8');
      let modifiedContent = originalContent;
      
      // Apply edits
      for (const edit of edits) {
        if (!modifiedContent.includes(edit.oldText)) {
          throw new Error(`Text to replace not found: "${edit.oldText}"`);
        }
        modifiedContent = modifiedContent.replace(edit.oldText, edit.newText);
      }

      if (dryRun) {
        return {
          content: [
            {
              type: 'text',
              text: `Dry run preview:\n\nOriginal content length: ${originalContent.length}\nModified content length: ${modifiedContent.length}\n\nChanges would be applied to: ${filePath}`
            } as TextContent
          ]
        };
      } else {
        await fs.writeFile(validatedPath, modifiedContent, 'utf-8');
        
        // Remember this file access
        await this.rememberFileAccess(filePath, 'edit', { 
          size: modifiedContent.length,
          editsCount: edits.length,
          originalSize: originalContent.length
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully edited ${filePath}`
            } as TextContent
          ]
        };
      }
    } catch (error) {
      throw new Error(`Failed to edit file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createDirectory(dirPath: string): Promise<CallToolResult> {
    const validatedPath = this.validatePath(dirPath);
    
    try {
      await fs.mkdir(validatedPath, { recursive: true });
      
      // Remember this directory creation
      await this.rememberFileAccess(dirPath, 'create_directory', { isDirectory: true });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully created directory ${dirPath}`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listDirectory(dirPath: string): Promise<CallToolResult> {
    const validatedPath = this.validatePath(dirPath);
    
    try {
      const entries = await fs.readdir(validatedPath);
      
      // Remember this directory access
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

  private async listDirectoryWithSizes(dirPath: string): Promise<CallToolResult> {
    const validatedPath = this.validatePath(dirPath);
    
    try {
      const entries = await fs.readdir(validatedPath);
      const entriesWithSizes = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(validatedPath, entry);
          const stats = await fs.stat(entryPath);
          return {
            name: entry,
            size: stats.size,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile()
          };
        })
      );

      // Remember this directory access
      await this.rememberFileAccess(dirPath, 'list_directory_with_sizes', { isDirectory: true });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(entriesWithSizes, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to list directory with sizes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async directoryTree(dirPath: string, maxDepth: number = 3): Promise<CallToolResult> {
    const validatedPath = this.validatePath(dirPath);
    
    const buildTree = async (currentPath: string, currentDepth: number): Promise<any> => {
      if (currentDepth >= maxDepth) {
        return null;
      }

      try {
        const stats = await fs.stat(currentPath);
        if (!stats.isDirectory()) {
          return path.basename(currentPath);
        }

        const entries = await fs.readdir(currentPath);
        const tree: Record<string, any> = {};

        for (const entry of entries) {
          const entryPath = path.join(currentPath, entry);
          tree[entry] = await buildTree(entryPath, currentDepth + 1);
        }

        return tree;
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    };

    try {
      const tree = await buildTree(validatedPath, 0);
      
      // Remember this directory tree exploration
      await this.rememberFileAccess(dirPath, 'directory_tree', { 
        isDirectory: true, 
        maxDepth,
        exploredAt: new Date().toISOString()
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(tree, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to build directory tree: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async moveFile(source: string, destination: string): Promise<CallToolResult> {
    const validatedSource = this.validatePath(source);
    const validatedDestination = this.validatePath(destination);
    
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(validatedDestination);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.rename(validatedSource, validatedDestination);
      
      // Remember this file move operation
      await this.rememberFileAccess(source, 'move_from', { movedTo: destination });
      await this.rememberFileAccess(destination, 'move_to', { movedFrom: source });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully moved ${source} to ${destination}`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to move file: ${error instanceof Error ? error.message : String(error)}`);
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

  private async listAllowedDirectories(): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            allowedDirectories: this.allowedDirectories,
            count: this.allowedDirectories.length,
            configFile: this.configFilePath,
            memoryFile: this.memoryFilePath
          }, null, 2)
        } as TextContent
      ]
    };
  }

  // FILESYSTEM-SPECIFIC MEMORY METHODS
  private async recallFileHistory(filePath: string): Promise<CallToolResult> {
    try {
      const fileEntityName = `file:${filePath}`;
      const fileEntity = this.memoryGraph.entities[fileEntityName];
      
      if (!fileEntity) {
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
              entityType: fileEntity.entityType,
              accessHistory: fileEntity.observations,
              relationships: fileEntity.relations || []
            }, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to recall file history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async findSimilarFiles(query: string, limit: number = 10): Promise<CallToolResult> {
    try {
      const searchResults = await this.searchNodesInternal(query);
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
    try {
      const fileEntities = Object.values(this.memoryGraph.entities).filter(e => e.entityType === 'filesystem_file');
      const dirEntities = Object.values(this.memoryGraph.entities).filter(e => e.entityType === 'filesystem_directory');
      
      const stats = {
        memoryEnabled: true,
        memoryFilePath: this.memoryFilePath,
        allowedDirectories: this.allowedDirectories,
        totalFilesTracked: fileEntities.length,
        totalDirectoriesTracked: dirEntities.length,
        totalMemoryEntities: Object.keys(this.memoryGraph.entities).length,
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

  // GENERAL MEMORY METHODS (built-in functionality)
  private async createEntitiesInternal(entities: MemoryEntity[]): Promise<void> {
    for (const entity of entities) {
      if (this.memoryGraph.entities[entity.name]) {
        // Entity exists, merge observations
        if (entity.observations) {
          const existingObs = this.memoryGraph.entities[entity.name].observations || [];
          this.memoryGraph.entities[entity.name].observations = [
            ...existingObs,
            ...entity.observations.filter(obs => !existingObs.includes(obs))
          ];
        }
      } else {
        // Create new entity
        this.memoryGraph.entities[entity.name] = {
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || [],
          relations: []
        };
      }
    }
    await this.saveMemoryGraph();
  }

  private async createRelationsInternal(relations: MemoryRelation[]): Promise<void> {
    for (const relation of relations) {
      // Ensure both entities exist
      if (!this.memoryGraph.entities[relation.from]) {
        this.memoryGraph.entities[relation.from] = {
          name: relation.from,
          entityType: 'unknown',
          observations: [],
          relations: []
        };
      }
      if (!this.memoryGraph.entities[relation.to]) {
        this.memoryGraph.entities[relation.to] = {
          name: relation.to,
          entityType: 'unknown',
          observations: [],
          relations: []
        };
      }

      // Add relation if it doesn't exist
      const fromEntity = this.memoryGraph.entities[relation.from];
      const existingRelation = fromEntity.relations?.find(r => 
        r.to === relation.to && r.relationType === relation.relationType
      );

      if (!existingRelation) {
        if (!fromEntity.relations) fromEntity.relations = [];
        fromEntity.relations.push({
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType
        });
      }
    }
    await this.saveMemoryGraph();
  }

  private async createEntities(entities: MemoryEntity[]): Promise<CallToolResult> {
    try {
      await this.createEntitiesInternal(entities);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully created ${entities.length} entities`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create entities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createRelations(relations: MemoryRelation[]): Promise<CallToolResult> {
    try {
      await this.createRelationsInternal(relations);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully created ${relations.length} relations`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to create relations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async addObservations(entityName: string, observations: string[]): Promise<CallToolResult> {
    try {
      if (!this.memoryGraph.entities[entityName]) {
        throw new Error(`Entity ${entityName} does not exist`);
      }

      const entity = this.memoryGraph.entities[entityName];
      const existingObs = entity.observations || [];
      entity.observations = [
        ...existingObs,
        ...observations.filter(obs => !existingObs.includes(obs))
      ];

      await this.saveMemoryGraph();

      return {
        content: [
          {
            type: 'text',
            text: `Successfully added ${observations.length} observations to ${entityName}`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to add observations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async searchNodesInternal(query: string): Promise<MemorySearchResult[]> {
    const results: MemorySearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const entity of Object.values(this.memoryGraph.entities)) {
      let score = 0;
      
      // Check entity name
      if (entity.name.toLowerCase().includes(queryLower)) {
        score += 100;
      }
      
      // Check entity type
      if (entity.entityType.toLowerCase().includes(queryLower)) {
        score += 50;
      }
      
      // Check observations
      for (const observation of entity.observations || []) {
        if (observation.toLowerCase().includes(queryLower)) {
          score += 10;
        }
      }

      if (score > 0) {
        results.push({
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations || [],
          relations: entity.relations || [],
          score
        });
      }
    }

    return results.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private async searchNodes(query: string): Promise<CallToolResult> {
    try {
      const results = await this.searchNodesInternal(query);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to search nodes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async readGraph(): Promise<CallToolResult> {
    try {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(this.memoryGraph, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to read graph: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async openNodes(names: string[]): Promise<CallToolResult> {
    try {
      const nodes: MemoryNode[] = [];
      for (const name of names) {
        const entity = this.memoryGraph.entities[name];
        if (entity) {
          nodes.push(entity);
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(nodes, null, 2)
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to open nodes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async deleteEntities(entityNames: string[]): Promise<CallToolResult> {
    try {
      for (const entityName of entityNames) {
        // Remove the entity
        delete this.memoryGraph.entities[entityName];
        
        // Remove all relations pointing to this entity
        for (const entity of Object.values(this.memoryGraph.entities)) {
          if (entity.relations) {
            entity.relations = entity.relations.filter(r => r.to !== entityName);
          }
        }
      }

      await this.saveMemoryGraph();

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted ${entityNames.length} entities`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to delete entities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async deleteObservations(entityName: string, observations: string[]): Promise<CallToolResult> {
    try {
      const entity = this.memoryGraph.entities[entityName];
      if (!entity) {
        throw new Error(`Entity ${entityName} does not exist`);
      }

      entity.observations = entity.observations?.filter(obs => !observations.includes(obs)) || [];
      await this.saveMemoryGraph();

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted ${observations.length} observations from ${entityName}`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to delete observations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async deleteRelations(relations: MemoryRelation[]): Promise<CallToolResult> {
    try {
      for (const relation of relations) {
        const fromEntity = this.memoryGraph.entities[relation.from];
        if (fromEntity && fromEntity.relations) {
          fromEntity.relations = fromEntity.relations.filter(r => 
            !(r.to === relation.to && r.relationType === relation.relationType)
          );
        }
      }

      await this.saveMemoryGraph();

      return {
        content: [
          {
            type: 'text',
            text: `Successfully deleted ${relations.length} relations`
          } as TextContent
        ]
      };
    } catch (error) {
      throw new Error(`Failed to delete relations: ${error instanceof Error ? error.message : String(error)}`);
    }
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
      await this.createEntitiesInternal([{
        name: `directory:${resolvedPath}`,
        entityType: 'filesystem_directory',
        observations: [
          `Allowed directory: ${resolvedPath}`,
          `Resolved path: ${path.resolve(resolvedPath)}`,
          `Added dynamically at: ${new Date().toISOString()}`
        ]
      }]);

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

      // Remember this directory removal in memory by adding an observation
      const directoryEntityName = `directory:${resolvedPath}`;
      if (this.memoryGraph.entities[directoryEntityName]) {
        await this.addObservations(
          directoryEntityName,
          [`Directory access removed at: ${new Date().toISOString()}`]
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
    
    console.error('Comprehensive filesystem-memory server started successfully');
  }

  async stop() {
    await this.server.close();
  }
} 