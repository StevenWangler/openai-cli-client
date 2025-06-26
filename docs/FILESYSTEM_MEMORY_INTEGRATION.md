# Filesystem Server with Memory Integration

This enhanced filesystem MCP server combines secure file operations with intelligent memory tracking, creating a knowledge graph of your filesystem access patterns.

## 🧠 Memory Integration Features

### What Gets Remembered

1. **Allowed Directories**: All configured directories are stored as entities
2. **File Access History**: Every file read, write, and operation
3. **Directory Exploration**: When directories are listed or explored
4. **File Relationships**: Connections between files, directories, and access patterns
5. **Content Previews**: Brief previews of file contents (for recently accessed files)
6. **Search Patterns**: What files you've searched for and found

### Memory Entity Types

- **`filesystem_directory`**: Represents allowed directories
- **`filesystem_file`**: Represents accessed files with operations history

### Relationship Types

- **`contains`**: Directory contains file
- **`sibling_directory`**: Directories that are both allowed
- **`accessed_after`**: Temporal relationships between file accesses

## 🚀 Quick Start

### 1. Basic Usage

```bash
# Development mode
npm run filesystem-memory-dev /Users/username/Documents

# Production mode
npm run build
npm run filesystem-memory-server /Users/username/Documents /Users/username/Projects

# With custom memory file
npm run filesystem-memory-server --memory-file=./my-fs-memory.json /Users/username/Documents
```

### 2. Configuration

Update your `config.json`:

```json
{
  "mcpServers": [
    {
      "name": "filesystem-memory",
      "command": "node",
      "args": [
        "dist/filesystem-memory-server-standalone.js",
        "--memory-file=./filesystem-memory.json",
        "/Users/username/Documents",
        "/Users/username/Projects"
      ]
    }
  ]
}
```

## 🛠 Available Tools

### Core Filesystem Tools (with Memory Tracking)

1. **`read_file`** - Read files (remembers content previews)
2. **`write_file`** - Write files (tracks content changes)
3. **`list_directory`** - List directory contents
4. **`search_files`** - Search with glob patterns
5. **`get_file_info`** - Get file metadata
6. **`list_allowed_directories`** - Show configured directories

### Memory-Specific Tools

7. **`recall_file_history`** - Get complete access history for a file
8. **`find_similar_files`** - Find files based on memory similarity
9. **`get_filesystem_memory_stats`** - Statistics about tracked files

## 💡 Smart AI Integration Examples

### File Discovery
```
AI: "What files have I worked with recently?"
→ Uses get_filesystem_memory_stats and find_similar_files
```

### Content-Aware Operations
```
AI: "Find all the Python files I've read that contain 'import pandas'"
→ Uses memory to recall file contents and find matches
```

### Workflow Patterns
```
AI: "What files do I usually access after working on config.json?"
→ Uses access_after relationships to suggest related files
```

### Project Understanding
```
AI: "Show me the structure of directories I have access to"
→ Uses allowed directory memory to map project layout
```

## 📊 Memory Data Examples

### File Entity Example
```json
{
  "name": "file:/Users/username/Documents/project/main.py",
  "entityType": "filesystem_file",
  "observations": [
    "Operation: read",
    "Accessed at: 2024-01-15T10:30:00.000Z",
    "File name: main.py",
    "Directory: /Users/username/Documents/project",
    "Size: 1247 bytes",
    "Content preview: import pandas as pd\nimport numpy as np\n\ndef process_data(df):..."
  ],
  "relations": [
    {
      "from": "directory:/Users/username/Documents/project",
      "to": "file:/Users/username/Documents/project/main.py",
      "relationType": "contains"
    }
  ]
}
```

### Directory Entity Example
```json
{
  "name": "directory:/Users/username/Documents",
  "entityType": "filesystem_directory",
  "observations": [
    "Allowed directory: /Users/username/Documents",
    "Resolved path: /Users/username/Documents",
    "Added at: 2024-01-15T09:00:00.000Z"
  ]
}
```

## 🔍 Advanced Usage

### Querying File History
```bash
# Get complete history of a specific file
recall_file_history "/Users/username/Documents/important.txt"
```

### Finding Related Files
```bash
# Find files similar to a search query
find_similar_files "python configuration" --limit 5
```

### Memory Statistics
```bash
# Get overview of tracked filesystem activity
get_filesystem_memory_stats
```

## 🔐 Security & Privacy

- **Sandboxed**: Still maintains strict directory access controls
- **Content Limits**: Only stores brief content previews (200 characters)
- **Local Storage**: All memory data stays in your specified JSON file
- **Configurable**: Memory file location is customizable

## 🎯 Benefits for AI Workflows

1. **Context Awareness**: AI remembers what files you've worked with
2. **Pattern Recognition**: Identifies common file access patterns
3. **Smart Suggestions**: Can suggest related files based on history
4. **Project Understanding**: Builds knowledge of your project structure
5. **Efficient Discovery**: Faster file finding based on previous interactions

## 🛡 Troubleshooting

### Memory Not Working
- Check if memory server is reachable
- Verify memory file permissions
- Look for initialization errors in console output

### Performance Concerns
- Memory operations are asynchronous and won't slow file access
- Large projects: consider periodic memory cleanup
- Storage: Each file access adds ~1KB to memory file

### Configuration Issues
```bash
# Test memory integration
npm run filesystem-memory-inspector --memory-file=./test-memory.json /tmp
```

## 🔄 Migration from Basic Filesystem Server

1. Update your config.json to use `filesystem-memory-server-standalone.js`
2. Add `--memory-file=` parameter if desired
3. Restart your MCP client
4. Memory will start building automatically

The memory-enhanced server is fully backward compatible with the basic filesystem server, but adds powerful knowledge graph capabilities that make your AI assistant much smarter about your files and workflows! 