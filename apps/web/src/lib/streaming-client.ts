export async function readTextStream(
  response: Response,
  onChunk?: (partialText: string) => void,
): Promise<string> {
  let scheduledFrameId: number | null = null;
  let latestChunk = "";

  const flushChunk = () => {
    scheduledFrameId = null;
    if (onChunk) {
      onChunk(latestChunk);
    }
  };

  const scheduleChunkFlush = () => {
    if (!onChunk) {
      return;
    }

    if (typeof window === "undefined") {
      flushChunk();
      return;
    }

    if (scheduledFrameId !== null) {
      return;
    }

    scheduledFrameId = window.requestAnimationFrame(() => {
      flushChunk();
    });
  };

  const flushFinalChunk = () => {
    if (!onChunk) {
      return;
    }

    if (typeof window !== "undefined" && scheduledFrameId !== null) {
      window.cancelAnimationFrame(scheduledFrameId);
    }

    flushChunk();
  };

  if (!response.body) {
    const text = await response.text();
    latestChunk = text;
    flushFinalChunk();
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    fullText += decoder.decode(value, { stream: true });
    latestChunk = fullText;
    scheduleChunkFlush();
  }

  fullText += decoder.decode();
  latestChunk = fullText;
  flushFinalChunk();

  return fullText;
}
