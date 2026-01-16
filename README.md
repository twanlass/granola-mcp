# Granola MCP Server

An MCP (Model Context Protocol) server that provides tools for accessing Granola meeting transcripts and AI-generated notes.

## Requirements

- Node.js 20+
- Granola desktop app installed and logged in

## Installation

```bash
git clone https://github.com/twanlass/granola-mcp.git
cd granola-mcp
npm install
npm run build
```

## Claude Desktop Configuration

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "granola": {
      "command": "node",
      "args": ["/path/to/granola-mcp/dist/index.js"]
    }
  }
}
```

Replace `/path/to/granola-mcp` with the actual path to this repository.

## Claude Code Configuration

Run this command to add the MCP server to Claude Code:

```bash
claude mcp add granola node /path/to/granola-mcp/dist/index.js
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_recent_documents` | List recent meeting documents |
| `get_document` | Get AI notes (default) or transcript for a document |
| `search_documents` | Search documents by title |

### Options

`get_document` returns AI-generated notes by default. Pass `transcript: true` to get the raw transcript instead.

## How Granola Credentials Work

The server reads credentials from Granola's config file at:
```
~/Library/Application Support/Granola/supabase.json
```

This file is created automatically when you log into the Granola desktop app. No additional configuration is required.
