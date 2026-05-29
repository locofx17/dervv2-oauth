import { Key, Clock, Trash2, ShieldCheck, HelpCircle } from "lucide-react";
import { DerivTokenResponse } from "../types";

interface TokenDetailsProps {
  tokens: DerivTokenResponse | null;
  onClear: () => void;
  clientId: string;
  activeBalance?: { balance: number; currency: string; loginid: string } | null;
}

export default function TokenDetails({ tokens, onClear, clientId, activeBalance }: TokenDetailsProps) {
  if (!tokens) return null;

  return (
    <div id="token-details" className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md overflow-hidden h-full">
      {/* Background glow spot */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 blur-[70px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">
              TOKEN INSPECTOR WELL
            </h2>
          </div>
          <button
            onClick={onClear}
            type="button"
            className="flex items-center gap-1.5 text-[10px] text-red-400 hover:text-white hover:bg-[#ff444f]/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-all font-bold uppercase tracking-wider"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Session</span>
          </button>
        </div>

        <div className="space-y-4">
          {/* Real-time Dynamic Balance Header inside Inspector */}
          {activeBalance && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-center justify-between animate-fade-in">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#ff444f] block">
                  Active Connected Balance
                </span>
                <div className="text-xl font-mono font-bold text-white">
                  {activeBalance.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-emerald-400 text-sm font-bold">{activeBalance.currency}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block">
                  Trading Login ID
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {activeBalance.loginid}
                </span>
              </div>
            </div>
          )}

          {/* Connection parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block">
                Authenticated App ID
              </span>
              <div className="text-sm font-mono font-bold text-blue-400">
                {clientId || "1010"}
              </div>
            </div>

            <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500 block">
                Session Expiry
              </span>
              <div className="text-sm font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  {tokens.expires_in ? `${tokens.expires_in} seconds` : "Infinite"}
                </span>
              </div>
            </div>
          </div>

          {/* Tokens Payload display */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
              {tokens.is_pat ? "API Personal Access Token Details (JSON)" : "OAuth Handshake Response Payload (JSON)"}
            </label>
            <div className="bg-black/60 border border-white/5 rounded-xl p-4 font-mono text-[11px] leading-relaxed relative text-slate-300 max-h-60 overflow-y-auto select-all scrollbar-thin">
              <pre className="whitespace-pre-wrap">{JSON.stringify(tokens, null, 2)}</pre>
            </div>
          </div>

          {/* Feedback details */}
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            {tokens.is_pat ? (
              <p className="text-[11px] text-emerald-300/80 leading-relaxed font-normal">
                <b>Personal API Token Authentication Active!</b> Your direct developer token was authorized manually. No client secret or redirect URIs were verified. Let&apos;s initiate the live connection below.
              </p>
            ) : (
              <p className="text-[11px] text-emerald-300/80 leading-relaxed font-normal">
                <b>Token Exchange Handshake Complete!</b> The local proxy channel successfully logged you in with Deriv services. 
                The profile tokens are saved securely. Let&apos;s use them below to query the high-speed live stream connection.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
