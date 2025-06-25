import { createInterface } from 'readline';
import { config } from 'dotenv';
import { OpenAIClient } from '../openai/client.js';
import { MCPClient } from '../mcp/client.js';
import { UIHelpers } from './ui.js';
import { MarkdownRenderer } from './markdown.js';
import type { ChatOptions, ChatMessage, MCPServerConfig } from '../types/index.js';
import chalk from 'chalk';

// Load environment variables from .env file
config();

export async function startChat(options: ChatOptions): Promise<void> {
  // Load configuration
  const config = await loadConfig(options.config);
  
  // Get OpenAI API key (prioritize env vars, then config file)
  const apiKey = process.env.OPENAI_API_KEY || config.openai.apiKey;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Set OPENAI_API_KEY in .env file, environment variable, or config file.');
  }

  // Get model (prioritize command line, then env var, then config, then default)
  const model = options.model || process.env.OPENAI_MODEL || config.openai.model || process.env.DEFAULT_MODEL || 'gpt-4o';

  // Initialize OpenAI client
  const openai = new OpenAIClient(apiKey, model);
  
  // Initialize MCP client
  const mcpClient = new MCPClient();
  
  // Connect to MCP server if specified
  if (options.server || config.mcpServers.length > 0) {
    const serverConfig = options.server 
      ? { name: 'custom', command: options.server, args: [] }
      : config.mcpServers[0];
    
    try {
      // Show connection attempt
      const connectSpinner = UIHelpers.createSpinner('Connecting to MCP server...');
      connectSpinner.start();
      
      await mcpClient.connect(serverConfig);
      connectSpinner.stop();
      
      UIHelpers.showConnectionStatus(mcpClient.getServerName(), true);
      UIHelpers.updateWindowTitle(`Connected to ${mcpClient.getServerName()}`);
      UIHelpers.showSuccessMessage(`Connected to ${mcpClient.getServerName()}`);
    } catch (error) {
      console.error(UIHelpers.formatError(`Failed to connect to MCP server: ${error}`));
      UIHelpers.showWarningMessage('Continuing without MCP server...');
      UIHelpers.updateWindowTitle('No MCP Server');
    }
  }

  // Show welcome and available tools
  UIHelpers.showWelcome();
  
  // Wait for welcome animation to complete
  setTimeout(() => {
    UIHelpers.showModelInfo(model);
    
    if (mcpClient.isConnected()) {
      UIHelpers.showAvailableTools(mcpClient.getTools());
    }
    
    // Show command palette
    UIHelpers.showCommandPalette();
    
    // Start the chat interface
    startChatInterface();
  }, 1000);

  function startChatInterface() {
    // Set up readline interface with custom prompt
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: UIHelpers.createCustomPrompt()
    });
    
    // Prevent stdin from pausing
    process.stdin.setRawMode(false);
    process.stdin.resume();

    // Chat history
    const messages: ChatMessage[] = [];
    let isProcessing = false;

    // Track whether we're intentionally shutting down
    let isShuttingDown = false;

    // Keep the process alive with a heartbeat timer
    const heartbeat = setInterval(() => {
      // This timer keeps the event loop active
    }, 1000);

    // Process message function that handles async operations
    const processMessage = async (userMessage: string) => {
      // Clear the input line for cleaner display
      UIHelpers.clearLine();
      
      // Add user message to history
      messages.push({ role: 'user', content: userMessage, timestamp: new Date() });
      console.log(UIHelpers.formatUserMessage(userMessage));

      // Show enhanced thinking animation
      const thinkingAnimation = UIHelpers.showThinkingAnimation();
      let typingAnimation: NodeJS.Timeout | undefined;

      try {
        isProcessing = true;
        
        // Get available tools
        const tools = mcpClient.isConnected() ? mcpClient.getTools() : [];
        
        // Stream response from OpenAI
        let assistantResponse = '';
        let toolCallsMade = false;

        try {
          UIHelpers.clearThinkingAnimation(thinkingAnimation);
          typingAnimation = UIHelpers.showTypingIndicator();

          for await (const chunk of openai.streamChat(messages, tools)) {
            if (typeof chunk === 'string') {
              // Text response - accumulate for markdown rendering
              assistantResponse += chunk;
              
              // Show a simple progress indicator instead of raw text
              if (!toolCallsMade && assistantResponse.length % 50 === 0) {
                // Update typing indicator periodically to show progress
                UIHelpers.clearTypingIndicator(typingAnimation);
                typingAnimation = UIHelpers.showTypingIndicator();
              }
            } else if (chunk.type === 'tool_call') {
              // Tool call
              if (!toolCallsMade) {
                UIHelpers.clearTypingIndicator(typingAnimation);
                toolCallsMade = true;
              }

              try {
                console.log(`\n${UIHelpers.formatSystemMessage(`Calling tool: ${chunk.tool}`)}`);
                
                // Show tool execution spinner
                const toolSpinner = UIHelpers.createSpinner(`Executing ${chunk.tool}...`);
                toolSpinner.start();
                
                const toolResult = await mcpClient.callTool(chunk.tool, chunk.args);
                toolSpinner.stop();
                
                // Format tool result for display
                const resultText = Array.isArray(toolResult) 
                  ? toolResult.map(r => r.text || JSON.stringify(r)).join('\n')
                  : typeof toolResult === 'string' 
                    ? toolResult 
                    : JSON.stringify(toolResult, null, 2);

                console.log(UIHelpers.formatToolMessage(chunk.tool, resultText));

                // Add tool result to messages for context
                messages.push({
                  role: 'assistant',
                  content: `Used tool ${chunk.tool} with result: ${resultText}`,
                  timestamp: new Date()
                });

              } catch (error) {
                console.log(UIHelpers.formatError(`Tool call failed: ${error}`));
              }
            }
          }
        } catch (streamError) {
          if (thinkingAnimation) UIHelpers.clearThinkingAnimation(thinkingAnimation);
          if (typingAnimation) UIHelpers.clearTypingIndicator(typingAnimation);
          console.error(UIHelpers.formatError(`Streaming error: ${streamError instanceof Error ? streamError.message : 'Unknown streaming error'}`));
          console.error('Full streaming error:', streamError);
        }
        
        if (toolCallsMade && !assistantResponse) {
          // If only tool calls were made, get a follow-up response
          typingAnimation = UIHelpers.showTypingIndicator();
          
          for await (const chunk of openai.streamChat(messages, [])) {
            if (typeof chunk === 'string') {
              assistantResponse += chunk;
              
              // Update progress indicator
              if (assistantResponse.length % 50 === 0) {
                UIHelpers.clearTypingIndicator(typingAnimation);
                typingAnimation = UIHelpers.showTypingIndicator();
              }
            }
          }
        }

        // Clear typing indicator and render the complete response
        if (typingAnimation) {
          UIHelpers.clearTypingIndicator(typingAnimation);
        }

        if (assistantResponse) {
          // Display the assistant prefix
          process.stdout.write(UIHelpers.formatAssistantMessage(''));
          
          // Check if the response contains markdown and render accordingly
          if (MarkdownRenderer.isMarkdown(assistantResponse)) {
            // Show markdown rendering indicator
            const markdownAnimation = UIHelpers.showMarkdownRenderIndicator();
            
            // Small delay to show the indicator
            setTimeout(() => {
              UIHelpers.clearTypingIndicator(markdownAnimation);
              
              // Render as markdown with syntax highlighting
              const renderedMarkdown = MarkdownRenderer.render(assistantResponse);
              process.stdout.write(renderedMarkdown);
              
              console.log('\n'); // New line after response
            }, 300);
          } else {
            // Fallback to plain text with basic formatting
            process.stdout.write(chalk.white(assistantResponse));
            console.log('\n'); // New line after response
          }
          
          messages.push({ 
            role: 'assistant', 
            content: assistantResponse, 
            timestamp: new Date() 
          });
        }

      } catch (error) {
        if (thinkingAnimation) UIHelpers.clearThinkingAnimation(thinkingAnimation);
        if (typingAnimation) UIHelpers.clearTypingIndicator(typingAnimation);
        console.log(UIHelpers.formatError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        // Log the full error for debugging
        console.error('Full error details:', error);
      }
      
      isProcessing = false;

      // Show separator and return to prompt
      console.log(UIHelpers.createSeparator());
      console.log('');
      
      // Return to prompt - use setTimeout to ensure async context is clear
      setTimeout(() => {
        if (!isShuttingDown) {
          try {
            // Force stdin to stay open
            process.stdin.resume();
            startPrompt();
          } catch (error) {
            console.log(UIHelpers.formatError(`Failed to prompt: ${error}`));
            // If prompting fails, something is wrong with readline
            cleanup();
          }
        }
      }, 10);
    };

    // Handle graceful shutdown
    const cleanup = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log('\n');
      const exitSpinner = UIHelpers.createSpinner('Shutting down gracefully...');
      exitSpinner.start();
      
      try {
        clearInterval(heartbeat);
        
        if (mcpClient.isConnected()) {
          await mcpClient.disconnect();
        }
        
        exitSpinner.stop();
        UIHelpers.showSuccessMessage('Goodbye! Thanks for using AI Chat! ✨');
        
        rl.close();
        process.exit(0);
      } catch (error) {
        exitSpinner.stop();
        console.error(UIHelpers.formatError(`Cleanup error: ${error}`));
        process.exit(1);
      }
    };

    // Handle Ctrl+C gracefully
    rl.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    // Handle line input
    rl.on('line', (input: string) => {
      const trimmedInput = input.trim();
      
      if (!trimmedInput) {
        startPrompt();
        return;
      }
      
      if (isProcessing) {
        UIHelpers.showWarningMessage('Please wait for the current response to complete...');
        startPrompt();
        return;
      }

      // Handle special commands
      if (trimmedInput.toLowerCase() === '/exit' || trimmedInput.toLowerCase() === '/quit') {
        cleanup();
        return;
      }
      
      if (trimmedInput.toLowerCase() === '/clear') {
        console.clear();
        UIHelpers.showWelcome();
        setTimeout(() => {
          UIHelpers.showModelInfo(model);
          if (mcpClient.isConnected()) {
            UIHelpers.showAvailableTools(mcpClient.getTools());
          }
          startPrompt();
        }, 500);
        return;
      }
      
      if (trimmedInput.toLowerCase() === '/help') {
        UIHelpers.showCommandPalette();
        startPrompt();
        return;
      }

      // Process regular message
      processMessage(trimmedInput);
    });

    // Start prompting for input
    const startPrompt = () => {
      try {
        if (!isShuttingDown && !isProcessing) {
          rl.prompt();
        }
      } catch (error) {
        console.log(UIHelpers.formatError(`Prompt error: ${error}`));
        cleanup();
      }
    };

    // Initial prompt
    startPrompt();
  }
}

async function loadConfig(configPath?: string): Promise<{
  openai: { apiKey?: string; model?: string };
  mcpServers: MCPServerConfig[];
}> {
  // Default configuration
  const defaultConfig = {
    openai: {},
    mcpServers: []
  };

  if (!configPath) {
    return defaultConfig;
  }

  try {
    const fs = await import('fs');
    const configFile = await fs.promises.readFile(configPath, 'utf-8');
    return { ...defaultConfig, ...JSON.parse(configFile) };
  } catch (error) {
    console.warn(chalk.yellow(`Warning: Could not load config file ${configPath}, using defaults`));
    return defaultConfig;
  }
} 