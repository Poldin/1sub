'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Download, Filter } from 'lucide-react';
import VendorSidebar from '../components/VendorSidebar';

interface Transaction {
  id: string;
  date: string;
  user: string;
  tool: string;
  credits: number;
  status: 'completed' | 'pending' | 'failed';
}

export default function VendorTransactionsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Mock transactions data
  const transactions: Transaction[] = [
    {
      id: '1',
      date: '2024-01-15',
      user: 'user1@example.com',
      tool: 'AI Content Generator',
      credits: 5,
      status: 'completed'
    },
    {
      id: '2',
      date: '2024-01-15',
      user: 'user2@example.com',
      tool: 'Data Analyzer Pro',
      credits: 10,
      status: 'completed'
    },
    {
      id: '3',
      date: '2024-01-14',
      user: 'user3@example.com',
      tool: 'Image Editor',
      credits: 8,
      status: 'completed'
    },
    {
      id: '4',
      date: '2024-01-14',
      user: 'user4@example.com',
      tool: 'Video Creator',
      credits: 15,
      status: 'pending'
    },
    {
      id: '5',
      date: '2024-01-13',
      user: 'user5@example.com',
      tool: 'SEO Optimizer',
      credits: 7,
      status: 'completed'
    },
    {
      id: '6',
      date: '2024-01-13',
      user: 'user6@example.com',
      tool: 'AI Content Generator',
      credits: 5,
      status: 'failed'
    }
  ];

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

  const totalCredits = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.credits, 0);

  const handleExport = () => {
    console.log('Exporting transactions...');
    alert('Transactions exported to CSV!');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <VendorSidebar 
        isOpen={isMenuOpen} 
        onClose={toggleMenu}
      />

      {/* Main Content Area */}
      <main className={`
        flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
        ${isMenuOpen ? 'lg:ml-80' : 'lg:ml-0'}
      `}>
        {/* Top Bar with Hamburger */}
        <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm z-30 overflow-x-hidden">
          <div className="flex items-center justify-between p-2 sm:p-3 min-w-0">
            {/* Hamburger Button */}
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg hover:bg-[#374151] transition-colors flex-shrink-0"
            >
              <Menu className="w-6 h-6 sm:w-6 sm:h-6" />
            </button>
            
            {/* Page Title */}
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Transactions</h1>
            
            {/* Filter and Export */}
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={handleExport}
                className="flex items-center px-3 py-2 bg-[#374151] text-[#ededed] rounded-lg hover:bg-[#4b5563] transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
            </div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Credits Earned</h3>
            <p className="text-2xl font-bold text-[#3ecf8e]">{totalCredits}</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Total Transactions</h3>
            <p className="text-2xl font-bold text-[#ededed]">{transactions.length}</p>
          </div>
          <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
            <h3 className="text-sm font-medium text-[#9ca3af] mb-2">Success Rate</h3>
            <p className="text-2xl font-bold text-[#3ecf8e]">
              {Math.round((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100)}%
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-[#1f2937] rounded-lg border border-[#374151]">
          <div className="p-6 border-b border-[#374151]">
            <h2 className="text-lg font-semibold text-[#ededed]">Transaction History</h2>
            <p className="text-sm text-[#9ca3af] mt-1">All transactions from your published tools</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Tool</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Credits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#9ca3af] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#9ca3af]">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-[#374151] hover:bg-[#374151]/50">
                      <td className="px-6 py-4 text-[#9ca3af]">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-[#ededed]">
                        {transaction.user}
                      </td>
                      <td className="px-6 py-4 text-[#ededed]">
                        {transaction.tool}
                      </td>
                      <td className="px-6 py-4 text-[#3ecf8e] font-medium">
                        +{transaction.credits}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.status === 'completed' 
                            ? 'bg-green-500/20 text-green-400'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#374151] mt-16 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Home</Link>
              <Link href="/privacy" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Privacy</Link>
              <Link href="/terms" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Terms</Link>
              <Link href="/support" className="text-[#9ca3af] hover:text-[#ededed] transition-colors">Support</Link>
            </div>
            <p className="text-[#9ca3af] text-xs mt-4">
              © 2025 1sub.io. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
      </main>
    </div>
  );
}

