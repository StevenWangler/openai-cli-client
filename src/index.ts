#!/usr/bin/env node

import { Command } from 'commander';
import { startChat } from './cli/chat.js';
import chalk from 'chalk';

const program = new Command();

// Enhanced ASCII art for the help command
const showBanner = () => {
  console.log(chalk.cyan(`
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║      █████╗ ██╗     ██╗██╗██╗     ██╗███████╗███╗   ██╗      ║
    ║     ██╔══██╗██║     ██║██║██║     ██║██╔════╝████╗  ██║      ║
    ║     ███████║██║     ██║██║██║     ██║█████╗  ██╔██╗ ██║      ║
    ║     ██╔══██║██║     ██║██║██║     ██║██╔══╝  ██║╚██╗██║      ║
    ║     ██║  ██║██║     ██║██║███████╗██║███████╗██║ ╚████║      ║
    ║     ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚══════╝╚═╝╚══════╝╚═╝  ╚═══╝      ║
    ║                                                               ║
    ║            ${chalk.white.bold('The most beautiful AI CLI experience')}            ║
    ║                 ${chalk.gray('OpenAI • MCP Servers • Modern UI')}                ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
  `));
};

program
  .name('ai-chat')
  .description(chalk.gray('The most beautiful CLI chat client using OpenAI API with MCP server support'))
  .version('1.0.0', '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display this help message')
  .addHelpText('before', () => {
    showBanner();
    return '';
  })
  .addHelpText('after', () => {
    return `
${chalk.cyan('Examples:')}
  ${chalk.gray('$')} ${chalk.white('ai-chat')}                          ${chalk.dim('# Start interactive chat')}
  ${chalk.gray('$')} ${chalk.white('ai-chat chat')}                     ${chalk.dim('# Start interactive chat (explicit)')}
  ${chalk.gray('$')} ${chalk.white('ai-chat chat -m gpt-3.5-turbo')}    ${chalk.dim('# Use specific model')}
  ${chalk.gray('$')} ${chalk.white('ai-chat chat -s ./my-server')}       ${chalk.dim('# Connect to MCP server')}
  ${chalk.gray('$')} ${chalk.white('ai-chat chat -c ./config.json')}     ${chalk.dim('# Use custom config')}

${chalk.cyan('Tips:')}
  ${chalk.gray('•')} Type ${chalk.yellow('/help')} in chat for interactive commands
  ${chalk.gray('•')} Use ${chalk.yellow('/clear')} to clear the screen
  ${chalk.gray('•')} Press ${chalk.yellow('Ctrl+C')} to exit gracefully
  ${chalk.gray('•')} Use ${chalk.yellow('/exit')} or ${chalk.yellow('/quit')} to leave chat

${chalk.cyan('Configuration:')}
  Set ${chalk.yellow('OPENAI_API_KEY')} environment variable or use a config file
  
${chalk.dim('For more information, visit: https://github.com/your-repo/ai-chat')}
`;
  });

program
  .command('chat')
  .description('🚀 Start an interactive AI chat session')
  .option('-m, --model <model>', 'OpenAI model to use (e.g., gpt-4o, gpt-3.5-turbo)', 'gpt-4o')
  .option('-s, --server <path>', 'Path to MCP server executable')
  .option('-c, --config <path>', 'Path to configuration file (JSON format)')
  .addHelpText('after', `
${chalk.cyan('Chat Commands (use inside the chat):')}
  ${chalk.yellow('/help')}    Show available commands
  ${chalk.yellow('/clear')}   Clear the screen
  ${chalk.yellow('/exit')}    Exit the chat session
  ${chalk.yellow('/quit')}    Exit the chat session
`)
  .action(async (options) => {
    try {
      await startChat(options);
    } catch (error) {
      console.error(`\n${chalk.red('❌ Error:')} ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(chalk.gray('\nTips:'));
      console.log(chalk.gray('• Make sure OPENAI_API_KEY is set in your environment'));
      console.log(chalk.gray('• Check your internet connection'));
      console.log(chalk.gray('• Verify your OpenAI API key is valid'));
      process.exit(1);
    }
  });

program
  .command('servers')
  .description('📋 List available MCP servers and configuration info')
  .action(() => {
    showBanner();
    console.log(chalk.cyan('\n╭─ Available MCP Servers'));
    console.log(chalk.cyan('├─ 🏗️  File system server (built-in)'));
    console.log(chalk.cyan('├─ ⚙️  Custom servers via --server option'));
    console.log(chalk.cyan('╰─ 📁 Custom servers via config file\n'));
    
    console.log(chalk.cyan('Configuration Options:'));
    console.log(chalk.gray('• Environment variable: OPENAI_API_KEY'));
    console.log(chalk.gray('• Config file: config.json (see config.example.json)'));
    console.log(chalk.gray('• Command line: --server, --model, --config\n'));
    
    console.log(chalk.yellow('💡 Tip:'), chalk.gray('Run'), chalk.white('ai-chat chat --help'), chalk.gray('for chat-specific options'));
  });

// Enhanced error handling
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str)),
  writeOut: (str) => process.stdout.write(str)
});

// Default to chat if no command specified
if (process.argv.length === 2) {
  program.parse(['', '', 'chat']);
} else {
  program.parse();
} 