'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Home, 
  Users,
  Settings,
  Activity,
  CreditCard,
  Key,
  LogOut,
  ArrowLeft
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    console.log('Admin logout');
    router.push('/');
  };

  const menuItems = [
    { name: 'Overview', href: '/admin', icon: Home },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Tools', href: '/admin/tools', icon: Settings },
    { name: 'Usage Logs', href: '/admin/usage-logs', icon: Activity },
    { name: 'Refund', href: '/admin/refund', icon: CreditCard },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
    { name: 'API', href: '/admin/api', icon: Key },
  ];

  return (
    <>
      {/* Overlay for mobile when menu is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Menu */}
      <aside className={`
        fixed top-0 left-0 h-full w-full lg:w-80 bg-[#111111] border-r border-[#374151] z-50 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#374151]">
          <h1 className="text-xl font-bold text-[#3ecf8e]">
            1sub<span className="text-[#9ca3af] font-normal">.io</span>
          </h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#374151] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#ededed] group"
                >
                  <Icon className="w-5 h-5 text-[#3ecf8e] group-hover:text-[#2dd4bf]" />
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-[#374151] space-y-2">
          <button
            onClick={() => router.push('/backoffice')}
            className="w-full flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#9ca3af] hover:text-[#ededed]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to App</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded hover:bg-[#374151] transition-colors text-[#9ca3af] hover:text-[#ededed]"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
