import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import NetworkGuardian from './components/NetworkGuardian';
import Auth from './pages/Auth';
import Pending from './pages/Pending';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

function App() {
  return (
    <NetworkGuardian>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col selection:bg-brand-500/30 bg-black">
          <header className="absolute top-0 w-full p-6 z-50 pointer-events-none">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-emerald-400 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
                </div>
                Leap IT
              </h1>
            </div>
          </header>

          <main className="flex-1 flex flex-col relative w-full h-full justify-center">
            <div className="absolute inset-0 z-0 overflow-hidden bg-black">
               {/* 3D Animated Grid */}
               <div className="tech-grid-bg" />
               <div className="tech-grid-fade" />
               
               {/* Ambient Glows */}
               <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-brand-900/40 blur-[120px] rounded-full pointer-events-none z-10" />
               <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-emerald-900/30 blur-[120px] rounded-full pointer-events-none z-10" />
            </div>
            
            <div className="z-10 relative w-full h-full flex flex-col">
              <Routes>
                {/* Public Route */}
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<Auth />} />

                {/* Secure Route (Requires Authentication but any status can view Pending) */}
                <Route element={<ProtectedRoute allowedStatuses={['PENDING', 'APPROVED', 'REJECTED']} redirectPath="/auth" />}>
                  <Route path="/pending" element={<Pending />} />
                </Route>

                {/* Secure Route (Requires APPROVED status only) */}
                <Route element={<ProtectedRoute allowedStatuses={['APPROVED']} redirectPath="/pending" />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/admin" element={<Admin />} />
                </Route>
              </Routes>
            </div>
          </main>
        </div>
      </Router>
      </AuthProvider>
    </NetworkGuardian>
  );
}

export default App;
