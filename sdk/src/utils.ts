export function createMemoBuffer(memo: string, size: number = 64): number[] {
  const buffer = new Uint8Array(size).fill(0);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(memo);
  buffer.set(encoded.slice(0, size));
  return Array.from(buffer);
}
