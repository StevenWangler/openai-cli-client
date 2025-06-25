import chalk from 'chalk';
import ora from 'ora';

export class UIHelpers {
  // Enhanced color palette for premium feel
  static readonly PRIMARY = chalk.hex('#00D9FF'); // Bright cyan
  static readonly SECONDARY = chalk.hex('#FF6B9D'); // Pink accent
  static readonly SUCCESS = chalk.hex('#00F5A0'); // Bright green
  static readonly WARNING = chalk.hex('#FFB800'); // Golden yellow
  static readonly ERROR = chalk.hex('#FF4757'); // Bright red
  static readonly MUTED = chalk.hex('#8B949E'); // Soft gray
  static readonly HIGHLIGHT = chalk.hex('#FFC107'); // Bright yellow
  
  // Enhanced prefixes with better styling
  static readonly USER_PREFIX = chalk.bold.blue('┌─ ') + chalk.bold.white('You');
  static readonly ASSISTANT_PREFIX = chalk.bold.green('└─ ') + chalk.bold.white('AI');
  static readonly SYSTEM_PREFIX = chalk.bold.yellow('⚡ ') + chalk.bold.white('System');
  static readonly TOOL_PREFIX = chalk.bold.magenta('🔧 ') + chalk.bold.white('Tool');
  static readonly ERROR_PREFIX = chalk.bold.red('❌ ') + chalk.bold.white('Error');

  static formatUserMessage(message: string): string {
    const border = chalk.blue('│ ');
    return `\n${this.USER_PREFIX}\n${border}${chalk.white(message)}\n`;
  }

  static formatAssistantMessage(message: string): string {
    return `${this.ASSISTANT_PREFIX}\n${chalk.green('│ ')}`;
  }

  static formatSystemMessage(message: string): string {
    return `${this.SYSTEM_PREFIX} ${chalk.yellow(message)}`;
  }

  static formatToolMessage(toolName: string, result: string): string {
    const toolLabel = chalk.bold.magenta(`[${toolName}]`);
    const resultPreview = result.length > 100 ? result.substring(0, 97) + '...' : result;
    return `${this.TOOL_PREFIX} ${toolLabel} ${chalk.gray('→')} ${chalk.white(resultPreview)}`;
  }

  static formatError(error: string): string {
    return `${this.ERROR_PREFIX} ${chalk.red(error)}`;
  }

  static createSpinner(text: string) {
    return ora({
      text: chalk.gray(text),
      spinner: {
        interval: 80,
        frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
      },
      color: 'cyan'
    });
  }

  static showWelcome() {
    // Set terminal window title
    this.setWindowTitle('AI Chat - OpenAI CLI Client');
    
    // Clear screen for a fresh start
    if (process.stdout.isTTY) {
      console.clear();
    }
    
    // Beautiful ASCII art header
    const art = chalk.cyan(`
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║      █████╗ ██╗     ██╗██╗██╗     ██╗███████╗███╗   ██╗      ║
    ║     ██╔══██╗██║     ██║██║██║     ██║██╔════╝████╗  ██║      ║
    ║     ███████║██║     ██║██║██║     ██║█████╗  ██╔██╗ ██║      ║
    ║     ██╔══██║██║     ██║██║██║     ██║██╔══╝  ██║╚██╗██║      ║
    ║     ██║  ██║██║     ██║██║███████╗██║███████╗██║ ╚████║      ║
    ║     ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚══════╝╚═╝╚══════╝╚═╝  ╚═══╝      ║
    ║                                                               ║
    ║                   ${chalk.white.bold('OpenAI CLI Client')}                     ║
    ║                 ${chalk.gray('with MCP Server Support')}                   ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝`);
    
    console.log(art);
    
    // Animated welcome message
    const welcomeText = [
      '',
      chalk.hex('#00D9FF')('✨ Welcome to the future of AI conversation'),
      chalk.gray('   Type your message and press Enter to begin'),
      chalk.gray('   AI responses support beautiful markdown rendering!'),
      chalk.gray('   Use Ctrl+C to exit gracefully'),
      ''
    ];
    
    welcomeText.forEach((line, index) => {
      setTimeout(() => {
        console.log(line);
        if (index === welcomeText.length - 1) {
          this.showPromptHint();
        }
      }, index * 200);
    });
  }

  static showPromptHint() {
    const hint = chalk.dim('────────────────────────────────────────────────────────────────');
    console.log(hint);
  }

  static showConnectionStatus(serverName: string, connected: boolean) {
    const statusIcon = connected ? '🟢' : '🔴';
    const statusText = connected 
      ? chalk.bold.green('CONNECTED') 
      : chalk.bold.red('DISCONNECTED');
    
    const serverDisplay = chalk.bold.white(serverName);
    const connectionBar = connected 
      ? chalk.green('▓'.repeat(20))
      : chalk.red('░'.repeat(20));
    
    console.log(`\n${chalk.cyan('╭─ MCP Server Status')}`);
    console.log(`${chalk.cyan('├─')} ${statusIcon} ${serverDisplay} ${statusText}`);
    console.log(`${chalk.cyan('├─')} ${connectionBar}`);
    console.log(`${chalk.cyan('╰─────────────────────────')}\n`);
  }

  static showAvailableTools(tools: Array<{ name: string; description?: string }>) {
    if (tools.length === 0) {
      console.log(chalk.gray('\n📦 No tools available\n'));
      return;
    }

    console.log(chalk.cyan('\n╭─ Available Tools'));
    tools.forEach((tool, index) => {
      const isLast = index === tools.length - 1;
      const connector = isLast ? '╰─' : '├─';
      const toolIcon = '🛠️ ';
      const toolName = chalk.bold.white(tool.name);
      const description = tool.description ? chalk.gray(` - ${tool.description}`) : '';
      
      console.log(`${chalk.cyan(connector)} ${toolIcon}${toolName}${description}`);
    });
    console.log('');
  }

  static showThinkingAnimation() {
    const frames = ['🤔', '💭', '🧠', '⚡', '✨'];
    let frameIndex = 0;
    
    return setInterval(() => {
      process.stdout.write(`\r${chalk.yellow(frames[frameIndex])} ${chalk.gray('AI is thinking...')}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 300);
  }

  static clearThinkingAnimation(interval: NodeJS.Timeout) {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
  }

  static showTypingIndicator() {
    const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let dotIndex = 0;
    
    return setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(dots[dotIndex])} ${chalk.gray('Generating response...')}`);
      dotIndex = (dotIndex + 1) % dots.length;
    }, 100);
  }

  static showMarkdownRenderIndicator() {
    const dots = ['📝', '✨', '🎨', '💫'];
    let dotIndex = 0;
    
    return setInterval(() => {
      process.stdout.write(`\r${dots[dotIndex]} ${chalk.gray('Rendering markdown...')}`);
      dotIndex = (dotIndex + 1) % dots.length;
    }, 200);
  }

  static clearTypingIndicator(interval: NodeJS.Timeout) {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
  }

  static showProgressBar(current: number, total: number, label: string = '') {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * 30);
    const empty = 30 - filled;
    
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const percentageText = chalk.bold.white(`${percentage}%`);
    const labelText = label ? chalk.gray(` ${label}`) : '';
    
    process.stdout.write(`\r[${bar}] ${percentageText}${labelText}`);
    
    if (current === total) {
      console.log('\n');
    }
  }

  static clearLine() {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
  }

  static hideCursor() {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1B[?25l');
    }
  }

  static showCursor() {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1B[?25h');
    }
  }

  static setWindowTitle(title: string) {
    if (process.stdout.isTTY) {
      process.stdout.write(`\x1b]0;${title}\x07`);
    }
  }

  static updateWindowTitle(status: string) {
    this.setWindowTitle(`AI Chat - ${status}`);
  }

  static showCommandPalette() {
    const commands = [
      { key: 'Ctrl+C', desc: 'Exit gracefully' },
      { key: 'Ctrl+L', desc: 'Clear screen' },
      { key: 'Enter', desc: 'Send message' }
    ];

    console.log(chalk.cyan('\n╭─ Quick Commands'));
    commands.forEach((cmd, index) => {
      const isLast = index === commands.length - 1;
      const connector = isLast ? '╰─' : '├─';
      console.log(`${chalk.cyan(connector)} ${chalk.bold.yellow(cmd.key)} ${chalk.gray(cmd.desc)}`);
    });
    console.log('');
  }

  static createCustomPrompt(): string {
    const promptIcon = chalk.bold.blue('▶');
    const promptText = chalk.dim('chat');
    return `${promptIcon} ${promptText} ${chalk.blue('>')} `;
  }

  static showSuccessMessage(message: string) {
    console.log(`${chalk.green('✅')} ${chalk.bold.green(message)}`);
  }

  static showWarningMessage(message: string) {
    console.log(`${chalk.yellow('⚠️ ')} ${chalk.bold.yellow(message)}`);
  }

  static createSeparator(char: string = '─', length: number = 60): string {
    return chalk.gray(char.repeat(length));
  }

  static showModelInfo(model: string) {
    console.log(chalk.cyan(`\n╭─ Configuration`));
    console.log(chalk.cyan(`├─ 🤖 Model: ${chalk.bold.white(model)}`));
    console.log(chalk.cyan(`╰─ 🚀 Ready for conversation\n`));
  }
} 