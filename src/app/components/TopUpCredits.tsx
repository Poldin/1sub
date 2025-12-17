'use client';

import { useState } from 'react';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TopUpCreditsProps {
  className?: string;
  hasSubscription?: boolean;
}

export default function TopUpCredits({ className = '', hasSubscription = true }: TopUpCreditsProps) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>('10');
  const [isLoading, setIsLoading] = useState(false);

  // Preset amounts in credits (1 CR = 1 €)
  const presetAmounts = [5, 10, 20, 50, 100];

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setAmount(value);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleTopUp = async () => {
    const numAmount = parseFloat(amount);
    
    if (!amount || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (numAmount < 1) {
      alert('Minimum amount is 1 CR');
      return;
    }

    if (numAmount > 10000) {
      alert('Maximum amount is 10,000 CR');
      return;
    }

    setIsLoading(true);
    
    // Navigate to pricing page for credit purchases
    router.push('/pricing');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTopUp();
    }
  };

  return (
    <div className={`bg-[#1f2937]/50 backdrop-blur-sm border border-[#374151]/50 rounded-xl p-4 ${className} ${!hasSubscription ? 'opacity-60' : ''}`}>
      {/* Compact Title */}
      <h3 className="text-sm font-semibold text-[#ededed] mb-3">
        Need more credit? One time top up here.
      </h3>

      {/* Alert when no subscription */}
      {!hasSubscription && (
        <div className="mb-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-500 leading-relaxed">
              To access one-time top-up, you need to activate a subscription plan first.
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border border-yellow-500/30"
          >
            View Subscription Plans
          </button>
        </div>
      )}

      {/* Compact Form - Responsive with flex-wrap */}
      <div className="flex flex-wrap gap-2 w-full">
        {/* Select for preset amounts */}
        <select
          value={amount}
          onChange={handleSelectChange}
          disabled={isLoading || !hasSubscription}
          className="flex-1 min-w-[140px] max-w-[180px] bg-[#0a0a0a] border border-[#374151] rounded-lg px-3 py-2.5 text-[#ededed] text-sm focus:outline-none focus:border-[#3ecf8e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:border-[#3ecf8e]/50"
          style={{
            colorScheme: 'dark'
          }}
        >
          <option value="" className="bg-[#0a0a0a] text-[#9ca3af]">Quick select</option>
          {presetAmounts.map((presetAmount) => (
            <option key={presetAmount} value={presetAmount} className="bg-[#0a0a0a] text-[#ededed]">
              {presetAmount} CR (€{presetAmount})
            </option>
          ))}
        </select>

        {/* Input Field */}
        <div className="relative flex-1 min-w-[100px] max-w-[120px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3ecf8e] text-sm font-semibold">
            CR
          </span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="10"
            className="w-full bg-[#0a0a0a]/50 border border-[#374151] rounded-lg pl-10 pr-3 py-2.5 text-[#ededed] text-sm font-medium focus:outline-none focus:border-[#3ecf8e] transition-colors placeholder:text-[#6b7280] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !hasSubscription}
          />
        </div>

        {/* CTA Button */}
        <button
          onClick={handleTopUp}
          disabled={isLoading || !amount || parseFloat(amount) <= 0 || !hasSubscription}
          className="flex-1 min-w-[80px] max-w-[100px] px-4 py-2.5 bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf] text-black rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#3ecf8e]/20 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Loading...</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>Buy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

