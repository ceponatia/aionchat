export function logRequest(method: string, path: string): void {
  console.log(`[API] ${method} ${path}`);
}

export function logError(method: string, path: string, error: unknown): void {
  console.error(`[API] ${method} ${path} ERROR:`, error);
}
