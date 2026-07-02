export type ModelMessageRole = "system" | "user" | "assistant";

export type ModelMessage = {
  role: ModelMessageRole;
  content: string;
};

export type GenerateStructuredInput = {
  messages: ModelMessage[];
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
};

export type ModelProvider = {
  generateStructured: (input: GenerateStructuredInput) => Promise<unknown>;
};

export class ModelProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ModelProviderError";
  }
}
