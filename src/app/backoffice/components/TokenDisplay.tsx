'use client';

import { useState, useEffect } from 'react';
import { Copy, RefreshCw, Check, Clock, AlertCircle } from 'lucide-react';
import { generateAccessToken, copyToClipboard, TokenResponse } from '@/lib/api-client';

interface TokenDisplayProps {
  onTokenGenerated?: (token: TokenResponse) => void;
}

export default function TokenDisplay({ onTokenGenerated }: TokenDisplayProps) {
  const [token, setToken] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Calculate time left until expiration
  useEffect(() => {
    if (!token?.expiresAt) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expires = new Date(token.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [token?.expiresAt]);

  const handleGenerateToken = async () => {
    setLoading(true);
    try {
      const newToken = await generateAccessToken();
      setToken(newToken);
      onTokenGenerated?.(newToken);
    } catch (error) {
      console.error('Failed to generate token:', error);
      // You could add a toast notification here
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!token?.token) return;

    const success = await copyToClipboard(token.token);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isExpired = token && new Date(token.expiresAt).getTime() <= new Date().getTime();

  return (
    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#ededed]">API Access Token</h3>
        <button
          onClick={handleGenerateToken}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#3ecf8e] text-black rounded-lg font-medium hover:bg-[#2dd4bf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating...' : 'Generate Token'}
        </button>
      </div>

      {token && (
        <div className="space-y-4">
          {/* Token Display */}
          <div>
            <label className="block text-sm font-medium text-[#d1d5db] mb-2">
              Your API Token
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-[#0a0a0a] border border-[#374151] rounded-lg font-mono text-sm text-[#ededed] break-all">
                {token.token}
              </div>
              <button
                onClick={handleCopyToken}
                className="flex items-center gap-2 px-3 py-3 bg-[#374151] hover:bg-[#4b5563] rounded-lg transition-colors"
                title="Copy token"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[#3ecf8e]" />
                ) : (
                  <Copy className="w-4 h-4 text-[#d1d5db]" />
                )}
              </button>
            </div>
          </div>

          {/* Token Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isExpired ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Clock className="w-4 h-4 text-[#3ecf8e]" />
              )}
              <span className={`text-sm font-medium ${isExpired ? 'text-red-400' : 'text-[#3ecf8e]'}`}>
                {isExpired ? 'Expired' : 'Valid'}
              </span>
            </div>
            
            {!isExpired && timeLeft && (
              <div className="text-sm text-[#9ca3af]">
                Expires in: {timeLeft}
              </div>
            )}
          </div>

          {/* Usage Instructions */}
          <div className="bg-[#0a0a0a] border border-[#374151] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#d1d5db] mb-2">How to use this token:</h4>
            <div className="text-xs text-[#9ca3af] space-y-1">
              <p>• Include in Authorization header: <code className="bg-[#1f2937] px-1 rounded">Authorization: Bearer YOUR_TOKEN</code></p>
              <p>• Use for API calls to access your tools and credits</p>
              <p>• Token expires after 24 hours for security</p>
            </div>
          </div>
        </div>
      )}

      {!token && (
        <div className="text-center py-8">
          <div className="text-[#9ca3af] mb-4">
            Generate an API token to access 1sub services programmatically
          </div>
          <button
            onClick={handleGenerateToken}
            disabled={loading}
            className="px-6 py-3 bg-[#3ecf8e] text-black rounded-lg font-medium hover:bg-[#2dd4bf] transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Your First Token'}
          </button>
        </div>
      )}
    </div>
  );
}
