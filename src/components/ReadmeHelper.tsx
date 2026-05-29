import React from "react";
import { GraduationCap, ExternalLink, ShieldCheck } from "lucide-react";

interface ReadmeHelperProps {
  redirect_uri: string;
}

export default function ReadmeHelper({ redirect_uri }: ReadmeHelperProps) {
  return (
    <div id="instructions" className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-10 space-y-8 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-white/5 pb-5">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
          <GraduationCap className="h-6 w-6 text-[#ff444f]" />
        </div>
        <div>
          <h2 className="text-md font-black text-white uppercase tracking-[0.2em]">
            DERIV INTEGRATION & CONFIGURATION MANUAL
          </h2>
          <p className="text-xs text-slate-500 font-mono uppercase tracking-widest mt-0.5">
            How to configure and secure OAuth 2.0 Auth Flow with PKCE
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Step-by-Step Guide */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#ff444f]/10 border border-[#ff444f]/20 text-[#ff444f] text-xs font-mono font-bold">1</span>
            Register your App on Deriv Portal
          </h3>
          <ul className="space-y-4 text-xs text-slate-400 leading-relaxed list-none pl-0">
            <li className="flex gap-2 items-start">
              <span className="text-[#ff444f] font-mono font-bold mt-0.5">•</span>
              <span>
                Navigate to the{" "}
                <a 
                  href="https://api.deriv.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[#ff444f] hover:text-[#ff444f]/80 font-bold inline-flex items-center gap-0.5 underline decoration-[#ff444f]/30"
                >
                  Deriv Developer Portal <ExternalLink className="h-3 w-3" />
                </a>{" "}
                and sign in with your account credentials.
              </span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-[#ff444f] font-mono font-bold mt-0.5">•</span>
              <span>
                Click <b>&quot;Register Application&quot;</b> inside the developer center to create an endpoint profile.
              </span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-[#ff444f] font-mono font-bold mt-0.5">•</span>
              <span>
                Under <b>Redirect URL</b>, declare this exact callback address:
                <code className="block mt-1.5 p-3 bg-black/40 border border-white/15 rounded-xl text-[11px] font-mono text-purple-400 select-all font-bold">
                  {redirect_uri}
                </code>
              </span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-[#ff444f] font-mono font-bold mt-0.5">•</span>
              <span>
                Declare scopes on the form: make sure that <b>Read</b> and <b>Trade</b> scopes are checked.
              </span>
            </li>
            <li className="flex gap-2 items-start">
              <span className="text-[#ff444f] font-mono font-bold mt-0.5">•</span>
              <span>
                Save settings to generate your custom **App ID / Client ID** (e.g. standard demo 1010).
              </span>
            </li>
          </ul>
        </div>

        {/* Backend & Environment Variables Setup */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold">2</span>
            Configure Vault Secrets
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            By default, credentials can be entered directly on the flow control deck. 
            For secure production environments, variables should be stored to prevent user-exposure. Define these key tokens in the **Secrets dashboard** inside Google AI Studio:
          </p>

          <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-4 text-[11px] font-mono leading-relaxed">
            <div>
              <div className="text-blue-400 font-bold uppercase tracking-wider">DERIV_CLIENT_ID</div>
              <div className="text-slate-500 mt-0.5">Your registered APP ID numeric code (configured as client identity).</div>
            </div>
            <div>
              <div className="text-pink-400 font-bold uppercase tracking-wider">DERIV_CLIENT_SECRET</div>
              <div className="text-slate-500 mt-0.5">Only needed for confidential application rules. Handled strictly server-side.</div>
            </div>
          </div>

          <p className="text-[11px] text-blue-300 leading-normal flex items-start gap-2 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
            <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              The proxy client code intercepts and handshakes authorization variables completely within the back-end. 
              Because the authorization token code never hits client-side variables directly during code exchange, network interception is impossible!
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
