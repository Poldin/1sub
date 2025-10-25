'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface PricingConfig {
  one_time: {
    available: boolean;
    price: number;
  };
  subscription: {
    available: boolean;
    price: number;
    period: 'monthly' | 'yearly';
  };
  usage: {
    available: boolean;
    price: number;
    unit: string;
  };
}

interface ToolPricingEditorProps {
  pricing: PricingConfig;
  onPricingChange: (pricing: PricingConfig) => void;
}

export default function ToolPricingEditor({ pricing, onPricingChange }: ToolPricingEditorProps) {
  const [expandedSections, setExpandedSections] = useState({
    oneTime: true,
    subscription: true,
    usage: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updatePricing = (section: keyof PricingConfig, updates: Partial<PricingConfig[keyof PricingConfig]>) => {
    const newPricing = {
      ...pricing,
      [section]: {
        ...pricing[section],
        ...updates
      }
    };
    onPricingChange(newPricing);
  };

  const togglePricing = (section: keyof PricingConfig) => {
    updatePricing(section, { available: !pricing[section].available });
  };

  const hasAnyPricing = pricing.one_time.available || pricing.subscription.available || pricing.usage.available;

  return (
    <div className="bg-[#1f2937] rounded-lg p-6 border border-[#374151]">
      <h2 className="text-lg font-semibold text-[#ededed] mb-6">Pricing Configuration</h2>
      
      {/* One-time Purchase Section */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => toggleSection('oneTime')}
          className="flex items-center justify-between w-full p-3 bg-[#374151] rounded-lg hover:bg-[#4b5563] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pricing.one_time.available}
                onChange={() => togglePricing('one_time')}
                className="w-4 h-4 text-[#3ecf8e] bg-[#4b5563] border-[#6b7280] rounded focus:ring-[#3ecf8e] focus:ring-2"
              />
              <span className="text-[#ededed] font-medium">One-time Purchase</span>
            </div>
          </div>
          {expandedSections.oneTime ? (
            <ChevronDown className="w-5 h-5 text-[#9ca3af]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[#9ca3af]" />
          )}
        </button>
        
        {expandedSections.oneTime && (
          <div className={`mt-3 p-4 bg-[#2d3748] rounded-lg border border-[#4b5563] ${!pricing.one_time.available ? 'opacity-50' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricing.one_time.price || ''}
                onChange={(e) => updatePricing('one_time', { price: parseFloat(e.target.value) || 0 })}
                disabled={!pricing.one_time.available}
                className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="0.00"
              />
            </div>
          </div>
        )}
      </div>

      {/* Subscription Section */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => toggleSection('subscription')}
          className="flex items-center justify-between w-full p-3 bg-[#374151] rounded-lg hover:bg-[#4b5563] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pricing.subscription.available}
                onChange={() => togglePricing('subscription')}
                className="w-4 h-4 text-[#3ecf8e] bg-[#4b5563] border-[#6b7280] rounded focus:ring-[#3ecf8e] focus:ring-2"
              />
              <span className="text-[#ededed] font-medium">Subscription</span>
            </div>
          </div>
          {expandedSections.subscription ? (
            <ChevronDown className="w-5 h-5 text-[#9ca3af]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[#9ca3af]" />
          )}
        </button>
        
        {expandedSections.subscription && (
          <div className={`mt-3 p-4 bg-[#2d3748] rounded-lg border border-[#4b5563] ${!pricing.subscription.available ? 'opacity-50' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.subscription.price || ''}
                  onChange={(e) => updatePricing('subscription', { price: parseFloat(e.target.value) || 0 })}
                  disabled={!pricing.subscription.available}
                  className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Billing Period
                </label>
                <select
                  value={pricing.subscription.period}
                  onChange={(e) => updatePricing('subscription', { period: e.target.value as 'monthly' | 'yearly' })}
                  disabled={!pricing.subscription.available}
                  className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Usage-based Section */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => toggleSection('usage')}
          className="flex items-center justify-between w-full p-3 bg-[#374151] rounded-lg hover:bg-[#4b5563] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pricing.usage.available}
                onChange={() => togglePricing('usage')}
                className="w-4 h-4 text-[#3ecf8e] bg-[#4b5563] border-[#6b7280] rounded focus:ring-[#3ecf8e] focus:ring-2"
              />
              <span className="text-[#ededed] font-medium">Usage-based</span>
            </div>
          </div>
          {expandedSections.usage ? (
            <ChevronDown className="w-5 h-5 text-[#9ca3af]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[#9ca3af]" />
          )}
        </button>
        
        {expandedSections.usage && (
          <div className={`mt-3 p-4 bg-[#2d3748] rounded-lg border border-[#4b5563] ${!pricing.usage.available ? 'opacity-50' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Price per Unit ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricing.usage.price || ''}
                  onChange={(e) => updatePricing('usage', { price: parseFloat(e.target.value) || 0 })}
                  disabled={!pricing.usage.available}
                  className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#d1d5db] mb-2">
                  Usage Unit
                </label>
                <input
                  type="text"
                  value={pricing.usage.unit}
                  onChange={(e) => updatePricing('usage', { unit: e.target.value })}
                  disabled={!pricing.usage.available}
                  className="w-full px-3 py-2 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="per_call"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Warning Message */}
      {!hasAnyPricing && (
        <div className="mb-4 p-3 bg-[#fbbf24]/10 border border-[#fbbf24]/30 rounded-lg">
          <p className="text-sm text-[#fbbf24]">
            ⚠️ No pricing options enabled. Users won&apos;t be able to purchase this tool.
          </p>
        </div>
      )}

    </div>
  );
}
