import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  TextContent,
  ImageContent,
  EmbeddedResource
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { 
  MemoryEntity, 
  MemoryRelation, 
  MemoryNode, 
  MemoryGraph, 
  MemorySearchResult 
} from '../types/index.js';

export class MemoryServer {
  private server: Server;
  private memoryFilePath: string;
  private memoryGraph: MemoryGraph = { entities: {} };
  private isInitialized = false;

  constructor(memoryFilePath?: string) {
    this.memoryFilePath = memoryFilePath || process.env.MEMORY_FILE_PATH || './memory.json';
    
    this.server = new Server(
      {
        name: 'memory-server',
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

  private setupToolHandlers() {
    // Define all available memory tools
    const tools: Tool[] = [
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
      }
    ];

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.ensureInitialized();

        if (!args) {
          throw new Error('Missing arguments');
        }

        switch (name) {
          case 'create_entities':
            return await this.createEntities(args.entities as MemoryEntity[]);
          case 'create_relations':
            return await this.createRelations(args.relations as MemoryRelation[]);
          case 'add_observations':
            return await this.addObservations(args.entityName as string, args.observations as string[]);
          case 'search_nodes':
            return await this.searchNodes(args.query as string);
          case 'read_graph':
            return await this.readGraph();
          case 'open_nodes':
            return await this.openNodes(args.names as string[]);
          case 'delete_entities':
            return await this.deleteEntities(args.entityNames as string[]);
          case 'delete_observations':
            return await this.deleteObservations(args.entityName as string, args.observations as string[]);
          case 'delete_relations':
            return await this.deleteRelations(args.relations as MemoryRelation[]);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            } as TextContent
          ]
        };
      }
    });
  }

  private setupRequestHandlers() {
    // Add any additional request handlers if needed
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.loadMemoryGraph();
      this.isInitialized = true;
    }
  }

  private async loadMemoryGraph() {
    try {
      const data = await fs.readFile(this.memoryFilePath, 'utf-8');
      this.memoryGraph = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty graph
      this.memoryGraph = { entities: {} };
      await this.saveMemoryGraph();
    }
  }

  private async saveMemoryGraph() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.memoryFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Save graph to file
      await fs.writeFile(this.memoryFilePath, JSON.stringify(this.memoryGraph, null, 2));
    } catch (error) {
      console.error('Failed to save memory graph:', error);
    }
  }

  private async createEntities(entities: MemoryEntity[]): Promise<CallToolResult> {
    const results = [];

    for (const entity of entities) {
      const node: MemoryNode = {
        name: entity.name,
        entityType: entity.entityType,
        observations: entity.observations || [],
        relations: []
      };

      // Add or update entity
      if (this.memoryGraph.entities[entity.name]) {
        // Merge with existing entity
        const existing = this.memoryGraph.entities[entity.name];
        existing.observations = [...new Set([...existing.observations, ...node.observations])];
        results.push(`Updated entity: ${entity.name}`);
      } else {
        this.memoryGraph.entities[entity.name] = node;
        results.push(`Created entity: ${entity.name}`);
      }
    }

    await this.saveMemoryGraph();

    return {
      content: [
        {
          type: 'text',
          text: results.join('\n')
        } as TextContent
      ]
    };
  }

  private async createRelations(relations: MemoryRelation[]): Promise<CallToolResult> {
    const results = [];

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

      // Add relation to source entity
      const sourceEntity = this.memoryGraph.entities[relation.from];
      const existingRelation = sourceEntity.relations.find(
        r => r.to === relation.to && r.relationType === relation.relationType
      );

      if (!existingRelation) {
        sourceEntity.relations.push(relation);
        results.push(`Created relation: ${relation.from} -> ${relation.to} (${relation.relationType})`);
      } else {
        results.push(`Relation already exists: ${relation.from} -> ${relation.to} (${relation.relationType})`);
      }
    }

    await this.saveMemoryGraph();

    return {
      content: [
        {
          type: 'text',
          text: results.join('\n')
        } as TextContent
      ]
    };
  }

  private async addObservations(entityName: string, observations: string[]): Promise<CallToolResult> {
    if (!this.memoryGraph.entities[entityName]) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Entity '${entityName}' not found`
          } as TextContent
        ]
      };
    }

    const entity = this.memoryGraph.entities[entityName];
    const originalCount = entity.observations.length;
    
    entity.observations = [...new Set([...entity.observations, ...observations])];
    const addedCount = entity.observations.length - originalCount;

    await this.saveMemoryGraph();

    return {
      content: [
        {
          type: 'text',
          text: `Added ${addedCount} new observations to ${entityName}`
        } as TextContent
      ]
    };
  }

  private async searchNodes(query: string): Promise<CallToolResult> {
    const results: MemorySearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const [name, entity] of Object.entries(this.memoryGraph.entities)) {
      let score = 0;

      // Check name match
      if (name.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Check entity type match
      if (entity.entityType.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Check observations match
      for (const observation of entity.observations) {
        if (observation.toLowerCase().includes(queryLower)) {
          score += 3;
        }
      }

      // Check relations match
      for (const relation of entity.relations) {
        if (relation.relationType.toLowerCase().includes(queryLower) || 
            relation.to.toLowerCase().includes(queryLower)) {
          score += 2;
        }
      }

      if (score > 0) {
        results.push({
          name: entity.name,
          entityType: entity.entityType,
          observations: entity.observations,
          relations: entity.relations,
          score
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        } as TextContent
      ]
    };
  }

  private async readGraph(): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(this.memoryGraph, null, 2)
        } as TextContent
      ]
    };
  }

  private async openNodes(names: string[]): Promise<CallToolResult> {
    const results: MemoryNode[] = [];

    for (const name of names) {
      if (this.memoryGraph.entities[name]) {
        results.push(this.memoryGraph.entities[name]);
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

  private async deleteEntities(entityNames: string[]): Promise<CallToolResult> {
    const results = [];

    for (const name of entityNames) {
      if (this.memoryGraph.entities[name]) {
        // Remove entity and all relations to it
        delete this.memoryGraph.entities[name];
        
        // Remove relations pointing to this entity
        for (const entity of Object.values(this.memoryGraph.entities)) {
          entity.relations = entity.relations.filter(r => r.to !== name);
        }
        
        results.push(`Deleted entity: ${name}`);
      } else {
        results.push(`Entity not found: ${name}`);
      }
    }

    await this.saveMemoryGraph();

    return {
      content: [
        {
          type: 'text',
          text: results.join('\n')
        } as TextContent
      ]
    };
  }

  private async deleteObservations(entityName: string, observations: string[]): Promise<CallToolResult> {
    if (!this.memoryGraph.entities[entityName]) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Entity '${entityName}' not found`
          } as TextContent
        ]
      };
    }

    const entity = this.memoryGraph.entities[entityName];
    const originalCount = entity.observations.length;
    
    entity.observations = entity.observations.filter(obs => !observations.includes(obs));
    const deletedCount = originalCount - entity.observations.length;

    await this.saveMemoryGraph();

    return {
      content: [
        {
          type: 'text',
          text: `Deleted ${deletedCount} observations from ${entityName}`
        } as TextContent
      ]
    };
  }

  private async deleteRelations(relations: MemoryRelation[]): Promise<CallToolResult> {
    const results = [];

    for (const relation of relations) {
      if (this.memoryGraph.entities[relation.from]) {
        const entity = this.memoryGraph.entities[relation.from];
        const originalCount = entity.relations.length;
        
        entity.relations = entity.relations.filter(r => 
          !(r.to === relation.to && r.relationType === relation.relationType)
        );
        
        if (entity.relations.length < originalCount) {
          results.push(`Deleted relation: ${relation.from} -> ${relation.to} (${relation.relationType})`);
        } else {
          results.push(`Relation not found: ${relation.from} -> ${relation.to} (${relation.relationType})`);
        }
      }
    }

    await this.saveMemoryGraph();

    return {
      content: [
        {
          type: 'text',
          text: results.join('\n')
        } as TextContent
      ]
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async stop() {
    await this.server.close();
  }
}

// CLI entry point for running the memory server
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MemoryServer();
  server.start().catch(console.error);
} 