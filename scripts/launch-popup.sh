#!/bin/bash

# Launch script for pop-out terminal
# This script opens the OpenAI CLI client in a new terminal window

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to launch in different terminal applications
launch_in_terminal() {
    case "$OSTYPE" in
        darwin*)
            # macOS - try different terminal apps in order of preference
            if command -v osascript >/dev/null 2>&1; then
                # Try iTerm2 first
                if osascript -e 'tell application "iTerm2" to get version' >/dev/null 2>&1; then
                    osascript -e "
                        tell application \"iTerm2\"
                            create window with default profile
                            tell current session of current window
                                write text \"cd '$PROJECT_DIR' && npm run start\"
                            end tell
                            activate
                        end tell
                    "
                # Fall back to Terminal.app
                else
                    osascript -e "
                        tell application \"Terminal\"
                            do script \"cd '$PROJECT_DIR' && npm run start\"
                            activate
                        end tell
                    "
                fi
            else
                echo "Error: AppleScript not available"
                exit 1
            fi
            ;;
        linux*)
            # Linux - try common terminal emulators
            if command -v gnome-terminal >/dev/null 2>&1; then
                gnome-terminal --working-directory="$PROJECT_DIR" -- bash -c "npm run start; exec bash"
            elif command -v konsole >/dev/null 2>&1; then
                konsole --workdir "$PROJECT_DIR" -e bash -c "npm run start; exec bash"
            elif command -v xterm >/dev/null 2>&1; then
                xterm -e "cd '$PROJECT_DIR' && npm run start; exec bash" &
            else
                echo "Error: No suitable terminal emulator found"
                exit 1
            fi
            ;;
        msys*|cygwin*|mingw*)
            # Windows (Git Bash, etc.)
            if command -v cmd.exe >/dev/null 2>&1; then
                cmd.exe /c "start cmd /k \"cd /d $PROJECT_DIR && npm run start\""
            else
                echo "Error: cmd.exe not found"
                exit 1
            fi
            ;;
        *)
            echo "Error: Unsupported operating system: $OSTYPE"
            exit 1
            ;;
    esac
}

# Check if we're in the project directory
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "Error: Could not find package.json in project directory"
    echo "Expected location: $PROJECT_DIR/package.json"
    exit 1
fi

# Launch the application
echo "Launching OpenAI CLI Client in new terminal window..."
launch_in_terminal

echo "Terminal window opened! The CLI client should start automatically." 