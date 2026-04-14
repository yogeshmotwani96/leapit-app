import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, LayoutDashboard, Clock, Download, CheckCircle2, AlertCircle, Video, Upload, X, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { AttendanceLog } from '../types/attendance';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [log, setLog] = useState<AttendanceLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Privacy & Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showClockInConfirm, setShowClockInConfirm] = useState(false);
  const [updatingSetup, setUpdatingSetup] = useState(false);

  // Telemetry & Presence State
  const [presenceLogs, setPresenceLogs] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile) {
      loadTodayLog();
      loadPresenceLogs();
      if (!profile.has_setup_tracking) {
        setShowOnboarding(true);
      }
    }
  }, [profile]);

  const loadTodayLog = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setLog(data || null);
    } catch (err: any) {
      console.error('Error handling attendance:', err);
      if (err.message && (err.message.includes('relation') || err.code === '42P01' || err.message.includes('does not exist'))) {
        setDbError('The database table "attendance_logs" has not been created yet in Supabase.');
      } else {
        setDbError('Failed to load attendance logs.');
      }
    } finally {
      setLoadingLog(false);
    }
  };

  const loadPresenceLogs = async () => {
    if (!profile) return;
    try {
      // 1. Fetch latest snapshots
      const { data: presenceData } = await supabase
        .from('proof_of_presence')
        .select('*')
        .eq('user_id', profile.id)
        .order('timestamp', { ascending: false })
        .limit(3);

      setPresenceLogs(presenceData || []);

      // 2. Fetch latest activity pulse (heartbeat)
      const { data: activityPulse } = await supabase
        .from('activity_logs')
        .select('timestamp')
        .eq('user_id', profile.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 3. Determine last sync from either presence or activity
      const latestPresence = presenceData?.[0]?.timestamp;
      const latestActivity = activityPulse?.timestamp;

      if (latestPresence || latestActivity) {
        const pDate = latestPresence ? new Date(latestPresence) : new Date(0);
        const aDate = latestActivity ? new Date(latestActivity) : new Date(0);
        setLastSync(pDate > aDate ? pDate : aDate);
      }
    } catch (err) {
      console.error('Error loading presence logs:', err);
    }
  };

  const handleClockIn = async () => {
    if (!profile) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const newLog = {
        user_id: profile.id,
        date: today,
        time_in: new Date().toISOString()
      };
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(newLog)
        .select()
        .single();
      
      if (error) throw error;
      setLog(data);
      setShowClockInConfirm(false);
    } catch (err: any) {
      alert("Error clocking in: " + err.message);
    }
  };

  const completeSetup = async () => {
    if (!profile) return;
    setUpdatingSetup(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_setup_tracking: true })
        .eq('id', profile.id);
      
      if (error) throw error;
      setShowOnboarding(false);
      window.location.reload(); 
    } catch (err: any) {
      alert("Error updating setup status: " + err.message);
    } finally {
      setUpdatingSetup(false);
    }
  };

  const handleClockOut = async () => {
    if (!log) return;
    try {
      const timeOut = new Date().toISOString();
      const { data, error } = await supabase
        .from('attendance_logs')
        .update({ time_out: timeOut })
        .eq('id', log.id)
        .select()
        .single();

      if (error) throw error;
      setLog(data);
    } catch (err) {
      console.error('Error clocking out:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const formatDuration = (start: string, end: string | Date) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  };

  const downloadMyLogs = async () => {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', profile!.id)
      .order('date', { ascending: false });

    if (error || !data) {
      alert('Error fetching logs');
      return;
    }

    const headers = ['Date', 'Time In', 'Time Out', 'Total Time'];
    const rows = data.map(row => {
      const total = row.time_out ? formatDuration(row.time_in, row.time_out) : 'In Progress';
      const timeIn = new Date(row.time_in).toLocaleTimeString();
      const timeOut = row.time_out ? new Date(row.time_out).toLocaleTimeString() : '-';
      return [row.date, timeIn, timeOut, total];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'my_attendance_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVideoUpload = async () => {
    if (!videoFile || !profile) return;
    setUploading(true);
    try {
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const { error: storageError } = await supabase.storage
        .from('dashboard-videos')
        .upload(fileName, videoFile);
      if (storageError) throw storageError;

      const { data: publicUrlData } = supabase.storage
        .from('dashboard-videos')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('user_videos').insert({
        user_id: profile.id,
        title: videoFile.name,
        video_url: publicUrlData.publicUrl,
        file_path: fileName
      });
      if (dbError) throw dbError;
      alert('Video secured in your personal vault successfully!');
      setVideoFile(null);
    } catch (err: any) {
      alert("Error uploading video: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 pt-32 h-full flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl text-center mb-12"
      >
        <h2 className="text-4xl font-bold text-white mb-2">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h2>
        <p className="text-slate-400 text-lg mb-8">Access your IT services and manage your timesheet below.</p>

        {/* Telemetry Status Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
           <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest ${lastSync ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
              <div className={`w-2 h-2 rounded-full ${lastSync ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              Agent Status: {lastSync ? 'Connected' : 'Disconnected'}
           </div>
           {lastSync && (
             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                Last Heartbeat: {lastSync.toLocaleTimeString()}
             </span>
           )}
        </div>

        {/* Attendance Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 mb-8 text-left shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Clock className="w-48 h-48 text-brand-500 -mt-16 -mr-16" />
          </div>

          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
            <Clock className="w-5 h-5 text-brand-400" />
            Today's Attendance
          </h3>

          {loadingLog ? (
            <div className="h-24 flex items-center justify-center text-slate-500">
              Loading your logs...
            </div>
          ) : dbError ? (
            <div className="relative z-10 bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-medium mb-1">Database Error</p>
              <p className="text-red-400/80 text-sm">{dbError}</p>
            </div>
          ) : log ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              {/* Holder 1: Time In */}
              <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800 flex flex-col justify-center">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Time In</p>
                <p className="text-2xl font-medium text-white flex items-center gap-2">
                  {new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Holder 2: Time Out */}
              <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800 flex flex-col justify-center">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Time Out</p>
                {log.time_out ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-medium text-2xl">
                    {new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <CheckCircle2 className="w-5 h-5 ml-1" />
                  </div>
                ) : (
                  <button
                    onClick={handleClockOut}
                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors shadow-lg shadow-brand-500/20"
                  >
                    Clock Out
                  </button>
                )}
              </div>

              {/* Holder 3: Total Hours */}
              <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800 flex flex-col justify-center">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Total Hours</p>
                <p className="text-2xl font-medium text-brand-400">
                  {log.time_out
                    ? formatDuration(log.time_in, log.time_out)
                    : formatDuration(log.time_in, now)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 relative z-10">
               <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mb-4">
                 <Clock className="w-8 h-8 text-brand-400" />
               </div>
               <p className="text-white font-medium mb-1">Not Clocked In</p>
               <p className="text-slate-500 text-sm mb-6">Ready to start your day?</p>
               <button
                 onClick={() => setShowClockInConfirm(true)}
                 className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95"
               >
                 Start My Day (Clock In)
               </button>
            </div>
          )}
        </div>

        {/* My Activity Shots */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 mb-8 text-left shadow-2xl relative overflow-hidden w-full">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2 relative z-10">
                <LayoutDashboard className="w-5 h-5 text-brand-400" />
                My Desktop Proof of Work
              </h3>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Random Captures</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {presenceLogs.length === 0 ? (
                <div className="col-span-full border-2 border-dashed border-slate-800 rounded-2xl py-12 text-center">
                   <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                   <p className="text-slate-500 text-sm font-medium">No activity shots synced yet. Ensure LeapSync is running.</p>
                </div>
              ) : (
                presenceLogs.map(shot => (
                  <div key={shot.id} className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 group bg-black">
                     <img 
                       src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/proof-of-presence/${shot.photo_url}`}
                       className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                       alt="Activity Snapshot"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                     <div className="absolute bottom-3 left-3 right-3 text-[10px] font-bold">
                        <p className="text-white truncate mb-0.5">{shot.activity_title}</p>
                        <p className="text-brand-400/80">{new Date(shot.timestamp).toLocaleTimeString()}</p>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>

        {/* Video Vault Card (Legacy/Support) */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 mb-8 text-left shadow-2xl relative overflow-hidden w-full opacity-60 hover:opacity-100 transition-opacity">
           <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
             <Video className="w-5 h-5 text-slate-400" />
             Manual File Vault
           </h3>
           <p className="text-sm text-slate-400 mb-6 font-medium">Upload progress updates or screen recordings here. Your uploads are securely stored and only visible to the Leap IT Administrator.</p>
           <div className="border-2 border-dashed border-slate-700 bg-slate-950/50 rounded-2xl p-8 text-center transition-colors hover:border-brand-500/50">
             {!videoFile ? (
               <div className="flex flex-col items-center">
                 <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center mb-4">
                   <Upload className="w-6 h-6 text-brand-400" />
                 </div>
                 <p className="text-white font-medium mb-1">Select a video file to upload</p>
                 <p className="text-xs text-slate-500 mb-4 font-bold tracking-tight">MP4, MOV, or WEBM up to 50MB</p>
                 <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700">
                   Browse Files
                   <input 
                     type="file" 
                     className="hidden" 
                     accept="video/mp4,video/quicktime,video/webm"
                     onChange={(e) => {
                       if (e.target.files && e.target.files.length > 0) {
                         setVideoFile(e.target.files[0]);
                       }
                     }}
                   />
                 </label>
               </div>
             ) : (
               <div className="flex flex-col items-center">
                 <Video className="w-10 h-10 text-emerald-400 mb-3" />
                 <p className="text-white font-medium mb-1">{videoFile.name}</p>
                 <p className="text-xs text-slate-500 mb-6 font-bold">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                 <div className="flex gap-3">
                   <button 
                     onClick={() => setVideoFile(null)}
                     disabled={uploading}
                     className="px-4 py-2 hover:bg-slate-800 text-slate-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                   >
                     <X className="w-4 h-4" /> Cancel
                   </button>
                   <button 
                     onClick={handleVideoUpload}
                     disabled={uploading}
                     className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg disabled:opacity-50"
                   >
                     {uploading ? 'Uploading...' : 'Securely Upload'}
                   </button>
                 </div>
               </div>
             )}
           </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
          <button
            onClick={downloadMyLogs}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download My Records
          </button>

          {profile?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="px-6 py-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-5 h-5" />
              Go to Admin Portal
            </button>
          )}
        </div>
      </motion.div>

      <button onClick={handleLogout} className="mt-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors relative z-10">
        <LogOut className="w-4 h-4" />
        Log Out
      </button>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-2xl w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                <ShieldAlert className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">IT Setup Required</h3>
                <p className="text-slate-400">Please complete these steps to enable secure work tracking.</p>
              </div>
            </div>
            <div className="space-y-6 mb-8">
              <div className="flex gap-4 p-5 bg-slate-950/50 rounded-2xl border border-slate-800 hover:border-brand-500/30 transition-colors">
                <div className="w-8 h-8 bg-brand-500/10 rounded-full flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">1</div>
                <div>
                  <p className="text-white font-bold mb-1">Download & Run the Engine</p>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    Download the <b>Windows Installer (.exe)</b>. Once installed, run the app. 
                    <span className="block mt-1 text-emerald-400 font-medium italic">Requirement: You must see the "AW" icon in your system tray (bottom-right taskbar).</span>
                  </p>
                  <a href="https://github.com/ActivityWatch/activitywatch/releases/latest" target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all border border-slate-700 shadow-sm">
                    Get Windows Installer (.exe)
                  </a>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-950/50 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0">2</div>
                <div>
                  <p className="text-white font-bold mb-1">Activate the Browser Bridge</p>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    This allows the engine to securely log your work-related tab usage. 
                    <span className="block mt-1 text-emerald-400 font-medium italic">Success: The extension icon in your browser browser should turn green or show "Connected".</span>
                  </p>
                  <div className="flex gap-3">
                    <a href="https://chromewebstore.google.com/detail/activitywatch-web-watcher/nglaklhklhcoonedhgnpgddginnjdadi" target="_blank" rel="noreferrer" className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md font-bold transition-all border border-slate-700">Chrome / Edge Store</a>
                    <a href="https://addons.mozilla.org/en-US/firefox/addon/aw-watcher-web/" target="_blank" rel="noreferrer" className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md font-bold transition-all border border-slate-700">Firefox Addons</a>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 p-5 bg-slate-950/50 rounded-2xl border border-slate-800 hover:border-brand-500/30 transition-colors">
                <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0">3</div>
                <div>
                  <p className="text-white font-bold mb-1">Launch the LeapSync Agent</p>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed font-medium">
                    This bridge connects your local engine to your secure Leap IT Cloud dashboard.
                  </p>
                  <button 
                    onClick={() => {
                      // Small helper to download the .bat file content
                      const content = `@echo off\ntitle LeapSync Agent\necho 🚀 Starting LeapSync...\nnode leap-sync.js\npause`;
                      const blob = new Blob([content], { type: 'text/plain' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.setAttribute('download', 'Start-LeapSync.bat');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-brand-600/10 hover:bg-brand-600/20 text-brand-400 text-xs font-bold rounded-lg transition-all border border-brand-500/20"
                  >
                    <Download className="w-3 h-3 mr-2" />
                    Download Windows Agent (.bat)
                  </button>
                  <p className="text-[10px] text-slate-500 mt-2 italic">Note: Keep the black window open while you work.</p>
                </div>
              </div>
            </div>
            <button onClick={completeSetup} disabled={updatingSetup} className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50">
              {updatingSetup ? 'Updating Status...' : "I've Completed Setup & Started the App"}
            </button>
          </motion.div>
        </div>
      )}

      {/* Clock-In Confirmation */}
      {showClockInConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="w-8 h-8 text-brand-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 font-bold tracking-tight">Privacy & Sync Check</h3>
            <p className="text-slate-400 text-sm mb-8 font-medium">To record your work hours, ActivityWatch and the LeapSync Agent must be running in your taskbar.</p>
            <div className="space-y-3">
              <button onClick={handleClockIn} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-500/20">
                Yes, It's Started (Confirm & Clock In)
              </button>
              <button onClick={() => setShowClockInConfirm(false)} className="w-full py-3 text-slate-500 hover:text-white transition-colors">
                No, Let me start it first
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
