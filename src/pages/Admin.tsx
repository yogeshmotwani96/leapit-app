import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ShieldAlert, ArrowLeft, Download, Key, Activity, Video } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

// Create admin client only if key is available, to prevent app crash
const supabaseAdmin = serviceRoleKey 
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

export default function Admin() {
  const { profile, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Password Reset Modal State
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Forensics Spyglass State
  const [spyglassUser, setSpyglassUser] = useState<Profile | null>(null);
  const [spyglassLogs, setSpyglassLogs] = useState<any[]>([]);
  const [spyglassPresence, setSpyglassPresence] = useState<any[]>([]);
  const [loadingSpyglass, setLoadingSpyglass] = useState(false);

  useEffect(() => {
    if (profile?.is_admin) {
      fetchProfiles();
    }
  }, [profile]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setProfiles(data);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const { error } = await supabase
      .from('profiles')
      .update({ approval_status: status })
      .eq('id', id);

    if (!error) {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, approval_status: status } : p));
    } else {
      alert('Error updating status: ' + error.message);
    }
  };

  const executePasswordOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !supabaseAdmin) {
      alert("Administrator client not initialized. Check your SERVICE_ROLE_KEY.");
      return;
    }
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(resetUserId, { password: newPassword });
      if (error) throw error;
      alert("Password successfully overridden!");
      setResetUserId(null);
      setNewPassword('');
    } catch (err: any) {
      alert("Overide failed: " + err.message);
    }
  };

  const openSpyglass = async (user: Profile) => {
    setSpyglassUser(user);
    setLoadingSpyglass(true);
    try {
      const [activityRes, presenceRes] = await Promise.all([
        supabase.from('activity_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(20),
        supabase.from('proof_of_presence').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(20)
      ]);
      setSpyglassLogs(activityRes.data || []);
      setSpyglassPresence(presenceRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSpyglass(false);
    }
  };

  const formatDuration = (start: string, end: string | Date) => {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const totalMins = Math.floor(ms / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
  };

  const downloadAllLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        alert('No attendance records found.');
        return;
      }

      const headers = ['User Name', 'Email', 'Date', 'Time In', 'Time Out', 'Total Time'];
      const rows = data.map((row: any) => {
        const total = row.time_out ? formatDuration(row.time_in, row.time_out) : 'In Progress';
        const timeIn = new Date(row.time_in).toLocaleTimeString();
        const timeOut = row.time_out ? new Date(row.time_out).toLocaleTimeString() : '-';
        const name = row.profiles?.full_name || 'Unknown';
        const email = row.profiles?.email || 'Unknown';

        return `"${name}","${email}","${row.date}","${timeIn}","${timeOut}","${total}"`;
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'master_attendance_logs.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Error fetching master logs: ' + err.message);
    }
  };

  if (authLoading) return null;

  if (!profile?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 pt-32 h-full flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center border border-brand-500/30">
                <ShieldAlert className="w-5 h-5 text-brand-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Admin Portal</h2>
            </div>
            <p className="text-slate-400">Manage user access requests for Leap IT.</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={downloadAllLogs}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-medium flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export All Attendance
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-12">Loading profiles...</div>
        ) : (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  <th className="p-4 text-sm font-semibold text-slate-400">Name</th>
                  <th className="p-4 text-sm font-semibold text-slate-400">Email</th>
                  <th className="p-4 text-sm font-semibold text-slate-400">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-400">Joined</th>
                  <th className="p-4 text-sm font-semibold text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 text-white font-medium">{p.full_name || 'N/A'}</td>
                    <td className="p-4 text-slate-400">{p.email}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${p.approval_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          p.approval_status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                        {p.approval_status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {p.approval_status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                        {p.approval_status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {p.approval_status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      {p.approval_status !== 'APPROVED' && (
                        <button
                          onClick={() => updateStatus(p.id, 'APPROVED')}
                          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"
                        >
                          Approve
                        </button>
                      )}
                      {p.approval_status !== 'REJECTED' && (
                        <button
                          onClick={() => updateStatus(p.id, 'REJECTED')}
                          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
                        >
                          Reject
                        </button>
                      )}

                      <button 
                        onClick={() => openSpyglass(p)}
                        className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20 flex items-center justify-center -mr-1"
                        title="Spyglass Forensics"
                      >
                        <Activity className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setResetUserId(p.id)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 flex items-center justify-center"
                        title="Force Password Override"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {profiles.length === 0 && (
              <div className="p-8 text-center text-slate-500">No users found.</div>
            )}
          </div>
        )}

        {/* Override Modal */}
        {resetUserId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4 text-brand-400">
                <Key className="w-6 h-6" />
                <h3 className="text-xl font-bold text-white">Administrator Override</h3>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                You are about to securely overwrite this user's password without requiring email verification. Make sure you communicate the new temporary password to the user.
              </p>
              <form onSubmit={executePasswordOverride} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="New Temporary Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-500"
                  required
                />
                <div className="flex gap-3 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => { setResetUserId(null); setNewPassword(''); }}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors font-medium"
                  >
                    Force Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Spyglass Dashboard Overlay */}
        {spyglassUser && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                    <Activity className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{spyglassUser.full_name || 'Spyglass Forensics'}</h3>
                    <p className="text-sm text-slate-400 font-medium">Activity logs & Media Vault for tracking session.</p>
                  </div>
                </div>
                <button onClick={() => setSpyglassUser(null)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold text-sm">
                  Close Dashboard
                </button>
              </div>

              {loadingSpyglass ? (
                <div className="text-center text-slate-500 py-24 flex flex-col items-center gap-4">
                  <Activity className="w-12 h-12 animate-pulse text-emerald-400/20" />
                  <p className="text-lg font-medium">Decrypting user telemetry logs...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Activity Tracker */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-bold text-white flex items-center gap-3">
                       <Activity className="w-5 h-5 text-emerald-400" />
                       Recent Desktop Activity
                    </h4>
                    <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-6">
                      {spyglassLogs.length === 0 ? (
                        <div className="text-center py-12">
                          <Clock className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                          <p className="text-sm text-slate-500 font-medium">No activity captured yet. Ensure user has started the LeapSync Agent.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {spyglassLogs.map(log => (
                            <div key={log.id} className="flex justify-between items-center p-4 rounded-xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors border border-slate-800/50">
                              <div className="flex flex-col overflow-hidden mr-4">
                                <span className="text-sm font-bold text-white truncate max-w-xs mb-1">{log.app_name}</span>
                                <span className="text-xs text-slate-400 truncate max-w-xs">{log.window_title}</span>
                              </div>
                              <div className="text-right flex flex-col shrink-0">
                                <span className="text-sm font-mono font-bold text-brand-400 mb-1">{log.duration_seconds}s</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Presence Vault */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-bold text-white flex items-center gap-3">
                       <ShieldAlert className="w-5 h-5 text-brand-400" />
                       Desktop Proof of Work
                    </h4>
                    <div className="grid grid-cols-1 gap-6">
                      {spyglassPresence.length === 0 ? (
                        <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800 border-dashed">
                          <Video className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                          <p className="text-sm text-slate-500 font-medium">No snapshots captured by agent yet.</p>
                        </div>
                      ) : (
                        spyglassPresence.map(shot => (
                          <div key={shot.id} className="bg-slate-950/50 rounded-2xl border border-slate-800 p-4 hover:border-brand-500/30 transition-all group overflow-hidden">
                            <div className="flex justify-between items-center mb-3">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-1">Activity at Capture</span>
                                  <span className="text-sm text-white font-medium truncate max-w-[250px]">{shot.activity_title}</span>
                               </div>
                               <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                 {new Date(shot.timestamp).toLocaleTimeString()}
                               </span>
                            </div>
                            
                            <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-slate-800">
                               <img 
                                 src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/proof-of-presence/${shot.photo_url}`} 
                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                 alt={shot.activity_title}
                               />
                               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            </div>
                            
                            <div className="flex justify-between items-center mt-3">
                               <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">{new Date(shot.timestamp).toLocaleDateString()}</span>
                               <span className="text-[10px] text-emerald-500/50 font-bold">SECURE TELEMETRY</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
