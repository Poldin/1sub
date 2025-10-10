'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function UsersManagement() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      <div className="bg-[#111111] border-b border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 p-2 hover:bg-[#374151] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold">User Management</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#1f2937] rounded-lg p-8 border border-[#374151] text-center">
          <h2 className="text-xl font-semibold mb-4">UI Demo - User Management</h2>
          <p className="text-[#9ca3af]">This is a UI-only demo. User management functionality is not implemented.</p>
        </div>
      </div>
    </div>
  );
}
