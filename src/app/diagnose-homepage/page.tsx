'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function DiagnoseHomepage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/diagnose-homepage', {
        cache: 'no-store',
      });
      const data = await response.json();
      setResults(data);
    } catch (error: any) {
      setResults({
        error: true,
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔍 Homepage Tags Diagnostic
            </h1>
            <p className="text-gray-600">
              Check why tagged products aren't showing on homepage
            </p>
          </div>

          {/* Run Button */}
          <Button
            onClick={runDiagnostics}
            isLoading={loading}
            variant="primary"
            size="lg"
            fullWidth
            className="mb-8"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              'Run Full Diagnostic'
            )}
          </Button>

          {/* Results */}
          {results && !results.error && (
            <div className="space-y-6">
              {/* Environment */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment Variables</h2>
                <div className="space-y-2 text-sm font-mono">
                  {Object.entries(results.environment).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className={value.includes('NOT SET') ? 'text-red-600' : 'text-green-600'}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tests */}
              {results.tests && results.tests.map((test: any, index: number) => (
                <div key={index} className="border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {test.status === 'success' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                  </div>

                  {/* Test 1: All Tags */}
                  {index === 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Found {test.count} total tags in WooCommerce
                      </p>
                      {test.tags && test.tags.length > 0 && (
                        <div className="bg-gray-50 rounded p-4 max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left border-b">
                                <th className="pb-2">Name</th>
                                <th className="pb-2">Slug</th>
                                <th className="pb-2">Products</th>
                              </tr>
                            </thead>
                            <tbody>
                              {test.tags.map((tag: any) => (
                                <tr key={tag.id} className="border-b last:border-0">
                                  <td className="py-2">{tag.name}</td>
                                  <td className="py-2 font-mono text-xs">{tag.slug}</td>
                                  <td className="py-2">{tag.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test 2: Target Tags */}
                  {index === 1 && (
                    <div className="space-y-4">
                      {test.found && test.found.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-2">
                            ✅ Found Tags ({test.found.length}):
                          </p>
                          <div className="space-y-2">
                            {test.found.map((tag: any) => (
                              <div key={tag.slug} className="bg-green-50 border border-green-200 rounded p-3">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium text-green-900">{tag.name}</span>
                                    <span className="text-xs text-green-600 ml-2 font-mono">({tag.slug})</span>
                                  </div>
                                  <span className="text-sm text-green-700">{tag.count} products</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {test.missing && test.missing.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-2">
                            ❌ Missing Tags ({test.missing.length}):
                          </p>
                          <div className="space-y-2">
                            {test.missing.map((slug: string) => (
                              <div key={slug} className="bg-red-50 border border-red-200 rounded p-3">
                                <span className="font-medium text-red-900 font-mono">{slug}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test 3 & 4: Products by Tag */}
                  {(index === 2 || index === 3) && (
                    <div className="space-y-3">
                      {test.results && test.results.map((result: any) => (
                        <div 
                          key={result.tag} 
                          className={`rounded p-4 ${
                            result.success && result.count > 0 
                              ? 'bg-green-50 border border-green-200' 
                              : result.success && result.count === 0
                                ? 'bg-yellow-50 border border-yellow-200'
                                : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="font-medium font-mono">{result.tag}</span>
                              {result.tagId && <span className="text-xs text-gray-600 ml-2">(ID: {result.tagId})</span>}
                            </div>
                            <span className={`text-sm font-semibold ${
                              result.count > 0 ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              {result.count} products
                            </span>
                          </div>

                          {result.products && result.products.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {result.products.map((product: any) => (
                                <div key={product.id} className="text-sm text-gray-700">
                                  • {product.name}
                                  {product.tags && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({product.tags.map((t: any) => t.slug).join(', ')})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {result.error && (
                            <p className="text-sm text-red-600 mt-2">{result.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Summary */}
              {results.summary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h2 className="text-lg font-semibold text-blue-900 mb-4">Summary</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-900">{results.summary.totalTags}</div>
                      <div className="text-sm text-blue-700">Total Tags</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{results.summary.targetTagsFound}</div>
                      <div className="text-sm text-blue-700">Target Tags Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{results.summary.targetTagsMissing}</div>
                      <div className="text-sm text-blue-700">Missing Tags</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-900">{results.summary.productsFound}</div>
                      <div className="text-sm text-blue-700">Products Found</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {results.recommendations && results.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
                  {results.recommendations.map((rec: any, index: number) => (
                    <div 
                      key={index}
                      className={`rounded-lg p-4 flex gap-3 ${
                        rec.type === 'success' ? 'bg-green-50 border border-green-200' :
                        rec.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-red-50 border border-red-200'
                      }`}
                    >
                      {rec.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : rec.type === 'warning' ? (
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${
                          rec.type === 'success' ? 'text-green-900' :
                          rec.type === 'warning' ? 'text-yellow-900' :
                          'text-red-900'
                        }`}>
                          {rec.message}
                        </p>
                        <p className={`text-sm mt-1 ${
                          rec.type === 'success' ? 'text-green-700' :
                          rec.type === 'warning' ? 'text-yellow-700' :
                          'text-red-700'
                        }`}>
                          {rec.action}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {results && results.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Diagnostic Failed</h3>
              </div>
              <p className="text-red-700 mb-4">{results.message}</p>
              {results.recommendations && (
                <div className="space-y-2">
                  {results.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="bg-white rounded p-3">
                      <p className="text-sm text-red-900 font-medium">{rec.message}</p>
                      <p className="text-sm text-red-700 mt-1">{rec.action}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}