# Dynamic Directory Management

This document describes the dynamic directory management feature that allows the AI agent to add and remove directories from its allowed access list at runtime.

## Overview

The filesystem MCP servers now support dynamic directory management, allowing the AI to:

1. **List current allowed directories** - See what directories are currently accessible
2. **Add new directories** - Grant access to additional directories during runtime
3. **Remove directories** - Revoke access to directories (with safety constraints)
4. **Persist changes** - Save directory configuration to disk for persistence across restarts

## Available Tools

### `list_allowed_directories`
Lists all currently allowed directories for the filesystem server.

**Response includes:**
- `allowedDirectories`: Array of directory paths
- `count`: Number of allowed directories 
- `configFile`: Path to the configuration file
- `memoryFile`: Path to memory file (memory-enabled servers only)

### `add_allowed_directory`
Adds a new directory to the allowed directories list.

**Parameters:**
- `path` (string): The directory path to add

**Behavior:**
- Validates that the path exists and is a directory
- Checks if directory is already in the allowed list
- Adds the directory and persists the configuration
- Returns success message with updated count

### `remove_allowed_directory`
Removes a directory from the allowed directories list.

**Parameters:**
- `path` (string): The directory path to remove

**Behavior:**
- Validates that the directory exists in the allowed list
- Ensures at least one directory remains (security constraint)
- Removes the directory and persists the configuration
- Returns success message with remaining count

## Security Features

### Path Validation
- All directory paths are resolved to absolute paths
- Existence and accessibility are verified before adding
- Only actual directories can be added (not files)

### Minimum Directory Requirement
- At least one directory must remain in the allowed list at all times
- Attempting to remove the last directory will fail with an error
- This prevents the agent from losing all filesystem access

### Configuration Persistence
- All changes are immediately saved to a configuration file
- Configuration is loaded on server startup
- Manual directories and persisted directories are merged

## Configuration Files

Each server type uses a different configuration file:

- **Basic Filesystem Server**: `./filesystem-config.json`
- **Filesystem with Memory**: `./filesystem-memory-config.json`  
- **Comprehensive Server**: `./comprehensive-filesystem-config.json`

### Configuration File Format
```json
{
  "allowedDirectories": [
    "/Users/username/Documents",
    "/Users/username/Projects",
    "/tmp/workspace"
  ],
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

## Usage Examples

### Adding a New Directory
```javascript
// AI can request access to a new directory
await callTool('add_allowed_directory', {
  path: '/Users/username/Downloads'
});
```

### Removing a Directory
```javascript
// AI can revoke access to a directory
await callTool('remove_allowed_directory', {
  path: '/tmp/old-workspace'
});
```

### Listing Current Access
```javascript
// AI can check what directories it currently has access to
const result = await callTool('list_allowed_directories', {});
console.log(result.allowedDirectories);
```

## Integration with Memory

For memory-enabled servers, directory changes are tracked:

- **Adding directories**: Creates memory entities for new directories
- **Removing directories**: Adds observations about access removal
- **Directory relationships**: Maintains relationships between related directories

## Startup Behavior

When a server starts:

1. **Command-line directories** are processed first
2. **Configuration file** is loaded (if it exists)
3. **Directories are merged** and duplicates removed
4. **Server starts** with the combined directory list

### Command Line Examples

```bash
# Basic server with config file
node dist/filesystem-server-standalone.js --config-file=./my-config.json /initial/dir

# Comprehensive server with config file  
node dist/comprehensive-filesystem-memory-server-standalone.js --config-file=./my-config.json /initial/dir

# Without config file (uses defaults)
node dist/filesystem-server-standalone.js /initial/dir
```

## Error Handling

### Common Errors

1. **Directory doesn't exist**: `Directory /path does not exist or is not accessible`
2. **Path is not a directory**: `Path /path is not a directory`
3. **Already in list**: `Directory /path is already in the allowed directories list`
4. **Not found**: `Directory /path was not found in the allowed directories list`
5. **Last directory**: `Cannot remove the last allowed directory. At least one directory must remain for security.`

### Error Recovery

- Failed operations don't modify the directory list
- Configuration file is only updated on successful operations
- Memory tracking handles errors gracefully

## Best Practices

### For Users Setting Up Servers

1. **Start with minimal directories**: Only include directories that are immediately needed
2. **Use configuration files**: Enable persistent configuration for dynamic management
3. **Monitor access**: Regularly check the allowed directories list
4. **Backup configurations**: Keep copies of important directory configurations

### For AI Agents

1. **Validate before requesting**: Check if a directory exists before requesting access
2. **Clean up access**: Remove access to directories that are no longer needed
3. **Check current access**: Use `list_allowed_directories` to understand current permissions
4. **Handle errors gracefully**: Always check the response for error messages

## Migration from Static Configuration

If you're currently using static directory configuration:

1. **Backup your current setup**
2. **Update your server startup** to include `--config-file` parameter
3. **Use `add_allowed_directory`** to add any additional directories needed
4. **Remove old directories** using `remove_allowed_directory` if no longer needed

## Troubleshooting

### Configuration File Issues
- Ensure the config file directory is writable
- Check JSON syntax if manual edits were made
- Delete corrupted config files to reset to command-line directories

### Permission Issues
- Ensure the Node.js process has read/write access to target directories
- Check that the config file directory is writable
- Verify directory paths are correct and accessible

### Memory Integration Issues
- Check that memory files are writable
- Ensure memory client is properly initialized
- Monitor memory file size for large directory lists 