'use client';

import { useState } from 'react';
import { X, Share2, Copy, Check } from 'lucide-react';

interface ShareAndEarnDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareAndEarnDialog({ isOpen, onClose }: ShareAndEarnDialogProps) {
  const [copied, setCopied] = useState(false);
  const referralCode = 'DEMO123';
  const referralLink = `https://1sub.io/ref/${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
      <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#ededed]">Share & Earn</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#374151] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#9ca3af]" />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-[#d1d5db] text-sm">
            Share your referral link and earn credits when friends sign up!
          </p>
          
          <div className="bg-[#0a0a0a] border border-[#374151] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[#9ca3af] text-xs mb-1">Your Referral Link</p>
                <p className="text-[#ededed] text-sm font-mono break-all">{referralLink}</p>
              </div>
              <button
                onClick={handleCopy}
                className="ml-3 p-2 bg-[#3ecf8e] text-black rounded-lg hover:bg-[#2dd4bf] transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Share2 className="w-5 h-5 text-[#3ecf8e] mr-2" />
              <h3 className="font-semibold text-[#3ecf8e]">How it works</h3>
            </div>
            <ul className="text-[#d1d5db] text-sm space-y-1">
              <li>• Share your link with friends</li>
              <li>• They get 10% bonus credits on signup</li>
              <li>• You earn 10% of their first purchase</li>
              <li>• Credits appear in your account instantly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the button component as well
export function ShareAndEarnButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center px-4 py-3 text-left text-[#9ca3af] hover:text-[#ededed] hover:bg-[#374151] rounded-lg transition-colors"
    >
      <Share2 className="w-5 h-5 mr-3" />
      <span>Share & Earn</span>
    </button>
  );
}


