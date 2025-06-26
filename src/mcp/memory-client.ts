import { MCPClient } from './client.js';
import type { 
  MemoryEntity, 
  MemoryRelation, 
  MemoryNode, 
  MemoryGraph, 
  MemorySearchResult,
  MCPServerConfig 
} from '../types/index.js';

export class MemoryClient {
  private mcpClient: MCPClient;
  private isConnected = false;

  constructor() {
    this.mcpClient = new MCPClient();
  }

  async connect(memoryFilePath?: string): Promise<void> {
    const serverConfig: MCPServerConfig = {
      name: 'memory-server',
      command: 'node',
      args: ['dist/mcp/server.js'],
      env: memoryFilePath ? { MEMORY_FILE_PATH: memoryFilePath } : undefined
    };

    await this.mcpClient.connect(serverConfig);
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.mcpClient.disconnect();
      this.isConnected = false;
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Memory client not connected. Call connect() first.');
    }
  }

  async createEntities(entities: MemoryEntity[]): Promise<string> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('create_entities', { entities });
    return this.extractTextContent(result);
  }

  async createEntity(name: string, entityType: string, observations?: string[]): Promise<string> {
    return await this.createEntities([{ name, entityType, observations }]);
  }

  async createRelations(relations: MemoryRelation[]): Promise<string> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('create_relations', { relations });
    return this.extractTextContent(result);
  }

  async createRelation(from: string, to: string, relationType: string): Promise<string> {
    return await this.createRelations([{ from, to, relationType }]);
  }

  async addObservations(entityName: string, observations: string[]): Promise<string> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('add_observations', { entityName, observations });
    return this.extractTextContent(result);
  }

  async addObservation(entityName: string, observation: string): Promise<string> {
    return await this.addObservations(entityName, [observation]);
  }

  async searchNodes(query: string): Promise<MemorySearchResult[]> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('search_nodes', { query });
    const textContent = this.extractTextContent(result);
    
    try {
      return JSON.parse(textContent) as MemorySearchResult[];
    } catch (error) {
      console.error('Failed to parse search results:', error);
      return [];
    }
  }

  async readGraph(): Promise<MemoryGraph> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('read_graph', {});
    const textContent = this.extractTextContent(result);
    
    try {
      return JSON.parse(textContent) as MemoryGraph;
    } catch (error) {
      console.error('Failed to parse memory graph:', error);
      return { entities: {} };
    }
  }

  async openNodes(names: string[]): Promise<MemoryNode[]> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('open_nodes', { names });
    const textContent = this.extractTextContent(result);
    
    try {
      return JSON.parse(textContent) as MemoryNode[];
    } catch (error) {
      console.error('Failed to parse nodes:', error);
      return [];
    }
  }

  async openNode(name: string): Promise<MemoryNode | null> {
    const nodes = await this.openNodes([name]);
    return nodes.length > 0 ? nodes[0] : null;
  }

  async deleteEntities(entityNames: string[]): Promise<string> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('delete_entities', { entityNames });
    return this.extractTextContent(result);
  }

  async deleteEntity(entityName: string): Promise<string> {
    return await this.deleteEntities([entityName]);
  }

  async deleteObservations(entityName: string, observations: string[]): Promise<string> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('delete_observations', { entityName, observations });
    return this.extractTextContent(result);
  }

  async deleteRelations(relations: MemoryRelation[]): Promise<string> {
    this.ensureConnected();
    const result = await this.mcpClient.callTool('delete_relations', { relations });
    return this.extractTextContent(result);
  }

  async deleteRelation(from: string, to: string, relationType: string): Promise<string> {
    return await this.deleteRelations([{ from, to, relationType }]);
  }

  // Convenience methods for common operations
  
  async rememberPerson(name: string, details: string[]): Promise<string> {
    return await this.createEntity(name, 'person', details);
  }

  async rememberConcept(name: string, description: string[]): Promise<string> {
    return await this.createEntity(name, 'concept', description);
  }

  async rememberEvent(name: string, details: string[]): Promise<string> {
    return await this.createEntity(name, 'event', details);
  }

  async associatePeople(person1: string, person2: string, relationship: string): Promise<string> {
    return await this.createRelation(person1, person2, relationship);
  }

  async recallSimilar(query: string, limit = 5): Promise<MemorySearchResult[]> {
    const results = await this.searchNodes(query);
    return results.slice(0, limit);
  }

  async recallAbout(entityName: string): Promise<MemoryNode | null> {
    return await this.openNode(entityName);
  }

  // Helper methods

  async getEntityCount(): Promise<number> {
    const graph = await this.readGraph();
    return Object.keys(graph.entities).length;
  }

  async getEntityTypes(): Promise<Record<string, number>> {
    const graph = await this.readGraph();
    const typeCounts: Record<string, number> = {};
    
    for (const entity of Object.values(graph.entities)) {
      typeCounts[entity.entityType] = (typeCounts[entity.entityType] || 0) + 1;
    }
    
    return typeCounts;
  }

  async getRecentlyModifiedEntities(days = 7): Promise<MemoryNode[]> {
    // This would require timestamps in the memory format
    // For now, return all entities
    const graph = await this.readGraph();
    return Object.values(graph.entities);
  }

  // Smart memory functions for AI integration

  async smartRemember(content: string, context?: string): Promise<string> {
    // This method would use AI to extract entities and relationships from free text
    // For now, we'll create a simple implementation that creates a generic entity
    const entityName = context || `memory_${Date.now()}`;
    return await this.createEntity(entityName, 'information', [content]);
  }

  async contextualSearch(query: string, contextEntities?: string[]): Promise<MemorySearchResult[]> {
    let results = await this.searchNodes(query);
    
    if (contextEntities && contextEntities.length > 0) {
      // Boost scores for entities related to context
      for (const result of results) {
        for (const relation of result.relations) {
          if (contextEntities.includes(relation.to)) {
            result.score = (result.score || 0) + 5;
          }
        }
      }
      
      // Re-sort by score
      results.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    
    return results;
  }

  private extractTextContent(result: any): string {
    if (Array.isArray(result)) {
      return result
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }
    
    if (typeof result === 'string') {
      return result;
    }
    
    if (result && typeof result === 'object' && result.text) {
      return result.text;
    }
    
    return JSON.stringify(result);
  }

  // Status methods

  getIsConnected(): boolean {
    return this.isConnected && this.mcpClient.isConnected();
  }

  getServerName(): string {
    return this.mcpClient.getServerName();
  }

  getAvailableTools() {
    return this.mcpClient.getTools();
  }
} 