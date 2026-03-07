export async function readTextStream(
  response: Response,
  onChunk?: (partialText: string) => void,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    if (onChunk) {
      onChunk(text);
    }
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
    if (onChunk) {
      onChunk(fullText);
    }
  }

  fullText += decoder.decode();
  if (onChunk) {
    onChunk(fullText);
  }

  return fullText;
}
