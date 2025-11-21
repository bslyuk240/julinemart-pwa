'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { testWooCommerceConnection } from '@/lib/woocommerce/test-connection';

export default function TestAPIPage() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      const testResult = await testWooCommerceConnection();
      setResult(testResult);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔌 WooCommerce API Test
            </h1>
            <p className="text-gray-600">
              Test your WooCommerce API connection
            </p>
          </div>

          {/* Configuration Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Current Configuration:</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Base URL:</span>
                <span className="font-mono text-gray-900">
                  {process.env.NEXT_PUBLIC_WC_BASE_URL || 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">API Key:</span>
                <span className="font-mono text-gray-900">
                  {process.env.NEXT_PUBLIC_WC_KEY 
                    ? `${process.env.NEXT_PUBLIC_WC_KEY.substring(0, 10)}...` 
                    : 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Secret:</span>
                <span className="font-mono text-gray-900">
                  {process.env.NEXT_PUBLIC_WC_SECRET ? '••••••••••' : 'Not configured'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Button */}
          <Button
            onClick={handleTest}
            isLoading={testing}
            variant="primary"
            size="lg"
            fullWidth
            className="mb-6"
          >
            {testing ? 'Testing Connection...' : 'Test Connection'}
          </Button>

          {/* Results */}
          {result && (
            <div className={`rounded-lg p-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.success ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-900">Connection Successful! 🎉</h3>
                      <p className="text-sm text-green-700">Your API is working perfectly</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-green-200">
                      <span className="text-green-700">Products Found:</span>
                      <span className="font-bold text-green-900">{result.productsCount}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-green-200">
                      <span className="text-green-700">Categories Found:</span>
                      <span className="font-bold text-green-900">{result.categoriesCount}</span>
                    </div>
                    {result.wcVersion && (
                      <div className="flex justify-between py-2">
                        <span className="text-green-700">WooCommerce Version:</span>
                        <span className="font-bold text-green-900">{result.wcVersion}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t border-green-200">
                    <p className="text-sm text-green-800 font-medium mb-3">✅ Next Steps:</p>
                    <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                      <li>Your API connection is working!</li>
                      <li>Now you can replace dummy data with real products</li>
                      <li>Go to the homepage to see your products</li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-900">Connection Failed</h3>
                      <p className="text-sm text-red-700">Unable to connect to WooCommerce</p>
                    </div>
                  </div>

                  <div className="bg-white rounded p-4 mb-4">
                    <p className="font-mono text-sm text-red-600">{result.error}</p>
                  </div>

                  <div className="space-y-3 text-sm text-red-800">
                    <p className="font-medium">🔍 Troubleshooting Steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Check your .env.local file has correct credentials</li>
                      <li>Verify your WordPress site is accessible</li>
                      <li>Make sure WooCommerce REST API is enabled</li>
                      <li>Check Consumer Key and Secret are correct</li>
                      <li>Ensure your API key has Read/Write permissions</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📝 Setup Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to WordPress Admin → WooCommerce → Settings → Advanced → REST API</li>
              <li>Click "Add Key" and generate API credentials</li>
              <li>Copy the Consumer Key and Consumer Secret</li>
              <li>Add them to your .env.local file</li>
              <li>Restart your development server (npm run dev)</li>
              <li>Come back here and click "Test Connection"</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}