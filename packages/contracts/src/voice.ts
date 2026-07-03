import { z } from "zod";

export const voiceTranscriptionInputSchema = z.object({
  audioBase64: z.string().min(1).max(12_000_000),
  mimeType: z.string().min(1).max(100).default("audio/webm"),
});

export const voiceTranscriptionResultSchema = z.object({
  text: z.string(),
});

export type VoiceTranscriptionInput = z.infer<typeof voiceTranscriptionInputSchema>;
export type VoiceTranscriptionResult = z.infer<typeof voiceTranscriptionResultSchema>;
