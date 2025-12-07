'use client';

import { Check, Shield, Star, Users } from 'lucide-react';

export default function TrustIndicators() {
  return (
    <section className="section-padding bg-[#111111] pb-8 sm:pb-16 border-t-2 border-[#374151]/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Social Proof Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 sm:mb-12">
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6 text-center hover:border-[#3ecf8e] transition-all">
            <Star className="w-10 h-10 text-[#3ecf8e] mx-auto mb-3" />
            <div className="text-3xl font-bold text-[#ededed] mb-1">96%</div>
            <div className="text-[#9ca3af] text-sm">customer satisfaction rating</div>
          </div>
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6 text-center hover:border-[#3ecf8e] transition-all">
            <Users className="w-10 h-10 text-[#3ecf8e] mx-auto mb-3" />
            <div className="text-3xl font-bold text-[#ededed] mb-1">280+</div>
            <div className="text-[#9ca3af] text-sm">active subscribers</div>
          </div>
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6 text-center hover:border-[#3ecf8e] transition-all">
            <Shield className="w-10 h-10 text-[#3ecf8e] mx-auto mb-3" />
            <div className="text-3xl font-bold text-[#ededed] mb-1">100%</div>
            <div className="text-[#9ca3af] text-sm">secure & encrypted</div>
          </div>
          <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-6 text-center hover:border-[#3ecf8e] transition-all">
            <Check className="w-10 h-10 text-[#3ecf8e] mx-auto mb-3" />
            <div className="text-3xl font-bold text-[#ededed] mb-1">24/7</div>
            <div className="text-[#9ca3af] text-sm">support available</div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-center mb-6 text-[#ededed]">What Our Users Say</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: 'Sarah Chen',
              role: 'Product Designer',
              text: 'Switching to 1sub saved me over €100/month. I can access all the tools I need without breaking the bank.',
              rating: 5,
            },
            {
              name: 'Marcus Rodriguez',
              role: 'Software Engineer',
              text: 'The flexibility is incredible. I only pay for what I use, and the credit system makes budgeting so much easier.',
              rating: 5,
            },
            {
              name: 'Emily Watson',
              role: 'Marketing Manager',
              text: 'Finally, a subscription model that makes sense. No more paying for tools I rarely use!',
              rating: 5,
            },
          ].map((testimonial, index) => (
            <div
              key={index}
              className="bg-[#1f2937] border border-[#374151] rounded-xl p-6 hover:border-[#3ecf8e] transition-all"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-[#3ecf8e] fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-[#d1d5db] mb-4 leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#3ecf8e] to-[#2dd4bf] rounded-full flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[#ededed] font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-[#9ca3af] text-xs">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 sm:mt-12 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-[#9ca3af]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#3ecf8e]" />
            <span className="text-sm">SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-[#3ecf8e]" />
            <span className="text-sm">GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#3ecf8e]" />
            <span className="text-sm">PCI DSS Level 1</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-[#3ecf8e]" />
            <span className="text-sm">99.9% Uptime</span>
          </div>
        </div>
      </div>
    </section>
  );
}

