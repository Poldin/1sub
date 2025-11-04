'use client';

import { X, AlertCircle } from 'lucide-react';

interface BuyCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  neededAmount: number;
  onCreditsAdded?: () => void;
}

export default function BuyCreditsDialog({ 
  isOpen, 
  onClose, 
  currentBalance, 
  neededAmount
}: BuyCreditsDialogProps) {
  if (!isOpen) return null;

  const remainingCredits = Math.max(0, neededAmount - currentBalance);

  const packages = [
    { credits: 100, price: 29.99, label: 'Starter' },
    { credits: 500, price: 129.99, label: 'Professional', popular: true },
    { credits: 1000, price: 219.99, label: 'Business' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[95vh] bg-[#1f2937] rounded-lg shadow-2xl border border-[#374151] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-[#374151] hover:bg-[#4b5563] rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-6 h-6 text-[#ededed]" />
        </button>

        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#ededed] mb-1">Buy Credits</h2>
            <p className="text-sm text-[#9ca3af]">
              Purchase credits to complete your purchase
            </p>
          </div>

          {/* Insufficient Credits Warning */}
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium text-sm mb-1">Insufficient Credits</p>
                <div className="text-xs text-[#9ca3af] space-y-1">
                  <p>Current balance: <span className="text-[#ededed] font-semibold">{currentBalance.toFixed(2)} credits</span></p>
                  <p>Required: <span className="text-[#ededed] font-semibold">{neededAmount} credits</span></p>
                  <p>Need to purchase: <span className="text-[#3ecf8e] font-semibold">{remainingCredits} more credits</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 font-medium text-sm mb-2">🚧 Coming Soon</p>
            <p className="text-xs text-[#9ca3af]">
              Credit purchase with Stripe payment integration will be available soon. 
              In the meantime, please contact support to add credits to your account.
            </p>
          </div>

          {/* Credit Packages */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-semibold text-[#ededed]">Available Packages (Preview)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.credits}
                  className={`relative bg-[#0a0a0a]/50 border rounded-lg p-4 opacity-50 ${
                    pkg.popular ? 'border-[#3ecf8e]/30' : 'border-[#374151]'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <span className="bg-[#3ecf8e] text-black px-3 py-0.5 rounded-full text-xs font-bold">
                        Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#3ecf8e] mb-1">{pkg.credits}</div>
                    <div className="text-xs text-[#9ca3af] mb-3">{pkg.label}</div>
                    <div className="text-lg font-bold text-[#ededed]">€{pkg.price}</div>
                    <div className="text-xs text-[#9ca3af] mt-1">
                      €{(pkg.price / pkg.credits).toFixed(2)}/credit
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="text-center">
            <p className="text-sm text-[#9ca3af] mb-3">
              Need credits now? Contact our support team
            </p>
            <a
              href="mailto:support@1sub.io"
              className="inline-block bg-[#3ecf8e] text-black px-6 py-3 rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export { BuyCreditsDialog };

