'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Menu } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Link from 'next/link';

interface VendorApplication {
  id: string;
  user_id: string;
  company: string;
  website: string | null;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  user_profile: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export default function VendorApplicationsAdminPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    checkAdminAccess();
    fetchApplications();
  }, [filter]);

  const checkAdminAccess = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/backoffice');
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/admin/vendor-applications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessApplication = async (
    applicationId: string,
    newStatus: string,
    rejectionReason?: string
  ) => {
    try {
      setProcessing(applicationId);
      const response = await fetch('/api/admin/vendor-applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          new_status: newStatus,
          rejection_reason: rejectionReason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Application ${newStatus} successfully${data.message ? `: ${data.message}` : ''}`);
        fetchApplications();
      } else {
        let errorMessage = 'Failed to process application';
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorMessage;
              console.error('Error processing application:', {
                status: response.status,
                error: errorData,
                rawResponse: errorText,
              });
            } catch {
              // Not JSON, use the text as error message
              errorMessage = errorText || errorMessage;
              console.error('Error processing application (non-JSON):', {
                status: response.status,
                rawResponse: errorText,
              });
            }
          } else {
            console.error('Error processing application (empty response):', {
              status: response.status,
            });
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error processing application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process application';
      alert(`Error: ${errorMessage}`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-500';
      case 'rejected':
        return 'text-red-500';
      case 'under_review':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] flex overflow-x-hidden">
      {/* Sidebar Component */}
      <AdminSidebar 
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#ededed]">Vendor Applications</h1>
            
            {/* Spacer for centering */}
            <div className="w-10"></div>
          </div>
        </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          {['all', 'pending', 'under_review', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === status
                  ? 'bg-[#3ecf8e] text-black'
                  : 'bg-[#1f2937] text-[#ededed] hover:bg-[#374151]'
              }`}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#3ecf8e] border-r-transparent"></div>
            <p className="mt-4 text-[#9ca3af]">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 text-[#9ca3af]">
            No applications found
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-[#1f2937] border border-[#374151] rounded-lg p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{app.company}</h3>
                    <p className="text-sm text-[#9ca3af]">
                      {app.user_profile.full_name || 'Unknown'} ({app.user_profile.email})
                    </p>
                    {app.website && (
                      <a
                        href={app.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#3ecf8e] hover:underline"
                      >
                        {app.website}
                      </a>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${getStatusColor(app.status)}`}>
                    {app.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-[#d1d5db] mb-4">{app.description}</p>

                <div className="text-xs text-[#9ca3af] mb-4">
                  Applied: {new Date(app.created_at).toLocaleDateString()}
                  {app.reviewed_at && (
                    <> | Reviewed: {new Date(app.reviewed_at).toLocaleDateString()}</>
                  )}
                </div>

                {app.rejection_reason && (
                  <div className="bg-red-900/20 border border-red-500/50 rounded p-3 mb-4">
                    <p className="text-sm text-red-400">
                      <strong>Rejection Reason:</strong> {app.rejection_reason}
                    </p>
                  </div>
                )}

                {app.status === 'pending' || app.status === 'under_review' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleProcessApplication(app.id, 'under_review')}
                      disabled={processing === app.id}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => handleProcessApplication(app.id, 'approved')}
                      disabled={processing === app.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter rejection reason:');
                        if (reason) {
                          handleProcessApplication(app.id, 'rejected', reason);
                        }
                      }}
                      disabled={processing === app.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

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

