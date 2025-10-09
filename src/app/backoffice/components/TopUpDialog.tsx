'use client';

import { useState } from 'react';
import { X, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface TopUpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreditsUpdated: () => void;
  userId: string;
}

const PRESET_AMOUNTS = [10, 50, 100, 500];

export default function TopUpDialog({ isOpen, onClose, onCreditsUpdated, userId }: TopUpDialogProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleTopUp = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Please select or enter a valid amount' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/v1/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount,
          reason: 'Manual top-up via dashboard'
        }),
      });

      const result = await response.json();

      if (result.ok) {
        setMessage({ type: 'success', text: `Successfully added ${amount} credits!` });
        onCreditsUpdated();
        // Reset form
        setSelectedAmount(null);
        setCustomAmount('');
        // Close dialog after 2 seconds
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error?.message || 'Failed to add credits' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f2937] rounded-lg w-full max-w-md border border-[#374151]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#374151]">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#3ecf8e]" />
            <h2 className="text-lg font-semibold text-[#ededed]">Top Up Credits</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#374151] transition-colors"
          >
            <X className="w-5 h-5 text-[#9ca3af]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Preset Amounts */}
          <div>
            <label className="block text-sm font-medium text-[#ededed] mb-2">
              Quick Amounts
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handlePresetClick(amount)}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedAmount === amount
                      ? 'border-[#3ecf8e] bg-[#3ecf8e]/10 text-[#3ecf8e]'
                      : 'border-[#374151] hover:border-[#3ecf8e]/50 text-[#ededed]'
                  }`}
                >
                  {amount} credits
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-sm font-medium text-[#ededed] mb-2">
              Custom Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Enter amount"
                min="1"
                step="0.01"
                className="w-full px-3 py-2 bg-[#111111] border border-[#374151] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-[#ededed]"
              />
              <span className="absolute right-3 top-2 text-[#9ca3af] text-sm">credits</span>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                : 'bg-red-900/20 border border-red-500/30 text-red-400'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#374151] hover:bg-[#4b5563] rounded-lg text-[#ededed] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleTopUp}
              disabled={isLoading || (!selectedAmount && !customAmount)}
              className="flex-1 px-4 py-2 bg-[#3ecf8e] hover:bg-[#2dd4bf] disabled:bg-[#374151] disabled:text-[#9ca3af] rounded-lg text-black font-medium transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add Credits'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
