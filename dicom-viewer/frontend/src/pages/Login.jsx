import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to backend server. Make sure php artisan serve is running.');
      } else {
        setError(err.response?.data?.message || 'Invalid email or password');
      }
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#050505] relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00e5ff]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#0077ff]/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 mx-4 relative overflow-hidden">
        {/* Subtle accent border top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00e5ff] to-[#0077ff]" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#00e5ff]/20 to-[#0077ff]/20 rounded-2xl flex items-center justify-center mb-4 border border-white/5 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            <Stethoscope className="w-8 h-8 text-[#00e5ff]" />
          </div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#aaa] tracking-tight text-center">DICOM PACS</h2>
          <p className="text-[#888] text-sm mt-2 text-center font-medium">Radiology Information System</p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all"
              placeholder="doctor@pacs.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#888] uppercase tracking-wider mb-2 ml-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#00e5ff] focus:ring-1 focus:ring-[#00e5ff] transition-all"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-[#00e5ff] to-[#0077ff] text-white font-bold py-3.5 rounded-xl mt-4 hover:opacity-90 transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)] tracking-wide"
          >
            Sign In to System
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/5 text-xs text-[#666] flex flex-col gap-2 bg-black/20 p-4 rounded-xl">
          <p className="font-bold text-[#888]">Demo Accounts (password: password):</p>
          <div className="grid grid-cols-1 gap-1">
            <p className="flex justify-between"><span>Superadmin:</span> <code className="text-[#00e5ff]">superadmin@dicom.com</code></p>
            <p className="flex justify-between"><span>Nurse:</span> <code className="text-white">nurse@pacs.com</code></p>
            <p className="flex justify-between"><span>Doctor:</span> <code className="text-white">doctor@pacs.com</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
