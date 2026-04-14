import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Globe, Smartphone, Lock, User, ArrowRight, CheckCircle2, Phone, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false);
  
  // Standard Email/Password Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  
  // Phone OTP Auth
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user && !authLoading) {
      if (profile?.approval_status === 'APPROVED') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/pending', { replace: true });
      }
    }
  }, [user, profile, authLoading, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // Navigation is handled safely by the useEffect above once AuthContext updates
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } }
        });
        if (signUpError) throw signUpError;
        // Navigation safely forced for brand new users to prevent DB race-conditions
        navigate('/pending');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
      setLoading(false); // Only stop loading if there is an error. On success, we want it to stay 'Processing...' until the unmount.
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!otpSent) {
        // Send OTP
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
        setOtpSent(true);
      } else {
        // Verify OTP
        const { error } = await supabase.auth.verifyOtp({ phone, token: otpCode, type: 'sms' });
        if (error) throw error;
        // Navigation handled by useEffect
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during phone authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/pending` }
    });
    if (error) setError(error.message);
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between p-6 h-full flex-1 gap-12 pt-24">
      {/* Left side - Hero Copy */}
      <motion.div 
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full md:w-1/2 flex flex-col gap-6"
      >
        <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight leading-tight">
          Next Generation <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-500">
            IT Consulting.
          </span>
        </h2>
        <p className="text-lg md:text-xl text-slate-400 max-w-lg leading-relaxed">
          Leap IT provides enterprise-grade infrastructure and bespoke software solutions. Join our exclusive client portal to get started. 
        </p>
        <div className="flex gap-4 mt-4 text-sm text-slate-500">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-500"/> Enterprise Security</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-500"/> 24/7 Support</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-500"/> Custom Architecture</div>
        </div>
      </motion.div>

      {/* Right side - Login/Register Card */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="w-full md:w-[450px]"
      >
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[120px] bg-brand-500/10 blur-[60px] pointer-events-none"/>

          <h3 className="text-2xl font-semibold mb-2 text-white relative z-10 flex justify-between items-center">
            {isPhoneMode ? 'Phone Access' : (isLogin ? 'Welcome back' : 'Request Access')}
            {isPhoneMode && (
              <button type="button" onClick={() => {setIsPhoneMode(false); setError(null)}} className="text-xs text-brand-400 hover:text-brand-300 font-medium">Use Email</button>
            )}
          </h3>
          <p className="text-sm text-slate-400 mb-6 relative z-10">
            {isPhoneMode 
              ? (otpSent ? 'Enter the 6-digit code sent to your phone.' : 'Enter your phone number to receive a secure code.')
              : (isLogin ? 'Enter your credentials to access your dashboard.' : 'Registration requires admin approval.')}
          </p>

          {isPhoneMode ? (
             <form onSubmit={handlePhoneAuth} className="flex flex-col gap-4 relative z-10">
                {!otpSent ? (
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="tel"
                      placeholder="+15550000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                      required
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                      required
                    />
                  </div>
                )}
                
                {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 group mt-2"
                >
                  {loading ? 'Processing...' : (otpSent ? 'Verify Code' : 'Send Code')}
                  {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
             </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 relative z-10">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    required
                  />
                </div>
              )}
              
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 group mt-2"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Submit Request')}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>

              {isLogin && !loading && (
                 <div className="text-center mt-2">
                    <button 
                       type="button" 
                       onClick={() => alert("Access Recovery requires Administrative override. Please ping the Leap IT Support Administrator on Slack or Teams to issue a temporary password.")}
                       className="text-xs text-slate-500 hover:text-brand-400 transition-colors"
                    >
                       Forgot password?
                    </button>
                 </div>
              )}
            </form>
          )}

          <div className="my-6 flex items-center gap-3 relative z-10">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-xs text-slate-500 uppercase font-medium tracking-wider">Or continue with</span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>

          <div className="grid grid-cols-3 gap-3 relative z-10">
            <button type="button" onClick={() => handleOAuth('github')} className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-950/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-medium text-slate-300">GitHub</span>
            </button>
            <button type="button" onClick={() => handleOAuth('google')} className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-950/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-xs font-medium text-slate-300">Google</span>
            </button>
            <button type="button" onClick={() => { setIsPhoneMode(true); setError(null); }} className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-950/50 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors">
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-xs font-medium text-slate-300">Phone</span>
            </button>
          </div>

          {!isPhoneMode && (
            <p className="text-center text-sm text-slate-500 mt-8 relative z-10">
              {isLogin ? "Don't have access? " : "Already approved? "}
              <button 
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(null); }}
                className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                {isLogin ? 'Register here' : 'Log in instead'}
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
