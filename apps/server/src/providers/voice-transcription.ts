export type VoiceTranscriptionRequest = {
  audioBase64: string;
  mimeType: string;
};

export type VoiceTranscriptionResponse = {
  text: string;
};

export type VoiceTranscriptionProvider = {
  transcribe(input: VoiceTranscriptionRequest): Promise<VoiceTranscriptionResponse>;
};

export class VoiceTranscriptionProviderError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "VoiceTranscriptionProviderError";
    this.statusCode = statusCode;
  }
}

type OpenAITranscriptionProviderOptions = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

type OpenAITranscriptionConfig = {
  apiKey?: string;
  model: string;
  baseUrl: string;
};

const defaultOpenAITranscriptionModel = "gpt-4o-mini-transcribe";
const defaultOpenAIBaseUrl = "https://api.openai.com/v1";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getOpenAITranscriptionConfig(
  options: OpenAITranscriptionProviderOptions = {},
): OpenAITranscriptionConfig {
  return {
    apiKey: options.apiKey ?? process.env.OPENAI_API_KEY,
    model:
      options.model ??
      process.env.OPENAI_TRANSCRIPTION_MODEL ??
      defaultOpenAITranscriptionModel,
    baseUrl:
      options.baseUrl ?? process.env.OPENAI_BASE_URL ?? defaultOpenAIBaseUrl,
  };
}

function fileExtensionForMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }

  if (mimeType.includes("mpeg")) {
    return "mp3";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("wav")) {
    return "wav";
  }

  return "webm";
}

export function createOpenAITranscriptionProvider(
  options: OpenAITranscriptionProviderOptions = {},
): VoiceTranscriptionProvider {
  const fetchFn = options.fetchImpl ?? fetch;

  return {
    async transcribe(input) {
      const config = getOpenAITranscriptionConfig(options);

      if (!config.apiKey) {
        throw new VoiceTranscriptionProviderError(
          "OPENAI_API_KEY is required for server voice transcription.",
          503,
        );
      }

      const audioBuffer = Buffer.from(input.audioBase64, "base64");

      if (audioBuffer.length === 0) {
        throw new VoiceTranscriptionProviderError("Voice audio was empty.", 400);
      }

      const formData = new FormData();
      const audioBytes = new Uint8Array(audioBuffer);
      const audioBlob = new Blob([audioBytes], { type: input.mimeType });

      formData.set(
        "file",
        audioBlob,
        `voice.${fileExtensionForMimeType(input.mimeType)}`,
      );
      formData.set("model", config.model);
      formData.set("response_format", "text");

      const response = await fetchFn(
        `${trimTrailingSlash(config.baseUrl)}/audio/transcriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: formData,
        },
      );

      const text = await response.text();

      if (!response.ok) {
        throw new VoiceTranscriptionProviderError(
          text || `Voice transcription failed with status ${response.status}.`,
          response.status >= 400 && response.status < 500 ? 400 : 502,
        );
      }

      return { text: text.trim() };
    },
  };
}

export const defaultVoiceTranscriptionProvider = createOpenAITranscriptionProvider();
