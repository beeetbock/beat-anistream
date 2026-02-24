import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginPrompt({ onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors"
        >
          <X size={22} />
        </button>

        {/* Card — matches your auth page exactly */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="font-display font-black text-2xl text-white mb-1">Welcome Back</h1>
            <p className="text-sm text-white/50">Sign in to access your watchlist &amp; progress</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-11 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>→ Sign In</>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/auth"
              onClick={onClose}
              className="text-sm text-primary hover:underline"
            >
              Don't have an account? Sign up
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-white/30 leading-relaxed">
            Login is optional. You can browse without an account, but
            logged-in users get watchlist sync &amp; continue watching.
          </p>
        </div>
      </div>
    </div>
  );
}
