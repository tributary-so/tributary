export function createMemoBuffer(memo: string, size: number = 64): number[] {
  const buffer = new Uint8Array(size).fill(0);
  Buffer.from(memo).copy(buffer);
  return Array.from(buffer);
}
