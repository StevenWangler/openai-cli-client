# Filesystem MCP Server Setup

This project includes a custom filesystem MCP server that provides secure file operations with sandboxed directory access.

## Features

The filesystem server provides 12 tools for comprehensive file and directory management:

1. **`read_file`** - Read complete file contents
2. **`read_multiple_files`** - Read multiple files simultaneously  
3. **`write_file`** - Create or overwrite files
4. **`edit_file`** - Make precise edits with diff preview (supports dry-run)
5. **`create_directory`** - Create directories
6. **`list_directory`** - List directory contents
7. **`list_directory_with_sizes`** - List with file sizes
8. **`directory_tree`** - Get recursive directory structure
9. **`move_file`** - Move/rename files and directories
10. **`search_files`** - Recursive file search with glob patterns
11. **`get_file_info`** - File metadata and stats
12. **`list_allowed_directories`** - List the allowed directories for this server

## Security Features

- **Sandboxed Access**: Only allows operations within explicitly specified directories
- **Path Validation**: All paths are validated against allowed directories
- **Error Handling**: Graceful handling of unauthorized access attempts

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Configuration

Update your `config.json` file to include the filesystem server:

```json
{
  "mcpServers": [
    {
      "name": "filesystem",
      "command": "node",
      "args": [
        "dist/filesystem-server-standalone.js",
        "/path/to/allowed/directory1",
        "/path/to/allowed/directory2"
      ]
    }
  ]
}
```

**Important**: Replace the paths with actual directories you want to grant access to.

### 4. Running the Server

#### Development Mode
```bash
npm run filesystem-dev /Users/username/Documents /Users/username/Projects
```

#### Production Mode
```bash
npm run build
npm run filesystem-server /Users/username/Documents /Users/username/Projects
```

#### Testing with MCP Inspector
```bash
npm run filesystem-inspector /Users/username/Documents
```

## Usage Examples

### Basic Configuration
```json
{
  "name": "filesystem",
  "command": "node",
  "args": [
    "dist/filesystem-server-standalone.js",
    "/Users/username/Documents",
    "/Users/username/Projects"
  ]
}
```

### Multiple Directory Access
```json
{
  "name": "filesystem",
  "command": "node",
  "args": [
    "dist/filesystem-server-standalone.js",
    "/Users/username/Documents",
    "/Users/username/Projects",
    "/Users/username/Downloads",
    "/tmp/workspace"
  ]
}
```

## Available Scripts

- `npm run filesystem-dev` - Run in development mode with TypeScript
- `npm run filesystem-server` - Run the compiled server
- `npm run filesystem-inspector` - Test with MCP inspector

## Security Considerations

1. **Minimal Access**: Only grant access to directories that are actually needed
2. **No Symlink Escape**: The server validates that symlinks don't escape allowed directories
3. **Explicit Permissions**: Each directory must be explicitly specified as a command-line argument
4. **Error Reporting**: Unauthorized access attempts are logged and rejected

## Troubleshooting

### Common Issues

1. **"Access denied" errors**: Ensure the target path is within allowed directories
2. **"No such file or directory"**: Check that the path exists and is accessible
3. **Permission errors**: Ensure the Node.js process has appropriate file system permissions

### Debug Mode

Run with additional logging:
```bash
DEBUG=* npm run filesystem-dev /path/to/directory
```

## Integration with CLI

The filesystem server integrates seamlessly with the OpenAI CLI client. Once configured, you can:

- Ask the AI to read files: "Read the contents of package.json"
- Request file operations: "Create a new file called test.txt with some content"
- Search for files: "Find all TypeScript files in the src directory"
- Get file information: "What's the size and last modified date of README.md?" 