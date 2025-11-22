'use client';

import { useState } from 'react';
import NumericInput from './NumericInput';

export interface PricingModel {
  one_time: {
    enabled: boolean;
    type: 'absolute' | 'range'; // absolute or range
    price?: number; // for absolute
    min_price?: number; // for range
    max_price?: number; // for range
  };
  subscription: {
    enabled: boolean;
    price: number;
    interval: 'day' | 'week' | 'month' | 'year';
    trial_days?: number;
  };
  usage_based: {
    enabled: boolean;
    price_per_unit: number;
    unit_name: string;
    minimum_units?: number;
  };
  custom_plan: {
    enabled: boolean;
    contact_email: string;
  };
}

type PricingModelType = 'one_time' | 'subscription' | 'consumption' | 'custom_plan' | 'one_time_sub' | 'one_time_cons' | 'sub_cons' | 'all' | null;

interface PricingModelsSectionProps {
  pricingModel: PricingModel;
  setPricingModel: (model: PricingModel) => void;
}

export default function PricingModelsSection({ pricingModel, setPricingModel }: PricingModelsSectionProps) {
  const [selectedModel, setSelectedModel] = useState<PricingModelType>('subscription');

  // Update pricing model based on selected model type
  const handleModelSelect = (modelType: PricingModelType) => {
    setSelectedModel(modelType);
    
    // Reset all
    const newModel: PricingModel = {
      one_time: { enabled: false, type: 'absolute', price: 0 },
      subscription: { enabled: false, price: 0, interval: 'month' as const, trial_days: 0 },
      usage_based: { enabled: false, price_per_unit: 0, unit_name: '', minimum_units: 0 },
      custom_plan: { enabled: false, contact_email: '' },
    };

    // Enable based on selection
    switch (modelType) {
      case 'one_time':
        newModel.one_time.enabled = true;
        break;
      case 'subscription':
        newModel.subscription.enabled = true;
        break;
      case 'consumption':
        newModel.usage_based.enabled = true;
        break;
      case 'custom_plan':
        newModel.custom_plan.enabled = true;
        break;
      case 'one_time_sub':
        newModel.one_time.enabled = true;
        newModel.subscription.enabled = true;
        break;
      case 'one_time_cons':
        newModel.one_time.enabled = true;
        newModel.usage_based.enabled = true;
        break;
      case 'sub_cons':
        newModel.subscription.enabled = true;
        newModel.usage_based.enabled = true;
        break;
      case 'all':
        newModel.one_time.enabled = true;
        newModel.subscription.enabled = true;
        newModel.usage_based.enabled = true;
        break;
    }

    setPricingModel(newModel);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#ededed] mb-2">Pricing Models</h2>
      <p className="text-xs text-[#9ca3af] mb-4">
        Choose one or multiple pricing models for your product
      </p>

      {/* Model Selection Badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => handleModelSelect('one_time')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedModel === 'one_time'
              ? 'bg-[#3ecf8e] text-black border-2 border-[#3ecf8e]'
              : 'bg-transparent text-[#ededed] border-2 border-[#4b5563] hover:border-[#3ecf8e]'
          }`}
        >
          One time
        </button>
        <button
          type="button"
          onClick={() => handleModelSelect('subscription')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedModel === 'subscription'
              ? 'bg-[#3ecf8e] text-black border-2 border-[#3ecf8e]'
              : 'bg-transparent text-[#ededed] border-2 border-[#4b5563] hover:border-[#3ecf8e]'
          }`}
        >
          Subscription
        </button>
        <button
          type="button"
          onClick={() => handleModelSelect('consumption')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedModel === 'consumption'
              ? 'bg-[#3ecf8e] text-black border-2 border-[#3ecf8e]'
              : 'bg-transparent text-[#ededed] border-2 border-[#4b5563] hover:border-[#3ecf8e]'
          }`}
        >
          Consumption
        </button>
        <button
          type="button"
          onClick={() => handleModelSelect('custom_plan')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedModel === 'custom_plan'
              ? 'bg-[#3ecf8e] text-black border-2 border-[#3ecf8e]'
              : 'bg-transparent text-[#ededed] border-2 border-[#4b5563] hover:border-[#3ecf8e]'
          }`}
        >
          Custom Plan
        </button>
        <button
          type="button"
          onClick={() => handleModelSelect('one_time_sub')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedModel === 'one_time_sub'
              ? 'bg-[#3ecf8e] text-black border-2 border-[#3ecf8e]'
              : 'bg-transparent text-[#ededed] border-2 border-[#4b5563] hover:border-[#3ecf8e]'
          }`}
        >
          One time + Subscription
        </button>
        <button
          type="button"
          onClick={() => handleModelSelect('one_time_cons')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedModel === 'one_time_cons'
              ? 'bg-[#3ecf8e] text-black border-2 border-[#3ecf8e]'
              : 'bg-transparent text-[#ededed] border-2 border-[#4b5563] hover:border-[#3ecf8e]'
          }`}
        >
          One time + Consumption
        </button>
        <button
          type="button"
          onClick={() => handleModelSelect('sub_cons')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedModel === 'sub_cons'
              ? 'bg-[#3ecf8e] text-black border-2 border-[#3ecf8e]'
              : 'bg-transparent text-[#ededed] border-2 border-[#4b5563] hover:border-[#3ecf8e]'
          }`}
        >
          Subscription + Consumption
        </button>
        <button
          type="button"
          onClick={() => handleModelSelect('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedModel === 'all'
              ? 'bg-[#3ecf8e] text-black border-2 border-[#3ecf8e]'
              : 'bg-transparent text-[#ededed] border-2 border-[#4b5563] hover:border-[#3ecf8e]'
          }`}
        >
          One time + Subscription + Consumption
        </button>
      </div>

      {/* Configuration Inputs Based on Selection */}
      {selectedModel && (
        <div className="space-y-4">
          {/* One-Time Payment Fields */}
          {pricingModel.one_time.enabled && (
            <div className="border border-[#4b5563] rounded-lg p-4">
              {/* Title with Type Selection */}
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-[#ededed]">One-Time Payment</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPricingModel({
                      ...pricingModel,
                      one_time: { 
                        ...pricingModel.one_time, 
                        type: 'absolute',
                        price: pricingModel.one_time.price || 0,
                        min_price: undefined,
                        max_price: undefined
                      }
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      pricingModel.one_time.type === 'absolute'
                        ? 'bg-[#3ecf8e] text-black'
                        : 'bg-[#374151] text-[#ededed] hover:bg-[#4b5563]'
                    }`}
                  >
                    Absolute
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingModel({
                      ...pricingModel,
                      one_time: { 
                        ...pricingModel.one_time, 
                        type: 'range',
                        price: undefined,
                        min_price: pricingModel.one_time.min_price || 0,
                        max_price: pricingModel.one_time.max_price || 0
                      }
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      pricingModel.one_time.type === 'range'
                        ? 'bg-[#3ecf8e] text-black'
                        : 'bg-[#374151] text-[#ededed] hover:bg-[#4b5563]'
                    }`}
                  >
                    Range
                  </button>
                </div>
              </div>

              {/* Absolute Price Input */}
              {pricingModel.one_time.type === 'absolute' && (
                <div>
                  <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Price (Credits) *
                  </label>
                  <NumericInput
                    value={pricingModel.one_time.price || 0}
                    onChange={(value) => setPricingModel({
                      ...pricingModel,
                      one_time: { ...pricingModel.one_time, price: value }
                    })}
                    min={0}
                    allowDecimals={true}
                    placeholder="99.00"
                    className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                  />
                </div>
              )}

              {/* Range Price Inputs */}
              {pricingModel.one_time.type === 'range' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                      Minimum Price (Credits) *
                    </label>
                    <NumericInput
                      value={pricingModel.one_time.min_price || 0}
                      onChange={(value) => setPricingModel({
                        ...pricingModel,
                        one_time: { ...pricingModel.one_time, min_price: value }
                      })}
                      min={0}
                      allowDecimals={true}
                      placeholder="0.00"
                      className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                      Maximum Price (Credits) *
                    </label>
                    <NumericInput
                      value={pricingModel.one_time.max_price || 0}
                      onChange={(value) => setPricingModel({
                        ...pricingModel,
                        one_time: { ...pricingModel.one_time, max_price: value }
                      })}
                      min={0}
                      allowDecimals={true}
                      placeholder="999.00"
                      className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                    />
                  </div>
                  {pricingModel.one_time.min_price !== undefined && 
                   pricingModel.one_time.max_price !== undefined && 
                   pricingModel.one_time.min_price > pricingModel.one_time.max_price && (
                    <p className="text-xs text-red-400">
                      Minimum price must be less than or equal to maximum price
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subscription Fields */}
          {pricingModel.subscription.enabled && (
            <div className="border border-[#4b5563] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#ededed] mb-3">Subscription</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Price (Credits) *
                  </label>
                  <NumericInput
                    value={pricingModel.subscription.price}
                    onChange={(value) => setPricingModel({
                      ...pricingModel,
                      subscription: { ...pricingModel.subscription, price: value }
                    })}
                    min={0}
                    allowDecimals={true}
                    placeholder="9.99"
                    className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Billing Interval *
                  </label>
                  <select
                    value={pricingModel.subscription.interval}
                    onChange={(e) => setPricingModel({
                      ...pricingModel,
                      subscription: { 
                        ...pricingModel.subscription, 
                        interval: e.target.value as 'day' | 'week' | 'month' | 'year'
                      }
                    })}
                    className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                  >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Trial Period (Days) - Optional
                  </label>
                  <NumericInput
                    value={pricingModel.subscription.trial_days || 0}
                    onChange={(value) => setPricingModel({
                      ...pricingModel,
                      subscription: { ...pricingModel.subscription, trial_days: value }
                    })}
                    min={0}
                    allowDecimals={false}
                    placeholder="7"
                    className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Usage-Based Fields */}
          {pricingModel.usage_based.enabled && (
            <div className="border border-[#4b5563] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#ededed] mb-3">Usage-Based (Consumption)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Price Per Unit (Credits) *
                  </label>
                  <NumericInput
                    value={pricingModel.usage_based.price_per_unit}
                    onChange={(value) => setPricingModel({
                      ...pricingModel,
                      usage_based: { ...pricingModel.usage_based, price_per_unit: value }
                    })}
                    min={0}
                    allowDecimals={true}
                    placeholder="0.01"
                    className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Unit Name *
                  </label>
                  <input
                    type="text"
                    value={pricingModel.usage_based.unit_name}
                    onChange={(e) => setPricingModel({
                      ...pricingModel,
                      usage_based: { ...pricingModel.usage_based, unit_name: e.target.value }
                    })}
                    className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                    placeholder="API call, request, token, etc."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Minimum Units - Optional
                  </label>
                  <NumericInput
                    value={pricingModel.usage_based.minimum_units || 0}
                    onChange={(value) => setPricingModel({
                      ...pricingModel,
                      usage_based: { ...pricingModel.usage_based, minimum_units: value }
                    })}
                    min={0}
                    allowDecimals={false}
                    placeholder="100"
                    className="w-fit px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-[#9ca3af] mt-0.5">
                    Minimum units that must be purchased
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Custom Plan Fields */}
          {pricingModel.custom_plan.enabled && (
            <div className="border border-[#4b5563] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#ededed] mb-3">Custom Plan</h3>
              <div className="space-y-3">
                <div className="bg-[#111111] border border-[#374151] rounded-lg p-3 mb-3">
                  <p className="text-xs text-[#d1d5db] mb-1">
                    <strong>Custom pricing plans</strong> allow users to contact you directly for personalized quotes and pricing.
                  </p>
                  <p className="text-xs text-[#9ca3af]">
                    Users will see a &quot;Contact for Custom Pricing&quot; button instead of a standard checkout flow.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#d1d5db] mb-1">
                    Contact Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={pricingModel.custom_plan.contact_email}
                    onChange={(e) => setPricingModel({
                      ...pricingModel,
                      custom_plan: { ...pricingModel.custom_plan, contact_email: e.target.value }
                    })}
                    className="w-full px-3 py-1.5 bg-[#374151] border border-[#4b5563] rounded-lg text-[#ededed] focus:outline-none focus:ring-2 focus:ring-[#3ecf8e] focus:border-transparent text-sm"
                    placeholder="sales@your-company.com"
                  />
                  <p className="text-xs text-[#9ca3af] mt-1">
                    Leave empty to use the tool-level custom pricing email. This email will be used for this specific product.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

