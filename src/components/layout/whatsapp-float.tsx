'use client';

import { MessageCircle } from 'lucide-react';

// ==================== WHATSAPP CONFIGURATION ====================
const WHATSAPP_NUMBER = '2347075825761'; // Your WhatsApp business number
const WHATSAPP_MESSAGE = 'Hello! I need help with shopping on JulineMart.';
// ================================================================

export default function WhatsAppFloat() {
  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(WHATSAPP_MESSAGE);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      {/* Desktop: Hidden (shows in header) */}
      {/* Mobile: Floating button */}
      <button
        onClick={handleWhatsAppClick}
        className="md:hidden fixed bottom-24 right-4 z-40 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 animate-bounce"
        aria-label="Chat on WhatsApp"
        title="Chat with us on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
        
        {/* Pulse animation */}
        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></span>
      </button>

      {/* Add bounce animation */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </>
  );
}