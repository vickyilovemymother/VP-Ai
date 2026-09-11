import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  User, 
  Camera, 
  Layers, 
  Download, 
  Plus, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  Image as ImageIcon,
  Grid,
  RefreshCw,
  ArrowRight,
  LogOut,
  Shield,
  Users,
  Zap,
  Trash2,
  Ban,
  Unlock,
  Mail,
  Send,
  UserPlus,
  Clock,
  ChevronDown,
  Lock,
  X,
  Upload,
  Key,
  Settings,
  Smartphone,
  Monitor,
  CheckSquare,
  Square
} from 'lucide-react';
import { auth, db, googleProvider, appleProvider } from './firebase';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);

  // If it's a transient connection/offline issue, log warning and avoid crashing listeners
  if (errMessage.includes('unavailable') || errMessage.includes('client is offline')) {
    console.warn(`Firestore operating in offline/reconnecting mode for ${operationType} on ${path}:`, errMessage);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
// --------------------------------
import { generateModelImage, generatePose, generatePhotoshoot, generateDesignerPhotoshoot, enhanceImage, setGenerationMode, getGenerationMode } from './services/geminiService';
import { SetupGuide } from './components/SetupGuide';
import { PricingModal } from './components/PricingModal';
import { DesignerPanel } from './components/DesignerPanel';
import { VirtualTryOn } from './components/VirtualTryOn';

declare global {
  interface Window {
    aistudio?: {
      openSelectKey?: () => Promise<void>;
      hasSelectedApiKey?: () => Promise<boolean>;
    };
  }
}

// --- Types ---
import { Layer, Variant } from './types';

interface Project {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
  models?: Model[];
}

interface Model {
  id: string;
  project_id: string;
  image_url: string;
  prompt: string;
  gender: string;
  metadata: string;
}

interface Pose {
  id: string;
  model_id: string;
  image_url: string;
  pose_type: string;
}

// --- Components ---

const Button = ({ children, onClick, disabled, variant = 'primary', className = '' }: any) => {
  const variants = {
    primary: 'ai-button-primary',
    secondary: 'ai-button-secondary',
    ghost: 'hover:bg-white/5 text-white/70 hover:text-white'
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`font-display transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type = 'text', options, placeholder }: any) => (
  <div className="flex flex-col gap-2 relative z-10">
    <label className="col-header">{label}</label>
    {options ? (
      <div className="relative">
        <select 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 text-white transition-all hover:border-white/20 appearance-none cursor-pointer pr-10"
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt} className="bg-black text-white">{opt}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
          <ChevronDown size={16} />
        </div>
      </div>
    ) : (
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 text-white placeholder:text-white/20 transition-all hover:border-white/20"
      />
    )}
  </div>
);

const BackgroundMesh = () => (
  <div className="bg-mesh">
    <div className="mesh-circle w-[600px] h-[600px] bg-brand-secondary/10 -top-[10%] -left-[10%]" />
    <div className="mesh-circle w-[500px] h-[500px] bg-brand-accent/10 top-[40%] -right-[5%]" style={{ animationDelay: '-2s' }} />
    <div className="mesh-circle w-[400px] h-[400px] bg-brand-tertiary/10 -bottom-[5%] left-[20%]" style={{ animationDelay: '-5s' }} />
    <div className="mesh-circle w-[300px] h-[300px] bg-brand-quaternary/5 top-[10%] left-[40%]" style={{ animationDelay: '-8s' }} />
  </div>
);

const Logo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <a 
    href="https://www.vickylive.com" 
    target="_blank" 
    rel="noopener noreferrer" 
    onClick={(e) => {
      e.stopPropagation();
    }}
    className={`${className} relative group cursor-pointer inline-flex items-center justify-center shrink-0`}
    title="VickyLive"
  >
    <img 
      src="/assets/images/global/LogoVickyLive.png" 
      alt="VickyLive Logo" 
      className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(0,242,255,0.4)] group-hover:scale-105 transition-transform" 
    />
  </a>
);

const AdminDashboard = ({ currentUserEmail }: { currentUserEmail: string | null }) => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');

  useEffect(() => {
    const usersQ = collection(db, 'users');
    const unsubUsers = onSnapshot(usersQ, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(users);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const invitesQ = collection(db, 'invitations');
    const unsubInvites = onSnapshot(invitesQ, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvitations(invites);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invitations');
    });

    return () => {
      unsubUsers();
      unsubInvites();
    };
  }, []);

  const toggleRole = async (userId: string, currentRole: string) => {
    setActionLoading(userId);
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (err) {
      console.error("Failed to update role:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: string) => {
    setActionLoading(userId);
    try {
      const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user profile? This action cannot be undone.")) return;
    setActionLoading(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setActionLoading('invite');
    try {
      await addDoc(collection(db, 'invitations'), {
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
        invitedBy: currentUserEmail,
        createdAt: serverTimestamp()
      });
      setInviteEmail('');
      alert(`Invitation sent to ${inviteEmail}. In a production environment, this would trigger a real email.`);
    } catch (err) {
      console.error("Failed to send invitation:", err);
    } finally {
      setActionLoading('invite');
      setTimeout(() => setActionLoading(null), 500);
    }
  };

  const cancelInvitation = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invitations', id));
    } catch (err) {
      console.error("Failed to cancel invitation:", err);
    }
  };

  const isSuperAdmin = currentUserEmail === 'vicky.vignesh1020@gmail.com';

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="px-4 py-1 bg-brand-accent/20 border border-brand-accent/30 rounded-full">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent">Super Admin Access</span>
          </div>
        </div>
        <h2 className="text-5xl font-display font-bold ai-gradient-text">Admin Control Center</h2>
        <p className="text-white/60">Manage users, invitations, and platform access.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="ai-card p-8 space-y-2">
          <p className="col-header">Total Users</p>
          <p className="text-4xl font-display font-bold">{allUsers.length}</p>
        </div>
        <div className="ai-card p-8 space-y-2">
          <p className="col-header">Admins</p>
          <p className="text-4xl font-display font-bold">{allUsers.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="ai-card p-8 space-y-2">
          <p className="col-header">Pending Invites</p>
          <p className="text-4xl font-display font-bold">{invitations.length}</p>
        </div>
        <div className="ai-card p-8 space-y-2">
          <p className="col-header">Platform Status</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-2xl font-display font-bold text-emerald-500 uppercase tracking-widest">Optimal</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="ai-card overflow-hidden">
            <div className="p-8 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-brand-accent" size={20} />
                User Directory
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="p-6 col-header">User</th>
                    <th className="p-6 col-header">Role</th>
                    <th className="p-6 col-header">Status</th>
                    <th className="p-6 col-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-8 h-8 rounded-full border border-white/10" />
                            <span className="font-bold text-sm">{u.displayName || 'Anonymous'}</span>
                          </div>
                          <span className="text-[10px] text-white/40 mt-1 ml-11">{u.email}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-brand-secondary/20 text-brand-secondary border border-brand-secondary/30' : 'bg-white/10 text-white/60'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${u.status === 'blocked' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'}`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleRole(u.id, u.role)}
                            disabled={actionLoading === u.id || (u.email === 'vicky.vignesh1020@gmail.com' && !isSuperAdmin)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-brand-accent disabled:opacity-30"
                            title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                          >
                            {actionLoading === u.id ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                          </button>
                          <button 
                            onClick={() => toggleStatus(u.id, u.status)}
                            disabled={actionLoading === u.id || u.email === 'vicky.vignesh1020@gmail.com'}
                            className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 ${u.status === 'blocked' ? 'text-emerald-500' : 'text-white/40 hover:text-orange-400'}`}
                            title={u.status === 'blocked' ? 'Unblock User' : 'Block User'}
                          >
                            {u.status === 'blocked' ? <Unlock size={14} /> : <Ban size={14} />}
                          </button>
                          <button 
                            onClick={() => deleteUser(u.id)}
                            disabled={actionLoading === u.id || u.email === 'vicky.vignesh1020@gmail.com'}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-red-400 disabled:opacity-30"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="ai-card p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="text-brand-accent" size={20} />
              Invite User
            </h3>
            <form onSubmit={sendInvitation} className="space-y-4">
              <div className="space-y-2">
                <label className="col-header">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input 
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-accent/50 transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="col-header">Initial Role</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-brand-accent/50 transition-colors appearance-none"
                >
                  <option value="user" className="bg-zinc-900">Standard User</option>
                  <option value="admin" className="bg-zinc-900">Administrator</option>
                </select>
              </div>
              <Button 
                type="submit" 
                className="w-full gap-2" 
                disabled={actionLoading === 'invite'}
              >
                {actionLoading === 'invite' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Send Invitation
              </Button>
            </form>
          </div>

          <div className="ai-card p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Clock className="text-brand-secondary" size={20} />
              Pending Invites
            </h3>
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <p className="text-center py-8 text-white/20 text-sm italic">No pending invitations</p>
              ) : (
                invitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold truncate max-w-[120px]">{inv.email}</span>
                      <span className="text-[9px] uppercase tracking-wider text-white/40">{inv.role}</span>
                    </div>
                    <button 
                      onClick={() => cancelInvitation(inv.id)}
                      className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-lg transition-colors"
                      title="Cancel Invitation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BlockedScreen = ({ onLogout }: { onLogout: () => void }) => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8 text-center">
    <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
      <Ban size={48} className="text-red-500" />
    </div>
    <div className="space-y-4 max-w-md">
      <h2 className="text-4xl font-display font-bold text-white">Access Restricted</h2>
      <p className="text-white/60 leading-relaxed">
        Your account has been suspended by the platform administrator. If you believe this is a mistake, please contact support.
      </p>
    </div>
    <Button variant="secondary" onClick={onLogout} className="gap-2">
      <LogOut size={18} /> Sign Out
    </Button>
  </div>
);

const LoginScreen = ({ onLogin }: { onLogin: (p: 'google' | 'apple' | 'email' | 'phone', data?: any) => void }) => {
  const [mode, setMode] = useState<'social' | 'email' | 'phone'>('social');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible'
      });
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return;
    setAuthLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(confirmation);
      alert("OTP sent to your mobile number.");
    } catch (err: any) {
      console.error("OTP failed:", err);
      alert(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmationResult) return;
    setAuthLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      if (result.user) {
        onLogin('phone', { user: result.user });
      }
    } catch (err: any) {
      console.error("Verification failed:", err);
      alert(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="text-center space-y-8 max-w-2xl relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Logo className="w-32 h-32 mx-auto mb-12 drop-shadow-[0_0_30px_rgba(0,242,255,0.3)]" />
        </motion.div>
        
        <h2 className="text-7xl font-display font-bold text-white tracking-tight">
          Welcome to <span className="text-multi-color">VP-Ai</span>
        </h2>
        <p className="text-xl text-white/40 leading-relaxed max-w-lg mx-auto">
          Unlock the future of virtual photoshoots. Sign in to manage your projects and generate ultra-realistic AI models.
        </p>
      </div>

      <div className="w-full max-w-md mt-16 relative z-10 space-y-6">
        {mode === 'social' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => onLogin('google')}
              className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-center gap-4 hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <span className="font-bold text-lg text-white">Gmail Login</span>
            </button>

            <button 
              onClick={() => onLogin('apple')}
              className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-center gap-4 hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="black">
                  <path d="M17.05 20.28c-.96.95-2.04 1.72-3.24 1.72-1.16 0-1.54-.71-2.94-.71-1.41 0-1.84.71-2.94.71-1.16 0-2.31-.83-3.27-1.72-1.96-1.95-3.46-5.52-3.46-8.62 0-4.85 3.03-7.41 5.91-7.41 1.54 0 2.84.96 3.78.96.93 0 2.41-1.15 4.21-1.15 1.8 0 4.1.91 5.48 2.85-3.41 1.99-2.86 6.36.57 7.78-1.3 2.94-3.14 5.2-4.34 6.38zM12.03 5.07c-.02-2.13 1.76-3.95 3.86-4.07.21 2.29-1.98 4.34-3.86 4.07z"/>
                </svg>
              </div>
              <span className="font-bold text-lg text-white">Apple ID</span>
            </button>
          </div>
        ) : mode === 'email' ? (
          <div className="ai-card p-8 space-y-6">
            <h3 className="text-2xl font-bold text-white text-center">{isSignUp ? 'Create Account' : 'Sign In'}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="col-header">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-accent/50"
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="col-header">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-accent/50"
                  placeholder="••••••••"
                />
              </div>
              <Button 
                onClick={() => onLogin('email', { email, password, isSignUp })}
                className="w-full h-12"
                disabled={authLoading}
              >
                {authLoading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-xs text-white/40 hover:text-white transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
            </div>
          </div>
        ) : (
          <div className="ai-card p-8 space-y-6">
            <h3 className="text-2xl font-bold text-white text-center">Mobile Login</h3>
            <div className="space-y-4">
              {!confirmationResult ? (
                <>
                  <div className="space-y-2">
                    <label className="col-header">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-accent/50"
                      placeholder="+1234567890"
                    />
                  </div>
                  <div id="recaptcha-container"></div>
                  <Button 
                    onClick={handleSendOtp}
                    className="w-full h-12"
                    disabled={authLoading || !phone}
                  >
                    {authLoading ? <Loader2 className="animate-spin" /> : 'Send OTP'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="col-header">Enter OTP</label>
                    <input 
                      type="text" 
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-accent/50 text-center tracking-[1em] font-bold"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    onClick={handleVerifyOtp}
                    className="w-full h-12"
                    disabled={authLoading || !otp}
                  >
                    {authLoading ? <Loader2 className="animate-spin" /> : 'Verify & Sign In'}
                  </Button>
                  <button 
                    onClick={() => setConfirmationResult(null)}
                    className="w-full text-xs text-white/40 hover:text-white transition-colors"
                  >
                    Change phone number
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => setMode('social')}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'social' ? 'bg-brand-accent text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          >
            Social
          </button>
          <button 
            onClick={() => setMode('email')}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'email' ? 'bg-brand-accent text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          >
            Email
          </button>
          <button 
            onClick={() => setMode('phone')}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'phone' ? 'bg-brand-accent text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
          >
            Mobile
          </button>
        </div>
      </div>

    </div>
  );
};

const HowToUse = () => (
  <div className="ai-card p-12 max-w-4xl mx-auto space-y-12">
    <div className="text-center space-y-4">
      <h2 className="text-5xl font-display font-bold ai-gradient-text">How It Works</h2>
      <p className="text-white/60">Master the art of virtual photoshoots in four simple steps.</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {[
        { step: "01", title: "Create Project", desc: "Organize your work by creating a dedicated project for your collection." },
        { step: "02", title: "Generate Model", desc: "Describe your ideal model or upload a reference image to start." },
        { step: "03", title: "Select Poses", desc: "Choose from our library of professional fashion poses for your model." },
        { step: "04", title: "Download Assets", desc: "Export high-resolution images ready for your marketing channels." }
      ].map((s, i) => (
        <div key={i} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-4">
          <span className="text-4xl font-display font-bold text-brand-accent/40">{s.step}</span>
          <h3 className="text-xl font-bold">{s.title}</h3>
          <p className="text-white/60 leading-relaxed">{s.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

const PrivacyPolicy = () => (
  <div className="ai-card p-12 max-w-4xl mx-auto space-y-8">
    <h2 className="text-4xl font-display font-bold ai-gradient-text">Privacy Policy</h2>
    <div className="space-y-6 text-white/70 leading-relaxed">
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white">1. Data Collection</h3>
        <p>We collect minimal data required to provide our AI generation services. This includes project names, generation parameters, and images you upload for pose generation.</p>
      </section>
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white">2. Image Usage</h3>
        <p>Images generated or uploaded are used solely for your projects. We do not use your personal images to train our base models without explicit consent.</p>
      </section>
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white">3. Security</h3>
        <p>We implement industry-standard security measures to protect your data. All connections are encrypted via SSL, and access to your projects is restricted to your account.</p>
      </section>
    </div>
  </div>
);

const APIAccess = () => (
  <div className="ai-card p-12 max-w-4xl mx-auto space-y-8">
    <h2 className="text-4xl font-display font-bold ai-gradient-text">API Access</h2>
    <div className="space-y-6">
      <div className="p-6 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl">
        <p className="text-brand-accent font-bold mb-2">Developer Preview</p>
        <p className="text-white/70">Our API is currently in closed beta. We are working on providing programmatic access to our model and pose generation engines.</p>
      </div>
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white">Request Access</h3>
        <p className="text-white/60">If you are a fashion brand or developer interested in integrating VP-Ai into your workflow, please contact our enterprise team.</p>
        <Button className="mt-4">Join Waitlist</Button>
      </div>
    </div>
  </div>
);

const compressImage = async (base64Str: string, maxWidth = 1024, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL('image/jpeg', quality);
        
        // Firestore limit is 1MB. Base64 is ~33% larger than binary.
        // 1,048,576 bytes is the limit. Let's aim for 900KB to be safe.
        if (result.length > 900000 && quality > 0.1) {
          console.warn(`Image still too large (${result.length} bytes), re-compressing...`);
          resolve(compressImage(base64Str, Math.round(maxWidth * 0.8), quality - 0.1));
        } else {
          resolve(result);
        }
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

const flattenTransparency = async (base64: string): Promise<string> => {
  if (!base64) return base64;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);
      
      // Draw white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95)); // JPEG naturally removes transparency
    };
    img.onerror = reject;
    img.src = base64;
  });
};

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [stage, setStage] = useState<'landing' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'how-to-use' | 'privacy' | 'api-access' | 'admin' | 'setup-guide'>('landing');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);

  // Stage 2 State
  const [stage2TopWear, setStage2TopWear] = useState<string | null>(null);
  const [stage2BottomWear, setStage2BottomWear] = useState<string | null>(null);
  const [stage2Dress, setStage2Dress] = useState<string | null>(null);
  const [stage2Prompt, setStage2Prompt] = useState<string>('High-end fashion editorial, studio lighting, highly detailed');
  const [stage2Results, setStage2Results] = useState<string[]>([]);
  const [stage1ExportRes, setStage1ExportRes] = useState<'default' | 'hq' | '4k'>('default');
  const [stage2ExportRes, setStage2ExportRes] = useState<'default' | 'hq' | '4k'>('default');
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());

  // Designer Mode State
  const [isDesignerMode, setIsDesignerMode] = useState(false);
  const [layers, setLayers] = useState<any[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);
  const [isCompressionEnabled, setIsCompressionEnabled] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showMaskPreview, setShowMaskPreview] = useState(false);

  const handleSaveVariant = () => {
    if (stage2Results.length === 0) return;
    const newVariant: Variant = {
      id: `variant_${Date.now()}`,
      name: `Variant ${variants.length + 1}`,
      layers: JSON.parse(JSON.stringify(layers)),
      outputImage: stage2Results[0]
    };
    setVariants([...variants, newVariant]);
    setActiveVariantId(newVariant.id);
  };

  const handleSwitchVariant = (id: string) => {
    const variant = variants.find(v => v.id === id);
    if (variant) {
      setLayers(JSON.parse(JSON.stringify(variant.layers)));
      setActiveVariantId(id);
      if (variant.outputImage) {
        setStage2Results([variant.outputImage]);
      }
    }
  };

  const handleAutoColorways = async () => {
    if (!selectedModel || layers.length === 0) return;
    setLoading(true);
    try {
      // Logic to generate 3 variants with different colors
      const colors = ['#FF5733', '#33FF57', '#3357FF'];
      const newVariants = [];
      
      for (const color of colors) {
        const modifiedLayers = layers.map(l => ({
          ...l,
          material: { ...l.material, colorHex: color }
        }));
        
        const rawImageUrl = await generateDesignerPhotoshoot(selectedModel.image_url, modifiedLayers);
        const imageUrl = await compressImage(rawImageUrl);
        
        newVariants.push({
          id: `v_auto_${Date.now()}_${color}`,
          name: `Colorway ${color}`,
          layers: modifiedLayers,
          outputImage: imageUrl
        });
      }
      
      setVariants([...variants, ...newVariants]);
      setStage2Results([newVariants[0].outputImage, ...stage2Results]);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };
  // Stage 4 State
  const [stage4Mode, setStage4Mode] = useState<'fashion' | 'normal'>('fashion');
  const [stage4Category, setStage4Category] = useState('Dress');
  const [stage4Style, setStage4Style] = useState('Luxury');
  const [stage4Resolution, setStage4Resolution] = useState('4K');
  const [stage4Duration, setStage4Duration] = useState(5);
  const [stage4Image, setStage4Image] = useState<string | null>(null);
  const [stage4Analysis, setStage4Analysis] = useState<any>(null);
  const [stage4Prompt, setStage4Prompt] = useState('');
  const [stage4VideoUrl, setStage4VideoUrl] = useState<string | null>(null);
  const [stage4Loading, setStage4Loading] = useState(false);
  const [stage4History, setStage4History] = useState<any[]>([]);

  const handleStage4Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setStage4Loading(true);
      try {
        const compressed = await compressImage(base64, 1440, 0.85);
        setStage4Image(compressed);
        const { analyzeImageForVideo, generateVideoPrompt } = await import('./services/videoService');
        const analysis = await analyzeImageForVideo(compressed);
        setStage4Analysis(analysis);
        const prompt = generateVideoPrompt(analysis, { 
          mode: stage4Mode, 
          category: stage4Category,
          style: stage4Style 
        });
        setStage4Prompt(prompt);
      } catch (err) {
        handleError(err);
      } finally {
        setStage4Loading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async () => {
    if (!stage4Image || !stage4Prompt) return;
    
    setStage4Loading(true);
    setStage4VideoUrl(null); // Clear previous video
    setError(null);
    
    try {
      const { generateVideo } = await import('./services/videoService');
      const videoUrl = await generateVideo(stage4Image, stage4Prompt, {
        resolution: stage4Resolution,
        duration: stage4Duration
      });
      setStage4VideoUrl(videoUrl);
      
      const newEntry = {
        id: `v_${Date.now()}`,
        sourceImage: stage4Image,
        videoUrl,
        prompt: stage4Prompt,
        mode: stage4Mode,
        category: stage4Category,
        settings: {
          resolution: stage4Resolution,
          duration: stage4Duration,
          style: stage4Style
        },
        createdAt: new Date()
      };
      setStage4History([newEntry, ...stage4History]);
      
      // Save to Firestore (Metadata and lightweight thumbnail only to strictly respect 1MB limit)
      if (user) {
        try {
          const thumbnail = stage4Image ? await compressImage(stage4Image, 600, 0.6) : '';
          await addDoc(collection(db, 'videos'), {
            id: newEntry.id,
            sourceImage: thumbnail.length < 800000 ? thumbnail : '',
            videoUrl: videoUrl && videoUrl.length < 500000 ? videoUrl : '',
            prompt: stage4Prompt || '',
            mode: stage4Mode || 'fashion',
            category: stage4Category || 'Dress',
            settings: newEntry.settings || {},
            ownerId: user.uid,
            createdAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.warn("Could not save video history metadata to database:", dbErr);
        }
      }
    } catch (err: any) {
      console.error("Video generation error:", err);
      handleError(err);
    } finally {
      setStage4Loading(false);
    }
  };

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      }
    };
    checkKey();

    // Auto-invite vigneshwaranp@avataar.ai if current user is admin
    const checkInvitation = async () => {
      if (user?.email === 'vicky.vignesh1020@gmail.com') {
        try {
          const q = query(collection(db, 'invitations'), where('email', '==', 'vigneshwaranp@avataar.ai'));
          const snap = await getDocs(q);
          if (snap.empty) {
            await addDoc(collection(db, 'invitations'), {
              email: 'vigneshwaranp@avataar.ai',
              role: 'admin',
              status: 'pending',
              invitedBy: 'vicky.vignesh1020@gmail.com',
              createdAt: serverTimestamp()
            });
            console.log("Auto-invited vigneshwaranp@avataar.ai");
          }
        } catch (inviteErr) {
          console.warn("Auto-invitation check skipped/offline:", inviteErr);
        }
      }
    };
    if (user) checkInvitation();
  }, [user]);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
      setError(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          // Sync user profile
          const userRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const newProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              photoURL: fbUser.photoURL,
              role: (fbUser.email === 'vicky.vignesh1020@gmail.com' || fbUser.email === 'vigneshwaranp@avataar.ai') ? 'admin' : 'user',
              plan: 'free',
              status: 'active',
              lastLogin: serverTimestamp(),
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            setUserProfile(newProfile);
          } else {
            const profile = userSnap.data();
            // Force admin role for super admin if not already set
            if ((fbUser.email === 'vicky.vignesh1020@gmail.com' || fbUser.email === 'vigneshwaranp@avataar.ai') && profile.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' });
              profile.role = 'admin';
            }
            setUserProfile(profile);
            // Update last login
            await updateDoc(userRef, { lastLogin: serverTimestamp() });
          }
        } catch (profileErr) {
          console.warn("User profile sync deferred:", profileErr);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (provider: 'google' | 'apple' | 'email' | 'phone', data?: any) => {
    try {
      setLoading(true);
      let result;
      if (provider === 'google') {
        result = await signInWithPopup(auth, googleProvider);
      } else if (provider === 'apple') {
        result = await signInWithPopup(auth, appleProvider);
      } else if (provider === 'email') {
        if (data.isSignUp) {
          result = await createUserWithEmailAndPassword(auth, data.email, data.password);
        } else {
          result = await signInWithEmailAndPassword(auth, data.email, data.password);
        }
      } else if (provider === 'phone') {
        // Phone auth is handled separately via ConfirmationResult
        return;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Stage 1 Form
  const [formData, setFormData] = useState({
    gender: 'Female',
    age: '25',
    ethnicity: 'Caucasian',
    skinColor: 'Fair',
    bodyType: 'Slim',
    hairStyle: 'Long wavy',
    faceDetails: 'Symmetrical, sharp jawline',
    faceExpression: 'Neutral',
    clothing: 'Minimalist white Bra and Panty',
    lighting: 'Studio softbox',
    mood: 'Neutral',
    cameraAngle: 'Full body shot',
    background: 'Studio white background',
    customPrompt: ''
  });

  // Stage 2 Form
  const [poseCount, setPoseCount] = useState('5');
  const [posePack, setPosePack] = useState('Fashion Pose Pack');
  const [poseCategory, setPoseCategory] = useState('Full Body');
  const [poseBackground, setPoseBackground] = useState('Keep the Same Background');
  const [poseGender, setPoseGender] = useState('Female');
  const [genMode, setGenMode] = useState<'gemini' | 'local'>(getGenerationMode() as any);

  const toggleGenMode = () => {
    const newMode = genMode === 'gemini' ? 'local' : 'gemini';
    setGenMode(newMode);
    setGenerationMode(newMode);
  };

  useEffect(() => {
    if (selectedModel?.gender) {
      setPoseGender(selectedModel.gender);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'projects'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(projs);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'projects');
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'videos'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStage4History(history);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'videos');
      });
      return () => unsubscribe();
    }
  }, [user]);

  const [showAPISettings, setShowAPISettings] = useState(false);
  const [localProxyUrl, setLocalProxyUrl] = useState(import.meta.env.VITE_LOCAL_PROXY_URL || '');
  const [localProxyKey, setLocalProxyKey] = useState(import.meta.env.VITE_LOCAL_PROXY_KEY || '');

  const saveAPISettings = () => {
    // In a real app, we'd save to localStorage or a backend
    // For this demo, we'll just update the session state
    // Note: This won't persist across refreshes unless we use localStorage
    localStorage.setItem('VPAI_LOCAL_PROXY_URL', localProxyUrl);
    localStorage.setItem('VPAI_LOCAL_PROXY_KEY', localProxyKey);
    window.location.reload(); // Reload to apply new env vars
  };

  useEffect(() => {
    const savedUrl = localStorage.getItem('VPAI_LOCAL_PROXY_URL');
    const savedKey = localStorage.getItem('VPAI_LOCAL_PROXY_KEY');
    if (savedUrl) setLocalProxyUrl(savedUrl);
    if (savedKey) setLocalProxyKey(savedKey);
  }, []);

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { plan: 'pro' });
      setUserProfile((prev: any) => ({ ...prev, plan: 'pro' }));
      setShowPricingModal(false);
    } catch (err: any) {
      setError("Upgrade failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const [confirmClear, setConfirmClear] = useState<string | null>(null);

  const handleClearProjects = async () => {
    if (!user) return;
    if (confirmClear !== 'projects') {
      setConfirmClear('projects');
      setTimeout(() => setConfirmClear(null), 3000);
      return;
    }
    
    setLoading(true);
    try {
      const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      for (const projectDoc of snapshot.docs) {
        // Delete models for this project
        const modelsQ = query(collection(db, 'models'), where('project_id', '==', projectDoc.id));
        const modelsSnapshot = await getDocs(modelsQ);
        for (const modelDoc of modelsSnapshot.docs) {
          // Delete poses for this model
          const posesQ = query(collection(db, 'poses'), where('model_id', '==', modelDoc.id));
          const posesSnapshot = await getDocs(posesQ);
          const poseDeletePromises = posesSnapshot.docs.map(d => deleteDoc(doc(db, 'poses', d.id)));
          await Promise.all(poseDeletePromises);
          await deleteDoc(doc(db, 'models', modelDoc.id));
        }
        await deleteDoc(doc(db, 'projects', projectDoc.id));
      }
      setConfirmClear(null);
    } catch (err: any) {
      setError("Failed to clear projects: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearModels = async () => {
    if (!currentProject) return;
    if (confirmClear !== 'models') {
      setConfirmClear('models');
      setTimeout(() => setConfirmClear(null), 3000);
      return;
    }
    
    setLoading(true);
    try {
      const q = query(collection(db, 'models'), where('project_id', '==', currentProject.id));
      const snapshot = await getDocs(q);
      
      // Delete models and their poses
      for (const modelDoc of snapshot.docs) {
        const posesQ = query(collection(db, 'poses'), where('model_id', '==', modelDoc.id));
        const posesSnapshot = await getDocs(posesQ);
        const poseDeletePromises = posesSnapshot.docs.map(d => deleteDoc(doc(db, 'poses', d.id)));
        await Promise.all(poseDeletePromises);
        await deleteDoc(doc(db, 'models', modelDoc.id));
      }
      
      setModels([]);
      setSelectedModel(null);
      setConfirmClear(null);
    } catch (err: any) {
      setError("Failed to clear models: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearPoses = async () => {
    if (!selectedModel) return;
    if (confirmClear !== 'poses') {
      setConfirmClear('poses');
      setTimeout(() => setConfirmClear(null), 3000);
      return;
    }
    
    setLoading(true);
    try {
      const q = query(collection(db, 'poses'), where('model_id', '==', selectedModel.id));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'poses', d.id)));
      await Promise.all(deletePromises);
      setPoses([]);
      setConfirmClear(null);
    } catch (err: any) {
      setError("Failed to clear poses: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim() || !user) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        models: []
      });
      setNewProjectName('');
      setShowNewProjectModal(false);
      setStage('stage1');
      setCurrentProject({ id: docRef.id, name: newProjectName, ownerId: user.uid, createdAt: Timestamp.now(), models: [] });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirmClear !== `project_${projectId}`) {
      setConfirmClear(`project_${projectId}`);
      setTimeout(() => setConfirmClear(null), 3000);
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      setConfirmClear(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClearAllProjects = async () => {
    if (confirmClear !== 'all_projects') {
      setConfirmClear('all_projects');
      setTimeout(() => setConfirmClear(null), 3000);
      return;
    }
    try {
      setLoading(true);
      const deletePromises = projects.map(p => deleteDoc(doc(db, 'projects', p.id)));
      await Promise.all(deletePromises);
      setConfirmClear(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressedBase64 = await compressImage(base64);
      
      let targetProjectId = currentProject?.id;
      
      if (!targetProjectId) {
        const docRef = await addDoc(collection(db, 'projects'), {
          name: `Uploads ${new Date().toLocaleDateString()}`,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          models: []
        });
        targetProjectId = docRef.id;
      }

      const modelRef = await addDoc(collection(db, 'models'), {
        project_id: targetProjectId,
        image_url: compressedBase64,
        prompt: 'Uploaded Model',
        gender: 'Unknown',
        metadata: JSON.stringify({ ethnicity: 'Uploaded', gender: 'Model', age: 'Local' }),
        createdAt: serverTimestamp()
      });

      const newModel = { 
        id: modelRef.id, 
        project_id: targetProjectId, 
        image_url: compressedBase64, 
        metadata: JSON.stringify({ ethnicity: 'Uploaded', gender: 'Model', age: 'Local' }) 
      } as any;
      
      setModels([newModel, ...models]);
      setSelectedModel(newModel);
      setPoses([]);
      setStage2Results([]);
      setStage2TopWear(null);
      setStage2BottomWear(null);
      setStage2Dress(null);
      setStage2Prompt('');
      setStage('stage2');
    };
    reader.readAsDataURL(file);
  };

  const handleStage2Upload = (type: 'model' | 'top' | 'bottom' | 'dress') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressedBase64 = await compressImage(base64);
      
      if (type === 'model') {
        let targetProjectId = currentProject?.id;
        if (!targetProjectId && user) {
          const docRef = await addDoc(collection(db, 'projects'), {
            name: `Uploads ${new Date().toLocaleDateString()}`,
            ownerId: user.uid,
            createdAt: serverTimestamp(),
            models: []
          });
          targetProjectId = docRef.id;
        }
        if (targetProjectId) {
          const modelRef = await addDoc(collection(db, 'models'), {
            project_id: targetProjectId,
            image_url: compressedBase64,
            prompt: 'Uploaded Model (Stage 2)',
            gender: 'Unknown',
            metadata: JSON.stringify({ ethnicity: 'Uploaded', gender: 'Model', age: 'Local' }),
            createdAt: serverTimestamp()
          });
          const newModel = { 
            id: modelRef.id, 
            project_id: targetProjectId, 
            image_url: compressedBase64, 
            metadata: JSON.stringify({ ethnicity: 'Uploaded', gender: 'Model', age: 'Local' }) 
          } as any;
          setModels([newModel, ...models]);
          setSelectedModel(newModel);
        }
      } else if (type === 'top') {
        setStage2TopWear(compressedBase64);
      } else if (type === 'bottom') {
        setStage2BottomWear(compressedBase64);
      } else if (type === 'dress') {
        setStage2Dress(compressedBase64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleError = (err: any) => {
    let errorMessage = err.message || String(err);
    
    if (errorMessage.startsWith('{')) {
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error?.message) errorMessage = parsed.error.message;
      } catch (e) {}
    }

    const isQuotaError = errorMessage.toLowerCase().includes('429') || 
                        errorMessage.toLowerCase().includes('quota') || 
                        errorMessage.toLowerCase().includes('resource_exhausted') ||
                        errorMessage.toLowerCase().includes('limit');
    
    const isEntityNotFound = errorMessage.includes('Requested entity was not found');
    const isPermissionDenied = errorMessage.includes('403') || 
                              errorMessage.includes('PERMISSION_DENIED') ||
                              errorMessage.toLowerCase().includes('permission');
    
    if (isEntityNotFound || isPermissionDenied) {
      setError("API Key Error: This feature requires a valid paid Google Cloud API key. Please select one to continue.");
      if (window.aistudio?.openSelectKey) {
        window.aistudio.openSelectKey();
      }
    } else if (isQuotaError) {
      setError("Quota Exceeded: You've reached the limit for the shared API key. Please select your own API key in the top bar to continue generating without limits.");
      if (window.aistudio?.openSelectKey) {
        window.aistudio.openSelectKey();
      }
    } else {
      setError(errorMessage || "An unexpected error occurred.");
    }
  };

  const handleGenerateModel = async () => {
    if (!currentProject || !user) return;
    setLoading(true);
    setError(null);
    try {
      const rawImageUrl = await generateModelImage(formData);
      const imageUrl = await compressImage(rawImageUrl);
      
      const modelRef = await addDoc(collection(db, 'models'), {
        project_id: currentProject.id,
        image_url: imageUrl,
        prompt: formData.customPrompt,
        gender: formData.gender,
        metadata: JSON.stringify(formData),
        createdAt: serverTimestamp()
      });

      const newModel = { 
        id: modelRef.id, 
        project_id: currentProject.id, 
        image_url: imageUrl, 
        ...formData, 
        metadata: JSON.stringify(formData) 
      } as any;
      
      setModels([newModel, ...models]);
      setSelectedModel(newModel);
      setStage2Results([]);
      setStage2TopWear(null);
      setStage2BottomWear(null);
      setStage2Dress(null);
      setStage2Prompt('');
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePoses = async () => {
    if (!selectedModel || !user) return;
    setLoading(true);
    setError(null);
    try {
      const posePacks: Record<string, string[]> = {
        'Fashion Pose Pack': [
          'Walking forward confidently', 'Side profile looking away', 'Hand on hip, elegant stance', 
          'Sitting on stool, relaxed', 'Arms crossed, bold look', 'Looking over shoulder, mysterious',
          'Dynamic jump, high energy', 'Adjusting glasses/hair', 'Laughing naturally', 'Runway walk, powerful'
        ],
        'Catalog Pose Pack': [
          'Front view, arms at sides', 'Back view, showing details', 'Side view, 45 degree angle',
          'Hands in pockets', 'Holding a bag/accessory', 'Checking watch/phone',
          'Leaning against wall', 'Sitting on floor, legs crossed', 'Walking away from camera', 'Close-up on face/details'
        ],
        'Walking Pose Pack': [
          'Striding forward, motion blur', 'Walking towards camera, smiling', 'Walking away, looking back',
          'Slow walk, thoughtful', 'Fast walk, busy look', 'Walking with hands in pockets',
          'Walking while talking on phone', 'Walking and laughing', 'Walking in rain (implied)', 'Walking up stairs'
        ],
        'Dynamic Pose Pack': [
          'Mid-air jump', 'Spinning around', 'Running towards camera',
          'Dancing, fluid motion', 'Stretching, athletic', 'Squatting, urban style',
          'Leaning forward, intense gaze', 'Reaching for camera', 'Turning quickly', 'Action shot, hair flying'
        ],
        'Editorial Pose Pack': [
          'High fashion, avant-garde', 'Dramatic shadows, moody', 'Lying down, artistic',
          'Vogue style, sharp angles', 'Minimalist, static', 'Shadow play, textured',
          'Extreme close-up, eyes focused', 'Distorted perspective', 'Multiple exposure look', 'Grainy film aesthetic'
        ],
        'Streetwear Pose Pack': [
          'Crouching on street', 'Hoodie up, mysterious', 'Leaning on graffiti wall',
          'Sitting on curb', 'Skateboarding pose', 'Adjusting sneakers',
          'Hands in hoodie pocket', 'Looking down at phone', 'Walking through crosswalk', 'Urban explorer stance'
        ],
        'Lingerie/Swimwear Pose Pack': [
          'Lying on silk sheets', 'Leaning against pool edge', 'Kneeling on sand',
          'Soft lighting, elegant curve', 'Playful splash in water', 'Stretching towards sun',
          'Looking over shoulder, seductive', 'Sitting on sunbed', 'Walking out of ocean', 'Adjusting strap'
        ]
      };
      
      const selectedPack = posePacks[posePack] || posePacks['Fashion Pose Pack'];
      const count = Math.min(parseInt(poseCount), selectedPack.length);
      const selectedPoses = selectedPack.slice(0, count);
      
      for (let i = 0; i < selectedPoses.length; i++) {
        const poseType = selectedPoses[i];
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 5000));

        const sourceImage = stage2Results.length > 0 ? stage2Results[0] : selectedModel.image_url;
        const rawImageUrl = await generatePose(sourceImage, poseType, poseBackground, poseGender, poseCategory);
        const imageUrl = await compressImage(rawImageUrl);
        
        await addDoc(collection(db, 'poses'), {
          model_id: selectedModel.id,
          image_url: imageUrl,
          pose_type: poseType,
          category: poseCategory,
          createdAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePhotoshoot = async () => {
    if (!selectedModel || !user) return;
    setLoading(true);
    setError(null);
    try {
      let rawImageUrl;
      if (isDesignerMode) {
        rawImageUrl = await generateDesignerPhotoshoot(
          selectedModel.image_url,
          layers
        );
      } else {
        // Flatten transparency for garments to improve AI segmentation
        const top = stage2TopWear ? await flattenTransparency(stage2TopWear) : null;
        const bottom = stage2BottomWear ? await flattenTransparency(stage2BottomWear) : null;
        const dress = stage2Dress ? await flattenTransparency(stage2Dress) : null;

        rawImageUrl = await generatePhotoshoot(
          selectedModel.image_url,
          top,
          bottom,
          dress,
          stage2Prompt
        );
      }
      const imageUrl = await compressImage(rawImageUrl);
      
      setStage2Results([imageUrl, ...stage2Results]);
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Listeners for models and poses
  useEffect(() => {
    if (!currentProject || !['stage1', 'stage2', 'stage3'].includes(stage)) return;
    const q = query(collection(db, 'models'), where('project_id', '==', currentProject.id), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Model));
      setModels(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'models');
    });
    return () => unsubscribe();
  }, [currentProject, stage]);

  useEffect(() => {
    if (!selectedModel || !['stage2', 'stage3'].includes(stage)) return;
    const q = query(collection(db, 'poses'), where('model_id', '==', selectedModel.id), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pose));
      setPoses(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'poses');
    });
    return () => unsubscribe();
  }, [selectedModel, stage]);

  const selectProject = async (p: Project) => {
    setCurrentProject(p);
    setSelectedModel(null);
    setStage('stage1');
  };

  const selectModel = async (m: Model) => {
    setSelectedModel(m);
    setStage2Results([]);
    setStage2TopWear(null);
    setStage2BottomWear(null);
    setStage2Dress(null);
    setStage2Prompt('');
    setStage('stage2');
  };

  const handleDownloadZip = async () => {
    if (!poses.length) return;
    setLoading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`${currentProject?.name || 'Project'}_PosePack`);
      
      for (let i = 0; i < poses.length; i++) {
        const pose = poses[i];
        const base64Data = pose.image_url.split(',')[1];
        folder?.file(`${pose.pose_type.replace(/\s+/g, '_')}_${i + 1}.png`, base64Data, { base64: true });
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${currentProject?.name || 'Project'}_Poses.zip`);
    } catch (err: any) {
      setError("Failed to generate ZIP: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSingle = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, filename);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct saveAs if fetch fails (e.g. CORS)
      saveAs(url, filename);
    }
  };

  const handleExportPhotoshoot = async (url: string, filename: string, resolution: 'default' | 'hq' | '4k', silent: boolean = false) => {
    if (resolution === 'default') {
      saveAs(url, filename);
      return;
    }

    if (!silent) setIsExporting(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const base64 = canvas.toDataURL('image/png');
      
      // Use Gemini to enhance the image
      let finalImage = base64;
      try {
        finalImage = await enhanceImage(base64, resolution as any, isCompressionEnabled);
      } catch (enhanceError) {
        console.warn('Enhancement failed, falling back to original image:', enhanceError);
        // If it's not silent, we might want to inform the user but still let them have the image
        if (!silent) {
          setError("Enhancement failed due to service load. Downloading original image instead.");
          setTimeout(() => setError(null), 5000);
        }
      }
      
      saveAs(finalImage, filename.replace('.png', `_${resolution}.png`));
    } catch (error: any) {
      console.error('Export error:', error);
      if (!silent) handleError(error);
    } finally {
      if (!silent) setIsExporting(false);
    }
  };

  const toggleModelSelection = (id: string) => {
    const newSelected = new Set(selectedModelIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedModelIds(newSelected);
  };

  const handleBulkDownload = async () => {
    if (selectedModelIds.size === 0) return;
    
    setIsExporting(true);
    try {
      const selectedModelsList = models.filter(m => selectedModelIds.has(m.id));
      for (const m of selectedModelsList) {
        await handleExportPhotoshoot(m.image_url, `model_${m.id}.png`, stage1ExportRes, true);
      }
    } catch (error: any) {
      handleError(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b2e_0%,#05020a_100%)] pointer-events-none" />
      
      <PricingModal 
        isOpen={showPricingModal} 
        onClose={() => setShowPricingModal(false)} 
        onUpgrade={handleUpgrade}
        currentPlan={userProfile?.plan || 'free'}
      />

      {/* API Settings Modal */}
      <AnimatePresence>
        {showAPISettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAPISettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl p-8"
            >
              <button 
                onClick={() => setShowAPISettings(false)}
                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all z-10"
              >
                <X size={20} />
              </button>

              <div className="space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Settings size={32} className="text-brand-accent" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white mb-2">API Settings</h3>
                  <p className="text-white/40 text-sm">Configure your AI connection keys</p>
                </div>

                <div className="space-y-6">
                  {/* AI Key Info */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">API Key</label>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Key size={16} className="text-brand-accent" />
                        <span className="text-xs text-white/60">
                          {window.aistudio?.hasSelectedApiKey ? "Personal Key Active" : "Shared Key (Limited)"}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setShowAPISettings(false);
                          window.aistudio?.openSelectKey?.();
                        }}
                        className="text-[10px] font-bold text-brand-accent uppercase tracking-widest hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Local Proxy Settings */}
                  <div className="space-y-4">
                    <div className="h-[1px] bg-white/5" />
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Local Proxy (Gaming PC Mode)</label>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-[10px] text-white/30 uppercase tracking-tighter">Proxy URL</p>
                        <input 
                          type="text"
                          value={localProxyUrl}
                          onChange={(e) => setLocalProxyUrl(e.target.value)}
                          placeholder="https://your-tunnel.trycloudflare.com"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-brand-accent outline-none transition-all"
                        />
                        {localProxyUrl && !localProxyUrl.startsWith('https') && window.location.protocol === 'https:' && (
                          <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                            <Shield size={12} />
                            Warning: Using HTTP on an HTTPS site may be blocked by your browser. Use a secure tunnel (HTTPS).
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] text-white/30 uppercase tracking-tighter">Proxy API Key</p>
                        <input 
                          type="password"
                          value={localProxyKey}
                          onChange={(e) => setLocalProxyKey(e.target.value)}
                          placeholder="Enter your proxy secret key"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-brand-accent outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-[10px] h-8 border-white/5 hover:bg-white/5"
                        onClick={async () => {
                          try {
                            const baseUrl = localProxyUrl.trim().replace(/\/$/, '');
                            const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
                            const response = await fetch(`${url}/api/generate`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': localProxyKey || ''
                              },
                              body: JSON.stringify({ prompt: 'ping', task: 'text' })
                            });
                            if (response.ok) {
                              alert("Connection Successful! Your local proxy is reachable.");
                            } else {
                              const err = await response.json().catch(() => ({ error: 'Unknown error' }));
                              alert(`Connection Failed: ${err.error || response.statusText}`);
                            }
                          } catch (err: any) {
                            alert(`Connection Error: ${err.message}. Make sure your tunnel is active and the URL is correct.`);
                          }
                        }}
                      >
                        <RefreshCw size={12} className="mr-2" />
                        Test Connection
                      </Button>
                    </div>
                  </div>

                  <Button 
                    variant="primary" 
                    className="w-full py-4"
                    onClick={saveAPISettings}
                  >
                    Save & Reload App
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <header className="border-b border-white/5 px-8 py-3 flex items-center justify-between bg-brand-bg/60 backdrop-blur-xl sticky top-0 z-50">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileUpload} 
        />
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setStage('landing')}>
          <Logo className="w-10 h-10" />
          <h1 className="font-display text-xl font-bold tracking-tight text-multi-color">VP-Ai</h1>
        </div>
        
        <nav className="flex items-center gap-6">
          <Button variant="ghost" className="text-[11px] font-bold uppercase tracking-widest text-white/40 hover:text-white" onClick={() => setStage('landing')}>Dashboard</Button>
          <Button variant="primary" className="text-[11px] font-bold uppercase tracking-widest py-2 px-5 rounded-full" onClick={() => setShowNewProjectModal(true)}>
            <Plus size={14} /> New Project
          </Button>
        </nav>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
              <button 
                onClick={() => setIsDesignerMode(false)}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${!isDesignerMode ? 'bg-brand-accent text-black' : 'text-white/40 hover:text-white'}`}
              >
                Normal
              </button>
              <button 
                onClick={() => setIsDesignerMode(true)}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${isDesignerMode ? 'bg-brand-accent text-black' : 'text-white/40 hover:text-white'}`}
              >
                Designer
              </button>
            </div>

            <button 
              onClick={toggleGenMode}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                genMode === 'local' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent'
              }`}
            >
              {genMode === 'local' ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Run on PC</span>
                </>
              ) : (
                <>
                  <Zap size={10} className="animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Cloud API</span>
                </>
              )}
            </button>
            
            <button 
              onClick={() => setShowAPISettings(true)}
              className="text-[9px] font-bold uppercase tracking-wider text-white/30 hover:text-white transition-colors flex items-center gap-1"
            >
              <Settings size={10} /> API Settings
            </button>
            <button 
              onClick={() => window.aistudio?.openSelectKey?.()}
              className="text-[9px] font-bold uppercase tracking-wider text-brand-accent hover:text-brand-accent/80 transition-colors flex items-center gap-1"
            >
              <Key size={10} /> Upgrade Key
            </button>
            <button 
              onClick={() => setStage('setup-guide')}
              className="text-[9px] font-bold uppercase tracking-wider text-white/30 hover:text-white transition-colors"
            >
              Setup PC Mode
            </button>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              {userProfile?.role === 'admin' && (
                <button 
                  onClick={() => setStage('admin')}
                  className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${stage === 'admin' ? 'text-brand-accent' : 'text-white/30 hover:text-white'}`}
                >
                  <Shield size={12} /> Admin
                </button>
              )}
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-[8px] font-bold text-white/30 uppercase tracking-tighter">Logged in as</p>
                  <p className="text-[10px] font-bold text-white truncate max-w-[100px]">{user.displayName}</p>
                </div>
                <img src={user.photoURL || ''} className="w-7 h-7 rounded-full border border-white/20" />
                <button 
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-red-400"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          )}
          
          <Button 
            variant="secondary" 
            className="hidden md:flex gap-2 py-2 px-5 rounded-full border-white/5 text-[11px] font-bold uppercase tracking-widest"
            onClick={() => setShowPricingModal(true)}
          >
            <Zap size={14} className="text-brand-accent" />
            Upgrade Pro
          </Button>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-12 relative z-10">
        <AnimatePresence mode="wait">
          {authLoading ? (
            <div className="min-h-[60vh] flex items-center justify-center">
              <Loader2 className="animate-spin text-brand-accent" size={48} />
            </div>
          ) : !user ? (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoginScreen onLogin={handleLogin} />
            </motion.div>
          ) : userProfile?.status === 'blocked' ? (
            <motion.div
              key="blocked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <BlockedScreen onLogout={handleLogout} />
            </motion.div>
          ) : (
            <>
              {stage === 'setup-guide' && (
                <SetupGuide onBack={() => setStage('landing')} />
              )}
              {stage === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="max-w-3xl">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase tracking-widest mb-6"
                >
                  <Sparkles size={12} /> Next-Gen Fashion AI
                </motion.div>
                <h2 className="text-7xl font-display font-bold leading-[1.1] mb-6 tracking-tight">
                  The Future of <br />
                  <span className="text-multi-color italic">Virtual Photoshoots</span>
                </h2>
                <p className="text-lg text-white/40 mb-8 leading-relaxed max-w-xl">
                  Generate ultra-realistic human models and create multi-pose catalog sets in seconds. 
                  Built for fashion brands and marketing creatives.
                </p>
                <div className="flex gap-4">
                  <Button onClick={() => setShowNewProjectModal(true)} className="h-12 px-8 text-base">
                    Start Creating <ArrowRight size={18} />
                  </Button>
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="h-12 px-8 text-base">
                    Upload Image
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { stage: "Stage 1: Model Gen", desc: "Create unique, ultra-realistic human models with precise control.", icon: User, colorClass: "bg-brand-accent/10 text-brand-accent group-hover:bg-brand-accent", hoverText: "group-hover:text-brand-accent", action: () => setStage('stage1') },
                  { stage: "Stage 2: Virtual Photoshoot", desc: "Combine your model with garments using human parsing.", icon: Camera, colorClass: "bg-brand-secondary/10 text-brand-secondary group-hover:bg-brand-secondary", hoverText: "group-hover:text-brand-secondary", action: () => setStage('stage2') },
                  { stage: "Stage 3: Pose Pack", desc: "Transform your model into 10+ different poses.", icon: Layers, colorClass: "bg-brand-tertiary/10 text-brand-tertiary group-hover:bg-brand-tertiary", hoverText: "group-hover:text-brand-tertiary", action: () => setStage('stage3') },
                  { stage: "Stage 4: Image → Video", desc: "Transform static images into cinematic 4K videos.", icon: Zap, colorClass: "bg-brand-quaternary/10 text-brand-quaternary group-hover:bg-brand-quaternary", hoverText: "group-hover:text-brand-quaternary", action: () => setStage('stage4') }
                ].map((s, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ y: -5, scale: 1.02 }}
                    onClick={s.action}
                    className={`p-8 ai-card space-y-6 group cursor-pointer`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.2)] group-hover:text-white transition-all duration-500 ${s.colorClass}`}>
                      <s.icon size={28} />
                    </div>
                    <div className="space-y-2">
                      <h3 className={`text-xl font-bold transition-colors ${s.hoverText}`}>
                        <span className="bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded text-sm mr-2 group-hover:bg-brand-accent/30">Stage</span>
                        {s.stage.split(': ')[1]}
                      </h3>
                      <p className="text-xs text-white/40 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="col-header text-xs">Recent Projects</h3>
                    {projects.length > 0 && (
                      <button 
                        onClick={handleClearAllProjects}
                        className={`text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${confirmClear === 'all_projects' ? 'text-red-500' : 'text-white/20 hover:text-red-400'}`}
                      >
                        <Trash2 size={10} /> {confirmClear === 'all_projects' ? 'Confirm Clear All?' : 'Clear All'}
                      </button>
                    )}
                  </div>
                  <div className="h-px flex-1 bg-white/5 mx-6" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {projects.map(p => (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={p.id} 
                      onClick={() => selectProject(p)}
                      className="p-6 ai-card cursor-pointer group relative"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/20 group-hover:bg-brand-accent/20 group-hover:text-brand-accent transition-all duration-500">
                          <ImageIcon size={20} />
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleDeleteProject(e, p.id)}
                            className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${confirmClear === `project_${p.id}` ? 'bg-red-500 text-white opacity-100' : 'text-white/10 hover:text-red-400 hover:bg-red-400/10'}`}
                          >
                            {confirmClear === `project_${p.id}` ? <Trash2 size={14} /> : <X size={14} />}
                          </button>
                          <ChevronRight size={16} className="text-white/20 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                      <h4 className="text-base font-bold truncate text-white group-hover:text-brand-accent transition-colors">{p.name}</h4>
                      <p className="text-[10px] text-white/30 mt-2 font-mono uppercase tracking-wider">
                        {p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </p>
                    </motion.div>
                  ))}
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewProjectModal(true)}
                    className="p-6 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-brand-accent/20 hover:bg-brand-accent/5 transition-all group"
                  >
                    <Plus size={24} className="text-white/10 group-hover:text-brand-accent transition-all" />
                    <span className="text-[10px] font-bold text-white/20 group-hover:text-brand-accent uppercase tracking-widest">New Project</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'stage4' && (
            <motion.div 
              key="stage4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h2 className="text-5xl font-display font-bold ai-gradient-text">Social Media Ad Generator</h2>
                <p className="text-white/60">Transform your fashion photos into high-converting social media ads with AI-powered motion and overlays.</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                  <Zap size={12} /> Social Media Ad Synthesis Enabled
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 space-y-8">
                  <div className="ai-card p-8 space-y-6">
                    <div className="space-y-4">
                      <label className="col-header">Generation Mode</label>
                      <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                        <button 
                          onClick={() => setStage4Mode('fashion')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${stage4Mode === 'fashion' ? 'bg-brand-accent text-brand-bg' : 'text-white/40 hover:text-white'}`}
                        >
                          FASHION MODE
                        </button>
                        <button 
                          onClick={() => setStage4Mode('normal')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${stage4Mode === 'normal' ? 'bg-brand-secondary text-white' : 'text-white/40 hover:text-white'}`}
                        >
                          NORMAL MODE
                        </button>
                      </div>
                    </div>

                    {stage4Mode === 'fashion' && (
                      <>
                        <Input 
                          label="Category" 
                          value={stage4Category} 
                          onChange={setStage4Category}
                          options={['Dress', 'Suit', 'Streetwear', 'Luxury', 'Accessory', 'Footwear']}
                        />
                        <Input 
                          label="Style Preset" 
                          value={stage4Style} 
                          onChange={setStage4Style}
                          options={['Luxury', 'Runway', 'Studio', 'Editorial', 'Cinematic']}
                        />
                      </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label="Resolution" 
                        value={stage4Resolution} 
                        onChange={setStage4Resolution}
                        options={['1080p', '4K']}
                      />
                      <Input 
                        label="Duration" 
                        value={stage4Duration.toString()} 
                        onChange={(v: string) => setStage4Duration(parseInt(v))}
                        options={['5', '10', '15']}
                      />
                    </div>

                    <div className="space-y-4 pt-4">
                      <Button 
                        className="w-full h-14 gap-2" 
                        disabled={stage4Loading || !stage4Image}
                        onClick={handleGenerateVideo}
                      >
                        {stage4Loading ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
                        Generate Video
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="w-full h-14"
                        onClick={() => setStage('landing')}
                      >
                        Back to Dashboard
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="ai-card p-4 aspect-[3/4] relative group overflow-hidden">
                      {stage4Image ? (
                        <>
                          <img src={stage4Image} className="w-full h-full object-cover rounded-2xl" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" onClick={() => setStage4Image(null)}>Replace Image</Button>
                          </div>
                        </>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-colors rounded-2xl border-2 border-dashed border-white/10">
                          <Upload size={48} className="text-white/20" />
                          <span className="col-header">Upload Source Image</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleStage4Upload} />
                        </label>
                      )}
                    </div>

                    <div className="ai-card p-4 aspect-[3/4] relative bg-black/40 flex items-center justify-center overflow-hidden">
                      {stage4VideoUrl ? (
                        <video 
                          key={stage4VideoUrl}
                          src={stage4VideoUrl} 
                          controls 
                          autoPlay 
                          muted
                          playsInline
                          loop 
                          className="w-full h-full object-cover rounded-2xl shadow-2xl"
                        />
                      ) : (
                        <div className="text-center space-y-4">
                          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                            <Zap size={32} className="text-white/10" />
                          </div>
                          <p className="col-header">Video Preview Output</p>
                        </div>
                      )}
                      {stage4Loading && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-6 z-20">
                          <div className="relative">
                            <div className="w-24 h-24 border-4 border-brand-accent/20 rounded-full animate-spin border-t-brand-accent shadow-[0_0_30px_rgba(0,242,255,0.2)]" />
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-accent animate-pulse" size={32} />
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-xl font-display font-bold ai-gradient-text animate-pulse">AI Matching Cinematic Video...</p>
                            <p className="text-xs text-white/40 uppercase tracking-[0.3em]">Analyzing Material & Lighting</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ai-card p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Sparkles className="text-brand-accent" size={20} />
                        AI Video Prompt
                      </h3>
                      <Button 
                        variant="ghost" 
                        className="text-[10px] uppercase tracking-widest"
                        onClick={() => setStage4Prompt('')}
                      >
                        Reset Prompt
                      </Button>
                    </div>
                    <textarea 
                      value={stage4Prompt}
                      onChange={(e) => setStage4Prompt(e.target.value)}
                      placeholder="AI will generate a prompt based on your image..."
                      className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-white/80 focus:outline-none focus:border-brand-accent/50 transition-all resize-none leading-relaxed"
                    />
                    {stage4Analysis && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(stage4Analysis).map(([key, value]: [string, any]) => (
                          <div key={key} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase text-white/30">{key}:</span>
                            <span className="text-[10px] text-white/70">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {stage4History.length > 0 && (
                <div className="space-y-8 pt-12">
                  <div className="flex items-center justify-between">
                    <h3 className="col-header text-sm">Generation History</h3>
                    <div className="h-px flex-1 bg-white/10 mx-6" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stage4History.filter(item => item.videoUrl || item.sourceImage).map((item) => (
                      <div key={item.id} className="ai-card overflow-hidden group">
                        <div className="aspect-video relative bg-black/40 flex items-center justify-center">
                          {item.videoUrl ? (
                            <video 
                              key={item.videoUrl}
                              src={item.videoUrl} 
                              poster={item.sourceImage}
                              muted
                              playsInline
                              className="w-full h-full object-cover" 
                            />
                          ) : item.sourceImage ? (
                            <img 
                              src={item.sourceImage} 
                              alt={item.prompt || "Video thumbnail"}
                              className="w-full h-full object-cover opacity-80" 
                            />
                          ) : null}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            {item.videoUrl && (
                              <Button variant="secondary" className="p-2" onClick={() => setStage4VideoUrl(item.videoUrl)}>
                                <RefreshCw size={16} />
                              </Button>
                            )}
                            {item.videoUrl && (
                              <a href={item.videoUrl} download className="p-2 bg-brand-accent text-brand-bg rounded-lg">
                                <Download size={16} />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{item.mode} Mode</p>
                          <p className="text-xs text-white/70 line-clamp-2 italic">"{item.prompt}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {stage === 'stage1' && (
            <motion.div 
              key="stage1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              {!currentProject ? (
                <div className="lg:col-span-12 flex flex-col items-center justify-center py-20 space-y-6 ai-card">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <Layers size={32} className="text-white/20" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">No Project Selected</h3>
                    <p className="text-white/40">Please select an existing project or create a new one to start generating models.</p>
                  </div>
                  <Button onClick={() => setShowNewProjectModal(true)}>Create New Project</Button>
                </div>
              ) : (
                <>
                  <div className="lg:col-span-4 space-y-8">
                <div className="space-y-2">
                  <h2 className="text-4xl font-display font-bold">Model Generator</h2>
                  <p className="text-sm text-white/50">Define your ideal fashion model parameters.</p>
                </div>

                <div className="space-y-6 ai-card p-8">
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Gender" 
                      value={formData.gender} 
                      onChange={(v: string) => {
                        let newClothing = formData.clothing;
                        if (v === 'Female') newClothing = 'Minimalist white Bra and Panty';
                        else if (v === 'Male') newClothing = 'Minimalist white fitted sleeveless Tshirt and Panty';
                        setFormData({...formData, gender: v, clothing: newClothing});
                      }} 
                      options={['Female', 'Male', 'Non-binary']}
                    />
                    <Input 
                      label="Age" 
                      value={formData.age} 
                      onChange={(v: string) => setFormData({...formData, age: v})} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Ethnicity" 
                      value={formData.ethnicity} 
                      onChange={(v: string) => setFormData({...formData, ethnicity: v})} 
                      options={['Caucasian', 'African', 'Asian', 'Hispanic', 'Middle Eastern', 'South Asian', 'Mixed']}
                    />
                    <Input 
                      label="Skin Color" 
                      value={formData.skinColor} 
                      onChange={(v: string) => setFormData({...formData, skinColor: v})} 
                      options={['Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Brown', 'Dark Brown', 'Black']}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Body Type" 
                      value={formData.bodyType} 
                      onChange={(v: string) => setFormData({...formData, bodyType: v})} 
                      options={['Slim', 'Athletic', 'Curvy', 'Plus Size']}
                    />
                    <Input 
                      label="Hair Style" 
                      value={formData.hairStyle} 
                      onChange={(v: string) => setFormData({...formData, hairStyle: v})} 
                      options={['Bald', 'Buzz cut', 'Short crop', 'Bob', 'Shoulder length', 'Long wavy', 'Long straight', 'Curly', 'Afro', 'Braids', 'Ponytail', 'Updo']}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Face Details" 
                      value={formData.faceDetails} 
                      onChange={(v: string) => setFormData({...formData, faceDetails: v})} 
                      options={['Symmetrical, sharp jawline', 'Soft round features', 'High cheekbones', 'Freckles', 'Mature with character lines', 'Striking eyes']}
                    />
                    <Input 
                      label="Face Expression" 
                      value={formData.faceExpression} 
                      onChange={(v: string) => setFormData({...formData, faceExpression: v})} 
                      options={['Neutral', 'Gentle smile', 'Fierce gaze', 'Laughing', 'Pensive', 'Smirking']}
                    />
                  </div>
                  <Input 
                    label="Clothing Style" 
                    value={formData.clothing} 
                    onChange={(v: string) => setFormData({...formData, clothing: v})} 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Lighting" 
                      value={formData.lighting} 
                      onChange={(v: string) => setFormData({...formData, lighting: v})} 
                      options={['Studio softbox', 'Natural sunlight', 'Dramatic noir', 'Neon city', 'Golden hour']}
                    />
                    <Input 
                      label="Mood" 
                      value={formData.mood} 
                      onChange={(v: string) => setFormData({...formData, mood: v})} 
                      options={['Neutral', 'Happy', 'Serious', 'Confident', 'Dreamy', 'Energetic']}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Camera Angle" 
                      value={formData.cameraAngle} 
                      onChange={(v: string) => setFormData({...formData, cameraAngle: v})} 
                      options={['Full body shot', 'Medium shot', 'Close-up portrait', 'Low angle', 'High angle', 'Dutch angle']}
                    />
                    <Input 
                      label="Background" 
                      value={formData.background} 
                      onChange={(v: string) => setFormData({...formData, background: v})} 
                      options={['Studio white background', 'Urban street', 'Nature/Forest', 'Minimalist concrete', 'Luxury interior', 'Beach']}
                    />
                  </div>
                  
                  <div className="pt-4 space-y-3">
                    <Button 
                      onClick={handleGenerateModel} 
                      disabled={loading}
                      className="w-full h-14 text-lg"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                      Generate Model
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <div className={`w-1.5 h-1.5 rounded-full ${genMode === 'local' ? 'bg-emerald-500' : 'bg-brand-accent'}`} />
                      Using {genMode === 'local' ? 'Local PC Mode' : 'Cloud Mode'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="col-header">Generated Models</h3>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Export Quality:</span>
                      <div className="flex bg-black/50 rounded-lg p-1">
                        <button 
                          onClick={() => setStage1ExportRes('default')}
                          className={`px-3 py-1 text-[10px] rounded-md transition-colors font-bold select-none ${stage1ExportRes === 'default' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                        >
                          NORMAL
                        </button>
                        <button 
                          onClick={() => setStage1ExportRes('hq')}
                          className={`px-3 py-1 text-[10px] rounded-md transition-colors font-bold select-none ${stage1ExportRes === 'hq' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                        >
                          HD
                        </button>
                        <button 
                          onClick={() => setStage1ExportRes('4k')}
                          className={`px-3 py-1 text-[10px] rounded-md transition-colors font-bold select-none ${stage1ExportRes === '4k' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                        >
                          4K
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Compressed:</span>
                      <div className="flex bg-black/50 rounded-lg p-1">
                        <button 
                          onClick={() => setIsCompressionEnabled(true)}
                          className={`px-3 py-1 text-[10px] rounded-md transition-colors font-bold select-none ${isCompressionEnabled ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                        >
                          ON
                        </button>
                        <button 
                          onClick={() => setIsCompressionEnabled(false)}
                          className={`px-3 py-1 text-[10px] rounded-md transition-colors font-bold select-none ${!isCompressionEnabled ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                        >
                          OFF
                        </button>
                      </div>
                    </div>

                    <div className="flex bg-black/50 rounded-lg p-1">
                      <button 
                        onClick={() => {
                          if (selectedModelIds.size === models.length) {
                            setSelectedModelIds(new Set());
                          } else {
                            setSelectedModelIds(new Set(models.map(m => m.id)));
                          }
                        }}
                        className={`px-3 py-1 text-[10px] rounded-md transition-colors font-bold select-none ${selectedModelIds.size === models.length && models.length > 0 ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                      >
                        {selectedModelIds.size === models.length && models.length > 0 ? 'DESELECT ALL' : 'SELECT ALL'}
                      </button>
                    </div>

                    <Button 
                      variant="secondary" 
                      className="py-2 px-4 text-xs bg-brand-accent/10 border-brand-accent/30 text-brand-accent hover:bg-brand-accent/20 select-none"
                      onClick={handleBulkDownload}
                      disabled={selectedModelIds.size === 0 || isExporting}
                    >
                      {isExporting ? <Loader2 size={14} className="animate-spin mr-2" /> : <Download size={14} className="mr-2" />}
                      {isExporting ? 'Exporting...' : `Download Selected (${selectedModelIds.size})`}
                    </Button>

                    <div className="flex gap-3">
                    {models.length > 0 && (
                      <Button 
                        variant="secondary" 
                        className={`py-2 px-6 text-sm border-red-500/20 transition-all ${confirmClear === 'models' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                        onClick={handleClearModels}
                      >
                        <Trash2 size={14} /> {confirmClear === 'models' ? 'Confirm Clear?' : 'Clear Images'}
                      </Button>
                    )}
                    <Button 
                      variant="secondary" 
                      className="py-2 px-6 text-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Local
                    </Button>
                    <Button variant="secondary" className="py-2 px-6 text-sm" onClick={() => setStage('landing')}>Back</Button>
                  </div>
                </div>
              </div>

              {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl text-sm flex flex-col gap-4"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">!</div>
                      <p className="font-medium">{error}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="secondary" 
                        className="py-2 px-4 text-xs bg-white/5 border-red-500/30 text-red-400 hover:bg-red-500/10" 
                        onClick={handleGenerateModel}
                      >
                        <RefreshCw size={14} /> Retry
                      </Button>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {loading && !selectedModel && (
                    <div className="aspect-[3/4] ai-card flex flex-col items-center justify-center gap-6 animate-pulse">
                      <div className="ai-scan-line" />
                      <div className="relative">
                        <Loader2 className="animate-spin text-brand-accent" size={48} />
                        <Sparkles className="absolute -top-2 -right-2 text-brand-tertiary animate-bounce" size={20} />
                      </div>
                      <p className="col-header text-brand-accent animate-pulse">Synthesizing Model...</p>
                    </div>
                  )}
                  
                  {models.map(m => (
                    <motion.div 
                      layoutId={`model-${m.id}`}
                      key={m.id}
                      className={`relative group rounded-[2rem] overflow-hidden border-2 transition-all duration-500 cursor-pointer ${selectedModel?.id === m.id ? 'border-brand-accent shadow-[0_0_30px_rgba(0,242,255,0.3)]' : 'border-white/10'}`}
                      onClick={() => setSelectedModel(m)}
                    >
                      <div 
                        className="absolute top-4 left-4 z-20 p-2 bg-black/50 backdrop-blur-md rounded-xl border border-white/10 text-white hover:bg-black/70 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleModelSelection(m.id);
                        }}
                      >
                        {selectedModelIds.has(m.id) ? (
                          <CheckSquare size={20} className="text-brand-accent" />
                        ) : (
                          <Square size={20} className="text-white/40" />
                        )}
                      </div>

                      <img src={m.image_url} alt="Generated Model" className="w-full aspect-[3/4] object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <Button 
                          variant="secondary" 
                          className="p-2 bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 flex items-center gap-2 px-3 select-none"
                          disabled={isExporting}
                          onClick={(e: any) => {
                            e.stopPropagation();
                            handleExportPhotoshoot(m.image_url, `model_${m.id}.png`, stage1ExportRes);
                          }}
                        >
                          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                          <span className="text-[10px] font-bold">{isExporting ? '...' : stage1ExportRes.toUpperCase()}</span>
                        </Button>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8">
                        <div className="space-y-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <p className="text-white text-lg font-bold">
                            {JSON.parse(m.metadata).ethnicity} {JSON.parse(m.metadata).gender}
                          </p>
                          <Button className="w-full py-3" onClick={() => selectModel(m)}>
                            Stage 2: Photoshoot <ArrowRight size={18} />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              </>
              )}
            </motion.div>
          )}

          {stage === 'stage2' && (
            <motion.div 
              key="stage2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              {!selectedModel ? (
                <div className="lg:col-span-12 flex flex-col items-center justify-center py-20 space-y-6 ai-card">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <User size={32} className="text-white/20" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">No Model Selected</h3>
                    <p className="text-white/40">Please select or generate a model in Stage 1 first.</p>
                  </div>
                  <Button onClick={() => setStage('stage1')}>Go to Stage 1</Button>
                </div>
              ) : (
                <>
                  <div className="lg:col-span-4 space-y-8">
                <div className="space-y-2">
                  <h2 className="text-4xl font-display font-bold">Virtual Photoshoot</h2>
                  <p className="text-sm text-white/50">Combine your model with garments.</p>
                </div>
                
                <div className="ai-card p-6 space-y-6">
                  <div className="space-y-4">
                    <p className="col-header">1. Model Image</p>
                    {selectedModel ? (
                      <div className="relative group rounded-xl overflow-hidden aspect-[3/4] max-h-48 w-full bg-black/50">
                        <img src={selectedModel.image_url} className="w-full h-full object-cover" alt="Model" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm transition-colors">
                            Change Model
                            <input type="file" className="hidden" accept="image/*" onChange={handleStage2Upload('model')} />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                        <Upload size={24} className="text-white/40 mb-2" />
                        <span className="text-sm text-white/60">Upload Model</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleStage2Upload('model')} />
                      </label>
                    )}
                  </div>

                  {!isDesignerMode ? (
                    <>
                      <div className="space-y-4">
                        <p className="col-header">2. Garments</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs text-white/50">Top Wear</label>
                            {stage2TopWear ? (
                              <div className="relative group rounded-xl overflow-hidden aspect-square w-full bg-black/50">
                                <img src={stage2TopWear} className="w-full h-full object-cover" alt="Top" />
                                <button onClick={() => setStage2TopWear(null)} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500/50 transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                                <Upload size={20} className="text-white/40 mb-1" />
                                <span className="text-xs text-white/60">Upload</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleStage2Upload('top')} />
                              </label>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-white/50">Bottom Wear</label>
                            {stage2BottomWear ? (
                              <div className="relative group rounded-xl overflow-hidden aspect-square w-full bg-black/50">
                                <img src={stage2BottomWear} className="w-full h-full object-cover" alt="Bottom" />
                                <button onClick={() => setStage2BottomWear(null)} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500/50 transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                                <Upload size={20} className="text-white/40 mb-1" />
                                <span className="text-xs text-white/60">Upload</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleStage2Upload('bottom')} />
                              </label>
                            )}
                          </div>
                        </div>
                        
                        <div className="relative py-2">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-brand-bg px-2 text-xs text-white/40">OR</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs text-white/50">Full Dress</label>
                          {stage2Dress ? (
                            <div className="relative group rounded-xl overflow-hidden h-32 w-full bg-black/50">
                              <img src={stage2Dress} className="w-full h-full object-cover" alt="Dress" />
                              <button onClick={() => setStage2Dress(null)} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500/50 transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                              <Upload size={20} className="text-white/40 mb-1" />
                              <span className="text-xs text-white/60">Upload Dress</span>
                              <input type="file" className="hidden" accept="image/*" onChange={handleStage2Upload('dress')} />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="col-header">3. Photoshoot Prompt</p>
                        <textarea 
                          value={stage2Prompt}
                          onChange={(e) => setStage2Prompt(e.target.value)}
                          placeholder="Describe lighting, environment, and fashion mood..."
                          className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-accent/50 transition-colors resize-none"
                        />
                      </div>
                    </>
                  ) : (
                    <DesignerPanel 
                      layers={layers}
                      setLayers={setLayers}
                      selectedLayerId={selectedLayerId}
                      setSelectedLayerId={setSelectedLayerId}
                    />
                  )}

                  <div className="pt-4 space-y-3">
                    <Button 
                      onClick={handleGeneratePhotoshoot} 
                      disabled={loading || !selectedModel || (isDesignerMode && layers.length === 0)}
                      className="w-full h-14 text-lg"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Camera size={20} />}
                      Generate Photoshoot
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <Lock size={12} className="text-brand-accent" />
                      Identity, Pose & Background Locked
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="col-header">Photoshoot Results</h3>
                  <div className="flex gap-3">
                    {isDesignerMode && (
                      <Button
                        variant="secondary"
                        className="py-2 px-4 text-xs border-brand-accent/30 text-brand-accent"
                        onClick={handleAutoColorways}
                        disabled={loading || layers.length === 0}
                      >
                        <Zap size={14} className="mr-2" /> Auto Colorways
                      </Button>
                    )}
                    {stage2Results.length > 0 && (
                      <Button 
                        variant="secondary" 
                        className="py-2 px-6 text-sm"
                        onClick={() => setStage('stage3')}
                      >
                        Next: Pose Generation <ArrowRight size={16} className="ml-2" />
                      </Button>
                    )}
                    <Button variant="secondary" className="py-2 px-6 text-sm" onClick={() => setStage('landing')}>Back</Button>
                  </div>
                </div>

                {isDesignerMode && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Design Variants</p>
                      <button
                        onClick={handleSaveVariant}
                        disabled={stage2Results.length === 0}
                        className="text-xs text-brand-accent hover:underline disabled:opacity-30"
                      >
                        + Save Current as Variant
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {variants.map((variant) => (
                        <div
                          key={variant.id}
                          onClick={() => handleSwitchVariant(variant.id)}
                          className={`flex-shrink-0 w-32 group cursor-pointer transition-all ${
                            activeVariantId === variant.id ? 'scale-105' : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className={`aspect-[3/4] rounded-xl overflow-hidden border-2 mb-2 ${
                            activeVariantId === variant.id ? 'border-brand-accent shadow-[0_0_15px_rgba(0,242,255,0.3)]' : 'border-white/10'
                          }`}>
                            {variant.outputImage ? (
                              <img src={variant.outputImage} className="w-full h-full object-cover" alt={variant.name} />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <ImageIcon size={24} className="text-white/10" />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-medium text-center truncate text-white/60">{variant.name}</p>
                        </div>
                      ))}
                      {variants.length === 0 && (
                        <div className="w-full py-8 border border-dashed border-white/10 rounded-2xl flex items-center justify-center">
                          <p className="text-xs text-white/20 italic">No variants saved yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {stage2Results.length === 0 && !loading && !error && (
                  <div className="h-[600px] flex flex-col items-center justify-center border border-white/5 rounded-[2rem] bg-white/[0.02]">
                    <Camera size={48} className="text-white/10 mb-4" />
                    <p className="text-white/40 text-lg">No photoshoots generated yet</p>
                    <p className="text-white/20 text-sm mt-2">Upload garments and generate to see results</p>
                  </div>
                )}

                {loading && stage2Results.length === 0 && (
                  <div className="h-[600px] flex flex-col items-center justify-center border border-white/5 rounded-[2rem] bg-white/[0.02]">
                    <Loader2 size={48} className="text-brand-accent animate-spin mb-4" />
                    <p className="text-white/60 text-lg animate-pulse">Generating photoshoot...</p>
                    <p className="text-white/40 text-sm mt-2">Applying garments and lighting</p>
                  </div>
                )}

                {stage2Results.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-white/60">Export Quality:</span>
                        <div className="flex bg-black/50 rounded-lg p-1">
                          <button 
                            onClick={() => setStage2ExportRes('default')}
                            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${stage2ExportRes === 'default' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                          >
                            Default
                          </button>
                          <button 
                            onClick={() => setStage2ExportRes('hq')}
                            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${stage2ExportRes === 'hq' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                          >
                            High Quality
                          </button>
                          <button 
                            onClick={() => setStage2ExportRes('4k')}
                            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${stage2ExportRes === '4k' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                          >
                            4K Upscale
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-white/60">Preview Mode:</span>
                        <div className="flex bg-black/50 rounded-lg p-1">
                          <button 
                            onClick={() => setShowMaskPreview(false)}
                            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${!showMaskPreview ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                          >
                            Result
                          </button>
                          <button 
                            onClick={() => setShowMaskPreview(true)}
                            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${showMaskPreview ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                          >
                            Masks
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-white/60">Compression:</span>
                        <div className="flex bg-black/50 rounded-lg p-1">
                          <button 
                            onClick={() => setIsCompressionEnabled(true)}
                            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${isCompressionEnabled ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                          >
                            On
                          </button>
                          <button 
                            onClick={() => setIsCompressionEnabled(false)}
                            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${!isCompressionEnabled ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/80'}`}
                          >
                            Off (HQ)
                          </button>
                        </div>
                      </div>
                    </div>

                    {isDesignerMode && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="col-header">Design Variants</h3>
                          <Button 
                            variant="secondary" 
                            onClick={handleSaveVariant}
                            className="py-1.5 px-4 text-[10px] rounded-full"
                          >
                            <Plus size={14} /> Save Current as Variant
                          </Button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                          {variants.map(v => (
                            <motion.div 
                              key={v.id}
                              whileHover={{ y: -2 }}
                              onClick={() => handleSwitchVariant(v.id)}
                              className={`min-w-[120px] ai-card p-3 cursor-pointer transition-all ${activeVariantId === v.id ? 'ring-2 ring-brand-accent border-transparent' : 'border-white/5 hover:border-white/20'}`}
                            >
                              <div className="aspect-[3/4] bg-black/40 rounded-xl mb-2 overflow-hidden">
                                {v.outputImage ? (
                                  <img src={v.outputImage} className="w-full h-full object-cover" alt={v.name} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white/10">
                                    <ImageIcon size={24} />
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-center truncate">{v.name}</p>
                            </motion.div>
                          ))}
                          {variants.length === 0 && (
                            <div className="w-full py-8 text-center text-xs text-white/20 border border-dashed border-white/5 rounded-2xl">
                              No variants saved yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {stage2Results.map((url, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative group rounded-2xl overflow-hidden ai-card"
                        >
                          <img src={url} alt={`Result ${i}`} className="w-full aspect-[3/4] object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <Button 
                              variant="secondary" 
                              className="bg-white/10 hover:bg-white/20 border-white/20"
                              onClick={() => handleExportPhotoshoot(url, `photoshoot_${i}.png`, stage2ExportRes)}
                            >
                              <Download size={16} className="mr-2" />
                              Download {stage2ExportRes.toUpperCase()}
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              </>
              )}
            </motion.div>
          )}

          {stage === 'stage3' && (
            <motion.div 
              key="stage3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-10"
            >
              {!selectedModel ? (
                <div className="lg:col-span-12 flex flex-col items-center justify-center py-20 space-y-6 ai-card">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <User size={32} className="text-white/20" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">No Model Selected</h3>
                    <p className="text-white/40">Please select or generate a model in Stage 1 first.</p>
                  </div>
                  <Button onClick={() => setStage('stage1')}>Go to Stage 1</Button>
                </div>
              ) : (
                <>
                  <div className="lg:col-span-4 space-y-8">
                <div className="space-y-2">
                  <h2 className="text-4xl font-display font-bold">Pose Generator</h2>
                  <p className="text-sm text-white/50">Generate multiple poses for your selected model.</p>
                </div>

                <div className="ai-card p-4">
                  <img src={stage2Results.length > 0 ? stage2Results[0] : selectedModel.image_url} alt="Source Model" className="w-full aspect-[3/4] object-cover rounded-[1.5rem]" referrerPolicy="no-referrer" />
                  <div className="p-6 space-y-2">
                    <p className="col-header">Source Identity</p>
                    <p className="text-lg font-bold text-white">Project: {currentProject?.name}</p>
                  </div>
                </div>

                <div className="space-y-6 ai-card p-8">
                  <Input 
                    label="Gender" 
                    value={poseGender} 
                    onChange={setPoseGender} 
                    options={['Female', 'Male']}
                  />
                  <Input 
                    label="Pose Pack" 
                    value={posePack} 
                    onChange={setPosePack} 
                    options={['Fashion Pose Pack', 'Catalog Pose Pack', 'Walking Pose Pack', 'Dynamic Pose Pack', 'Editorial Pose Pack', 'Streetwear Pose Pack', 'Lingerie/Swimwear Pose Pack']}
                  />
                  <Input 
                    label="Category" 
                    value={poseCategory} 
                    onChange={setPoseCategory} 
                    options={['Full Body', 'Top Wear', 'Bottom Wear', 'Dress', 'Outerwear', 'Bra', 'Panty', 'Swimsuit', 'Accessories', 'Headshot']}
                  />
                  <Input 
                    label="Number of Poses" 
                    value={poseCount} 
                    onChange={setPoseCount} 
                    options={['3', '5', '10']}
                  />
                  <Input 
                    label="Background" 
                    value={poseBackground} 
                    onChange={setPoseBackground} 
                    options={[
                      'Keep the Same Background', 
                      'Studio white background', 
                      'Studio grey background',
                      'Studio black background',
                      'Urban street, daytime', 
                      'Urban street, night neon',
                      'Nature/Forest, sunlight', 
                      'Beach, sunset',
                      'Minimalist concrete loft', 
                      'Luxury interior, modern', 
                      'Parisian cafe',
                      'Desert dunes',
                      'Mountain peak',
                      'Cyberpunk city',
                      'Art gallery'
                    ]}
                  />
                  
                  <div className="pt-4 space-y-3">
                    <Button 
                      onClick={handleGeneratePoses} 
                      disabled={loading}
                      className="w-full h-14 text-lg"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <Grid size={20} />}
                      Generate Pose Pack
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      <div className={`w-1.5 h-1.5 rounded-full ${genMode === 'local' ? 'bg-emerald-500' : 'bg-brand-accent'}`} />
                      Using {genMode === 'local' ? 'Local PC Mode' : 'Cloud Mode'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="col-header">Pose Pack Results</h3>
                  <div className="flex gap-3">
                    {poses.length > 0 && (
                      <Button 
                        variant="secondary" 
                        className={`py-2 px-6 text-sm border-red-500/20 transition-all ${confirmClear === 'poses' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                        onClick={handleClearPoses}
                      >
                        <Trash2 size={14} /> {confirmClear === 'poses' ? 'Confirm Clear?' : 'Clear Poses'}
                      </Button>
                    )}
                    <Button variant="secondary" className="py-2 px-6 text-sm" onClick={() => setStage('stage1')}>Back to Models</Button>
                    <Button 
                      variant="primary" 
                      className="py-2 px-6 text-sm"
                      onClick={handleDownloadZip}
                      disabled={loading || poses.length === 0}
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
                      Download ZIP
                    </Button>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl text-sm flex flex-col gap-4"
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">!</div>
                      <p className="font-medium">{error}</p>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="secondary" 
                        className="py-2 px-4 text-xs bg-white/5 border-red-500/30 text-red-400 hover:bg-red-500/10" 
                        onClick={handleGeneratePoses}
                      >
                        <RefreshCw size={14} /> Retry
                      </Button>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {loading && (
                    <div className="aspect-[3/4] ai-card flex flex-col items-center justify-center gap-6 animate-pulse">
                      <div className="ai-scan-line" />
                      <Loader2 className="animate-spin text-brand-accent" size={32} />
                      <p className="col-header text-brand-accent">Synthesizing Poses...</p>
                    </div>
                  )}
                  
                  {poses.map(p => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={p.id} 
                      className="relative group rounded-3xl overflow-hidden border border-white/10 hover:border-brand-accent/50 transition-all duration-500"
                    >
                      <img src={p.image_url} alt={p.pose_type} className="w-full aspect-[3/4] object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute top-4 left-4 bg-brand-bg/60 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-lg uppercase font-bold tracking-[0.15em] border border-white/10">
                        {p.pose_type}
                      </div>
                      <div className="absolute inset-0 bg-brand-bg/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                        <Button 
                          variant="secondary" 
                          className="bg-white text-brand-bg border-none py-3 px-6 shadow-xl"
                          onClick={() => handleDownloadSingle(p.image_url, `pose_${p.pose_type.replace(/\s+/g, '_')}.png`)}
                        >
                          <Download size={20} />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              </>
              )}
            </motion.div>
          )}

          {stage === 'how-to-use' && (
            <motion.div 
              key="how-to-use"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HowToUse />
            </motion.div>
          )}

          {stage === 'privacy' && (
            <motion.div 
              key="privacy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PrivacyPolicy />
            </motion.div>
          )}

          {stage === 'api-access' && (
            <motion.div 
              key="api-access"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <APIAccess />
            </motion.div>
          )}

          {stage === 'admin' && userProfile?.role === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminDashboard currentUserEmail={user?.email || null} />
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  </main>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="ai-card w-full max-w-md p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-accent/10 rounded-full blur-[60px]" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-secondary/10 rounded-full blur-[60px]" />
              
              <h3 className="text-3xl font-display font-bold mb-8 relative z-10">Create New Project</h3>
              <div className="space-y-8 relative z-10">
                <Input 
                  label="Project Name" 
                  value={newProjectName} 
                  onChange={setNewProjectName} 
                  placeholder="e.g. Summer Collection 2026"
                />
                <div className="flex gap-4 pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowNewProjectModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={createProject}>
                    Create
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/10 p-12 mt-auto relative z-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setStage('landing')}>
              <Logo className="w-8 h-8" />
              <span className="text-xs font-mono uppercase tracking-[0.3em]">VP-Ai Virtual Studio</span>
            </div>
            <div className="flex gap-10">
              <button onClick={() => setStage('how-to-use')} className="text-xs col-header hover:text-brand-accent transition-colors">How to Use</button>
              <button onClick={() => setStage('privacy')} className="text-xs col-header hover:text-brand-accent transition-colors">Privacy Policy</button>
              <button onClick={() => setStage('api-access')} className="text-xs col-header hover:text-brand-accent transition-colors">API Access</button>
            </div>
          </div>
        </footer>
    </div>
  );
};
