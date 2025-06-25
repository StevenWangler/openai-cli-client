#!/bin/bash

# Script to create a macOS app bundle for the OpenAI CLI client

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="OpenAI Chat CLI"
APP_DIR="$PROJECT_DIR/dist/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

echo "Creating macOS app bundle..."

# Create app directory structure
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Create Info.plist
cat > "$CONTENTS_DIR/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>openai-chat-cli</string>
    <key>CFBundleIdentifier</key>
    <string>com.openai.chat.cli</string>
    <key>CFBundleName</key>
    <string>OpenAI Chat CLI</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSUIElement</key>
    <false/>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
EOF

# Create launcher script
cat > "$MACOS_DIR/openai-chat-cli" << 'EOF'
#!/bin/bash

# Get the app bundle directory
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$APP_DIR")")"

# Launch in Terminal
osascript << APPLESCRIPT
tell application "Terminal"
    do script "cd '$PROJECT_DIR' && npm run start"
    activate
end tell
APPLESCRIPT
EOF

chmod +x "$MACOS_DIR/openai-chat-cli"

# Create app icon (simple text-based icon)
cat > "$RESOURCES_DIR/app.icns" << 'EOF'
# This would be a real .icns file in production
# For now, this is just a placeholder
EOF

echo "App bundle created at: $APP_DIR"
echo "You can now double-click the app to launch your CLI client in a new terminal window!"
echo ""
echo "To install system-wide:"
echo "  cp -r '$APP_DIR' /Applications/" 