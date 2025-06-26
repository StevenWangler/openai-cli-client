#!/usr/bin/env node

import { FilesystemServer } from './mcp/filesystem-server.js';

async function main() {
  // Get allowed directories from command line arguments
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
  
  if (allowedDirectories.length === 0) {
    console.error('Error: At least one allowed directory must be specified');
    console.error('Usage: node filesystem-server-standalone.js [--config-file=path] <directory1> [directory2] ...');
    console.error('Example: node filesystem-server-standalone.js --config-file=./fs-config.json /Users/username/Documents /Users/username/Projects');
    process.exit(1);
  }

  console.error(`Starting Filesystem Server with allowed directories:`);
  allowedDirectories.forEach((dir, index) => {
    console.error(`  ${index + 1}. ${dir}`);
  });
  if (configFilePath) {
    console.error(`Configuration file: ${configFilePath}`);
  }
  console.error('Filesystem Server ready for connections...');

  const server = new FilesystemServer(allowedDirectories, configFilePath);
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down Filesystem Server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('Shutting down Filesystem Server...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start Filesystem Server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
} 