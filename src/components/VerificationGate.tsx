import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface Props {
  children: ReactNode;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export default function VerificationGate({ children }: Props) {
  try {
    const stored = localStorage.getItem("beat-verified");
    if (!stored) return <Navigate to="/verify" replace />;

    const data = JSON.parse(stored);
    if (!data.verified) return <Navigate to="/verify" replace />;

    // After 2 days, force re-verification
    const verifiedAt = data.verifiedAt || 0;
    if (Date.now() - verifiedAt > TWO_DAYS_MS) {
      localStorage.removeItem("beat-verified");
      return <Navigate to="/verify" replace />;
    }

    return <>{children}</>;
  } catch {
    return <Navigate to="/verify" replace />;
  }
}
