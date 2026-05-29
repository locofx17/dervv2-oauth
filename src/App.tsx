import { useState, useEffect } from "react";
import Header from "./components/Header";
import CredentialsForm from "./components/CredentialsForm";
import PkceVisualizer from "./components/PkceVisualizer";
import TokenDetails from "./components/TokenDetails";
import WebSocketTester from "./components/WebSocketTester";
import ReadmeHelper from "./components/ReadmeHelper";
import { DerivTokenResponse } from "./types";
import { ShieldAlert, Sparkles, CheckCircle, GraduationCap, AlertCircle } from "lucide-react";

export default function App() {
  // Config states
  const [clientId, setClientId] = useState<string>("1010"); // Default standard Demo App ID
  const [clientSecret, setClientSecret] = useState<string>("");
  const [tokenResponse, setTokenResponse] = useState<DerivTokenResponse | null>(null);
  const [activeBalance, setActiveBalance] = useState<{ balance: number; currency: string; loginid: string } | null>(null);
  const [wsState, setWsState] = useState<string>("disconnected");
  const [wsError, setWsError] = useState<string>("");

  // PKCE dynamic tracking tracers
  const [codeVerifierTrace, setCodeVerifierTrace] = useState<string>("");
  const [codeChallengeTrace, setCodeChallengeTrace] = useState<string>("");
  const [stateTrace, setStateTrace] = useState<string>("");

  // Control flow variables
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [alertMsg, setAlertMsg] = useState<string>("");

  // Determine dynamic callback URI & enable manual override via interactive configuration
  const [redirectUri, setRedirectUri] = useState<string>("");

  useEffect(() => {
    try {
      const savedRedirect = localStorage.getItem("deriv_oauth_redirect_uri");
      if (savedRedirect) {
        setRedirectUri(savedRedirect);
      } else if (typeof window !== "undefined") {
        setRedirectUri(`${window.location.origin}/auth/callback`);
      }
    } catch (e) {
      console.error("Failed to load redirect URI state:", e);
    }
  }, []);

  const handleUpdateRedirectUri = (newUri: string) => {
    setRedirectUri(newUri);
    try {
      localStorage.setItem("deriv_oauth_redirect_uri", newUri);
    } catch (e) {
      console.error("Failed to persist redirect URI State:", e);
    }
  };

  const handleResetRedirectUriToDefault = () => {
    if (typeof window !== "undefined") {
      const defaultUri = `${window.location.origin}/auth/callback`;
      setRedirectUri(defaultUri);
      try {
        localStorage.setItem("deriv_oauth_redirect_uri", defaultUri);
      } catch (e) {
        console.error("Failed to clear custom redirect URI state:", e);
      }
    }
  };

  // Load active session from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("deriv_oauth_session");
      if (cached) {
        const parsed = JSON.parse(cached);
        setTokenResponse(parsed);
      }
      
      const cachedClientId = localStorage.getItem("deriv_oauth_client_id");
      if (cachedClientId) {
        setClientId(cachedClientId);
      }
    } catch (e) {
      console.error("Failed to load cached session state:", e);
    }
  }, []);

  // Listen for callback events via postMessage from our popup callback window OR via LocalStorage cross-tab updates
  useEffect(() => {
    const handleMessageEvent = (event: MessageEvent) => {
      // Validate messaging is sent from the same application origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const payload: DerivTokenResponse = event.data.data;
        setTokenResponse(payload);
        
        // Persist session
        localStorage.setItem("deriv_oauth_session", JSON.stringify(payload));
        localStorage.setItem("deriv_oauth_client_id", clientId);
        localStorage.removeItem("deriv_oauth_session_shuttle");
        
        setAlertMsg("✓ Tokens synchronized and saved. You can now execute commands below!");
        setTimeout(() => setAlertMsg(""), 5000);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "deriv_oauth_session_shuttle" && event.newValue) {
        try {
          const payload: DerivTokenResponse = JSON.parse(event.newValue);
          setTokenResponse(payload);
          
          localStorage.setItem("deriv_oauth_session", JSON.stringify(payload));
          localStorage.setItem("deriv_oauth_client_id", clientId);
          localStorage.removeItem("deriv_oauth_session_shuttle");
          
          setAlertMsg("✓ Tokens synchronized dynamically via LocalStorage! Ready to execute commands.");
          setTimeout(() => setAlertMsg(""), 5000);
        } catch (e) {
          console.error("Failed to parse shuttle session from local storage:", e);
        }
      }
    };

    // Active polling fallback for extreme sandbox restrictions
    const intervalId = setInterval(() => {
      try {
        const shuttleVal = localStorage.getItem("deriv_oauth_session_shuttle");
        if (shuttleVal) {
          const payload: DerivTokenResponse = JSON.parse(shuttleVal);
          setTokenResponse(payload);
          localStorage.setItem("deriv_oauth_session", JSON.stringify(payload));
          localStorage.setItem("deriv_oauth_client_id", clientId);
          localStorage.removeItem("deriv_oauth_session_shuttle");
          
          setAlertMsg("✓ Tokens synchronized dynamically via LocalStorage polling. You are logged in!");
          setTimeout(() => setAlertMsg(""), 5000);
        }
      } catch (e) {
        // Silent catch
      }
    }, 600);

    window.addEventListener("message", handleMessageEvent);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      window.removeEventListener("message", handleMessageEvent);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [clientId]);

  // Handle initiating of Deriv OAuth Popup flow
  const handleInitiateLogin = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setAlertMsg("");

    try {
      // Fetch safe authorization setup configurations from server endpoint
      const response = await fetch(`/api/auth/initiate?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`);
      const payloadData = await response.json();

      if (!response.ok) {
        throw new Error(payloadData.error || "Failed to launch PKCE session");
      }

      const { url, codeVerifier, codeChallenge, state } = payloadData;

      // Update visible trace parameters for developers
      setCodeVerifierTrace(codeVerifier || "");
      setCodeChallengeTrace(codeChallenge || "");
      setStateTrace(state || "");

      // Let trace flicker slightly to look high-tech
      await new Promise(resolve => setTimeout(resolve, 800));

      // Open OAuth vendor prompt directly in a popup (Avoid iframe redirections block)
      const popupWidth = 600;
      const popupHeight = 700;
      const left = window.screen.width / 2 - popupWidth / 2;
      const top = window.screen.height / 2 - popupHeight / 2;

      const authWindow = window.open(
        url,
        "deriv_oauth_popup",
        `width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=yes,scrollbars=yes`
      );

      if (!authWindow) {
        throw new Error("Unable to open authentication browser window. Please check if a popup blocker is preventing access.");
      }
    } catch (err: any) {
      console.error("Initiation failed:", err);
      setErrorMsg(err.message || "An unexpected error occurred during secure initiation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle direct Personal Access Token (PAT) authentication login
  const handlePatLogin = (patToken: string) => {
    const payload: DerivTokenResponse = {
      access_token: patToken,
      is_pat: true,
      scope: "admin read trade payments",
      expires_in: 0 // Infinite
    };
    setTokenResponse(payload);
    
    // Persist session
    localStorage.setItem("deriv_oauth_session", JSON.stringify(payload));
    localStorage.setItem("deriv_oauth_client_id", clientId);
    
    setAlertMsg("✓ Personal Access Token (PAT) session synchronized and loaded.");
    setTimeout(() => setAlertMsg(""), 5000);
  };

  // Log statistics/session reset
  const handleClearSession = () => {
    setTokenResponse(null);
    setActiveBalance(null);
    localStorage.removeItem("deriv_oauth_session");
    
    // Maintain App ID but clear secrets for security
    setClientSecret("");
    setAlertMsg("Session wiped.");
    setTimeout(() => setAlertMsg(""), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-slate-300 flex flex-col font-sans selection:bg-[#ff444f]/20 selection:text-white relative overflow-x-hidden">
      <Header isAuthenticated={!!tokenResponse} />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in relative">
        {/* Intro hero banner with glowing spots */}
        <div className="relative bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10 overflow-hidden shadow-2xl">
          {/* Accent Ambient Glow Elements */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#ff444f]/10 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#ff444f]/10 border border-[#ff444f]/20 text-[#ff444f] text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
                Production Sandbox Environment
              </span>
              <span className="text-slate-600 text-xs hidden sm:inline">•</span>
              <span className="text-xs text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Deriv OAuth 2.0 PKCE Verification Engine
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
              Deriv OAuth Proof-Of-Concept Tester
            </h2>
            
            <p className="text-slate-400 text-sm max-w-4xl leading-relaxed">
              Connect and authenticate securely inside our sandbox workspace. This explorer uses cryptographic SHA-256 algorithms to run Auth Code exchanges with Proof Key for Code Exchange (PKCE) flow. Set standard app ID <b>1010</b>, specify redirects, and live query Deriv in real-time.
            </p>
          </div>
        </div>

        {/* Global alerts indicator */}
        {errorMsg && (
          <div className="p-5 bg-[#ff444f]/5 border border-[#ff444f]/15 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-[#ff444f] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Authentication Dispatch Error</h4>
              <p className="text-xs text-[#ff444f]/90 mt-1 font-mono">{errorMsg}</p>
            </div>
          </div>
        )}

        {alertMsg && (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">{alertMsg}</span>
          </div>
        )}

        {/* Main dynamic section configuration and dynamic parameters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Credentials Settings Form - Column 1 */}
          <div className="lg:col-span-5 space-y-6">
            <CredentialsForm
              clientId={clientId}
              setClientId={setClientId}
              clientSecret={clientSecret}
              setClientSecret={setClientSecret}
              onInitiateLogin={handleInitiateLogin}
              isLoading={isLoading}
              redirectUri={redirectUri}
              setRedirectUri={handleUpdateRedirectUri}
              onResetRedirectUriToDefault={handleResetRedirectUriToDefault}
              onPatLogin={handlePatLogin}
              tokenResponse={tokenResponse}
              activeBalance={activeBalance}
              wsState={wsState}
              wsError={wsError}
            />
          </div>

          {/* Tracer Visualizer/Token inspectors - Column 2 */}
          <div className="lg:col-span-7 space-y-6">
            {!tokenResponse ? (
              <PkceVisualizer
                codeVerifier={codeVerifierTrace}
                codeChallenge={codeChallengeTrace}
                state={stateTrace}
                isGenerating={isLoading}
              />
            ) : (
              <TokenDetails
                tokens={tokenResponse}
                onClear={handleClearSession}
                clientId={clientId}
                activeBalance={activeBalance}
              />
            )}
          </div>
        </div>

        {/* WebSocket Explorer section panel */}
        <WebSocketTester 
          tokenResponse={tokenResponse} 
          clientId={clientId} 
          onBalanceUpdate={setActiveBalance}
          onStateUpdate={setWsState}
          onErrorUpdate={setWsError}
        />

        {/* Readme Manual Instruction section */}
        <ReadmeHelper redirect_uri={redirectUri} />
      </main>

      {/* System Footer compliant to UI style guidelines */}
      <footer className="px-6 md:px-10 py-6 bg-black/80 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs mt-16">
        <div className="flex gap-8 flex-wrap">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Redirect URI Endpoint</span>
            <span className="text-slate-400 font-mono text-[11px]">{redirectUri}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Active Vendor APIs</span>
            <span className="text-slate-400 font-mono text-[11px]">auth.deriv.com / oauth2</span>
          </div>
        </div>
        <div className="text-right flex flex-col sm:items-end">
          <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Payload Cryptography</span>
          <span className="text-white/40 font-mono text-[11px]">SHA-256 / SSL 4096-bit Handshake</span>
        </div>
      </footer>
    </div>
  );
}
