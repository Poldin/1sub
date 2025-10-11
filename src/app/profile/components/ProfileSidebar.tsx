'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  ArrowLeft,
  User,
  CreditCard,
  History,
  HelpCircle,
  Home
} from 'lucide-react';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
  const router = useRouter();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-full lg:w-80 bg-[#111111] border-r border-[#374151] z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-[#374151]">
          <Link href="/profile" className="text-2xl font-bold text-[#3ecf8e]">
            1sub<span className="text-[#9ca3af] font-normal">.io</span>
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#374151] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => router.push('/backoffice')}
            className="w-full flex items-center px-4 py-3 text-left text-[#9ca3af] hover:text-[#ededed] hover:bg-[#374151] rounded-lg transition-colors"
          >
            <Home className="w-5 h-5 mr-3" />
            Back to App
          </button>
          
          <button
            onClick={() => router.push('/profile')}
            className="w-full flex items-center px-4 py-3 text-left text-[#3ecf8e] bg-[#3ecf8e]/10 rounded-lg transition-colors"
          >
            <User className="w-5 h-5 mr-3" />
            Profile
          </button>

          <button
            onClick={() => router.push('/support')}
            className="w-full flex items-center px-4 py-3 text-left text-[#9ca3af] hover:text-[#ededed] hover:bg-[#374151] rounded-lg transition-colors"
          >
            <HelpCircle className="w-5 h-5 mr-3" />
            Support
          </button>
        </nav>
      </aside>
    </>
  );
}

