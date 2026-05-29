import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  DollarSign, 
  Clock, 
  Activity, 
  ShieldAlert, 
  CheckCircle, 
  Coins, 
  Flame, 
  Target, 
  CornerDownRight, 
  ArrowRight,
  RefreshCw,
  Award,
  CircleDot
} from "lucide-react";
import { DerivAccount } from "../types";

interface QuickTradeProps {
  wsState: string;
  activeAccount: DerivAccount | null;
  accountsList: DerivAccount[];
  onSwitchAccount: (loginid: string) => void;
  onPlaceTrade: (contractPayload: any) => void;
  tradeState: "idle" | "placing" | "purchased" | "running" | "won" | "lost" | "error";
  tradeError: string;
  purchaseReceipt: any;
  contractProgress: any;
  onResetTradeState: () => void;
}

export default function QuickTrade({
  wsState,
  activeAccount,
  accountsList,
  onSwitchAccount,
  onPlaceTrade,
  tradeState,
  tradeError,
  purchaseReceipt,
  contractProgress,
  onResetTradeState
}: QuickTradeProps) {
  // Trade setup configurations
  const [symbol, setSymbol] = useState<string>("R_100");
  const [contractType, setContractType] = useState<"RISE_FALL" | "MATCH_DIFF" | "EVEN_ODD">("RISE_FALL");
  const [stake, setStake] = useState<number>(10);
  const [duration, setDuration] = useState<number>(5); // 5 Ticks default
  const [prediction, setPrediction] = useState<number>(5); // digit prediction default

  const symbols = [
    { value: "R_10", label: "Volatility 10 Index", desc: "Steady, gentle tick movements" },
    { value: "R_25", label: "Volatility 25 Index", desc: "Moderate market liquidity transitions" },
    { value: "R_50", label: "Volatility 50 Index", desc: "Active mid-frequency candles" },
    { value: "R_75", label: "Volatility 75 Index", desc: "High price action surges" },
    { value: "R_100", label: "Volatility 100 Index", desc: "Maximum extreme volatility index" },
    { value: "RDBEAR", label: "Bear Market Index", desc: "Weighted bearish trend index" },
    { value: "RDBULL", label: "Bull Market Index", desc: "Weighted bullish trend index" },
  ];

  const handleAdjustStake = (amount: number) => {
    setStake((prev) => Math.max(1, +(prev + amount).toFixed(2)));
  };

  const handleAdjustDuration = (amount: number) => {
    setDuration((prev) => Math.min(10, Math.max(1, prev + amount)));
  };

  const executeTradePlacement = (direction: "RISE" | "FALL" | "MATCH" | "DIFF" | "EVEN" | "ODD") => {
    if (wsState !== "authorized" || !activeAccount) return;

    // Map high level visual direction to API contract_type values
    let apiContractType = "CALL";
    if (contractType === "RISE_FALL") {
      apiContractType = direction === "RISE" ? "CALL" : "PUT";
    } else if (contractType === "MATCH_DIFF") {
      apiContractType = direction === "MATCH" ? "DIGITMATCH" : "DIGITDIFF";
    } else if (contractType === "EVEN_ODD") {
      apiContractType = direction === "EVEN" ? "DIGITEVEN" : "DIGITODD";
    }

    const payload: any = {
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: "stake",
        contract_type: apiContractType,
        currency: activeAccount.currency || "USD",
        duration: duration,
        duration_unit: "t", // forces tick based trade
        symbol: symbol,
      }
    };

    // Include prediction slider value for matches/diffs
    if (contractType === "MATCH_DIFF") {
      payload.parameters.barrier = String(prediction);
    }

    onPlaceTrade(payload);
  };

  const isTradeDisabled = wsState !== "authorized" || tradeState === "placing" || tradeState === "running" || tradeState === "purchased";

  return (
    <div id="quick-trade-desk" className="relative bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md overflow-hidden animate-fade-in">
      {/* Dynamic graphic backgrounds */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#ff444f]/5 blur-[90px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 space-y-6">
        {/* Desk Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#ff444f]/10 rounded-xl border border-[#ff444f]/20">
              <Flame className="h-4 w-4 text-[#ff444f] animate-pulse" />
            </div>
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                QUICK TRADE DESK
              </h2>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider">
                CRYPTOGRAPHIC HIGH-FREQUENCY TICK CONTROLLER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold uppercase text-slate-500">ENGINE STATUS:</span>
            <span className={`text-[9px] font-black uppercase font-mono px-2 py-0.5 rounded ${
              wsState === "authorized" 
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 animate-pulse" 
                : "bg-white/5 text-slate-500 border border-white/5"
            }`}>
              {wsState === "authorized" ? "LIVE-READY" : "AWAITING AUTH"}
            </span>
          </div>
        </div>

        {/* Trade State Engine Visualizer */}
        {tradeState !== "idle" && (
          <div className="p-5 bg-black/45 border border-white/5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-widest text-[#ff444f] uppercase font-mono flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 animate-spin text-[#ff444f]" /> Active Order Handshake
              </span>
              
              {(tradeState === "won" || tradeState === "lost" || tradeState === "error") && (
                <button
                  onClick={onResetTradeState}
                  className="text-[9px] font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/5 transition-colors uppercase tracking-wider font-mono flex items-center gap-1"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Clear Engine
                </button>
              )}
            </div>

            {/* Placing State */}
            {tradeState === "placing" && (
              <div className="py-6 text-center space-y-2">
                <RefreshCw className="h-8 w-8 text-[#ff444f] mx-auto animate-spin" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Transmitting Order Payload</h4>
                <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Broadcasting cryptographic hash values of contract buy call under selected active profile.
                </p>
              </div>
            )}

            {/* Error State */}
            {tradeState === "error" && (
              <div className="py-4 space-y-2 text-center bg-[#ff444f]/5 border border-[#ff444f]/15 rounded-xl">
                <ShieldAlert className="h-7 w-7 text-[#ff444f] mx-auto" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Purchase Execution Failed</h4>
                <p className="text-[10px] text-red-400 font-mono px-4 leading-relaxed breakdown-words">
                  {tradeError || "An unexpected error disrupted contract acquisition."}
                </p>
              </div>
            )}

            {/* Purchased/Running State */}
            {(tradeState === "purchased" || tradeState === "running") && purchaseReceipt && (
              <div className="space-y-4">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <CircleDot className="h-2 w-2 text-blue-400 animate-ping" />
                    <span className="text-[8px] font-mono font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded">
                      Executing
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h5 className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Acquired Contract Details</h5>
                    <p className="text-xs font-bold text-white font-serif tracking-tight leading-normal">
                      {purchaseReceipt.longcode}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-3 text-[10px] font-mono">
                    <div>
                      <span className="block text-[8px] text-slate-500 font-bold uppercase">Contract ID</span>
                      <span className="font-bold text-slate-300">{purchaseReceipt.contract_id}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-500 font-bold uppercase">Invested/Stake</span>
                      <span className="font-bold text-amber-400">${purchaseReceipt.buy_price}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-slate-500 font-bold uppercase">Potential Payout</span>
                      <span className="font-bold text-[#ff444f]">${purchaseReceipt.payout}</span>
                    </div>
                  </div>
                </div>

                {/* Tic-by-tick real time countdown tracks */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                    <span className="text-slate-400 uppercase">Tick Sequence Progression:</span>
                    <span className="text-white bg-[#ff444f]/20 border border-[#ff444f]/30 px-2 py-0.5 rounded animate-pulse">
                      {contractProgress?.tick_count !== undefined ? `Tick ${contractProgress.tick_count} of ${duration}` : `Awaiting initial tick...`}
                    </span>
                  </div>

                  {/* Tick progress indicators bar */}
                  <div className="grid h-1.5 rounded-full bg-white/5 overflow-hidden" style={{ gridTemplateColumns: `repeat(${duration}, minmax(0, 1fr))` }}>
                    {Array.from({ length: duration }).map((_, idx) => {
                      const tickIndex = idx + 1;
                      const hasFired = contractProgress?.tick_count >= tickIndex;
                      const isCurrent = contractProgress?.tick_count === tickIndex;
                      return (
                        <div 
                          key={idx} 
                          className={`h-full border-r border-black/30 transition-all ${
                            isCurrent ? "bg-[#ff444f] animate-pulse" : hasFired ? "bg-emerald-400/80" : "bg-white/5"
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Real-time Tick Price feeds */}
                  {contractProgress?.tick_stream ? (
                    <div className="flex flex-wrap gap-2.5 items-center justify-center">
                      {contractProgress.tick_stream.map((tick: any, index: number) => {
                        const isLast = index === contractProgress.tick_stream.length - 1;
                        return (
                          <div 
                            key={index} 
                            className={`px-2.5 py-1 rounded bg-black/55 border font-mono text-[10px] font-bold ${
                              isLast 
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shadow-[0_0_8px_rgba(16,185,129,0.1)] scale-110" 
                                : "border-white/5 text-slate-500"
                            }`}
                          >
                            T{tick.count}: {parseFloat(tick.raw || "0").toFixed(tick.raw && tick.raw.includes(".") ? tick.raw.split(".")[1].length : 2)}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[9px] text-center text-slate-600 font-mono italic uppercase py-1">
                      Connecting live ticker stream. Resolves immediately when duration is met.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Resolved - Won Outcome Panel */}
            {tradeState === "won" && contractProgress && (
              <div className="bg-emerald-500/10 border-2 border-emerald-400/40 p-6 rounded-2xl space-y-4 text-center animate-bounce-short relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"></div>
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/10 blur-xl rounded-full"></div>
                
                <Award className="h-10 w-10 text-emerald-400 mx-auto animate-pulse" />
                
                <div className="space-y-1">
                  <h3 className="text-xs font-black tracking-widest text-emerald-400 uppercase font-mono">
                    CONTRACT PURCHASE WON!
                  </h3>
                  <div className="text-3xl font-black text-white font-mono flex items-center justify-center tracking-tight">
                    <span className="text-emerald-400 font-bold">$</span>
                    {parseFloat(String(contractProgress.profit || "0")).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-sm mx-auto font-mono">
                    The contract target threshold settled. Entry: <span className="text-white font-bold">{contractProgress.entry_spot}</span> • Exit: <span className="text-emerald-400 font-bold">{contractProgress.exit_spot}</span>.
                  </p>
                </div>

                <div className="bg-black/35 py-2.5 px-4 rounded-xl border border-emerald-500/10 text-[9px] font-mono text-emerald-300 flex items-center justify-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" /> Handshake Resolved ID: {contractProgress.contract_id || purchaseReceipt?.contract_id}
                </div>
              </div>
            )}

            {/* Resolved - Lost Outcome Panel */}
            {tradeState === "lost" && contractProgress && (
              <div className="bg-[#ff444f]/10 border-2 border-[#ff444f]/30 p-6 rounded-2xl space-y-4 text-center animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600"></div>
                
                <TrendingDown className="h-10 w-10 text-red-400 mx-auto" />
                
                <div className="space-y-1">
                  <h3 className="text-xs font-black tracking-widest text-[#ff444f] uppercase font-mono">
                    CONTRACT OUTOF_BOUNDS (LOSS)
                  </h3>
                  <div className="text-2xl font-black text-slate-200 font-mono flex items-center justify-center tracking-tight">
                    <span className="text-red-400 font-normal">-${stake}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-sm mx-auto font-mono">
                    Contract settled outside of target parameters. Entry: <span className="text-white font-bold">{contractProgress.entry_spot}</span> • Exit: <span className="text-red-400 font-bold">{contractProgress.exit_spot}</span>.
                  </p>
                </div>

                <div className="bg-black/35 py-2 px-4 rounded-xl border border-[#ff444f]/10 text-[9px] font-mono text-[#ff444f]/80">
                  Transaction ID: {contractProgress.contract_id || purchaseReceipt?.contract_id}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Active profile details preview */}
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase block">
              Active Trade Profile
            </span>
            {activeAccount ? (
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${
                  activeAccount.is_virtual ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                }`} />
                <span className="text-sm font-black font-mono text-white">
                  {activeAccount.loginid}
                </span>
                <span className={`text-[8px] font-black uppercase font-mono px-1 rounded border leading-none ${
                  activeAccount.is_virtual 
                    ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                    : "text-amber-400 border-amber-500/20 bg-amber-500/10"
                }`}>
                  {activeAccount.is_virtual ? "Demo" : "Real"}
                </span>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-500">Awaiting Auth Selection</span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase block">
              Active Available Balance
            </span>
            {activeAccount ? (
              <div className="text-md font-black font-mono text-emerald-400">
                {typeof activeAccount.balance === "number" 
                  ? activeAccount.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : parseFloat(String(activeAccount.balance || "0")).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                } <span className="text-xs text-slate-400 uppercase font-bold">{activeAccount.currency || "USD"}</span>
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-500">$0.00</span>
            )}
          </div>
        </div>

        {/* Direct Account Switcher Select Option */}
        {accountsList.length > 1 && (
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Workspace Profile Switcher
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {accountsList.map((acc) => {
                const isActive = activeAccount?.loginid === acc.loginid;
                return (
                  <button
                    key={acc.loginid}
                    disabled={isTradeDisabled}
                    onClick={() => onSwitchAccount(acc.loginid)}
                    className={`py-2 px-3 text-left border rounded-xl font-mono text-[11px] leading-tight transition-all flex flex-col justify-center gap-0.5 ${
                      isActive 
                        ? "bg-[#ff444f]/10 border-[#ff444f]/40 text-white cursor-default" 
                        : "bg-black/30 border-white/5 hover:border-white/20 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="font-bold font-mono tracking-wider">{acc.loginid}</span>
                    <span className="text-[8px] text-slate-500 font-bold tracking-normal uppercase">
                      {acc.is_virtual ? "Demo Acc" : "Real Acc"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Trade configurations form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Asset Symbol selection */}
          <div className="space-y-1.5 col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Underlying Market Asset
            </label>
            <select
              disabled={isTradeDisabled}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff444f]/50 cursor-pointer font-bold select-none h-[42px]"
            >
              {symbols.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Trade contract type categorization select options */}
          <div className="space-y-1.5 col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Deriv Trade Contract Category
            </label>
            <select
              disabled={isTradeDisabled}
              value={contractType}
              onChange={(e) => setContractType(e.target.value as any)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#ff444f]/50 cursor-pointer font-bold select-none h-[42px]"
            >
              <option value="RISE_FALL">Rise / Fall Contract</option>
              <option value="MATCH_DIFF">Digits Match / Differs</option>
              <option value="EVEN_ODD">Digits Even / Odd</option>
            </select>
          </div>
        </div>

        {/* Numerical/Preset configurations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Stake selector Form */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Contract Stake (USD)
            </label>
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl p-1 h-[42px]">
              <button
                type="button"
                disabled={isTradeDisabled}
                onClick={() => handleAdjustStake(-1)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono font-bold flex items-center justify-center text-xs transition-colors shrink-0 disabled:opacity-25"
              >
                -1
              </button>
              <div className="flex-grow text-center text-xs font-black font-mono text-white flex items-center justify-center gap-0.5">
                <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                <input
                  type="number"
                  disabled={isTradeDisabled}
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, +parseFloat(e.target.value || "0").toFixed(2)))}
                  className="w-16 bg-transparent text-center outline-none select-all font-black text-white p-0 m-0 leading-none h-full border-none focus:ring-0 focus:outline-none"
                />
              </div>
              <button
                type="button"
                disabled={isTradeDisabled}
                onClick={() => handleAdjustStake(1)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono font-bold flex items-center justify-center text-xs transition-colors shrink-0 disabled:opacity-25"
              >
                +1
              </button>
            </div>
            {/* Quick stake presets helper links */}
            <div className="flex justify-between gap-1 mt-0.5">
              {[5, 10, 50, 100].map((num) => (
                <button
                  type="button"
                  key={num}
                  disabled={isTradeDisabled}
                  onClick={() => setStake(num)}
                  className={`text-[9.5px] font-mono leading-none bg-white/[0.03] border hover:bg-white/10 px-2 py-1 rounded transition-colors text-slate-400 hover:text-slate-200 ${
                    stake === num ? "border-[#ff444f]/30 text-[#ff444f] bg-[#ff444f]/5" : "border-white/5"
                  }`}
                >
                  ${num}
                </button>
              ))}
            </div>
          </div>

          {/* Tick duration Slider / Form */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Expiry Timer (Ticks)
            </label>
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl p-1 h-[42px]">
              <button
                type="button"
                disabled={isTradeDisabled}
                onClick={() => handleAdjustDuration(-1)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono font-bold flex items-center justify-center text-xs transition-colors shrink-0 disabled:opacity-25"
              >
                -1
              </button>
              <span className="flex-grow text-center text-xs font-black font-mono text-white flex items-center justify-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>{duration} Ticks</span>
              </span>
              <button
                type="button"
                disabled={isTradeDisabled}
                onClick={() => handleAdjustDuration(1)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono font-bold flex items-center justify-center text-xs transition-colors shrink-0 disabled:opacity-25"
              >
                +1
              </button>
            </div>
            {/* Quick durations presets helper links */}
            <div className="flex justify-between gap-1 mt-0.5">
              {[1, 3, 5, 10].map((num) => (
                <button
                  type="button"
                  key={num}
                  disabled={isTradeDisabled}
                  onClick={() => setDuration(num)}
                  className={`text-[9.5px] font-mono leading-none bg-white/[0.03] border hover:bg-white/10 px-2.5 py-1 rounded transition-colors text-slate-400 hover:text-slate-200 ${
                    duration === num ? "border-[#ff444f]/30 text-[#ff444f] bg-[#ff444f]/5" : "border-white/5"
                  }`}
                >
                  {num}T
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prediction Input Block - ONLY if Match/Diff consists as active state category */}
        {contractType === "MATCH_DIFF" && (
          <div className="p-4 bg-black/45 border border-white/5 rounded-2xl space-y-2.5 animate-slide-down">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-[#ff444f]" /> Digit Prediction Target
              </span>
              <span className="text-[#ff444f] font-black uppercase text-xs">
                Prediction: {prediction}
              </span>
            </div>

            <div className="flex gap-1 justify-between select-none">
              {Array.from({ length: 10 }).map((_, idx) => (
                <button
                  type="button"
                  key={idx}
                  disabled={isTradeDisabled}
                  onClick={() => setPrediction(idx)}
                  className={`w-8 h-8 rounded-lg transition-all font-mono font-black text-xs border ${
                    prediction === idx 
                      ? "bg-[#ff444f] border-[#ff444f] text-white shadow-[0_0_12px_rgba(255,68,79,0.35)] scale-110" 
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10"
                  }`}
                >
                  {idx}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buy Action Buttons container */}
        <div className="pt-2">
          {wsState !== "authorized" ? (
            <div className="text-center py-3 px-4 bg-white/5 border border-white/5 rounded-xl text-[11px] font-mono font-semibold tracking-wide text-slate-500">
              PLEASE AUTHORIZE ACTIVE PROFILE FIRST BEFORE PLACING TRADES
            </div>
          ) : (
            <div className="space-y-4">
              {contractType === "RISE_FALL" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Rise button */}
                  <button
                    onClick={() => executeTradePlacement("RISE")}
                    disabled={isTradeDisabled}
                    className="h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-emerald-500/20"
                  >
                    <TrendingUp className="h-4 w-4 shrink-0" />
                    <span>RISE (▲ CALL)</span>
                  </button>

                  {/* Fall button */}
                  <button
                    onClick={() => executeTradePlacement("FALL")}
                    disabled={isTradeDisabled}
                    className="h-14 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(239,68,68,0.2)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-red-500/20"
                  >
                    <TrendingDown className="h-4 w-4 shrink-0" />
                    <span>FALL (▼ PUT)</span>
                  </button>
                </div>
              )}

              {contractType === "MATCH_DIFF" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Matches button */}
                  <button
                    onClick={() => executeTradePlacement("MATCH")}
                    disabled={isTradeDisabled}
                    className="h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-emerald-500/20"
                  >
                    <Target className="h-4 w-4 shrink-0" />
                    <span>MATCH {prediction}</span>
                  </button>

                  {/* Differs button */}
                  <button
                    onClick={() => executeTradePlacement("DIFF")}
                    disabled={isTradeDisabled}
                    className="h-14 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(239,68,68,0.2)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-red-500/20"
                  >
                    <Activity className="h-4 w-4 shrink-0" />
                    <span>DIFF {prediction}</span>
                  </button>
                </div>
              )}

              {contractType === "EVEN_ODD" && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Even button */}
                  <button
                    onClick={() => executeTradePlacement("EVEN")}
                    disabled={isTradeDisabled}
                    className="h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-emerald-500/20"
                  >
                    <Coins className="h-4 w-4 shrink-0" />
                    <span>DIGIT EVEN</span>
                  </button>

                  {/* Odd button */}
                  <button
                    onClick={() => executeTradePlacement("ODD")}
                    disabled={isTradeDisabled}
                    className="h-14 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(239,68,68,0.2)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-red-500/20"
                  >
                    <Zap className="h-4 w-4 shrink-0" />
                    <span>DIGIT ODD</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
