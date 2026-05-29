import { Shield, Check, Terminal } from "lucide-react";

interface PkceVisualizerProps {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  isGenerating: boolean;
}

export default function PkceVisualizer({
  codeVerifier,
  codeChallenge,
  state,
  isGenerating
}: PkceVisualizerProps) {
  return (
    <div id="pkce-visualizer" className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md h-full overflow-hidden">
      {/* Dynamic light spot */}
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ff444f]/5 blur-[70px] rounded-full pointer-events-none"></div>
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">
              PKCE SECURITY LIVE TRACE
            </h2>
          </div>
          <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
            SHA-256 S256 Method
          </span>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-black/60 border border-white/5 rounded-2xl space-y-4 font-mono text-[11px] leading-relaxed relative overflow-hidden">
            {isGenerating ? (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
                <div className="h-5 w-5 border-2 border-blue-500/20 border-t-blue-400 rounded-full animate-spin"></div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest animate-pulse">Running HMAC cryptology...</span>
              </div>
            ) : null}

            {/* Code Verifier */}
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1.5 label-container">
                <span className="font-bold tracking-widest text-[10px] uppercase text-slate-400">1. CODE_VERIFIER</span>
                {codeVerifier && (
                  <span className="text-[9px] text-emerald-400 flex items-center gap-0.5 uppercase font-bold tracking-wide">
                    <Check className="h-3 w-3" /> Secure Bytes
                  </span>
                )}
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 break-all text-blue-400 select-all font-medium font-mono min-h-10">
                {codeVerifier || <span className="text-slate-600 block italic">Awaiting secure initialization query...</span>}
              </div>
            </div>

            {/* Code Challenge */}
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1.5 label-container">
                <span className="font-bold tracking-widest text-[10px] uppercase text-slate-400">2. CODE_CHALLENGE (S256)</span>
                {codeChallenge && <span className="text-[9px] text-slate-500 uppercase tracking-widest">Base64URL Safe</span>}
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 break-all text-pink-400 select-all font-medium font-mono min-h-10">
                {codeChallenge || <span className="text-slate-600 block italic">Awaiting verifier calculation...</span>}
              </div>
              <div className="text-[9px] text-slate-600 mt-1 italic uppercase tracking-wider">
                Formula: Base64URL( SHA256( code_verifier ) )
              </div>
            </div>

            {/* CSRF State */}
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1.5 label-container">
                <span className="font-bold tracking-widest text-[10px] uppercase text-slate-400">3. CSRF STATE PARAMS</span>
                {state && <span className="text-[9px] text-amber-500 uppercase font-black tracking-widest">Unique Token</span>}
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 break-all text-amber-400 select-all font-medium font-mono min-h-10">
                {state || <span className="text-slate-600 block italic">Awaiting random entropy allocation...</span>}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 leading-relaxed space-y-3 pt-2">
            <p className="flex items-start gap-1">
              <span className="text-[#ff444f] font-bold text-sm leading-none">•</span>
              <span>
                <b>Why PKCE?</b> Classical static client secrets are easily read in client bundles. Under PKCE rules, secret keys are computed on demand using dynamic cryptology.
              </span>
            </p>
            <p className="flex items-start gap-1">
              <span className="text-[#ff444f] font-bold text-sm leading-none">•</span>
              <span>
                Authenticating browsers handshake code values back to Deriv. They match the mathematical signature checks, neutralizing authorization intercept vectors entirely!
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
