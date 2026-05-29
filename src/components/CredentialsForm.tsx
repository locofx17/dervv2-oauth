import React from "react";
import { Settings, Info, AlertTriangle, Key, CheckCircle, ShieldCheck } from "lucide-react";
import { DerivTokenResponse } from "../types";

interface CredentialsFormProps {
  clientId: string;
  setClientId: (id: string) => void;
  clientSecret: string;
  setClientSecret: (secret: string) => void;
  onInitiateLogin: () => void;
  isLoading: boolean;
  redirectUri: string;
  setRedirectUri: (uri: string) => void;
  onResetRedirectUriToDefault: () => void;
  onPatLogin: (patToken: string) => void;
  tokenResponse: DerivTokenResponse | null;
  activeBalance?: { balance: number; currency: string; loginid: string } | null;
  wsState?: string;
  wsError?: string;
  useDirectRedirect: boolean;
  setUseDirectRedirect: (val: boolean) => void;
}

export default function CredentialsForm({
  clientId,
  setClientId,
  clientSecret,
  setClientSecret,
  onInitiateLogin,
  isLoading,
  redirectUri,
  setRedirectUri,
  onResetRedirectUriToDefault,
  onPatLogin,
  tokenResponse,
  activeBalance,
  wsState = "disconnected",
  wsError = "",
  useDirectRedirect,
  setUseDirectRedirect
}: CredentialsFormProps) {
  const [activeTab, setActiveTab] = React.useState<"oauth" | "pat">("oauth");
  const [patValue, setPatValue] = React.useState<string>("");
  const [showPat, setShowPat] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (tokenResponse?.is_pat && tokenResponse.access_token) {
      setPatValue(tokenResponse.access_token);
      setActiveTab("pat");
    }
  }, [tokenResponse]);

  return (
    <div id="flow-config" className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Background ambient accents for depth */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#ff444f]/5 blur-[70px] rounded-full pointer-events-none"></div>
      
      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-2 pb-2">
          <Settings className="h-4 w-4 text-[#ff444f]" />
          <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">
            SYSTEM FLOW CONFIGURATION
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("oauth")}
            className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "oauth"
                ? "bg-[#ff444f] text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-white hover:bg-white/5 font-semibold"
            }`}
          >
            OAuth 2.0 PKCE Flow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pat")}
            className={`flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "pat"
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-white hover:bg-white/5 font-semibold"
            }`}
          >
            Personal API Token (PAT)
          </button>
        </div>

        <div className="space-y-4">
          {/* CLIENT ID */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest font-mono">
              Deriv App ID <span className="text-[8px] text-slate-600">(For Live Routing)</span>
            </label>
            <input
              id="client-id-input"
              type="text"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:border-[#ff444f]/60 focus:ring-1 focus:ring-[#ff444f]/20 outline-none transition-all"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 1010"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Standard app ID is <b className="text-white">1010</b>. Change this to use your custom registered credentials in sandbox or real profiles.
            </p>
          </div>

          {activeTab === "oauth" ? (
            <div className="space-y-4 animate-fade-in">
              {/* CLIENT SECRET BACKEND OPTION */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest font-mono">
                  Client Secret <span className="text-[9px] text-slate-600 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    id="client-secret-input"
                    type="password"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:border-[#ff444f]/60 focus:ring-1 focus:ring-[#ff444f]/20 outline-none transition-all"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="••••••••••••••••••••"
                  />
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-600" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Only required if your selected profile details are configured as a confidential client.
                </p>
              </div>

              {/* REDIRECT URI */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="redirect-uri-input" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    OAuth 2.0 Redirect Callback URL
                  </label>
                  <button
                    type="button"
                    onClick={onResetRedirectUriToDefault}
                    className="text-[9px] font-bold text-[#ff444f] hover:underline uppercase tracking-wider bg-transparent border-none cursor-pointer"
                  >
                    Reset Default
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="redirect-uri-input"
                    type="text"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-20 py-3 text-xs font-mono text-white placeholder-slate-600 focus:border-[#ff444f]/60 focus:ring-1 focus:ring-[#ff444f]/20 outline-none transition-all font-semibold"
                    value={redirectUri}
                    onChange={(e) => setRedirectUri(e.target.value)}
                    placeholder="e.g. http://localhost:3000/auth/callback"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(redirectUri);
                    }}
                    className="absolute right-2 px-3 py-1.5 text-[9px] bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-bold uppercase tracking-wider rounded-lg transition-all"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1.5 leading-relaxed">
                  <Info className="h-3.5 w-3.5 mt-0.5 text-[#ff444f] shrink-0" />
                  <span>
                    <b>Crucial:</b> This URL must be registered <i>exactly</i> as a Redirect URI in your application profile inside the Deriv Developer Console!
                  </span>
                </p>
              </div>

              {/* PERSISTENT FULL-PAGE REDIRECT OPTIONS */}
              <div className="flex items-center gap-2.5 py-1 select-none">
                <input
                  id="direct-redirect-toggle"
                  type="checkbox"
                  checked={useDirectRedirect}
                  onChange={(e) => setUseDirectRedirect(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40 text-[#ff444f] cursor-pointer"
                  style={{ accentColor: "#ff444f" }}
                />
                <label htmlFor="direct-redirect-toggle" className="text-[11px] font-semibold text-slate-300 cursor-pointer">
                  Avoid browser popups (use direct tab redirection)
                </label>
              </div>

              {/* TRIGGER BUTTON */}
              <button
                id="login-button"
                onClick={onInitiateLogin}
                disabled={isLoading || !clientId}
                className={`w-full py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 focus:outline-none cursor-pointer ${
                  isLoading || !clientId
                    ? "bg-white/5 text-slate-600 cursor-not-allowed border border-white/5"
                    : "bg-[#ff444f] text-white shadow-[0_15px_35px_rgba(255,68,79,0.3)] hover:shadow-[0_15px_45px_rgba(255,68,79,0.5)] active:scale-[0.98]"
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>Establishing PKCE Handshake...</span>
                  </>
                ) : (
                  <>
                    <span>Login with Deriv Account</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* PAT INPUT */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="pat-input-field" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Personal API Token / Token String
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPat(!showPat)}
                    className="text-[9px] font-bold text-blue-400 hover:underline uppercase tracking-wider bg-transparent border border-none cursor-pointer"
                  >
                    {showPat ? "Hide Token" : "Show Token"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="pat-input-field"
                    type={showPat ? "text" : "password"}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-700 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all font-semibold"
                    value={patValue}
                    onChange={(e) => setPatValue(e.target.value)}
                    placeholder="e.g. jS9bV_x82mN_Hq4"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1.5 leading-relaxed">
                  <Info className="h-3.5 w-3.5 mt-0.5 text-blue-400 shrink-0" />
                  <span>
                    Get your API Token from <b>Deriv</b> &rarr; <b>Account Settings</b> &rarr; <b>API Token</b>. Check <b>Read</b> &amp; <b>Admin</b> scopes to execute live sandbox commands.
                  </span>
                </p>
              </div>

              {/* ACTIVE AUTHORIZED PAT ENTRY PIN */}
              {tokenResponse?.is_pat === true && tokenResponse.access_token === patValue.trim() && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-start gap-2.5 animate-fade-in w-full">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block font-sans">
                      Active Authorized Entry
                    </span>
                    <p className="text-[11px] text-slate-300 leading-normal font-mono truncate">
                      Token String: <span className="text-emerald-300 font-bold">{patValue.slice(0, 4)}••••{patValue.slice(-4)}</span>
                    </p>
                    
                    {/* Dynamic Real-time Balance display */}
                    {activeBalance ? (
                      <div className="py-1.5 px-3 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg font-mono text-xs font-bold inline-block animate-pulse-subtle">
                        Live Bal: <span className="text-white text-sm">{activeBalance.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> {activeBalance.currency}
                        <span className="text-[9px] text-slate-400 block font-sans font-medium mt-0.5">Account ID: {activeBalance.loginid}</span>
                      </div>
                    ) : wsState === "error" || wsError ? (
                      <div className="py-2 px-3 bg-[#ff444f]/10 text-red-200 border border-[#ff444f]/20 rounded-lg font-mono text-[10px] leading-relaxed block w-full">
                        <span className="font-bold uppercase tracking-wider block text-[8px] text-[#ff444f] mb-0.5">Credentials Error</span>
                        {wsError || "WebSocket authorization rejected. Verify your Personal Access Token (PAT) list constraints."}
                      </div>
                    ) : wsState === "connecting" ? (
                      <div className="py-1 px-2 text-blue-400 font-mono text-[10px] italic flex items-center gap-1.5 animate-pulse">
                        <div className="h-2 w-2 border border-t-transparent border-blue-400 rounded-full animate-spin shrink-0"></div>
                        <span>Connecting to Deriv Node...</span>
                      </div>
                    ) : wsState === "connected" ? (
                      <div className="py-1 px-2 text-amber-400 font-mono text-[10px] italic flex items-center gap-1.5 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping mr-1"></span>
                        <span>Exchanging secure handshake...</span>
                      </div>
                    ) : (
                      <div className="py-1 px-2 text-slate-500 font-mono text-[10px] italic flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500 mr-1"></span>
                        <span>Disconnected. Awaiting session connection.</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <span className={`text-[8px] border px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                        wsState === "authorized"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                          : wsState === "connecting" || wsState === "connected"
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                          : wsState === "error"
                          ? "bg-[#ff444f]/10 border-[#ff444f]/20 text-[#ff444f]"
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}>
                        {wsState === "authorized" ? "Connected" : wsState === "error" ? "Error" : wsState.toUpperCase()}
                      </span>
                      <span className="text-[8px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                        Read + Admin Scopes
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBMIT TOKEN BUTTON */}
              <button
                id="pat-login-button"
                type="button"
                onClick={() => {
                  if (patValue.trim()) {
                    onPatLogin(patValue.trim());
                  }
                }}
                disabled={!patValue.trim()}
                className={`w-full py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 focus:outline-none cursor-pointer ${
                  !patValue.trim()
                    ? "bg-white/5 text-slate-600 cursor-not-allowed border border-white/5"
                    : tokenResponse?.is_pat === true && tokenResponse.access_token === patValue.trim()
                    ? "bg-emerald-600 text-white shadow-[0_15px_35px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_45px_rgba(16,185,129,0.5)] active:scale-[0.98] border border-emerald-500/20"
                    : "bg-blue-600 text-white shadow-[0_15px_35px_rgba(37,99,235,0.3)] hover:shadow-[0_15px_45px_rgba(37,99,235,0.5)] active:scale-[0.98] border border-blue-500/20"
                }`}
              >
                <span>{tokenResponse?.is_pat === true && tokenResponse.access_token === patValue.trim() ? "✓ Re-Authorize API Token" : "Authorize API Token"}</span>
              </button>
            </div>
          )}

          {!clientId && (
            <div className="flex gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-400/90 leading-relaxed font-normal">
                An App ID is required to start. Specify <b>1010</b> to execute with public demo sandbox variables.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
