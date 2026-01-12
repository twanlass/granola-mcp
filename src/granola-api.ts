import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface WorkOSTokens {
  access_token: string;
}

interface GranolaConfig {
  workos_tokens: string;
}

interface GranolaDocument {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  last_viewed_panel?: {
    content?: ProseMirrorNode;
  };
  notes_markdown?: string;
  notes_plain?: string;
  content?: string;
  raw_transcript?: string;
}

interface ProseMirrorNode {
  type: string;
  content?: ProseMirrorNode[];
  text?: string;
  marks?: { type: string }[];
  attrs?: Record<string, unknown>;
}

interface TranscriptSegment {
  source: string;
  text: string;
}

interface GetDocumentsResponse {
  docs: GranolaDocument[];
}

export class GranolaAPI {
  private accessToken: string | null = null;

  private loadCredentials(): string {
    const configPath = path.join(
      os.homedir(),
      "Library/Application Support/Granola/supabase.json"
    );

    if (!fs.existsSync(configPath)) {
      throw new Error(
        `Granola config file not found at ${configPath}. Make sure Granola is installed and you're logged in.`
      );
    }

    const configData = fs.readFileSync(configPath, "utf-8");
    const config: GranolaConfig = JSON.parse(configData);

    if (!config.workos_tokens) {
      throw new Error("No workos_tokens found in Granola config");
    }

    const workosTokens: WorkOSTokens = JSON.parse(config.workos_tokens);

    if (!workosTokens.access_token) {
      throw new Error("No access_token found in workos_tokens");
    }

    return workosTokens.access_token;
  }

  private getAccessToken(): string {
    if (!this.accessToken) {
      this.accessToken = this.loadCredentials();
    }
    return this.accessToken;
  }

  private async makeRequest<T>(
    url: string,
    body: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getAccessToken()}`,
        "Content-Type": "application/json",
        "User-Agent": "Granola/5.354.0",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const data = await response.text();
    return JSON.parse(data) as T;
  }

  async getRecentDocuments(
    limit: number = 50,
    offset: number = 0
  ): Promise<GranolaDocument[]> {
    const response = await this.makeRequest<GetDocumentsResponse>(
      "https://api.granola.ai/v2/get-documents",
      {
        limit,
        offset,
        include_last_viewed_panel: true,
      }
    );

    return response.docs || [];
  }

  async getDocumentTranscript(documentId: string): Promise<string | null> {
    try {
      const segments = await this.makeRequest<TranscriptSegment[]>(
        "https://api.granola.ai/v1/get-document-transcript",
        {
          document_id: documentId,
        }
      );

      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        return null;
      }

      const formattedTranscript = segments.map((segment) => {
        if (segment.source === "microphone") {
          return `**Me:** ${segment.text}`;
        } else if (segment.source === "system") {
          return `**System:** ${segment.text}`;
        }
        return segment.text;
      });

      return formattedTranscript.join("\n\n");
    } catch {
      return null;
    }
  }

  async getDocumentNotes(documentId: string): Promise<string | null> {
    try {
      // Fetch the document to get its notes
      const documents = await this.getRecentDocuments(100);
      const doc = documents.find((d) => d.id === documentId);

      if (!doc) {
        return null;
      }

      if (doc.notes_markdown) {
        return doc.notes_markdown;
      }

      if (doc.last_viewed_panel?.content) {
        return this.convertProseMirrorToMarkdown(doc.last_viewed_panel.content);
      }

      return null;
    } catch {
      return null;
    }
  }

  async searchDocuments(
    titlePattern: string,
    limit: number = 20
  ): Promise<GranolaDocument[]> {
    const documents = await this.getRecentDocuments(limit);
    const pattern = titlePattern.toLowerCase();

    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(pattern)
    );
  }

  async findLatest1on1(personName: string): Promise<{
    document: GranolaDocument;
  } | null> {
    const documents = await this.getRecentDocuments(50);
    const nameLower = personName.toLowerCase();

    // Find documents that match the person name and contain "1:1" or "1x1"
    const matching = documents.filter((doc) => {
      const titleLower = doc.title.toLowerCase();
      const hasName = titleLower.includes(nameLower);
      const is1on1 = titleLower.includes("1:1") || titleLower.includes("1x1");
      return hasName && is1on1;
    });

    if (matching.length === 0) {
      return null;
    }

    // Sort by created_at descending to get most recent
    matching.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      document: matching[0],
    };
  }

  convertProseMirrorToMarkdown(pmContent: ProseMirrorNode | null): string {
    if (!pmContent) {
      return "";
    }

    const processNode = (node: ProseMirrorNode): string => {
      const nodeType = node.type || "";
      const content = node.content || [];
      const text = node.text || "";

      if (nodeType === "text") {
        let result = text;
        const marks = node.marks || [];
        for (const mark of marks) {
          if (mark.type === "bold") {
            result = `**${result}**`;
          } else if (mark.type === "italic") {
            result = `*${result}*`;
          } else if (mark.type === "code") {
            result = `\`${result}\``;
          }
        }
        return result;
      }

      if (nodeType === "paragraph") {
        const paraText = content.map(processNode).join("");
        return paraText.trim() ? `${paraText}\n\n` : "";
      }

      if (nodeType === "heading") {
        const level = (node.attrs?.level as number) || 1;
        const headingText = content.map(processNode).join("");
        return `${"#".repeat(level)} ${headingText}\n\n`;
      }

      if (nodeType === "bulletList") {
        return content.map(processNode).join("");
      }

      if (nodeType === "listItem") {
        const itemText = content.map(processNode).join("");
        return `- ${itemText}`;
      }

      if (nodeType === "orderedList") {
        return content
          .map((child, i) => {
            const childText = processNode(child);
            return childText ? `${i + 1}. ${childText}` : "";
          })
          .join("");
      }

      if (nodeType === "codeBlock") {
        const codeText = content.map(processNode).join("");
        return `\`\`\`\n${codeText}\n\`\`\`\n\n`;
      }

      if (nodeType === "hardBreak") {
        return "\n";
      }

      if (content.length > 0) {
        return content.map(processNode).join("");
      }

      return "";
    };

    return processNode(pmContent);
  }
}
