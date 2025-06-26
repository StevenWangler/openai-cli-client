#!/usr/bin/env node

import { FilesystemServerWithMemory } from './mcp/filesystem-server-with-memory.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  // Get allowed directories from command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: At least one allowed directory must be specified');
    console.error('Usage: node filesystem-memory-server-standalone.js [--memory-file=path] <directory1> [directory2] ...');
    console.error('Example: node filesystem-memory-server-standalone.js --memory-file=./fs-memory.json /Users/username/Documents /Users/username/Projects');
    process.exit(1);
  }

  // Parse optional memory file argument
  let memoryFilePath: string | undefined;
  const allowedDirectories: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--memory-file=')) {
      memoryFilePath = arg.split('=')[1];
    } else {
      allowedDirectories.push(arg);
    }
  }

  if (allowedDirectories.length === 0) {
    console.error('Error: At least one allowed directory must be specified');
    process.exit(1);
  }

  console.error(`Starting Filesystem Server with Memory Integration:`);
  console.error(`Memory file: ${memoryFilePath || './filesystem-memory.json'}`);
  console.error(`Allowed directories:`);
  allowedDirectories.forEach((dir, index) => {
    console.error(`  ${index + 1}. ${dir}`);
  });
  console.error('Filesystem Server with Memory ready for connections...');

  const server = new FilesystemServerWithMemory(allowedDirectories, memoryFilePath);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down Filesystem Server with Memory...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down Filesystem Server with Memory...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start Filesystem Server with Memory:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 