#!/usr/bin/env node

import { MemoryServer } from './mcp/server.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  const memoryFilePath = process.env.MEMORY_FILE_PATH || './memory.json';
  
  console.error(`Starting Memory Server with file: ${memoryFilePath}`);
  console.error('Memory Server ready for connections...');

  const server = new MemoryServer(memoryFilePath);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down Memory Server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down Memory Server...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start Memory Server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 