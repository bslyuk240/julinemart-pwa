'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  getStorePolicies, 
  getReturnPolicyDays, 
  getFreeShippingThreshold 
} from '@/lib/woocommerce/policies';
import { 
  getTaxSettings, 
  areTaxesEnabled, 
  areCouponsEnabled,
  getStoreCurrency 
} from '@/lib/woocommerce/settings';
import { 
  getTaxRates, 
  calculateTax,
  getDefaultTaxRate 
} from '@/lib/woocommerce/tax-calculator';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function SettingsTestPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>({});

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setLoading(true);
    const testResults: any = {};

    try {
      // Test 1: Store Policies
      console.log('Testing store policies...');
      const policies = await getStorePolicies();
      testResults.policies = {
        success: true,
        data: policies,
      };

      // Test 2: Return Days
      console.log('Testing return days...');
      const returnDays = await getReturnPolicyDays();
      testResults.returnDays = {
        success: returnDays > 0,
        data: returnDays,
        message: `Return policy: ${returnDays} days`,
      };

      // Test 3: Free Shipping
      console.log('Testing free shipping threshold...');
      const threshold = await getFreeShippingThreshold();
      testResults.freeShipping = {
        success: threshold > 0,
        data: threshold,
        message: `Free shipping over ₦${threshold.toLocaleString()}`,
      };

      // Test 4: Tax Settings
      console.log('Testing tax settings...');
      const taxSettings = await getTaxSettings();
      testResults.taxSettings = {
        success: taxSettings !== null,
        data: taxSettings,
      };

      // Test 5: Taxes Enabled
      console.log('Testing if taxes are enabled...');
      const taxEnabled = await areTaxesEnabled();
      testResults.taxEnabled = {
        success: true,
        data: taxEnabled,
        message: taxEnabled ? 'Taxes are enabled' : 'Taxes are disabled',
      };

      // Test 6: Coupons Enabled
      console.log('Testing if coupons are enabled...');
      const couponsEnabled = await areCouponsEnabled();
      testResults.couponsEnabled = {
        success: true,
        data: couponsEnabled,
        message: couponsEnabled ? 'Coupons are enabled' : 'Coupons are disabled',
      };

      // Test 7: Currency
      console.log('Testing currency...');
      const currency = await getStoreCurrency();
      testResults.currency = {
        success: currency !== null,
        data: currency,
        message: `Store currency: ${currency}`,
      };

      // Test 8: Tax Rates
      console.log('Testing tax rates...');
      const taxRates = await getTaxRates();
      testResults.taxRates = {
        success: true,
        data: taxRates,
        message: `Found ${taxRates.length} tax rate(s)`,
      };

      // Test 9: Tax Calculation
      console.log('Testing tax calculation...');
      const testAmount = 10000;
      const calculatedTax = await calculateTax(testAmount, 'standard', 'NG', '');
      const taxPercent = (calculatedTax / testAmount) * 100;
      testResults.taxCalculation = {
        success: true,
        data: {
          amount: testAmount,
          tax: calculatedTax,
          percent: taxPercent.toFixed(2),
        },
        message: `Tax on ₦${testAmount.toLocaleString()}: ₦${calculatedTax.toLocaleString()} (${taxPercent.toFixed(2)}%)`,
      };

      // Test 10: Default Tax Rate
      console.log('Testing default tax rate...');
      const defaultRate = await getDefaultTaxRate('NG');
      testResults.defaultTaxRate = {
        success: true,
        data: defaultRate,
        message: `Default tax rate: ${(defaultRate * 100).toFixed(2)}%`,
      };

      setResults(testResults);
    } catch (error: any) {
      console.error('Test error:', error);
      testResults.error = {
        success: false,
        message: error.message,
      };
      setResults(testResults);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Running tests...</p>
        </div>
      </main>
    );
  }

  const allSuccess = Object.values(results).every((r: any) => r.success);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            WooCommerce Settings Test
          </h1>
          <p className="text-gray-600">
            Testing dynamic settings integration with WooCommerce
          </p>
        </div>

        {/* Overall Status */}
        <div className={`rounded-lg p-6 mb-6 ${
          allSuccess 
            ? 'bg-green-50 border-2 border-green-200' 
            : 'bg-yellow-50 border-2 border-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            {allSuccess ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-yellow-600" />
            )}
            <div>
              <h2 className={`text-xl font-bold ${
                allSuccess ? 'text-green-900' : 'text-yellow-900'
              }`}>
                {allSuccess 
                  ? '✅ All Tests Passed!' 
                  : '⚠️ Some Tests Need Attention'}
              </h2>
              <p className={`text-sm ${
                allSuccess ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {allSuccess 
                  ? 'Your WooCommerce settings are being fetched correctly' 
                  : 'Please check the details below'}
              </p>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-4">
          {Object.entries(results).map(([key, result]: [string, any]) => (
            <div key={key} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </h3>
                  
                  {result.message && (
                    <p className="text-gray-700 mb-2">{result.message}</p>
                  )}
                  
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                        View Details
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Expected Values */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Expected Values</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ <strong>Return Days:</strong> Should be 3 (your setting)</li>
            <li>✓ <strong>Free Shipping:</strong> Should match your WooCommerce shipping zone settings</li>
            <li>✓ <strong>Tax Rate:</strong> Should match your WooCommerce tax settings</li>
            <li>✓ <strong>Currency:</strong> Should be NGN (Nigerian Naira)</li>
            <li>✓ <strong>Coupons:</strong> Should reflect your WooCommerce coupon settings</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Button variant="primary" onClick={runTests}>
            Re-run Tests
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => {
              // Clear all caches
              import('@/lib/woocommerce/settings').then(m => m.clearSettingsCache());
              import('@/lib/woocommerce/policies').then(m => m.clearPoliciesCache());
              import('@/lib/woocommerce/tax-calculator').then(m => m.clearTaxCache());
              setTimeout(() => runTests(), 100);
            }}
          >
            Clear Cache & Re-test
          </Button>
          
          <a href="/" className="inline-flex items-center">
            <Button variant="ghost">
              Back to Home
            </Button>
          </a>
        </div>

        {/* Troubleshooting */}
        <div className="mt-6 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Troubleshooting</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>If return days is not 3:</strong> Check WordPress custom fields 
              or verify the policies endpoint
            </li>
            <li>
              <strong>If taxes are 0:</strong> Enable taxes in WooCommerce → Settings → Tax
            </li>
            <li>
              <strong>If tests fail:</strong> Check browser console for errors and 
              verify API credentials in .env.local
            </li>
            <li>
              <strong>If cached values are wrong:</strong> Use "Clear Cache & Re-test" button
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}