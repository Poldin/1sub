'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How does the credit system work?',
      answer: '1 credit equals €1. You can use credits across any tool on our platform. For example, if a tool costs 5 credits and you have 29 credits in your account, you can use that tool and have 24 credits remaining. Credits never expire, even if you cancel your subscription.'
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes! You can cancel your subscription at any time with no penalties or fees. Your credits will remain in your account and you can continue using them even after cancellation. You simply won\'t receive new credits each month.'
    },
    {
      question: 'What happens to unused credits?',
      answer: 'Unused credits never expire and stay in your account indefinitely. You can use them at any time, even after canceling your subscription. This means you only pay for what you actually use.'
    },
    {
      question: 'Can I switch plans?',
      answer: 'Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll receive the difference in credits immediately. When downgrading, the change will take effect at your next billing cycle.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'We offer a 14-day money-back guarantee for first-time subscribers. If you\'re not satisfied within the first 14 days, we\'ll refund your payment in full, no questions asked.'
    },
    {
      question: 'Are there any hidden fees?',
      answer: 'No hidden fees, ever. The price you see is the price you pay. All tools are included in your subscription, and you only pay with credits when you use them. No setup fees, no cancellation fees, no surprises.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for annual subscriptions. All payments are processed securely through Stripe.'
    },
    {
      question: 'Can I purchase credits without a subscription?',
      answer: 'Yes! While subscriptions offer the best value, you can also purchase one-time credit packages if you prefer. One-time credits are available starting from €9.99 for 10 credits.'
    },
    {
      question: 'Do you offer discounts for students or non-profits?',
      answer: 'Yes! We offer 50% off for verified students and 30% off for registered non-profit organizations. Contact our support team with your verification documents to claim your discount.'
    }
  ];

  return (
    <section className="py-20 px-4 bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-[#9ca3af]">
            Everything you need to know about our pricing
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-[#1f2937] border border-[#374151] rounded-xl overflow-hidden transition-all hover:border-[#3ecf8e]/50"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-[#ededed] pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#3ecf8e] flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 pb-6 text-[#d1d5db] leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[#9ca3af] mb-4">Still have questions?</p>
          <a
            href="mailto:support@1sub.io"
            className="inline-flex items-center gap-2 text-[#3ecf8e] hover:text-[#2dd4bf] font-semibold transition-colors"
          >
            Contact our support team
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

