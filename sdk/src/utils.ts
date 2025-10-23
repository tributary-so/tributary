export function encodeMemo(memo: string, size: number = 64): number[] {
  const buffer = new Uint8Array(size).fill(0);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(memo);
  buffer.set(encoded.slice(0, size));
  return Array.from(buffer);
}

export function createMemoBuffer(memo: string, size: number = 64): number[] {
  return encodeMemo(memo, size);
}

export function decodeMemo(buffer: number[]): string {
  const uint8Array = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  return decoder.decode(uint8Array).trim();
}
