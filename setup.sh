#!/bin/bash

# Colors for beautiful output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Beautiful ASCII art banner
show_banner() {
    echo -e "${CYAN}"
    echo "    ╔═══════════════════════════════════════════════════════════════╗"
    echo "    ║                                                               ║"
    echo "    ║      █████╗ ██╗     ██╗██╗██╗     ██╗███████╗███╗   ██╗      ║"
    echo "    ║     ██╔══██╗██║     ██║██║██║     ██║██╔════╝████╗  ██║      ║"
    echo "    ║     ███████║██║     ██║██║██║     ██║█████╗  ██╔██╗ ██║      ║"
    echo "    ║     ██╔══██║██║     ██║██║██║     ██║██╔══╝  ██║╚██╗██║      ║"
    echo "    ║     ██║  ██║██║     ██║██║███████╗██║███████╗██║ ╚████║      ║"
    echo "    ║     ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚══════╝╚═╝╚══════╝╚═╝  ╚═══╝      ║"
    echo "    ║                                                               ║"
    echo -e "    ║            ${WHITE}The most beautiful AI CLI experience${CYAN}            ║"
    echo -e "    ║                 ${GRAY}OpenAI • MCP Servers • Modern UI${CYAN}                ║"
    echo "    ║                                                               ║"
    echo "    ╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Progress indicator
show_progress() {
    local current=$1
    local total=$2
    local message=$3
    local filled=$((current * 30 / total))
    local empty=$((30 - filled))
    
    printf "\r${CYAN}["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] ${WHITE}%d%%${NC} ${GRAY}%s${NC}" $((current * 100 / total)) "$message"
    
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# Error handling
error_exit() {
    echo -e "\n${RED}❌ Error: $1${NC}" >&2
    echo -e "${GRAY}If you need help, please check the README.md or open an issue.${NC}"
    exit 1
}

# Success message
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Warning message
warning_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Info message
info_msg() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup function
main() {
    clear
    show_banner
    
    echo -e "\n${CYAN}🚀 Welcome to the AI Chat CLI Setup!${NC}"
    echo -e "${GRAY}This script will help you set up the most beautiful AI CLI experience.${NC}\n"
    
    # Check prerequisites
    echo -e "${CYAN}╭─ Checking Prerequisites${NC}"
    
    # Check Node.js
    if command_exists node; then
        node_version=$(node --version | cut -d'v' -f2)
        echo -e "${CYAN}├─${NC} ${GREEN}✓${NC} Node.js ${WHITE}${node_version}${NC} found"
    else
        echo -e "${CYAN}├─${NC} ${RED}✗${NC} Node.js not found"
        error_exit "Node.js 18+ is required. Please install Node.js from https://nodejs.org/"
    fi
    
    # Check npm
    if command_exists npm; then
        npm_version=$(npm --version)
        echo -e "${CYAN}├─${NC} ${GREEN}✓${NC} npm ${WHITE}${npm_version}${NC} found"
    else
        echo -e "${CYAN}├─${NC} ${RED}✗${NC} npm not found"
        error_exit "npm is required and should come with Node.js"
    fi
    
    echo -e "${CYAN}╰─${NC} ${GREEN}All prerequisites met!${NC}\n"
    
    # Install dependencies
    echo -e "${CYAN}╭─ Installing Dependencies${NC}"
    echo -e "${CYAN}├─${NC} ${GRAY}Installing Node.js packages...${NC}"
    
    show_progress 1 5 "Downloading packages..."
    
    if npm install --silent >/dev/null 2>&1; then
        show_progress 3 5 "Installing packages..."
        success_msg "Dependencies installed successfully"
    else
        echo ""
        error_exit "Failed to install dependencies. Please check your internet connection and try again."
    fi
    
    show_progress 5 5 "Installation complete!"
    echo -e "${CYAN}╰─${NC} ${GREEN}Dependencies ready!${NC}\n"
    
    # Build the project
    echo -e "${CYAN}╭─ Building Project${NC}"
    echo -e "${CYAN}├─${NC} ${GRAY}Compiling TypeScript...${NC}"
    
    if npm run build --silent >/dev/null 2>&1; then
        echo -e "${CYAN}├─${NC} ${GREEN}✓${NC} Build successful"
    else
        echo -e "${CYAN}├─${NC} ${RED}✗${NC} Build failed"
        error_exit "Failed to build the project. Please check for compilation errors."
    fi
    
    echo -e "${CYAN}╰─${NC} ${GREEN}Build complete!${NC}\n"
    
    # Check for OpenAI API key
    echo -e "${CYAN}╭─ Configuration Check${NC}"
    
    if [ -n "$OPENAI_API_KEY" ]; then
        echo -e "${CYAN}├─${NC} ${GREEN}✓${NC} OPENAI_API_KEY found in environment"
    else
        echo -e "${CYAN}├─${NC} ${YELLOW}!${NC} OPENAI_API_KEY not found in environment"
        echo -e "${CYAN}├─${NC} ${GRAY}You can set it later or use a config file${NC}"
        
        if [ -f ".env" ]; then
            echo -e "${CYAN}├─${NC} ${GREEN}✓${NC} .env file exists"
        else
            echo -e "${CYAN}├─${NC} ${BLUE}ℹ${NC} Creating .env template..."
            cp env.example .env 2>/dev/null || true
            echo -e "${CYAN}├─${NC} ${GREEN}✓${NC} .env template created"
        fi
    fi
    
    echo -e "${CYAN}╰─${NC} ${GREEN}Configuration ready!${NC}\n"
    
    # Optional: Install globally
    echo -e "${CYAN}Would you like to install AI Chat globally? (y/N):${NC} \c"
    read -r install_global
    
    if [[ $install_global =~ ^[Yy]$ ]]; then
        echo -e "\n${CYAN}╭─ Global Installation${NC}"
        echo -e "${CYAN}├─${NC} ${GRAY}Installing globally...${NC}"
        
        if npm run install-global --silent >/dev/null 2>&1; then
            echo -e "${CYAN}├─${NC} ${GREEN}✓${NC} Globally installed as 'ai-chat'"
            echo -e "${CYAN}╰─${NC} ${GREEN}You can now use 'ai-chat' from anywhere!${NC}\n"
        else
            echo -e "${CYAN}├─${NC} ${YELLOW}!${NC} Global installation failed (may need sudo)"
            echo -e "${CYAN}╰─${NC} ${GRAY}You can still use npm start to run the app${NC}\n"
        fi
    fi
    
    # Success banner
    echo -e "${GREEN}"
    echo "    ╔═══════════════════════════════════════════════════════════════╗"
    echo "    ║                                                               ║"
    echo -e "    ║                    ${WHITE}🎉 SETUP COMPLETE! 🎉${GREEN}                     ║"
    echo "    ║                                                               ║"
    echo "    ║               Your beautiful AI CLI is ready to use!         ║"
    echo "    ║                                                               ║"
    echo "    ╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Usage instructions
    echo -e "${CYAN}🚀 Quick Start:${NC}"
    
    if [[ $install_global =~ ^[Yy]$ ]] && command_exists ai-chat; then
        echo -e "   ${GRAY}$${NC} ${WHITE}ai-chat${NC}                    ${GRAY}# Start chatting with AI${NC}"
        echo -e "   ${GRAY}$${NC} ${WHITE}ai-chat --help${NC}             ${GRAY}# Show all options${NC}"
    else
        echo -e "   ${GRAY}$${NC} ${WHITE}npm start${NC}                  ${GRAY}# Start chatting with AI${NC}"
        echo -e "   ${GRAY}$${NC} ${WHITE}npm run dev${NC}                ${GRAY}# Run in development mode${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}📝 Configuration:${NC}"
    echo -e "   ${GRAY}•${NC} Set ${YELLOW}OPENAI_API_KEY${NC} in your environment or .env file"
    echo -e "   ${GRAY}•${NC} Edit ${WHITE}config.example.json${NC} and save as ${WHITE}config.json${NC} for advanced setup"
    echo -e "   ${GRAY}•${NC} Use ${YELLOW}/help${NC} inside the chat for interactive commands"
    
    echo ""
    echo -e "${CYAN}🎨 Features:${NC}"
    echo -e "   ${GRAY}•${NC} Beautiful ASCII art and modern UI"
    echo -e "   ${GRAY}•${NC} MCP server support for enhanced capabilities"
    echo -e "   ${GRAY}•${NC} Streaming responses with typing indicators"
    echo -e "   ${GRAY}•${NC} Interactive commands and help system"
    
    echo ""
    echo -e "${MAGENTA}✨ Enjoy your beautiful AI CLI experience! ✨${NC}"
    echo ""
}

# Run main function
main "$@" 