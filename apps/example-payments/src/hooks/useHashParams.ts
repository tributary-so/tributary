import { useLocation } from "react-router-dom";

export function useHashParams(): URLSearchParams {
  const location = useLocation();
  const hash = location.hash;
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(hash.slice(queryIndex + 1));
}
