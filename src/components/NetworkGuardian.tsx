import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

interface NetworkGuardianProps {
  children: ReactNode;
}

export default function NetworkGuardian({ children }: NetworkGuardianProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userIp, setUserIp] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const approvedIp = import.meta.env.VITE_APPROVED_NETWORK_IP;

  useEffect(() => {
    const verifyNetwork = async () => {
      try {
        // Fetch the public IP of the user trying to access the app
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) throw new Error('Failed to verify network identity');
        
        const data = await response.json();
        const currentIp = data.ip;
        setUserIp(currentIp);

        // If no approved IP is set in ENV, we act in permissive mode (open to all)
        // This prevents the app from bricking if the admin forgets to set the variable.
        if (!approvedIp) {
            console.warn("Network Guardian is running in permissive mode (no VITE_APPROVED_NETWORK_IP set).");
            setIsAuthorized(true);
            return;
        }

        // Compare the signatures
        if (currentIp === approvedIp) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          console.error(`Network Quarantine: Unauthorized IP detected (${currentIp}). App securely locked.`);
        }

      } catch (err: any) {
        setIsAuthorized(false);
        setErrorDetails(err.message || 'Network unreachable.');
      }
    };

    verifyNetwork();
  }, [approvedIp]);

  // Loading state while pinging registry (usually < 200ms)
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 z-0">
             <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-brand-900/20 blur-[120px] rounded-full pointer-events-none" />
             <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
         </div>
         <Loader2 className="w-10 h-10 text-brand-500 animate-spin z-10" />
         <p className="text-slate-400 mt-4 text-sm font-medium z-10 tracking-widest uppercase">Verifying Network Identity...</p>
      </div>
    );
  }

  // Network Lockout State
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Aggressive Red Warning Glow */}
        <div className="absolute flex items-center justify-center inset-0 pointer-events-none z-0">
            <div className="w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px]" />
        </div>
        
        <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-red-900/30 p-8 rounded-3xl shadow-2xl relative z-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-red-950/50 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Access Restricted</h1>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            You are attempting to access a secured corporate portal from an unauthorized network connection. 
          </p>

          <div className="bg-black/50 border border-slate-800 rounded-xl p-4 w-full mb-6 text-left">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-xs text-slate-500 font-mono">STATUS</span>
                 <span className="text-xs text-red-400 font-mono font-bold">LOCKED</span>
             </div>
             <div className="flex justify-between items-center mb-2">
                 <span className="text-xs text-slate-500 font-mono">YOUR IP</span>
                 <span className="text-xs text-slate-300 font-mono">{userIp || 'UNKNOWN'}</span>
             </div>
             <div className="flex justify-between items-center">
                 <span className="text-xs text-slate-500 font-mono">TARGET</span>
                 <span className="text-xs text-slate-300 font-mono">Leap IT Internal Network</span>
             </div>
             {errorDetails && (
                 <div className="mt-3 pt-3 border-t border-slate-800/50 text-xs text-red-500/70 font-mono">
                     ERR: {errorDetails}
                 </div>
             )}
          </div>

          <p className="text-xs text-slate-500">
            Please connect to the Leap IT office WiFi to proceed.
          </p>
        </div>
      </div>
    );
  }

  // Network Authorized: Render the website normally
  return <>{children}</>;
}
