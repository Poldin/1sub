'use client';

import { useState } from 'react';

interface CustomPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: string;
  toolName: string;
  productId?: string;
}

export default function CustomPricingModal({
  isOpen,
  onClose,
  toolId,
  toolName,
  productId,
}: CustomPricingModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/tools/${toolId}/custom-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, message }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          setSubmitted(false);
          setMessage('');
        }, 2000);
      } else {
        setError(data.error || 'Failed to send request');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setMessage('');
      setError('');
      setSubmitted(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#374151] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 animate-bounce">✓</div>
            <h3 className="text-xl font-semibold text-white mb-2">Request Sent!</h3>
            <p className="text-[#9ca3af]">The vendor will contact you shortly.</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white mb-2">
              Request Custom Pricing
            </h2>
            <p className="text-[#9ca3af] mb-6">
              Send a message to the vendor of <strong className="text-[#3ecf8e]">{toolName}</strong> to discuss custom pricing options.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Your Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#111111] border border-[#374151] rounded-lg text-white focus:border-[#3ecf8e] focus:outline-none resize-none placeholder-[#6b7280]"
                  placeholder="Tell the vendor about your needs, expected usage, team size, etc..."
                />
                <p className="text-xs text-[#6b7280] mt-1">
                  Help the vendor understand your requirements for better pricing
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#374151] hover:bg-[#4b5563] rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-[#3ecf8e] hover:bg-[#35b67a] rounded-lg text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
