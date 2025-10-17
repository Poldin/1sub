'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CreditCard, Calendar, Lock, Check } from 'lucide-react';

type PaymentMode = 'subscription' | 'one-time' | 'donation';
type BillingPeriod = 'monthly' | 'yearly';

interface FormData {
  email: string;
  name: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  billingAddress: string;
  zipCode: string;
  country: string;
  donationAmount: string;
}

export default function CreditCheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('one-time');
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBillingAddress, setShowBillingAddress] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingAddress: '',
    zipCode: '',
    country: '',
    donationAmount: '10'
  });

  // Sample prices and credits
  const prices = {
    'one-time': 29.99,
    'subscription-monthly': 9.99,
    'subscription-yearly': 99.99,
  };

  const credits = {
    'one-time': 100,
    'subscription-monthly': 50,
    'subscription-yearly': 600,
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-format card number
    if (name === 'cardNumber') {
      const cleaned = value.replace(/\s/g, '');
      const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }
    
    // Auto-format expiry date
    if (name === 'expiryDate') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = cleaned;
      if (cleaned.length >= 2) {
        formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
      }
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }
    
    // Limit CVV to 3-4 digits
    if (name === 'cvv') {
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getCurrentPrice = () => {
    if (paymentMode === 'donation') {
      return parseFloat(formData.donationAmount) || 0;
    }
    if (paymentMode === 'subscription') {
      return prices[`subscription-${billingPeriod}`];
    }
    return prices['one-time'];
  };

  const getCurrentCredits = () => {
    if (paymentMode === 'donation') {
      // For donations: 10 credits per dollar
      return Math.floor((parseFloat(formData.donationAmount) || 0) * 10);
    }
    if (paymentMode === 'subscription') {
      return credits[`subscription-${billingPeriod}`];
    }
    return credits['one-time'];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Payment process simulation
    setTimeout(() => {
      setIsProcessing(false);
      alert('Payment processed successfully! (Demo)');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/')}
              className="text-2xl font-bold text-[#3ecf8e] hover:text-[#2dd4bf] transition-colors"
            >
              1sub<span className="text-[#9ca3af] font-normal">.io</span>
            </button>
            <div className="flex items-center space-x-2 text-sm text-[#9ca3af]">
              <Lock className="w-4 h-4" />
              <span>Secure Payment</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Payment Form */}
          <div className="space-y-6">
            {/* Payment Mode Selector */}
            <div className="bg-[#1f2937]/90 backdrop-blur-lg rounded-2xl p-6 border border-[#374151]/70">
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              
              <div className="space-y-3">
                {/* One-time Payment */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('one-time')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    paymentMode === 'one-time'
                      ? 'border-[#3ecf8e] bg-[#3ecf8e]/10'
                      : 'border-[#374151] hover:border-[#4b5563]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">One-time Payment</div>
                      <div className="text-sm text-[#9ca3af]">Single purchase</div>
                    </div>
                    <div className="text-xl font-bold text-[#3ecf8e]">{credits['one-time']} credits</div>
                  </div>
                </button>

                {/* Subscription */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('subscription')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    paymentMode === 'subscription'
                      ? 'border-[#3ecf8e] bg-[#3ecf8e]/10'
                      : 'border-[#374151] hover:border-[#4b5563]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">Subscription</div>
                      <div className="text-sm text-[#9ca3af] mb-3">Auto-renewal</div>
                      
                      {paymentMode === 'subscription' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBillingPeriod('monthly');
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              billingPeriod === 'monthly'
                                ? 'bg-[#3ecf8e] text-black'
                                : 'bg-[#374151] text-[#9ca3af] hover:bg-[#4b5563]'
                            }`}
                          >
                            Monthly
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBillingPeriod('yearly');
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              billingPeriod === 'yearly'
                                ? 'bg-[#3ecf8e] text-black'
                                : 'bg-[#374151] text-[#9ca3af] hover:bg-[#4b5563]'
                            }`}
                          >
                            Yearly
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-bold text-[#3ecf8e]">
                      {billingPeriod === 'monthly' ? credits['subscription-monthly'] : credits['subscription-yearly']}
                      <span className="text-sm text-[#9ca3af] font-normal">
                        {' '}credits/{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Donation */}
                <button
                  type="button"
                  onClick={() => setPaymentMode('donation')}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    paymentMode === 'donation'
                      ? 'border-[#3ecf8e] bg-[#3ecf8e]/10'
                      : 'border-[#374151] hover:border-[#4b5563]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">Donation</div>
                      <div className="text-sm text-[#9ca3af] mb-3">10 credits per dollar</div>
                      
                      {paymentMode === 'donation' && (
                        <div className="flex gap-2 flex-wrap">
                          {['5', '10', '25', '50'].map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({ ...prev, donationAmount: amount }));
                              }}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                formData.donationAmount === amount
                                  ? 'bg-[#3ecf8e] text-black'
                                  : 'bg-[#374151] text-[#9ca3af] hover:bg-[#4b5563]'
                              }`}
                            >
                              {parseInt(amount) * 10} cr
                            </button>
                          ))}
                          <input
                            type="number"
                            name="donationAmount"
                            value={formData.donationAmount}
                            onChange={handleInputChange}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3ecf8e]"
                            placeholder="$"
                          />
                        </div>
                      )}
                    </div>
                    {paymentMode === 'donation' && (
                      <div className="text-xl font-bold text-[#3ecf8e]">
                        {getCurrentCredits()} credits
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Order Summary */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-[#1f2937]/90 backdrop-blur-lg rounded-2xl p-6 border border-[#374151]/70 space-y-6">
              <h2 className="text-xl font-semibold">Order Summary</h2>

              {/* Order Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">1sub.io Credits</div>
                    <div className="text-sm text-[#9ca3af]">ID: {id}</div>
                    {paymentMode === 'subscription' && (
                      <div className="text-sm text-[#9ca3af] mt-1">
                        {billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'} subscription
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-semibold text-[#3ecf8e]">
                    {getCurrentCredits()} credits
                  </div>
                </div>

                <div className="border-t border-[#374151] pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#9ca3af]">Subtotal</span>
                    <span>{getCurrentPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#9ca3af]">VAT (22%)</span>
                    <span>{(getCurrentPrice() * 0.22).toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-[#374151] pt-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total</span>
                    <span>{(getCurrentPrice() * 1.22).toFixed(2)}</span>
                  </div>
                  {paymentMode === 'subscription' && (
                    <div className="text-sm text-[#9ca3af] mt-1">
                      Billed every {billingPeriod === 'monthly' ? 'month' : 'year'}
                    </div>
                  )}
                </div>
              </div>

              {/* Pay Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full bg-[#3ecf8e] text-black font-semibold py-4 px-6 rounded-lg hover:bg-[#2dd4bf] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Pay {(getCurrentPrice() * 1.22).toFixed(2)}
                  </>
                )}
              </button>

              {/* Security Badges */}
              <div className="space-y-3 pt-4 border-t border-[#374151]">
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Check className="w-4 h-4 text-[#3ecf8e]" />
                  <span>Secure transaction with SSL encryption</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Check className="w-4 h-4 text-[#3ecf8e]" />
                  <span>No data stored on our servers</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Check className="w-4 h-4 text-[#3ecf8e]" />
                  <span>Protected by Stripe</span>
                </div>
                {paymentMode === 'subscription' && (
                  <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                    <Check className="w-4 h-4 text-[#3ecf8e]" />
                    <span>You can cancel anytime</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

