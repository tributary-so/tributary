// MEMO field utilities for payment tracking

export class MemoUtils {
  // Extract tracking ID from MEMO field
  static extractTrackingId(memo: string): string | null {
    if (!memo) return null;

    const trackingMatch = memo.match(/tributary:tracking:([a-zA-Z0-9_-]+)/);
    return trackingMatch ? trackingMatch[1] : null;
  }

  // Validate tracking ID format
  static validateTrackingId(trackingId: string): boolean {
    // Allow alphanumeric, underscore, hyphen, max 64 chars
    return /^[a-zA-Z0-9_-]{1,64}$/.test(trackingId);
  }

  // Build complete MEMO with tracking
  static buildMemo(customMemo: string, trackingId: string): string {
    const trackingPart = `tributary:tracking:${trackingId}`;
    return customMemo ? `${customMemo} | ${trackingPart}` : trackingPart;
  }

  // Validate complete MEMO format
  static validateMemo(memo: string): boolean {
    if (!memo) return false;

    // Check if memo contains tracking pattern
    return /tributary:tracking:[a-zA-Z0-9_-]+/.test(memo);
  }
}
