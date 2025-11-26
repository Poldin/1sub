'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Mail, Loader2, AlertCircle } from 'lucide-react';

interface OTPDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  checkoutId: string;
  userEmail: string;
}

export function OTPDialog({ isOpen, onClose, onVerify, checkoutId, userEmail }: OTPDialogProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setOtp(['', '', '', '', '', '']);
      setError(null);
      setOtpSent(false);
      setCountdown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !otpSent && !isGenerating) {
      generateOTP();
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const generateOTP = async () => {
    setIsGenerating(true);
    setError(null);
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']); // Reset OTP input

    try {
      const response = await fetch('/api/checkout/generate-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ checkout_id: checkoutId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send OTP');
        return;
      }

      setOtpSent(true);
      setCountdown(600); // 10 minutes
    } catch (err) {
      console.error('Error generating OTP:', err);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('').slice(0, 6);
      setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')]);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // First verify OTP
      const verifyResponse = await fetch('/api/checkout/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkout_id: checkoutId,
          otp: otpString,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setError(verifyData.error || 'Invalid OTP. Please try again.');
        setIsVerifying(false);
        return;
      }

      // OTP verified, proceed with checkout
      await onVerify(otpString);
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Failed to verify OTP. Please try again.');
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-6 lg:p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#ededed]">Verify Payment</h2>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#ededed] transition-colors"
            disabled={isVerifying}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Email Info */}
        <div className="bg-[#0a0a0a]/50 border border-[#374151] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[#3ecf8e]" />
            <div className="flex-1">
              <p className="text-sm text-[#9ca3af]">Verification code sent to</p>
              <p className="text-sm font-medium text-[#ededed]">{userEmail}</p>
            </div>
          </div>
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#ededed] mb-3">
            Enter 6-digit code
          </label>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl font-bold bg-[#0a0a0a] border-2 border-[#374151] rounded-lg text-[#ededed] focus:border-[#3ecf8e] focus:outline-none transition-colors"
                disabled={isVerifying || isGenerating}
                autoFocus={index === 0}
              />
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Resend OTP */}
        {otpSent && (
          <div className="text-center mb-4">
            {countdown > 0 ? (
              <p className="text-sm text-[#9ca3af]">
                Resend code in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </p>
            ) : (
              <button
                onClick={generateOTP}
                disabled={isGenerating}
                className="text-sm text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors disabled:opacity-50"
              >
                {isGenerating ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isVerifying}
            className="flex-1 px-4 py-3 bg-[#374151] text-[#ededed] rounded-lg font-semibold hover:bg-[#4b5563] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={isVerifying || otp.join('').length !== 6 || !otpSent}
            className="flex-1 px-4 py-3 bg-[#3ecf8e] text-black rounded-lg font-semibold hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              'Verify & Pay'
            )}
          </button>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="mt-4 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#3ecf8e] inline-block" />
            <p className="text-sm text-[#9ca3af] mt-2">Sending verification code...</p>
          </div>
        )}
      </div>
    </div>
  );
}

