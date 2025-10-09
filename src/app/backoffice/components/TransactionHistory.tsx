'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';

interface Transaction {
  id: string;
  delta: number;
  balanceAfter: number;
  transactionType: 'grant' | 'consume' | 'refund' | 'adjustment';
  reason?: string;
  idempotencyKey?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface TransactionHistoryProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionHistory({ userId, isOpen, onClose }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());

  const fetchTransactions = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/credits/transactions?userId=${userId}&limit=20`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchTransactions();
    }
  }, [isOpen, userId]);

  const toggleTransaction = (transactionId: string) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (delta: number) => {
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}`;
  };

  const getTransactionIcon = (type: string, delta: number) => {
    switch (type) {
      case 'grant':
        return <ArrowUp className="w-4 h-4 text-green-400" />;
      case 'consume':
        return <ArrowDown className="w-4 h-4 text-red-400" />;
      case 'refund':
        return <ArrowUp className="w-4 h-4 text-blue-400" />;
      case 'adjustment':
        return <RefreshCw className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTransactionColor = (type: string, delta: number) => {
    switch (type) {
      case 'grant':
      case 'refund':
        return 'text-green-400';
      case 'consume':
        return 'text-red-400';
      case 'adjustment':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f2937] rounded-lg w-full max-w-2xl max-h-[80vh] border border-[#374151] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#374151]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#3ecf8e]" />
            <h2 className="text-lg font-semibold text-[#ededed]">Transaction History</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="p-1 rounded hover:bg-[#374151] transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-[#9ca3af] ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#374151] transition-colors"
            >
              <ChevronDown className="w-5 h-5 text-[#9ca3af]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-[#3ecf8e] animate-spin" />
              <span className="ml-2 text-[#9ca3af]">Loading transactions...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4">
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchTransactions}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && transactions.length === 0 && (
            <div className="text-center py-8 text-[#9ca3af]">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transactions found</p>
            </div>
          )}

          {!loading && !error && transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-[#111111] rounded-lg border border-[#374151] overflow-hidden"
                >
                  {/* Transaction Summary */}
                  <div
                    className="p-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                    onClick={() => toggleTransaction(transaction.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.transactionType, transaction.delta)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#ededed] capitalize">
                              {transaction.transactionType}
                            </span>
                            <span className={`font-bold ${getTransactionColor(transaction.transactionType, transaction.delta)}`}>
                              {formatAmount(transaction.delta)}
                            </span>
                          </div>
                          <div className="text-sm text-[#9ca3af]">
                            Balance: {transaction.balanceAfter.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#9ca3af]">
                          {formatDate(transaction.createdAt)}
                        </span>
                        {expandedTransactions.has(transaction.id) ? (
                          <ChevronUp className="w-4 h-4 text-[#9ca3af]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  {expandedTransactions.has(transaction.id) && (
                    <div className="px-3 pb-3 border-t border-[#374151] bg-[#0a0a0a]">
                      <div className="pt-3 space-y-2 text-sm">
                        {transaction.reason && (
                          <div>
                            <span className="text-[#9ca3af]">Reason:</span>
                            <span className="ml-2 text-[#ededed]">{transaction.reason}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[#9ca3af]">Transaction ID:</span>
                          <span className="ml-2 text-[#ededed] font-mono text-xs">
                            {transaction.id}
                          </span>
                        </div>
                        {transaction.idempotencyKey && (
                          <div>
                            <span className="text-[#9ca3af]">Idempotency Key:</span>
                            <span className="ml-2 text-[#ededed] font-mono text-xs">
                              {transaction.idempotencyKey}
                            </span>
                          </div>
                        )}
                        {Object.keys(transaction.metadata).length > 0 && (
                          <div>
                            <span className="text-[#9ca3af]">Metadata:</span>
                            <pre className="ml-2 text-[#ededed] font-mono text-xs bg-[#111111] p-2 rounded mt-1">
                              {JSON.stringify(transaction.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#374151] bg-[#111111]">
          <div className="text-center text-sm text-[#9ca3af]">
            Showing {transactions.length} recent transactions
          </div>
        </div>
      </div>
    </div>
  );
}
