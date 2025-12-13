'use client';

export default function Header() {
  return (
    <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#374151] z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-[#3ecf8e]">
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </h1>
          </a>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            <a
              href="/pricing"
              className="hidden md:block text-sm text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
            >
              pricing
            </a>
            <a
              href="/login"
              className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold bg-transparent border-2 border-[#3ecf8e] rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-[#3ecf8e]/20"
            >
              <span className="relative z-10 flex items-center gap-2 text-[#3ecf8e]">
                get started
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
