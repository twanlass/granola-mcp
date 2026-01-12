# Granola MCP Server

An MCP (Model Context Protocol) server that provides tools for accessing Granola meeting transcripts and AI-generated notes.

## Requirements

- Node.js 20+
- Granola desktop app installed and logged in

## Installation

```bash
npm install
npm run build
```

## Usage

Start the MCP server:

```bash
npm start
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_recent_documents` | List recent meeting documents |
| `get_document` | Get AI notes (default) or transcript for a document |
| `search_documents` | Search documents by title |
| `get_latest_1on1` | Find the most recent 1:1 with a specific person |

### Options

Both `get_document` and `get_latest_1on1` return AI-generated notes by default. Pass `transcript: true` to get the raw transcript instead.

## Configuration

The server reads credentials from Granola's config file at:
```
~/Library/Application Support/Granola/supabase.json
```

No additional configuration is required.
