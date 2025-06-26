#!/usr/bin/env node

import { ComprehensiveFilesystemMemoryServer } from './mcp/comprehensive-filesystem-memory-server.js';

// Default directories - can be overridden by command line arguments
const defaultDirectories = [
  '/Users/steven/Source',
  '/Users/steven/Documents'
];

const memoryFilePath = './comprehensive-memory.json';

async function main() {
  const args = process.argv.slice(2);
  
  // Parse optional config file argument
  let configFilePath: string | undefined;
  const allowedDirectories: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--config-file=')) {
      configFilePath = arg.split('=')[1];
    } else if (arg.startsWith('--')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    } else {
      allowedDirectories.push(arg);
    }
  }
  
  // Use provided directories or defaults
  const finalDirectories = allowedDirectories.length > 0 ? allowedDirectories : defaultDirectories;

  console.error(`Starting comprehensive filesystem-memory server with directories: ${finalDirectories.join(', ')}`);
  console.error(`Memory file: ${memoryFilePath}`);
  if (configFilePath) {
    console.error(`Configuration file: ${configFilePath}`);
  }
  console.error('All filesystem tools + all memory tools will be available');

  const server = new ComprehensiveFilesystemMemoryServer(finalDirectories, memoryFilePath, configFilePath);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down comprehensive server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down comprehensive server...');
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

main().catch((error) => {
  console.error('Failed to start comprehensive server:', error);
  process.exit(1);
}); 