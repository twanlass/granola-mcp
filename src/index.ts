#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GranolaAPI } from "./granola-api.js";

const api = new GranolaAPI();

const server = new McpServer({
  name: "granola",
  version: "1.0.0",
});

// Tool: Get recent documents
server.tool(
  "get_recent_documents",
  "Get a list of recent Granola meeting documents",
  {
    limit: z.number().optional().describe("Number of documents to fetch (default: 20)"),
  },
  async ({ limit = 20 }) => {
    try {
      const documents = await api.getRecentDocuments(limit);
      const summary = documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        created_at: doc.created_at,
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching documents: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Get document content (notes or transcript)
server.tool(
  "get_document",
  "Get the content for a specific Granola document. Returns AI-generated notes by default, or raw transcript if requested.",
  {
    document_id: z.string().describe("The ID of the document to fetch"),
    transcript: z.boolean().optional().describe("If true, return raw transcript instead of AI notes (default: false)"),
  },
  async ({ document_id, transcript = false }) => {
    try {
      if (transcript) {
        const transcriptText = await api.getDocumentTranscript(document_id);
        if (!transcriptText) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No transcript available for this document",
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: transcriptText,
            },
          ],
        };
      } else {
        const notes = await api.getDocumentNotes(document_id);
        if (!notes) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No AI notes available for this document",
              },
            ],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: notes,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching document: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool: Search documents by title
server.tool(
  "search_documents",
  "Search Granola documents by title pattern",
  {
    query: z.string().describe("Text to search for in document titles"),
    limit: z.number().optional().describe("Maximum number of results (default: 20)"),
  },
  async ({ query, limit = 20 }) => {
    try {
      const documents = await api.searchDocuments(query, limit);
      const summary = documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        created_at: doc.created_at,
      }));
      return {
        content: [
          {
            type: "text" as const,
            text:
              summary.length > 0
                ? JSON.stringify(summary, null, 2)
                : `No documents found matching "${query}"`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error searching documents: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Granola MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
