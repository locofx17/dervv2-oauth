import { ShieldCheck, GraduationCap } from "lucide-react";

interface HeaderProps {
  isAuthenticated: boolean;
}

export default function Header({ isAuthenticated }: HeaderProps) {
  return (
    <header className="border-b border-white/5 bg-[#0a0b0e]/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-24 flex items-center justify-between">
        {/* Brand details */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#ff444f] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,68,79,0.3)]">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-[0.2em] text-white uppercase">
              Deriv <span className="text-[#ff444f]">Auth</span>
            </h1>
            <span className="text-[10px] text-slate-500 font-mono tracking-widest">
              OAUTH PKCE FLOW • V2.4.0
            </span>
          </div>
        </div>
        
        {/* Connection status and links */}
        <div className="flex items-center gap-6">
          <a 
            href="#instructions" 
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white uppercase tracking-wider transition-colors font-medium"
          >
            <GraduationCap className="h-4 w-4 text-[#ff444f]" />
            <span>Integration Manual</span>
          </a>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
              {isAuthenticated ? "Session Status" : "Server Connection"}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                isAuthenticated 
                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' 
                  : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              }`} />
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                isAuthenticated ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {isAuthenticated ? "AUTHORIZATION ACTIVE" : "AWAITING HANDSHAKE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
