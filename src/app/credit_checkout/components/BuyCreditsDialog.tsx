'use client';

import { X, Lock, Unlock, CreditCard, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface SubscriptionPlan {
  id: string;
  name: string;
  creditsPerMonth: number;
  price: number;
  hasOverdraft?: boolean;
}

interface BuyCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: SubscriptionPlan;
  currentCredits?: number;
  maxOverdraft?: number;
  onCreditsAdded?: () => void;
}

export default function BuyCreditsDialog({ 
  isOpen, 
  onClose,
  currentPlan,
  currentCredits = 0,
  maxOverdraft = 100
}: BuyCreditsDialogProps) {
  const [selectedTab, setSelectedTab] = useState<'upgrade' | 'one-time'>('upgrade');
  const [overdraftLimit, setOverdraftLimit] = useState(maxOverdraft);
  const hasOverdraft = maxOverdraft > 0;

  if (!isOpen) return null;

  // Available subscription plans
  const subscriptionPlans: SubscriptionPlan[] = [
    { id: 'starter', name: 'Starter', creditsPerMonth: 50, price: 50 },
    { id: 'professional', name: 'Professional', creditsPerMonth: 150, price: 150 },
    { id: 'business', name: 'Business', creditsPerMonth: 300, price: 300 },
    { id: 'enterprise', name: 'Enterprise', creditsPerMonth: 1000, price: 1000 },
  ];

  // One-time credit packages
  const oneTimePackages = [
    { credits: 50, price: 50 },
    { credits: 100, price: 100 },
    { credits: 250, price: 250 },
    { credits: 500, price: 500 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#1f2937] rounded-lg shadow-2xl border border-[#374151] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 bg-[#374151] hover:bg-[#4b5563] rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5 text-[#ededed]" />
        </button>

        <div className="p-5 overflow-y-auto flex-1">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#ededed] mb-2">Manage Credits</h2>
            <p className="text-base text-[#d1d5db]">
              1 <span className="text-[#3ecf8e] font-semibold">CR</span> = 1 credit = €1
            </p>
          </div>

          {/* Current Plan & Balance */}
          <div className="bg-[#0a0a0a]/50 border border-[#374151] rounded-lg p-3 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#9ca3af] mb-0.5">Current Plan</p>
                <p className="text-base font-bold text-[#ededed]">
                  {currentPlan?.name || 'No Plan'}
                </p>
                {currentPlan && (
                  <p className="text-xs text-[#9ca3af] mt-0.5">
                    {currentPlan.creditsPerMonth} CR/mo · €{currentPlan.price}/mo
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-[#9ca3af] mb-0.5">Current Balance</p>
                <p className={`text-base font-bold ${currentCredits >= 0 ? 'text-[#3ecf8e]' : 'text-red-400'}`}>
                  {currentCredits.toFixed(2)} CR
                </p>
                {currentCredits < 0 && (
                  <p className="text-xs text-red-400 mt-0.5">
                    Overdraft used: {Math.abs(currentCredits)} CR
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3 border-b border-[#374151]">
            <button
              onClick={() => setSelectedTab('upgrade')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                selectedTab === 'upgrade'
                  ? 'border-[#3ecf8e] text-[#3ecf8e]'
                  : 'border-transparent text-[#9ca3af] hover:text-[#ededed]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade Plan
            </button>
            <button
              onClick={() => setSelectedTab('one-time')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                selectedTab === 'one-time'
                  ? 'border-[#3ecf8e] text-[#3ecf8e]'
                  : 'border-transparent text-[#9ca3af] hover:text-[#ededed]'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Buy Credits (One-time)
            </button>
          </div>

          {/* Tab Content */}
          <div className="mb-4">
            {selectedTab === 'upgrade' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {subscriptionPlans
                  .filter(plan => !currentPlan || plan.creditsPerMonth > currentPlan.creditsPerMonth)
                  .map((plan) => {
                    const isCurrentPlan = currentPlan?.id === plan.id;
                    
                    return (
                      <div
                        key={plan.id}
                        className={`relative bg-[#0a0a0a]/50 border rounded p-2.5 text-center ${
                          isCurrentPlan ? 'border-[#3ecf8e] opacity-50' : 'border-[#374151] hover:border-[#3ecf8e]/50 cursor-pointer'
                        } transition-all`}
                      >
                        <div className="text-sm font-bold text-[#ededed] mb-0.5">{plan.name}</div>
                        <div className="text-xl font-bold text-[#3ecf8e] mb-0.5">
                          {plan.creditsPerMonth}
                        </div>
                        <div className="text-xs text-[#9ca3af] mb-1">CR/mo</div>
                        <div className="text-sm font-bold text-[#ededed] mb-2">€{plan.price}/mo</div>
                        {!isCurrentPlan && (
                          <button className="w-full bg-[#3ecf8e] text-black px-2 py-1 rounded text-xs font-semibold hover:bg-[#2dd4bf] transition-colors">
                            Upgrade
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {selectedTab === 'one-time' && (
              <div className="grid grid-cols-4 gap-2">
                {oneTimePackages.map((pkg) => (
                  <div
                    key={pkg.credits}
                    className="bg-[#0a0a0a]/50 border border-[#374151] rounded p-2.5 text-center hover:border-[#3ecf8e]/50 cursor-pointer transition-all"
                  >
                    <div className="text-lg font-bold text-[#3ecf8e] mb-0.5">{pkg.credits}</div>
                    <div className="text-xs text-[#9ca3af] mb-1.5">credits</div>
                    <div className="text-sm font-bold text-[#ededed] mb-2">€{pkg.price}</div>
                    <button className="w-full bg-[#374151] hover:bg-[#4b5563] text-[#ededed] px-2 py-1 rounded text-xs font-semibold transition-colors">
                      Buy
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pay-as-you-go Configuration */}
          <div className="bg-[#0a0a0a]/50 border border-[#374151] rounded-lg p-3">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {hasOverdraft ? (
                  <Unlock className="w-4 h-4 text-[#3ecf8e]" />
                ) : (
                  <Lock className="w-4 h-4 text-[#9ca3af]" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-[#ededed]">Pay-as-you-go</h3>
                  <p className="text-xs text-[#9ca3af]">
                    {hasOverdraft ? 'Continue using when balance hits 0' : 'Disabled - Set a limit to enable'}
                  </p>
                </div>
              </div>
              <div className={`text-xs font-semibold px-2 py-0.5 rounded ${
                hasOverdraft ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]' : 'bg-[#9ca3af]/10 text-[#9ca3af]'
              }`}>
                {hasOverdraft ? 'Active' : 'Locked'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-[#9ca3af]">Overdraft Limit</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="10"
                    value={overdraftLimit}
                    onChange={(e) => setOverdraftLimit(Number(e.target.value))}
                    className="w-20 bg-[#1f2937] border border-[#374151] rounded px-2 py-1 text-xs text-[#ededed] focus:outline-none focus:border-[#3ecf8e]"
                  />
                  <span className="text-xs text-[#9ca3af]">CR</span>
                </div>
              </div>

              {overdraftLimit > 0 && (
                <div className="bg-[#1f2937] rounded p-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9ca3af]">You can spend up to:</span>
                    <span className="text-[#3ecf8e] font-semibold">-{overdraftLimit} CR</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9ca3af]">Auto-billing:</span>
                    <span className="text-[#ededed]">End of month</span>
                  </div>
                </div>
              )}

              <button 
                className="w-full bg-[#3ecf8e] text-black px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#2dd4bf] transition-colors"
                onClick={() => {
                  // TODO: Save overdraft limit
                  alert(`Pay-as-you-go ${overdraftLimit > 0 ? 'enabled' : 'disabled'} with limit: ${overdraftLimit} CR`);
                }}
              >
                {overdraftLimit > 0 ? `Enable Pay-as-you-go (${overdraftLimit} CR)` : 'Disable Pay-as-you-go'}
              </button>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="mt-4 pt-3 border-t border-[#374151]">
            <p className="text-xs text-[#9ca3af] text-center">
              need support? <a href="mailto:support@1sub.io" className="text-[#3ecf8e] hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export { BuyCreditsDialog };
export type { SubscriptionPlan };

