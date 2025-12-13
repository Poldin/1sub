'use client';

export default function PricingExplainer() {
  return (
    <div className="max-w-6xl mx-auto mb-12 px-4">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          Subscribe once to get recurring or one-time credits
        </h2>
        <p className="text-[#d1d5db] text-base mb-2">
          1 credit = €1 = 1 CR. Use credits for any tool, any time.
        </p>
        <p className="text-lg font-semibold">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3ecf8e] to-[#2dd4bf]">
            pricing starts from €9/month
          </span>{' '}
          <a
            href="/pricing"
            className="inline-flex items-center gap-1 text-sm text-[#9ca3af] hover:text-[#3ecf8e] transition-colors"
          >
            view pricing
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </p>
      </div>
    </div>
  );
}
