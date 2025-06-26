# Memory Server Implementation Guide

This document explains how to use the integrated MCP Memory Server in your CLI AI application.

## Overview

The Memory Server provides persistent, graph-based memory capabilities for your AI conversations. It stores information as entities, relationships, and observations in a knowledge graph that persists across sessions.

## Quick Start

### 1. Build the Project
```bash
npm run build
```

### 2. Configure Memory Server
Update your `config.json` (copy from `config.example.json`):

```json
{
  "openai": {
    "apiKey": "your-openai-api-key-here",
    "model": "gpt-4o"
  },
  "mcpServers": [
    {
      "name": "memory-server",
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "env": {
        "MEMORY_FILE_PATH": "./memory.json"
      }
    }
  ],
  "memory": {
    "enabled": true,
    "filePath": "./memory.json",
    "autoSave": true
  }
}
```

### 3. Start Chat with Memory
```bash
ai-chat chat -c config.json
```

## Available Memory Tools

### Core Operations

1. **create_entities** - Create new entities in memory
   ```json
   {
     "entities": [
       {
         "name": "John Doe",
         "entityType": "person",
         "observations": ["Software engineer", "Lives in San Francisco"]
       }
     ]
   }
   ```

2. **create_relations** - Create relationships between entities
   ```json
   {
     "relations": [
       {
         "from": "John Doe",
         "to": "Jane Smith",
         "relationType": "colleague"
       }
     ]
   }
   ```

3. **add_observations** - Add facts to existing entities
   ```json
   {
     "entityName": "John Doe",
     "observations": ["Likes TypeScript", "Working on AI project"]
   }
   ```

4. **search_nodes** - Search memory by query
   ```json
   {
     "query": "software engineer"
   }
   ```

5. **read_graph** - Read the entire memory graph

6. **open_nodes** - Retrieve specific entities
   ```json
   {
     "names": ["John Doe", "Jane Smith"]
   }
   ```

### Management Operations

7. **delete_entities** - Remove entities and their relations
8. **delete_observations** - Remove specific observations
9. **delete_relations** - Remove relationships

## Programming Interface

### Using MemoryClient

```typescript
import { MemoryClient } from './src/mcp/memory-client.js';

const memory = new MemoryClient();

// Connect to memory server
await memory.connect('./my-memory.json');

// Remember a person
await memory.rememberPerson('Alice', ['Data scientist', 'Python expert']);

// Create a relationship
await memory.associatePeople('Alice', 'Bob', 'teammate');

// Search for information
const results = await memory.recallSimilar('Python expert');

// Get detailed information
const alice = await memory.recallAbout('Alice');

// Disconnect when done
await memory.disconnect();
```

### Convenience Methods

The MemoryClient provides high-level methods for common operations:

```typescript
// Memory creation
await memory.rememberPerson(name, details);
await memory.rememberConcept(name, description);
await memory.rememberEvent(name, details);

// Relationships
await memory.associatePeople(person1, person2, relationship);

// Retrieval
await memory.recallSimilar(query, limit);
await memory.recallAbout(entityName);

// Analysis
await memory.getEntityCount();
await memory.getEntityTypes();
```

## Memory File Format

The memory is stored as JSON in the following format:

```json
{
  "entities": {
    "John Doe": {
      "name": "John Doe",
      "entityType": "person",
      "observations": [
        "Software engineer",
        "Lives in San Francisco"
      ],
      "relations": [
        {
          "from": "John Doe",
          "to": "Jane Smith",
          "relationType": "colleague"
        }
      ]
    }
  }
}
```

## Environment Variables

- `MEMORY_FILE_PATH`: Path to the memory JSON file (default: `./memory.json`)

## Testing the Memory Server

### Using MCP Inspector
```bash
# First, build the project
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

This opens a web interface where you can test memory operations.

### Using the Standalone Server
```bash
# Run the standalone memory server
node dist/memory-server-standalone.js
```

### Manual Testing
```bash
# Start the server in one terminal
MEMORY_FILE_PATH=./test-memory.json node dist/memory-server-standalone.js

# In another terminal, test with a simple MCP client
# (This requires implementing a test client or using the MCP Inspector)
```

## Integration Patterns

### Automatic Memory Creation
The AI can automatically create memories during conversations:

```typescript
// In your chat handler
if (message.includes('Remember that')) {
  await memory.smartRemember(message, 'user-instruction');
}
```

### Context-Aware Search
Use contextual search to find relevant memories:

```typescript
const contextEntities = ['current project', 'team members'];
const relevantMemories = await memory.contextualSearch(query, contextEntities);
```

### Memory Consolidation
Periodically clean up and consolidate memories:

```typescript
// Get entity statistics
const types = await memory.getEntityTypes();
console.log('Memory contains:', types);

// Clean up old or irrelevant entities
await memory.deleteEntity('outdated-project');
```

## Best Practices

1. **Entity Naming**: Use consistent, descriptive names for entities
2. **Relationship Types**: Use standardized relationship types (colleague, friend, works-on, etc.)
3. **Observations**: Keep observations concise but descriptive
4. **Regular Cleanup**: Periodically review and clean up memory
5. **Backup**: Regularly backup your memory.json file
6. **Search Optimization**: Use specific queries for better search results

## Troubleshooting

### Common Issues

1. **Server Won't Start**
   - Check that the project is built: `npm run build`
   - Verify file permissions for memory.json
   - Check console for error messages

2. **Memory Not Persisting**
   - Ensure MEMORY_FILE_PATH is writable
   - Check disk space
   - Verify JSON format is valid

3. **Search Not Working**
   - Try simpler queries
   - Check entity names and observations
   - Verify entities exist with `read_graph`

4. **Connection Issues**
   - Ensure server is running
   - Check configuration file format
   - Verify command path in config

### Debug Mode

Set environment variable for debug output:
```bash
DEBUG=memory-server ai-chat chat -c config.json
```

## Advanced Usage

### Custom Entity Types

Create custom entity types for your domain:

```typescript
await memory.createEntity('My Project', 'project', [
  'Web application',
  'Uses React and Node.js',
  'Due next month'
]);
```

### Complex Relationships

Model complex relationships:

```typescript
await memory.createRelation('Alice', 'Project Alpha', 'manages');
await memory.createRelation('Bob', 'Project Alpha', 'contributes-to');
await memory.createRelation('Project Alpha', 'Client XYZ', 'delivered-to');
```

### Memory Analytics

Analyze your memory graph:

```typescript
const graph = await memory.readGraph();
const entityCount = Object.keys(graph.entities).length;
const relationCount = Object.values(graph.entities)
  .reduce((sum, entity) => sum + entity.relations.length, 0);

console.log(`Memory contains ${entityCount} entities and ${relationCount} relations`);
```

This memory system provides a powerful foundation for persistent AI conversations with rich context and relationship modeling. 