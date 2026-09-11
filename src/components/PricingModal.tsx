import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Zap, Crown, Star, ShieldCheck, CreditCard, Loader2, ArrowLeft } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => Promise<void>;
  currentPlan: string;
}

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false }: any) => {
  const variants = {
    primary: 'ai-button-primary',
    secondary: 'ai-button-secondary',
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading}
      className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : children}
    </button>
  );
};

export const PricingModal = ({ isOpen, onClose, onUpgrade, currentPlan }: PricingModalProps) => {
  const [view, setView] = useState<'pricing' | 'checkout' | 'success'>('pricing');
  const [isUpgrading, setIsUpgrading] = useState(false);

  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for getting started',
      features: [
        '5 Model generations / month',
        'Standard resolution',
        'Basic pose library',
        'Community support'
      ],
      buttonText: currentPlan === 'free' ? 'Current Plan' : 'Downgrade',
      buttonVariant: 'secondary',
      highlight: false,
      disabled: currentPlan === 'free'
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      description: 'For professional creators',
      features: [
        'Unlimited model generations',
        '4K Ultra-HD resolution',
        'Custom pose uploading',
        'Priority GPU access',
        'Commercial usage rights',
        'Advanced background removal'
      ],
      buttonText: currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      buttonVariant: 'primary',
      highlight: true,
      disabled: currentPlan === 'pro'
    }
  ];

  const handleUpgradeClick = async () => {
    setView('checkout');
  };

  const handlePayment = async () => {
    setIsUpgrading(true);
    // Simulate payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    await onUpgrade();
    setIsUpgrading(false);
    setView('success');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all z-10"
            >
              <X size={24} />
            </button>

            {view === 'pricing' && (
              <div className="grid md:grid-cols-2">
                {/* Left Side: Marketing */}
                <div className="p-8 md:p-12 bg-gradient-to-br from-brand-accent/20 to-transparent flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase tracking-widest mb-6 w-fit">
                    <Crown size={12} /> Premium Access
                  </div>
                  <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                    Unlock the full power of <span className="text-gradient">VP-Ai</span>
                  </h2>
                  <p className="text-white/60 text-lg mb-8 leading-relaxed">
                    Join thousands of professional designers and brands using VP-Ai to transform their fashion workflow.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-white/80">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Star size={16} className="text-brand-accent" />
                      </div>
                      <span className="text-sm">Trusted by 500+ Fashion Brands</span>
                    </div>
                    <div className="flex items-center gap-3 text-white/80">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <ShieldCheck size={16} className="text-emerald-400" />
                      </div>
                      <span className="text-sm">Secure Payment & Instant Access</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Plans */}
                <div className="p-8 md:p-12 space-y-8">
                  <div className="grid gap-6">
                    {plans.map((plan) => (
                      <div 
                        key={plan.name}
                        className={`p-6 rounded-2xl border transition-all duration-500 ${
                          plan.highlight 
                            ? 'bg-white/5 border-brand-accent/50 shadow-[0_0_30px_rgba(255,99,33,0.1)]' 
                            : 'bg-transparent border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                            <p className="text-xs text-white/40">{plan.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-white">{plan.price}</span>
                            {plan.period && <span className="text-xs text-white/40">{plan.period}</span>}
                          </div>
                        </div>
                        
                        <ul className="space-y-3 mb-6">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-white/60">
                              <Check size={14} className={plan.highlight ? 'text-brand-accent' : 'text-white/40'} />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <Button 
                          variant={plan.buttonVariant} 
                          className="w-full"
                          disabled={plan.disabled}
                          onClick={() => {
                            if (plan.highlight && !plan.disabled) {
                              handleUpgradeClick();
                            }
                          }}
                        >
                          {plan.highlight && <Zap size={16} />}
                          {plan.buttonText}
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-[10px] text-center text-white/20 uppercase tracking-widest">
                    Cancel anytime • No hidden fees • 7-day money back guarantee
                  </p>
                </div>
              </div>
            )}

            {view === 'checkout' && (
              <div className="p-12 flex flex-col items-center justify-center min-h-[500px]">
                <button 
                  onClick={() => setView('pricing')}
                  className="absolute top-6 left-6 flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                >
                  <ArrowLeft size={20} />
                  <span className="text-sm font-bold uppercase tracking-wider">Back</span>
                </button>

                <div className="w-full max-w-md space-y-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <CreditCard size={32} className="text-brand-accent" />
                    </div>
                    <h3 className="text-3xl font-display font-bold text-white mb-2">Secure Checkout</h3>
                    <p className="text-white/40">Complete your upgrade to VP-Ai Pro</p>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                    <div className="flex justify-between items-center pb-6 border-b border-white/10">
                      <div>
                        <p className="text-sm font-bold text-white">VP-Ai Pro Plan</p>
                        <p className="text-xs text-white/40">Monthly Subscription</p>
                      </div>
                      <p className="text-xl font-bold text-white">$29.00</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                        <ShieldCheck size={20} className="text-emerald-400" />
                        <p className="text-xs text-emerald-400 font-medium">
                          Free Payment Gateway Connected (Test Mode)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Card Details</label>
                        <div className="p-4 bg-black/40 border border-white/10 rounded-xl text-white/60 text-sm">
                          •••• •••• •••• 4242 (Test Card)
                        </div>
                      </div>
                    </div>

                    <Button 
                      variant="primary" 
                      className="w-full py-4 text-lg"
                      loading={isUpgrading}
                      onClick={handlePayment}
                    >
                      Pay $29.00 & Upgrade
                    </Button>
                  </div>

                  <p className="text-[10px] text-center text-white/20 uppercase tracking-widest">
                    Powered by VP-Ai Secure Checkout
                  </p>
                </div>
              </div>
            )}

            {view === 'success' && (
              <div className="p-12 flex flex-col items-center justify-center min-h-[500px] text-center">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.3)]"
                >
                  <Check size={48} className="text-white" />
                </motion.div>
                
                <h3 className="text-4xl font-display font-bold text-white mb-4">Welcome to Pro!</h3>
                <p className="text-white/60 text-lg max-w-md mb-12 leading-relaxed">
                  Your account has been successfully upgraded. You now have unlimited access to all premium features.
                </p>

                <Button 
                  variant="primary" 
                  className="px-12"
                  onClick={onClose}
                >
                  Start Creating
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
