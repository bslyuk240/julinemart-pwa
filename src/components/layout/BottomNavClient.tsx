'use client';

import dynamic from 'next/dynamic';

const BottomNav = dynamic(() => import('@/components/layout/bottom-nav'), { 
  ssr: false 
});

export default BottomNav;
