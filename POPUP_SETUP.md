# Pop-Out Terminal Setup

This guide shows you how to run your OpenAI CLI client in a dedicated terminal window instead of VS Code's integrated terminal.

## Quick Start

### Option 1: Simple Pop-Out Launch (Recommended)
```bash
npm run popup
```

This launches your CLI client in a new terminal window automatically.

### Option 2: Desktop Shortcut
```bash
npm run desktop-shortcut
```

Creates a desktop shortcut you can double-click to launch the CLI.

### Option 3: macOS App Bundle
```bash
npm run create-app
```

Creates a native macOS app that you can install in Applications.

### Option 4: Global Installation
```bash
npm run install-global
```

Then run from anywhere:
```bash
ai-chat
```

## Detailed Setup Options

### 1. Pop-Out Terminal Script

The `launch-popup.sh` script automatically detects your system and opens the CLI in:
- **macOS**: iTerm2 (preferred) or Terminal.app
- **Linux**: gnome-terminal, konsole, or xterm
- **Windows**: Command Prompt

**Usage:**
```bash
# Direct script execution
./scripts/launch-popup.sh

# Via npm script
npm run popup
```

### 2. macOS App Bundle

Creates a native `.app` bundle that you can:
- Double-click to launch
- Add to your Dock
- Install in `/Applications/`

**Usage:**
```bash
# Create the app bundle
npm run create-app

# Install system-wide (optional)
sudo cp -r "dist/OpenAI Chat CLI.app" /Applications/
```

### 3. Desktop Shortcut

Creates a clickable desktop shortcut:
- **macOS**: `.command` file
- **Linux**: `.desktop` file

**Usage:**
```bash
npm run desktop-shortcut
```

### 4. Global CLI Installation

Install globally to run from any terminal:

```bash
npm run install-global
```

Then use anywhere:
```bash
ai-chat                          # Start chat
ai-chat chat -m gpt-4           # Specify model
ai-chat chat -s ./my-server     # Use MCP server
ai-chat servers                 # List servers
```

## Terminal Enhancements

The CLI includes several terminal-specific enhancements when running in pop-out mode:

- **Window Title**: Updates to show connection status
- **Clear Screen**: Starts with a clean interface
- **Better Formatting**: Optimized for dedicated terminal windows
- **Graceful Exit**: Proper cleanup on Ctrl+C

## Keyboard Shortcuts

- **Ctrl+C**: Exit the CLI client
- **Ctrl+L**: Clear screen (standard terminal shortcut)
- **Up/Down**: Navigate command history (readline features)

## Troubleshooting

### Script Permission Errors
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Terminal Not Opening
- **macOS**: Ensure Terminal.app or iTerm2 is installed
- **Linux**: Install a terminal emulator (`sudo apt install gnome-terminal`)
- **Windows**: Use Git Bash or WSL

### Global Installation Issues
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use a different prefix
npm config set prefix ~/.local
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

## Platform-Specific Notes

### macOS
- Script uses AppleScript to control Terminal/iTerm2
- App bundle integrates with Spotlight search
- Desktop shortcuts have `.command` extension

### Linux
- Supports GNOME, KDE, and other desktop environments
- Desktop files follow XDG standards
- May require desktop environment restart to show shortcuts

### Windows/WSL
- Works with Git Bash, PowerShell, and WSL
- Use `cmd.exe` for native Windows terminals
- Consider Windows Terminal for better experience

## Advanced Configuration

### Custom Terminal Preferences
Edit `scripts/launch-popup.sh` to customize:
- Terminal application preference
- Window size and position
- Color schemes
- Font settings

### App Bundle Customization
Edit `scripts/create-app.sh` to modify:
- App name and identifier
- Icon (replace placeholder with .icns file)
- Bundle metadata

### Environment Variables
Set these for customization:
```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_MODEL="gpt-4o"
export TERM_PROGRAM="iterm"  # Force terminal choice
```

## Integration with System

### Spotlight Search (macOS)
After creating the app bundle:
```bash
sudo cp -r "dist/OpenAI Chat CLI.app" /Applications/
```

Then search "OpenAI" in Spotlight.

### Application Menu (Linux)
Desktop files automatically appear in application menus.

### Quick Access
Create an alias in your shell:
```bash
echo 'alias chat="cd ~/path/to/openai-cli-client && npm run popup"' >> ~/.zshrc
``` 