import React from 'react';
import { motion } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  Globe, 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Copy,
  ExternalLink,
  Sparkles
} from 'lucide-react';

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

interface SetupGuideProps {
  onBack: () => void;
}

const CodeBlock = ({ code, language = 'powershell' }: { code: string, language?: string }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group mt-2 mb-4">
      <div className="absolute -top-3 left-4 px-2 py-0.5 bg-brand-accent/20 border border-brand-accent/30 rounded text-[10px] font-bold text-brand-accent uppercase tracking-widest z-10">
        {language}
      </div>
      <pre className="bg-black/40 border border-white/10 rounded-xl p-6 font-mono text-sm text-white/80 overflow-x-auto pt-8">
        <code>{code}</code>
      </pre>
      <button 
        onClick={handleCopy}
        className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all text-white/50 hover:text-white"
      >
        {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
      </button>
    </div>
  );
};

export const SetupGuide = ({ onBack }: SetupGuideProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-12 pb-20"
    >
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold uppercase tracking-widest text-xs">Back to Dashboard</span>
      </button>

      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
          <Cpu size={12} /> Local Hardware Acceleration
        </div>
        <h2 className="text-6xl font-display font-bold text-multi-color">Gaming PC Setup</h2>
        <p className="text-xl text-white/60 leading-relaxed max-w-2xl">
          Run the AI models on your own hardware to bypass cloud quotas and use the platform for <span className="text-white font-bold">FREE</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Step 1 */}
        <div className="ai-card p-8 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 bg-brand-accent/10 text-brand-accent rounded-2xl flex items-center justify-center shrink-0 border border-brand-accent/20">
              <span className="text-xl font-display font-bold">01</span>
            </div>
            <div className="space-y-4 flex-grow">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <Terminal size={24} className="text-brand-accent" />
                Install AI Models
              </h3>
              <p className="text-white/60">
                Install <a href="https://ollama.com" target="_blank" className="text-brand-accent hover:underline inline-flex items-center gap-1">Ollama <ExternalLink size={12} /></a> for vision/text tasks:
              </p>
              <CodeBlock code="ollama pull llava" />
              <p className="text-white/60 mt-4">
                For <span className="text-white font-bold">Image Generation</span>, install <a href="https://github.com/AUTOMATIC1111/stable-diffusion-webui" target="_blank" className="text-brand-accent hover:underline inline-flex items-center gap-1">Stable Diffusion WebUI <ExternalLink size={12} /></a>. 
              </p>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-white/50">Important: Run Stable Diffusion with the <code className="text-white">--api</code> flag enabled to allow the bridge to connect.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="ai-card p-8 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 bg-brand-secondary/10 text-brand-secondary rounded-2xl flex items-center justify-center shrink-0 border border-brand-secondary/20">
              <span className="text-xl font-display font-bold">02</span>
            </div>
            <div className="space-y-4 flex-grow">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <Settings size={24} className="text-brand-secondary" />
                Start Local Proxy
              </h3>
              <p className="text-white/60">
                Navigate to the <code className="text-brand-secondary">Key</code> folder in your project and start the bridge server:
              </p>
              <CodeBlock code="npm install\nnode server.js" />
              <p className="text-sm text-white/40 italic">The server will start on port 3001.</p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="ai-card p-8 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 bg-brand-tertiary/10 text-brand-tertiary rounded-2xl flex items-center justify-center shrink-0 border border-brand-tertiary/20">
              <span className="text-xl font-display font-bold">03</span>
            </div>
            <div className="space-y-4 flex-grow">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <Globe size={24} className="text-brand-tertiary" />
                Create Secure Tunnel
              </h3>
              <p className="text-white/60">
                Use <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" target="_blank" className="text-brand-tertiary hover:underline inline-flex items-center gap-1">Cloudflare Tunnel <ExternalLink size={12} /></a> to connect your PC to the web app:
              </p>
              <CodeBlock code="cloudflared tunnel --url http://localhost:3001" />
              <p className="text-white/60">
                Copy the URL provided (e.g., <code className="text-brand-tertiary">https://xyz-abc.trycloudflare.com</code>).
              </p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="ai-card p-8 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
              <span className="text-xl font-display font-bold">04</span>
            </div>
            <div className="space-y-4 flex-grow">
              <h3 className="text-2xl font-bold flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-400" />
                Final Configuration
              </h3>
              <p className="text-white/60">
                Open the <span className="text-brand-accent font-bold">API Settings</span> modal in the header and enter your Cloudflare URL and Proxy Key:
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-sm font-mono text-white/50">Proxy URL</span>
                  <span className="text-sm font-bold text-brand-accent">https://xyz-abc.trycloudflare.com</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-sm font-mono text-white/50">Proxy Key</span>
                  <span className="text-sm font-bold text-brand-accent">Your Secret Key</span>
                </div>
              </div>
              <p className="text-xs text-white/40 italic">
                Note: You can also set these via environment variables (VITE_LOCAL_PROXY_URL and VITE_LOCAL_PROXY_KEY).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 bg-brand-accent/5 border border-brand-accent/20 rounded-3xl space-y-4">
        <h4 className="text-xl font-bold flex items-center gap-2">
          <Sparkles size={20} className="text-brand-accent" />
          Ready to Go!
        </h4 >
        <p className="text-white/60 leading-relaxed">
          Once configured, refresh the app. You'll see the 🎮 Gaming PC badge in the header, and all generations will happen on your own hardware for free.
        </p>
        <Button onClick={onBack} className="mt-4">Return to Dashboard</Button>
      </div>
    </motion.div>
  );
};
