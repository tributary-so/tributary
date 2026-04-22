import { useReducer, useCallback, useEffect, useRef } from "react";
import { TributaryVerifier, TributaryJWTPayload } from "@tributary-so/payments";

const DEFAULT_API_BASE_URL = "https://api.tributary.so"

export interface TokenResponse {
  token: string;
  expiresAt: number;
}

export type PaymentTokenState = {
  payload: TributaryJWTPayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

type Action =
  | { type: "fetch" }
  | { type: "success"; payload: TributaryJWTPayload }
  | { type: "error"; error: string };

function reducer(_state: PaymentTokenState, action: Action): PaymentTokenState {
  switch (action.type) {
    case "fetch":
      return {
        payload: null,
        loading: true,
        error: null,
        refresh: _state.refresh,
      };
    case "success":
      return {
        payload: action.payload,
        loading: false,
        error: null,
        refresh: _state.refresh,
      };
    case "error":
      return {
        payload: null,
        loading: false,
        error: action.error,
        refresh: _state.refresh,
      };
  }
}

export function useTrackingId(
  trackingId: string,
  recipient: string,
  tokenMint?: string,
  baseUrl?: string,
): PaymentTokenState {
  const [fetchKey, setFetchKey] = useReducer((x: number) => x + 1, 0);
  const abortRef = useRef<AbortController | null>(null);

  const [state, dispatch] = useReducer(reducer, {
    payload: null,
    loading: false,
    error: null,
    refresh: () => { },
  });

  useEffect(() => {
    if (!trackingId || !recipient) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    dispatch({ type: "fetch" });

    baseUrl = baseUrl ?? DEFAULT_API_BASE_URL;
    const verifier = new TributaryVerifier({ baseUrl });

    fetch(`${baseUrl}/v1/tokens/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackingId,
        recipient,
        tokenMint,
      }),
      signal: ac.signal,
    })
      .then((res) => {
        if (!res.ok)
          return res.json().then((body) => {
            throw new Error(body.error || "Token request failed");
          });
        return res.json();
      })
      .then((data: TokenResponse) => {
        return verifier.verify(data.token)
      })
      .then((decoded) => {
        if (!ac.signal.aborted) {
          dispatch({ type: "success", payload: decoded });
        }
      })
      .catch((err: any) => {
        console.error(err)
        if (ac.signal.aborted) return;
        dispatch({
          type: "error",
          error: err.message || "Token request failed",
        });
      });

    return () => {
      ac.abort();
    };
  }, [trackingId, recipient, tokenMint, fetchKey]);

  const refresh = useCallback(() => {
    setFetchKey();
  }, []);

  return { ...state, refresh };
}
