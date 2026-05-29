import React, { useState, useEffect, useRef } from "react";
import { Terminal, Send, CheckCircle, Wifi, WifiOff, RefreshCw, Coins, TrendingUp, Wallet, Copy, Check } from "lucide-react";
import { DerivTokenResponse, WebSocketMessage, DerivAuthorizeDetails, DerivAccount } from "../types";

interface WebSocketTesterProps {
  tokenResponse: DerivTokenResponse | null;
  clientId: string;
  onBalanceUpdate?: (info: { balance: number; currency: string; loginid: string } | null) => void;
  onStateUpdate?: (state: string) => void;
  onErrorUpdate?: (error: string) => void;
}

export default function WebSocketTester({ 
  tokenResponse, 
  clientId, 
  onBalanceUpdate,
  onStateUpdate,
  onErrorUpdate
}: WebSocketTesterProps) {
  const [wsState, setWsState] = useState<"disconnected" | "connecting" | "connected" | "authorized" | "error">("disconnected");
  const [errorDetails, setErrorDetails] = useState<string>("");

  // Share connection state changes dynamically with parent tier
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate(wsState);
    }
  }, [wsState, onStateUpdate]);

  useEffect(() => {
    if (onErrorUpdate) {
      onErrorUpdate(errorDetails);
    }
  }, [errorDetails, onErrorUpdate]);
  const [logMessages, setLogMessages] = useState<Array<{ type: "send" | "receive" | "status"; msg: any; time: string }>>([]);
  const [authData, setAuthData] = useState<DerivAuthorizeDetails | null>(null);
  const [activeAccount, setActiveAccount] = useState<DerivAccount | null>(null);
  
  // Flash tracking for accounts balance updates
  const [balanceFlash, setBalanceFlash] = useState<Record<string, { type: "green" | "red" | "neutral"; key: number }>>({});
  
  // Custom command text
  const [customCommand, setCustomCommand] = useState<string>(
    JSON.stringify({ get_settings: 1 }, null, 2)
  );

  // Clipboard copy tracking state
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  // Account balance refresh tracking state
  const [refreshingAccounts, setRefreshingAccounts] = useState<Record<string, boolean>>({});

  const copyToClipboard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering any row selection click events if any exist
    navigator.clipboard.writeText(id).then(() => {
      setCopiedStates((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [id]: false }));
      }, 2000);
    }).catch(() => {});
  };

  const refreshAccountBalance = (loginId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // crucial to prevent selecting the account or clicking row
    if (!socketRef.current || wsState !== "authorized") {
      appendLog("status", "Cannot refresh balance: WebSocket connection is offline or unauthorized.");
      return;
    }
    
    // Mark as refreshing
    setRefreshingAccounts(prev => ({ ...prev, [loginId]: true }));
    
    // Check if this is the currently authorized account
    if (authData && authData.loginid === loginId) {
      appendLog("status", `Forcing manual balance update for active account: ${loginId}...`);
      const req = { balance: 1 };
      appendLog("send", req);
      socketRef.current.send(JSON.stringify(req));
      
      // Stop animating after nice visual feedback
      setTimeout(() => {
        setRefreshingAccounts(prev => ({ ...prev, [loginId]: false }));
      }, 1500);
    } else {
      // It's a different account. To refresh, we can switch full workspace profile context if a token is available
      const accToken = getTokenForLoginid(loginId);
      if (accToken) {
        appendLog("status", `Requesting workspace context switch to refresh balance for ${loginId}...`);
        
        const targetAcc = authData.account_list?.find(a => a.loginid === loginId);
        if (targetAcc) {
          setActiveAccount(targetAcc);
        }
        
        const authRequest = { authorize: accToken };
        appendLog("send", authRequest);
        socketRef.current.send(JSON.stringify(authRequest));
        
        setTimeout(() => {
          setRefreshingAccounts(prev => ({ ...prev, [loginId]: false }));
        }, 1500);
      } else {
        appendLog("status", `❌ Cannot refresh ${loginId}: No available session token key found representing this account.`);
        setRefreshingAccounts(prev => ({ ...prev, [loginId]: false }));
      }
    }
  };

  const socketRef = useRef<WebSocket | null>(null);

  const token = tokenResponse?.access_token || "";

  // Helper to resolve accurate balance for an account
  const getAccountBalance = (acc: DerivAccount): number => {
    const isAuthorized = authData?.loginid === acc.loginid;
    if (isAuthorized && authData?.balance !== undefined) {
      return typeof authData.balance === "number" ? authData.balance : parseFloat(authData.balance || "0");
    }
    if (acc.balance !== undefined) {
      return typeof acc.balance === "number" ? acc.balance : parseFloat(String(acc.balance) || "0");
    }
    return 0;
  };

  // Helper to resolve the correct token for a login ID
  const getTokenForLoginid = (loginId: string): string => {
    if (!tokenResponse) return "";
    
    // Fallback if tokenResponse itself belongs to this loginid (or if PAT is used)
    if (tokenResponse.is_pat) {
      return tokenResponse.access_token;
    }
    
    // Search in tokenResponse keys (acct1 -> token1, acct2 -> token2 etc.)
    // Find key where value matches loginId
    const keys = Object.keys(tokenResponse);
    const acctKey = keys.find(key => key.startsWith("acct") && tokenResponse[key] === loginId);
    if (acctKey) {
      const idx = acctKey.replace("acct", "");
      const tokenKey = `token${idx}`;
      if (tokenResponse[tokenKey]) {
        return tokenResponse[tokenKey];
      }
    }
    
    // Otherwise fallback to main access_token
    return tokenResponse.access_token;
  };

  // Group and sum up balances by currency for Real and Virtual portfolios
  const getSummaries = () => {
    if (!authData?.account_list) return { real: [] as { currency: string; total: number }[], demo: [] as { currency: string; total: number }[] };

    const realTotals: Record<string, number> = {};
    const demoTotals: Record<string, number> = {};

    authData.account_list.forEach((acc) => {
      const bal = getAccountBalance(acc);
      const curr = (acc.currency || "USD").toUpperCase();
      const isVirtual = acc.is_virtual === 1 || acc.is_virtual === true || String(acc.is_virtual) === "true";

      if (isVirtual) {
        demoTotals[curr] = (demoTotals[curr] || 0) + bal;
      } else {
        realTotals[curr] = (realTotals[curr] || 0) + bal;
      }
    });

    return {
      real: Object.entries(realTotals).map(([currency, total]) => ({ currency, total })),
      demo: Object.entries(demoTotals).map(([currency, total]) => ({ currency, total }))
    };
  };

  const summaries = getSummaries();

  // Append new console logs
  const appendLog = (type: "send" | "receive" | "status", msg: any) => {
    const time = new Date().toLocaleTimeString();
    setLogMessages((prev) => [{ type, msg, time }, ...prev.slice(0, 49)]);
  };

  // Close active socket
  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setWsState("disconnected");
    setAuthData(null);
    setActiveAccount(null);
  };

  // Connect and Authenticate through the retrieved OAuth token
  const connectAndAuthorize = () => {
    if (!token) return;
    
    disconnectSocket();
    setWsState("connecting");
    setLogMessages([]);
    setErrorDetails("");

    const appId = clientId || "1010";
    const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${appId}`;
    
    appendLog("status", `Connection request dispatched to App ID: ${appId}...`);

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setWsState("connected");
        appendLog("status", "✓ TCP session active! Initiating OAuth sign-on challenge...");
        
        // Formulate and send the OAuth access token authorization
        const authRequest = { authorize: token };
        appendLog("send", authRequest);
        socket.send(JSON.stringify(authRequest));
      };

      socket.onmessage = (event) => {
        try {
          const response: WebSocketMessage = JSON.parse(event.data);
          appendLog("receive", response);

          if (response.error) {
            setWsState("error");
            setErrorDetails(response.error.message);
            appendLog("status", `API handshaking error: ${response.error.message}`);
          } else if (response.msg_type === "authorize" && response.authorize) {
            setWsState("authorized");
            
            // Ensure we have at least one account entry in the summary list fallback
            const parsedAuthorize = { ...response.authorize };
            if (!parsedAuthorize.account_list || parsedAuthorize.account_list.length === 0) {
              parsedAuthorize.account_list = [
                {
                  loginid: parsedAuthorize.loginid || "PAT-ACC",
                  currency: parsedAuthorize.currency || "USD",
                  is_virtual: parsedAuthorize.is_virtual === 1 || parsedAuthorize.is_virtual === true || String(parsedAuthorize.is_virtual) === "true",
                  balance: typeof parsedAuthorize.balance === "number" ? parsedAuthorize.balance : parseFloat(parsedAuthorize.balance || "0"),
                  account_category: "trading",
                  account_type: "standard"
                }
              ];
            } else {
              // Map the main authorized account's balance from the parent authorize object to its entry in account_list
              parsedAuthorize.account_list = parsedAuthorize.account_list.map((acc) => {
                if (acc.loginid === parsedAuthorize.loginid) {
                  return {
                    ...acc,
                    balance: typeof parsedAuthorize.balance === "number" ? parsedAuthorize.balance : parseFloat(parsedAuthorize.balance || "0")
                  };
                }
                return acc;
              });
            }
            
            setAuthData(parsedAuthorize);
            appendLog("status", `✓ Authenticated successfully! User: ${parsedAuthorize.fullname}`);
            
            // Set the active selected account to matching authorized profile
            if (parsedAuthorize.account_list && parsedAuthorize.account_list.length > 0) {
              const mainAcc = parsedAuthorize.account_list.find(a => a.loginid === parsedAuthorize.loginid) || parsedAuthorize.account_list[0];
              setActiveAccount(mainAcc);
            }

            // Immediately subscribe to real-time balance updates
            const balanceRequest = { balance: 1, subscribe: 1 };
            appendLog("send", balanceRequest);
            socket.send(JSON.stringify(balanceRequest));
          } else if (response.msg_type === "balance" && response.balance) {
            const newBal = response.balance.balance;
            const targetLoginid = response.balance.loginid;

            // Determine if balance increased, decreased or remained neutral to flash color
            let flashType: "green" | "red" | "neutral" = "neutral";

            setAuthData((prev) => {
              if (!prev) return prev;

              const oldAcc = prev.account_list?.find(a => a.loginid === targetLoginid);
              let oldVal = 0;
              if (oldAcc) {
                oldVal = typeof oldAcc.balance === "number" ? oldAcc.balance : parseFloat(String(oldAcc.balance) || "0");
              } else if (prev.loginid === targetLoginid) {
                oldVal = parseFloat(prev.balance || "0");
              }

              const newValNum = typeof newBal === "number" ? newBal : parseFloat(String(newBal) || "0");
              if (newValNum > oldVal) {
                flashType = "green";
              } else if (newValNum < oldVal) {
                flashType = "red";
              }

              // Set/refresh flash state for target account loginid
              setBalanceFlash((prevFlashes) => ({
                ...prevFlashes,
                [targetLoginid]: {
                  type: flashType,
                  key: (prevFlashes[targetLoginid]?.key || 0) + 1
                }
              }));

              let updatedAccList = prev.account_list;
              if (updatedAccList) {
                updatedAccList = updatedAccList.map((acc) => {
                  if (acc.loginid === targetLoginid) {
                    return { ...acc, balance: newBal };
                  }
                  return acc;
                });
              }
              if (prev.loginid === targetLoginid) {
                return {
                  ...prev,
                  balance: String(newBal),
                  account_list: updatedAccList
                };
              }
              return {
                ...prev,
                account_list: updatedAccList
              };
            });

            setActiveAccount((prev) => {
              if (prev && prev.loginid === targetLoginid) {
                return { ...prev, balance: newBal };
              }
              return prev;
            });

            appendLog("status", `ⓘ Real-time Balance updated under ${targetLoginid}: ${newBal} ${response.balance.currency}`);
          }
        } catch (err: any) {
          appendLog("status", `Error processing trace frames: ${err.message}`);
        }
      };

      socket.onclose = () => {
        setWsState("disconnected");
        appendLog("status", "Connection completed and closed.");
      };

      socket.onerror = (err) => {
        setWsState("error");
        setErrorDetails("Network connection failed.");
        appendLog("status", "Connection socket frame error.");
      };
    } catch (err: any) {
      setWsState("error");
      setErrorDetails(err.message);
      appendLog("status", `Error booting WebSocket Client: ${err.message}`);
    }
  };

  // Automatically connect and authorize when token changes/is ready
  useEffect(() => {
    if (token) {
      connectAndAuthorize();
    } else {
      disconnectSocket();
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [token, clientId]);

  // Sync the active selected account's balance back to the parent component
  useEffect(() => {
    if (onBalanceUpdate && activeAccount) {
      const activeBal = getAccountBalance(activeAccount);
      onBalanceUpdate({
        balance: activeBal,
        currency: activeAccount.currency || "USD",
        loginid: activeAccount.loginid
      });
    } else if (onBalanceUpdate && !activeAccount && authData) {
      const mainBalNum = typeof authData.balance === "number" ? authData.balance : parseFloat(authData.balance || "0");
      onBalanceUpdate({
        balance: mainBalNum,
        currency: authData.currency || "USD",
        loginid: authData.loginid || "PAT-ACC"
      });
    } else if (onBalanceUpdate && !tokenResponse) {
      onBalanceUpdate(null);
    }
  }, [activeAccount, authData, onBalanceUpdate, tokenResponse]);

  // Send a custom raw request
  const sendRawCommand = () => {
    if (wsState !== "authorized" || !socketRef.current) return;
    try {
      const parsed = JSON.parse(customCommand);
      appendLog("send", parsed);
      socketRef.current.send(JSON.stringify(parsed));
    } catch (err: any) {
      appendLog("status", `Compiling logic parsing failure: ${err.message}`);
    }
  };

  // Helper selectors
  const testCommandPreset = (preset: object) => {
    setCustomCommand(JSON.stringify(preset, null, 2));
  };

  return (
    <div id="websocket-explorer" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Profil details side */}
      <div className="lg:col-span-6 space-y-6">
        <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Ambient blur */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ff444f]/5 blur-[70px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-[#ff444f]" />
                <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                  LIVE CONNECTION MANAGER
                </h2>
              </div>
              
              {!token ? (
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">LOCK STATE STATUS</span>
              ) : wsState === "disconnected" ? (
                <button
                  onClick={connectAndAuthorize}
                  type="button"
                  className="text-[10px] bg-[#ff444f] hover:bg-[#ff444f]/95 text-white font-black px-4 py-2 rounded-xl transition-all shadow-[0_4px_15px_rgba(255,68,79,0.3)] active:scale-95 text-center flex items-center gap-1.5 uppercase tracking-wide"
                >
                  <RefreshCw className="h-3 w-3" /> Connect & Open
                </button>
              ) : (
                <button
                  onClick={disconnectSocket}
                  type="button"
                  className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 font-bold border border-white/10 px-4 py-2 rounded-xl active:scale-95 transition-all text-center uppercase tracking-wide"
                >
                  Close Session
                </button>
              )}
            </div>

            {!token ? (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-black/25">
                <WifiOff className="h-8 w-8 mx-auto mb-3 text-slate-600" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting Profile Login</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Connect to your Dev account on side configuration first. Once authorized, real-time sync starts automatically!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* WS State Alert Line */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  wsState === "authorized" 
                    ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                    : wsState === "error" 
                    ? "bg-[#ff444f]/5 border-[#ff444f]/10 text-red-400" 
                    : "bg-blue-500/5 border-blue-500/10 text-blue-400"
                }`}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`h-2 w-2 rounded-full ${
                      wsState === 'authorized' ? 'bg-emerald-400 animate-ping' : 'bg-blue-400 animate-pulse'
                    }`} />
                    <span className="font-bold tracking-wider uppercase font-mono text-[10px]">
                      WS: {wsState}
                    </span>
                  </div>
                  {errorDetails && <span className="text-[11px] font-mono truncate">{errorDetails}</span>}
                </div>

                {/* Profile Results rendering */}
                {authData ? (
                  <div className="space-y-5">
                    <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{authData.fullname}</h3>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{authData.email}</p>
                        </div>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-3 py-1 font-bold">
                          {authData.country ? authData.country.toUpperCase() : "INTL"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                        <div>
                          <span className="block text-[9px] text-slate-500 font-mono tracking-widest font-bold">CURRENCY</span>
                          <span className="text-sm font-black font-mono text-white">{authData.currency || "USD"}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-500 font-mono tracking-widest font-bold">REALTIME BALANCE</span>
                          <span className="text-sm font-black font-mono text-emerald-400">
                            {parseFloat(authData.balance || "0").toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Accounts Balance Summary Table */}
                    <div className="bg-gradient-to-br from-black/50 to-black/35 border border-white/5 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-white/5">
                        <Wallet className="h-4 w-4 text-[#ff444f]" />
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider font-mono">
                          Accounts Balances Summary
                        </h4>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-[11px] leading-relaxed">
                          <thead>
                            <tr className="border-b border-white/5 text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                              <th className="py-2">Account ID</th>
                              <th className="py-2">Type</th>
                              <th className="py-2">Currency</th>
                              <th className="py-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {authData.account_list?.map((acc) => {
                              const bal = getAccountBalance(acc);
                              const isVirtual = acc.is_virtual === 1 || acc.is_virtual === true || String(acc.is_virtual) === "true";
                              const isActive = activeAccount?.loginid === acc.loginid;
                              
                              const flash = balanceFlash[acc.loginid];
                              const animationClass = flash
                                ? flash.type === "green"
                                  ? "animate-flash-green"
                                  : flash.type === "red"
                                  ? "animate-flash-red"
                                  : "animate-flash-neutral"
                                : "";

                              return (
                                <tr key={acc.loginid} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                  <td className="py-2.5 font-bold text-slate-300 flex items-center gap-1.5">
                                    <span>{acc.loginid}</span>
                                    <button
                                      onClick={(e) => copyToClipboard(acc.loginid, e)}
                                      title={`Copy Account ID: ${acc.loginid}`}
                                      className="p-1 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded transition-all shrink-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 ml-0.5"
                                      aria-label="Copy Account Login ID"
                                    >
                                      {copiedStates[acc.loginid] ? (
                                        <Check className="h-3 w-3 text-emerald-400 animate-pulse" />
                                      ) : (
                                        <Copy className="h-3 w-3 transition-transform active:scale-75" />
                                      )}
                                    </button>

                                    <button
                                      onClick={(e) => refreshAccountBalance(acc.loginid, e)}
                                      disabled={wsState !== "authorized"}
                                      title={`Sync/Refresh balance for ${acc.loginid}`}
                                      className="p-1 hover:bg-white/10 text-slate-500 hover:text-emerald-400 rounded transition-all shrink-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 ml-0.5 disabled:opacity-35 disabled:cursor-not-allowed"
                                      aria-label="Refresh Account Balance"
                                    >
                                      <RefreshCw className={`h-3 w-3 ${refreshingAccounts[acc.loginid] ? "animate-spin text-emerald-400" : "transition-transform active:rotate-180"}`} />
                                    </button>

                                    {isActive && (
                                      <span className="text-[8px] bg-[#ff444f]/15 text-[#ff444f] border border-[#ff444f]/30 px-1 py-0.2 rounded font-sans font-black uppercase tracking-wider shrink-0">
                                        ACTIVE
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${
                                      isVirtual 
                                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25" 
                                        : "text-amber-400 bg-amber-500/10 border border-amber-500/25"
                                    }`}>
                                      {isVirtual ? "Demo" : "Real"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-slate-400 font-bold uppercase">{acc.currency || "USD"}</td>
                                  <td 
                                    key={`${acc.loginid}-bal-${flash?.key || 0}`}
                                    className={`py-2.5 text-right font-bold transition-all px-2 rounded-lg ${
                                      animationClass || (isVirtual ? "text-emerald-400" : "text-slate-200")
                                    }`}
                                  >
                                    {bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Portfolio totals calculation summary */}
                      {(summaries.real.length > 0 || summaries.demo.length > 0) && (
                        <div className="pt-3 border-t border-white/5 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Coins className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">
                              Aggregated Portfolio Totals
                            </span>
                          </div>
                          
                          <div className="bg-black/45 p-3 rounded-xl border border-white/5 space-y-2">
                            {summaries.real.length > 0 && (
                              <div className="flex flex-wrap items-center justify-between text-[11px] font-mono">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-amber-500" /> Real Balance Summarized:
                                </span>
                                <div className="flex gap-3">
                                  {summaries.real.map(({ currency, total }) => (
                                    <span key={currency} className="text-amber-400 font-black">
                                      {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small className="text-[9px] text-slate-400">{currency}</small>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {summaries.demo.length > 0 && (
                              <div className="flex flex-wrap items-center justify-between text-[11px] font-mono">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-emerald-500" /> Demo Balance Summarized:
                                </span>
                                <div className="flex gap-3">
                                  {summaries.demo.map(({ currency, total }) => (
                                    <span key={currency} className="text-emerald-400 font-black">
                                      {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small className="text-[9px] text-slate-400">{currency}</small>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Accounts Tab lists */}
                    <div className="space-y-2">
                      <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available Trading Profiles</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {authData.account_list?.map((acc) => (
                          <div
                            key={acc.loginid}
                            onClick={() => {
                              setActiveAccount(acc);
                              const accToken = getTokenForLoginid(acc.loginid);
                              if (accToken && socketRef.current && wsState === "authorized" && acc.loginid !== authData.loginid) {
                                appendLog("status", `Requesting to switch workspace profile context to ${acc.loginid}...`);
                                const authRequest = { authorize: accToken };
                                appendLog("send", authRequest);
                                socketRef.current.send(JSON.stringify(authRequest));
                              }
                            }}
                            className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                              activeAccount?.loginid === acc.loginid
                                ? "bg-gradient-to-r from-[#ff444f]/10 via-[#ff444f]/5 to-transparent border-[#ff444f]/40 shadow-inner"
                                : "bg-black/30 border-white/5 hover:border-white/20"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-mono font-bold text-white tracking-wider">
                                {acc.loginid}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
                                <span>CLASS: {acc.account_category?.toUpperCase()}</span>
                                <span>•</span>
                                <span>TYPE: {acc.account_type?.toUpperCase()}</span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md uppercase border ${
                                acc.is_virtual 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              }`}>
                                {acc.is_virtual ? "Demo Acc" : "Real Acc"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center border border-white/5 bg-black/20 rounded-xl">
                    <p className="text-[11px] text-slate-500">Connecting will auto-evaluate the OAuth <code>authorize</code> challenge.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Custom JSON Sandbox Query section */}
        <div className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/5 blur-[70px] rounded-full pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <Terminal className="h-4 w-4 text-slate-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                API EXPLORER SANDBOX
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={wsState !== "authorized"}
                  onClick={() => testCommandPreset({ get_settings: 1 })}
                  type="button"
                  className="text-[9px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 px-2.5 py-1 px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all uppercase tracking-wider"
                >
                  get_settings
                </button>
                <button
                  disabled={wsState !== "authorized"}
                  onClick={() => testCommandPreset({ statement: 1, limit: 5 })}
                  type="button"
                  className="text-[9px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 px-2.5 py-1 px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all uppercase tracking-wider"
                >
                  statement history
                </button>
                <button
                  disabled={wsState !== "authorized"}
                  onClick={() => testCommandPreset({ ping: 1 })}
                  type="button"
                  className="text-[9px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 px-2.5 py-1 px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all uppercase tracking-wider"
                >
                  ping sync
                </button>
                <button
                  disabled={wsState !== "authorized"}
                  onClick={() => testCommandPreset({ ticks: "R_100" })}
                  type="button"
                  className="text-[9px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 px-2.5 py-1 px-3 py-1.5 rounded-lg disabled:opacity-30 transition-all uppercase tracking-wider"
                >
                  subscribe ticks (R_100)
                </button>
              </div>

              <textarea
                disabled={wsState !== "authorized"}
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                className="w-full h-24 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-blue-300 placeholder-slate-700 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-semibold disabled:opacity-30"
              />

              <button
                onClick={sendRawCommand}
                disabled={wsState !== "authorized"}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 disabled:border-white/5 text-white border border-blue-500/20 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_10px_25px_rgba(37,99,235,0.15)] active:scale-[0.99]"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send JSON Sandbox Frame</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal log console */}
      <div className="lg:col-span-6 h-full">
        <div className="bg-black/60 border border-white/10 rounded-3xl shadow-2xl h-full flex flex-col overflow-hidden relative min-h-[500px]">
          {/* Accent glow corner */}
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ff444f]/5 blur-[70px] rounded-full pointer-events-none"></div>

          {/* Header text */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#ff444f] animate-pulse" />
              <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase font-mono">
                LIVE HANDSHAKE MONITOR
              </span>
            </div>
            <button
              onClick={() => setLogMessages([])}
              className="text-[9px] hover:text-[#ff444f] text-slate-500 border border-white/5 hover:border-white/10 bg-white/5 px-2.5 py-1 rounded-md uppercase font-bold tracking-wider transition-colors"
            >
              Clear Buffer
            </button>
          </div>

          {/* Console feed view */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-[10px] max-h-[550px] lg:max-h-[640px] select-all relative z-10 scrollbar-thin">
            {logMessages.length === 0 ? (
              <div className="text-center text-slate-600 py-32 italic uppercase tracking-widest text-[9px] font-bold">
                Logs will render transactions live...
              </div>
            ) : (
              logMessages.map((log, idx) => (
                <div key={idx} className="border-b border-white/5 pb-3">
                  <div className="flex items-center justify-between mb-1.5 text-[9px]">
                    <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                      log.type === 'send' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      log.type === 'receive' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-white/5 text-slate-400 border border-white/5'
                    }`}>
                      {log.type === 'send' ? '→ OUTGOING' : log.type === 'receive' ? '← INCOMING' : 'ⓘ STATUS'}
                    </span>
                    <span className="text-slate-600 font-bold">{log.time}</span>
                  </div>
                  <pre className="text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto bg-black/40 p-3 rounded-xl border border-white/5">
                    {typeof log.msg === "string" ? log.msg : JSON.stringify(log.msg, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
