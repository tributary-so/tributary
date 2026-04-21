import { useEffect, useState } from "react";
import { TributaryJWTPayload, TributaryVerifier } from "@tributary-so/payments";

const API_BASE_URL = "https://devnet.api.tributary.so";

export type TokenState = {
  token: string | null;
  payload: TributaryJWTPayload | null;
  loading: boolean;
  error: string | null;
};

export function useTributaryToken(token?: string, baseUrl?: string): TokenState {
  const verifier = new TributaryVerifier({ baseUrl: baseUrl ?? API_BASE_URL });

  const [state, setState] = useState<TokenState>({
    token: null,
    payload: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const resolved =
      token ?? new URLSearchParams(window.location.search).get("token");

    if (!resolved) {
      setState({ token: null, payload: null, loading: false, error: null });
      return;
    }

    setState((s) => ({ ...s, token: resolved, loading: true }));

    verifier.verify(resolved)
      .then((result) =>
        setState({
          token: resolved,
          payload: result,
          loading: false,
          error: null,
        })
      )
      .catch(() =>
        setState({
          token: resolved,
          payload: null,
          loading: false,
          error: "Verification failed",
        })
      );
  }, [token]);

  return state;
}

