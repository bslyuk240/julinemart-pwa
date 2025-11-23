'use client';

import { CheckCircle, Package, Truck, Clock, XCircle, MapPin, Boxes, Navigation } from 'lucide-react';

interface OrderStatusTrackerProps {
  status: string;
  dateCreated: string;
  datePaid?: string | null;
  dateCompleted?: string | null;
  metaData?: Array<{
    key: string;
    value: any;
  }>;
}

interface StatusStep {
  key: string;
  label: string;
  description: string;
  icon: any;
  color: {
    completed: string;
    current: string;
    inactive: string;
  };
}

interface TrackingItem {
  tracking_provider: string;
  tracking_number: string;
  date_shipped?: string;
  tracking_link?: string;
}

export default function OrderStatusTracker({
  status,
  dateCreated,
  datePaid,
  dateCompleted,
  metaData = [],
}: OrderStatusTrackerProps) {
  
  // Extract meta values helper
  const getMetaValue = (key: string): any => {
    const meta = metaData.find(m => m.key === key || m.key === `_${key}`);
    return meta?.value || null;
  };

  // Get Advanced Shipment Tracking data
  const trackingItems: TrackingItem[] = getMetaValue('wc_shipment_tracking_items') || [];
  
  // Get JLO data
  const jloCarrier = getMetaValue('jlo_recommended_carrier');
  const jloHub = getMetaValue('jlo_hub_name');
  const jloEstimated = getMetaValue('jlo_estimated_delivery');
  const jloMultiHub = getMetaValue('jlo_multi_hub') === 'yes';
  const jloCarriers = getMetaValue('jlo_carriers');
  const jloHubs = getMetaValue('jlo_hubs');

  // Check if tracking has been added
  const hasTracking = trackingItems && trackingItems.length > 0;
  const dateShipped = hasTracking && trackingItems[0]?.date_shipped ? trackingItems[0].date_shipped : null;

  // Normalize status - remove 'wc-' prefix if present
  const normalizedStatus = status.replace(/^wc-/, '');

  // Status progression map (defines which statuses come before others)
  const statusProgression: Record<string, number> = {
    'pending': 0,
    'processing': 1,
    'ready-to-ship': 2,
    'shipped': 3,
    'out-for-delivery': 4,
    'delivered': 5,
    'completed': 5, // Map 'completed' to same level as 'delivered'
  };

  // Debug logging (remove in production)
  console.log('🔍 Order Status Debug:', {
    originalStatus: status,
    normalizedStatus: normalizedStatus,
    progressionLevel: statusProgression[normalizedStatus],
    hasTracking,
    dateShipped,
    metaDataKeys: metaData.map(m => m.key),
  });

  // Define ALL possible status steps with their progression order
  const allStatusSteps: StatusStep[] = [
    {
      key: 'pending',
      label: 'Order Placed',
      description: formatDate(dateCreated),
      icon: Package,
      color: {
        completed: 'bg-green-500 border-green-500',
        current: 'bg-yellow-600 border-yellow-600',
        inactive: 'bg-white border-gray-300',
      },
    },
    {
      key: 'processing',
      label: 'Processing',
      description: datePaid ? `Payment confirmed ${formatDate(datePaid)}` : 'Order is being prepared',
      icon: Clock,
      color: {
        completed: 'bg-green-500 border-green-500',
        current: 'bg-blue-600 border-blue-600',
        inactive: 'bg-white border-gray-300',
      },
    },
    {
      key: 'ready-to-ship',
      label: 'Ready to Ship',
      description: 'Order packed and ready for pickup',
      icon: Boxes,
      color: {
        completed: 'bg-green-500 border-green-500',
        current: 'bg-cyan-600 border-cyan-600',
        inactive: 'bg-white border-gray-300',
      },
    },
    {
      key: 'shipped',
      label: 'Shipped',
      description: dateShipped ? `Shipped ${formatDate(dateShipped)}` : 'Order dispatched',
      icon: Truck,
      color: {
        completed: 'bg-green-500 border-green-500',
        current: 'bg-indigo-600 border-indigo-600',
        inactive: 'bg-white border-gray-300',
      },
    },
    {
      key: 'out-for-delivery',
      label: 'Out for Delivery',
      description: 'Package is with courier',
      icon: Navigation,
      color: {
        completed: 'bg-green-500 border-green-500',
        current: 'bg-purple-600 border-purple-600',
        inactive: 'bg-white border-gray-300',
      },
    },
    {
      key: 'delivered',
      label: 'Delivered',
      description: dateCompleted ? `Delivered ${formatDate(dateCompleted)}` : 'Order delivered successfully',
      icon: CheckCircle,
      color: {
        completed: 'bg-green-500 border-green-500',
        current: 'bg-green-600 border-green-600',
        inactive: 'bg-white border-gray-300',
      },
    },
  ];

  // Handle cancelled/failed orders
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'failed') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status</h2>
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">
              {normalizedStatus === 'cancelled' ? 'Order Cancelled' : 'Order Failed'}
            </p>
            <p className="text-sm text-red-700">
              {normalizedStatus === 'cancelled' 
                ? 'This order has been cancelled'
                : 'There was an issue processing this order'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle refunded orders
  if (normalizedStatus === 'refunded') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status</h2>
        <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <CheckCircle className="w-6 h-6 text-purple-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-purple-900">Order Refunded</p>
            <p className="text-sm text-purple-700">This order has been refunded</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle on-hold
  if (normalizedStatus === 'on-hold') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status</h2>
        <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <Clock className="w-6 h-6 text-orange-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-orange-900">Order On Hold</p>
            <p className="text-sm text-orange-700">Your order is temporarily on hold. We'll update you soon.</p>
          </div>
        </div>
      </div>
    );
  }

  // Get current status position (with fallback to 1 if unknown status)
  const currentStatusPosition = statusProgression[normalizedStatus] ?? 1;

  // Filter steps to show only those that are relevant (up to current status)
  const visibleSteps = allStatusSteps.filter((step, index) => {
    // Always show steps up to and including the current status
    return statusProgression[step.key] <= currentStatusPosition;
  });

  // Determine step states
  const isStepCompleted = (stepKey: string): boolean => {
    return statusProgression[stepKey] < currentStatusPosition;
  };

  const isStepCurrent = (stepKey: string): boolean => {
    return statusProgression[stepKey] === currentStatusPosition;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Status</h2>
      
      {/* Debug Info - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-xs font-mono">
          <p><strong>Status:</strong> {status} → {normalizedStatus}</p>
          <p><strong>Position:</strong> {currentStatusPosition}</p>
          <p><strong>Steps Visible:</strong> {visibleSteps.length}</p>
        </div>
      )}
      
      {/* Multi-Hub Alert */}
      {jloMultiHub && (
        <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg">
          <div className="flex items-start gap-3">
            <MapPin className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 mb-2">Multi-Hub Delivery</h3>
              <p className="text-sm text-orange-800 mb-2">
                Your order will arrive in multiple shipments from different warehouses for faster delivery.
              </p>
              {jloHubs && (
                <p className="text-xs text-orange-700 mb-1">
                  <strong>Fulfillment Hubs:</strong> {jloHubs}
                </p>
              )}
              {jloCarriers && (
                <p className="text-xs text-orange-700">
                  <strong>Carriers:</strong> {jloCarriers}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Tracking Information */}
      {hasTracking ? (
        <div className="mb-6 space-y-3">
          {trackingItems.map((item: TrackingItem, index: number) => (
            <div key={index} className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-900">
                    Tracking Number {trackingItems.length > 1 ? `#${index + 1}` : ''}
                  </p>
                  <p className="text-lg font-bold text-primary-700 font-mono mt-1">
                    {item.tracking_number}
                  </p>
                  <p className="text-sm text-primary-600 mt-1">
                    Carrier: <strong>{item.tracking_provider}</strong>
                  </p>
                  {item.date_shipped && (
                    <p className="text-xs text-primary-500 mt-1">
                      Shipped: {formatDate(item.date_shipped)}
                    </p>
                  )}
                </div>
                <Truck className="w-8 h-8 text-primary-600 flex-shrink-0" />
              </div>
              
              {item.tracking_link && (
                <a
                  href={item.tracking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-full p-2 bg-primary-600 text-white text-center rounded text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Track with {item.tracking_provider} →
                </a>
              )}
            </div>
          ))}
          
          {/* JLO Portal Link */}
          <a
            href="https://jlo.julinemart.com/customer"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full p-3 border-2 border-primary-600 text-primary-600 text-center rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5" />
              <span>Track in Real-Time on JLO Portal</span>
            </div>
          </a>
        </div>
      ) : jloCarrier ? (
        /* Show JLO assigned carrier when tracking not added yet */
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
          <div className="flex items-start gap-3">
            <Truck className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-green-900 mb-1">Assigned for Delivery</h3>
              <p className="text-sm text-green-800 mb-2">
                Your order will be delivered by <strong>{jloCarrier}</strong>
              </p>
              {jloHub && (
                <p className="text-xs text-green-700 mb-1">
                  📍 Shipping from: {jloHub}
                </p>
              )}
              {jloEstimated && (
                <p className="text-xs text-green-700">
                  ⏱️ Estimated delivery: {jloEstimated}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Dynamic Status Timeline - Only shows steps up to current status */}
      <div className="space-y-6">
        {visibleSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = isStepCompleted(step.key);
          const isCurrent = isStepCurrent(step.key);

          // Determine colors based on state
          let containerClass = '';
          if (isCompleted) {
            containerClass = step.color.completed;
          } else if (isCurrent) {
            containerClass = step.color.current;
          } else {
            containerClass = step.color.inactive;
          }

          return (
            <div key={step.key} className="relative">
              {/* Connection line - only show if not the last visible step */}
              {index < visibleSteps.length - 1 && (
                <div
                  className={`absolute left-6 top-12 w-0.5 h-full -ml-px ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Status step */}
              <div className="flex items-start gap-4">
                {/* Icon container */}
                <div
                  className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 flex-shrink-0 transition-all ${containerClass} ${
                    isCurrent ? 'animate-pulse' : ''
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <Icon
                      className={`w-6 h-6 ${
                        isCurrent ? 'text-white' : 'text-gray-400'
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div
                    className={`font-semibold ${
                      isCompleted || isCurrent
                        ? 'text-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </div>
                  <div
                    className={`text-sm mt-1 ${
                      isCompleted || isCurrent
                        ? 'text-gray-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.description}
                  </div>
                  
                  {/* Current status indicator */}
                  {isCurrent && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-blue-700">
                        In Progress
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to format dates
function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}