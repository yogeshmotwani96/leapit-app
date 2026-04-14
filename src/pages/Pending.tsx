import { motion } from 'framer-motion';
import { Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Pending() {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 h-full text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-12 rounded-3xl shadow-2xl relative overflow-hidden w-full flex flex-col items-center"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[120px] bg-brand-500/10 blur-[60px] pointer-events-none"/>

        <div className="w-20 h-20 bg-brand-900/50 rounded-full flex items-center justify-center mb-6 relative z-10 border border-brand-500/30">
          <Clock className="w-10 h-10 text-brand-400" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-4 relative z-10">Request Pending Approval</h2>
        
        <p className="text-slate-400 text-lg max-w-md mb-8 relative z-10">
          Your registration has been successfully received. A Leap IT administrator will review your application shortly. You will receive an email once your account is approved.
        </p>

        <Link to="/auth" className="flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium transition-colors relative z-10">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </motion.div>
    </div>
  );
}
