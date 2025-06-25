#!/bin/bash

# Create a desktop shortcut for the OpenAI CLI client

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$HOME/Desktop"
SHORTCUT_NAME="OpenAI Chat CLI"

# For macOS, create an app shortcut
if [[ "$OSTYPE" == "darwin"* ]]; then
    SHORTCUT_PATH="$DESKTOP_DIR/$SHORTCUT_NAME.command"
    
    cat > "$SHORTCUT_PATH" << EOF
#!/bin/bash
cd "$PROJECT_DIR"
npm run build && npm run start
EOF
    
    chmod +x "$SHORTCUT_PATH"
    echo "Desktop shortcut created: $SHORTCUT_PATH"
    echo "Double-click to launch your CLI client!"

# For Linux, create a .desktop file
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    SHORTCUT_PATH="$DESKTOP_DIR/$SHORTCUT_NAME.desktop"
    
    cat > "$SHORTCUT_PATH" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=OpenAI Chat CLI
Comment=OpenAI CLI Client with MCP Support
Exec=bash -c "cd '$PROJECT_DIR' && npm run build && npm run start; exec bash"
Icon=utilities-terminal
Terminal=true
Categories=Utility;Development;
EOF
    
    chmod +x "$SHORTCUT_PATH"
    echo "Desktop shortcut created: $SHORTCUT_PATH"
    echo "Double-click to launch your CLI client!"

else
    echo "Unsupported operating system: $OSTYPE"
    exit 1
fi

echo ""
echo "The shortcut will:"
echo "  1. Build your TypeScript code"
echo "  2. Launch the CLI client in a new terminal"
echo "  3. Keep the terminal open for interaction" 