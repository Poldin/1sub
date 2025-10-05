'use client';

import { useState } from 'react';
import { X, Share2, Copy, Check } from 'lucide-react';

interface ShareAndEarnProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareAndEarnButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 p-2 bg-[#0a0a0a] hover:bg-[#1f2937] rounded transition-colors border border-[#3ecf8e] hover:border-[#2dd4bf]"
    >
      <span>share and earn</span>
    </button>
  );
}

export default function ShareAndEarnDialog({ isOpen, onClose }: ShareAndEarnProps) {
  const [isCopied, setIsCopied] = useState(false);
  const referralLink = 'https://1sub.io/ref/user123'; // Mock link

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '1sub.io - 1 subscription, countless tools',
          text: 'Join 1sub and get access to premium tools with a single subscription!',
          url: referralLink,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback per browser che non supportano Web Share API
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      
      // Reset dopo 3 secondi
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    } catch (error) {
      console.log('Error copying link:', error);
    }
  };

  if (!isOpen) return null;

  return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80"
            onClick={onClose}
          />
          
          {/* Dialog Content */}
          <div className="relative w-full h-full lg:w-auto lg:h-auto lg:max-w-md lg:min-h-[90vh] lg:max-h-[100vh] bg-[#111111] lg:rounded-lg border border-[#374151] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#374151]">
              <h2 className="text-lg font-semibold">Share and Earn</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[#374151] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 text-center overflow-y-auto">
              <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-white">
                Bring new members and earn
              </h3>
              
              <div className="mb-6">
                <div className="text-6xl sm:text-7xl font-black text-[#3ecf8e] mb-2 leading-none">
                  1%
                </div>
                <p className="text-lg sm:text-xl text-[#ededed] font-semibold">
                  lifetime commission
                </p>
              </div>
              
              <p className="text-sm text-[#d1d5db] mb-4 opacity-80">
                Earn 1% for every new member you refer when they use tools with 1sub. 
                Once entered, you get the commission until member leaves.
              </p>
              
              <p className="text-xs text-[#9ca3af] mb-8 opacity-70">
                Looking for deeper partnerships? Reach out to{' '}
                <span className="font-semibold text-[#3ecf8e]">partner@1sub.io</span>.
              </p>

              {/* Referral Link Display */}
              <div className="mb-6 p-3 bg-[#1f2937] rounded-lg">
                <p className="text-xs text-[#9ca3af] mb-2">Your referral link:</p>
                <p className="text-sm text-[#3ecf8e] font-mono break-all">
                  {referralLink}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-[#374151]">
              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 sm:gap-3 p-3 bg-[#1f2937] hover:bg-[#374151] rounded-lg transition-colors text-[#ededed] border border-[#3ecf8e] hover:border-[#2dd4bf]"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Share</span>
                </button>
                
                <button
                  onClick={handleCopyLink}
                  className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 p-3 rounded-lg transition-all duration-300 text-[#ededed] ${
                    isCopied 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-[#1f2937] hover:bg-[#374151]'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="text-sm sm:text-base">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
  );
}
