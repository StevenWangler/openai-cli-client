# 🚀 AI Chat CLI - The Most Beautiful AI Terminal Experience

<div align="center">

```
    ╔═══════════════════════════════════════════════════════════════╗
    ║                                                               ║
    ║      █████╗ ██╗     ██╗██╗██╗     ██╗███████╗███╗   ██╗      ║
    ║     ██╔══██╗██║     ██║██║██║     ██║██╔════╝████╗  ██║      ║
    ║     ███████║██║     ██║██║██║     ██║█████╗  ██╔██╗ ██║      ║
    ║     ██╔══██║██║     ██║██║██║     ██║██╔══╝  ██║╚██╗██║      ║
    ║     ██║  ██║██║     ██║██║███████╗██║███████╗██║ ╚████║      ║
    ║     ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚══════╝╚═╝╚══════╝╚═╝  ╚═══╝      ║
    ║                                                               ║
    ║            The most beautiful AI CLI experience              ║
    ║                 OpenAI • MCP Servers • Modern UI            ║
    ║                                                               ║
    ╚═══════════════════════════════════════════════════════════════╝
```

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**A stunning, modern CLI chat client that brings the future of AI conversation to your terminal**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Configuration](#-configuration) • [Commands](#-commands)

</div>

## ✨ Features

### 🎨 **Beautiful UI Experience**
- **Stunning ASCII art** branding and headers
- **Rich color schemes** with premium hex colors
- **Smooth animations** and progress indicators
- **Modern typography** and spacing
- **Responsive layouts** that adapt to terminal size

### 🚀 **Advanced Functionality**
- **OpenAI GPT Integration** - Support for GPT-4, GPT-3.5-turbo, and more
- **MCP Server Support** - Connect to Model Context Protocol servers
- **Real-time Streaming** - Live response streaming with typing indicators
- **Tool Integration** - Execute tools through MCP servers seamlessly
- **Smart Configuration** - Multiple config options with precedence

### 💫 **Premium CLI Features**
- **Interactive Commands** - Built-in help, clear, exit commands
- **Graceful Shutdown** - Clean exit handling with status messages
- **Error Recovery** - Robust error handling with helpful messages
- **Session Management** - Maintain conversation context
- **Cross-platform** - Works on macOS, Linux, and Windows

## 🛠 Installation

### Quick Start (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd openai-cli-client

# Run the beautiful setup script
chmod +x setup.sh
./setup.sh
```

The setup script provides:
- ✅ Automated dependency installation
- 🔍 Prerequisites checking
- 🏗️ Project building
- ⚙️ Configuration setup
- 🌍 Optional global installation

### Manual Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Set up environment
cp env.example .env
# Edit .env with your OpenAI API key

# Optional: Install globally
npm run install-global
```

## 🚀 Usage

### Basic Usage

```bash
# Start AI Chat (if installed globally)
ai-chat

# Or use npm (if not installed globally)
npm start

# Start with specific model
ai-chat chat -m gpt-3.5-turbo

# Connect to MCP server
ai-chat chat -s /path/to/mcp-server

# Use custom config
ai-chat chat -c config.json
```

### Interactive Commands

Once in the chat, use these commands:

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/clear` | Clear the screen |
| `/exit` or `/quit` | Exit the chat |
| `Ctrl+C` | Graceful shutdown |

### Example Session

```
▶ chat > Hello, how are you today?

┌─ You
│ Hello, how are you today?

└─ AI
│ Hello! I'm doing great, thank you for asking! I'm here and ready to help 
│ you with any questions or tasks you might have. How can I assist you today?

────────────────────────────────────────────────────────────

▶ chat > 
```

## ⚙️ Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional
OPENAI_MODEL=gpt-4o
DEFAULT_MODEL=gpt-4o
```

### Config File

Create `config.json` based on `config.example.json`:

```json
{
  "openai": {
    "apiKey": "sk-your-openai-api-key-here",
    "model": "gpt-4o"
  },
  "mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"]
    }
  ]
}
```

### Configuration Precedence

1. **Command line options** (highest priority)
2. **Environment variables**
3. **Config file**
4. **Default values** (lowest priority)

## 📖 Commands

### Main Commands

```bash
ai-chat --help              # Show help with beautiful banner
ai-chat chat                # Start interactive chat session
ai-chat servers             # List available MCP servers
ai-chat --version           # Show version information
```

### Chat Options

```bash
ai-chat chat [options]

Options:
  -m, --model <model>    OpenAI model (gpt-4o, gpt-3.5-turbo, etc.)
  -s, --server <path>    Path to MCP server executable
  -c, --config <path>    Path to configuration file
  -h, --help             Display help for command
```

## 🎯 Advanced Features

### MCP Server Integration

Connect to Model Context Protocol servers for enhanced capabilities:

```bash
# File system access
ai-chat chat -s "npx -y @modelcontextprotocol/server-filesystem /allowed/path"

# Custom MCP server
ai-chat chat -s "/path/to/your/mcp-server"
```

### Model Selection

Support for various OpenAI models:

- `gpt-4o` (default) - Latest GPT-4 optimized
- `gpt-4` - GPT-4 standard
- `gpt-3.5-turbo` - Fast and efficient
- `gpt-4-turbo` - GPT-4 with larger context

### Development Mode

```bash
# Run in development with hot reload
npm run dev

# Watch mode
npm run watch

# Run specific commands in dev
npm run dev -- chat -m gpt-3.5-turbo
```

## 🛡️ Error Handling

The CLI includes comprehensive error handling:

- **Network issues** - Automatic retry suggestions
- **API key problems** - Clear setup instructions
- **Configuration errors** - Helpful validation messages
- **Tool failures** - Graceful degradation
- **Unexpected errors** - Debug information with user-friendly messages

## 🎨 Customization

### Color Themes

The CLI uses a carefully crafted color palette:

- **Primary**: Bright cyan (`#00D9FF`)
- **Secondary**: Pink accent (`#FF6B9D`)
- **Success**: Bright green (`#00F5A0`)
- **Warning**: Golden yellow (`#FFB800`)
- **Error**: Bright red (`#FF4757`)

### Animation Speed

Animations are optimized for performance and can be customized in the source code:

- **Thinking animation**: 300ms intervals
- **Typing indicators**: 100ms intervals
- **Welcome sequence**: 200ms delays

## 📦 Package Scripts

```bash
npm run build           # Build TypeScript to JavaScript
npm run dev             # Run in development mode
npm start               # Start the built application
npm run watch           # Watch mode with auto-reload
npm run install-global  # Install globally as 'ai-chat'
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the API
- **Model Context Protocol** for the server framework
- **Chalk** for beautiful terminal colors
- **Ora** for stunning spinners
- The amazing open-source community

---

<div align="center">

**Made with ❤️ for the terminal-loving AI enthusiasts**

*Experience the future of AI conversation in your terminal*

</div>