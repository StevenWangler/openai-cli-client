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

export class FilesystemServer {
  private server: Server;
  private allowedDirectories: string[] = [];
  private configFilePath: string;

  constructor(allowedDirectories: string[] = [], configFilePath: string = './filesystem-config.json') {
    // Resolve and normalize allowed directories
    this.allowedDirectories = allowedDirectories.map(dir => path.resolve(dir));
    this.configFilePath = configFilePath;
    
    // Load configuration if it exists
    this.loadConfiguration();
    
    this.server = new Server(
      {
        name: 'filesystem-server',
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
    // Define all available filesystem tools
    const tools: Tool[] = [
      {
        name: 'read_file',
        description: 'Read complete file contents',
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
        description: 'Read multiple files simultaneously',
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
        description: 'Create or overwrite files',
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
        description: 'Make precise edits with diff preview (supports dry-run)',
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
        description: 'Create directories',
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
        description: 'List directory contents',
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
        description: 'List directory contents with file sizes',
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
        description: 'Get recursive directory structure',
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
        description: 'Move/rename files and directories',
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
        description: 'Recursive file search with glob patterns',
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
        description: 'File metadata and stats',
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
    const results: Record<string, string | string> = {};
    
    for (const filePath of filePaths) {
      try {
        const validatedPath = this.validatePath(filePath);
        const content = await fs.readFile(validatedPath, 'utf-8');
        results[filePath] = content;
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
  }

  async stop() {
    await this.server.close();
  }
} 