import { NextResponse } from 'next/server';
import { getHomepageSectionsData } from '@/lib/homepage-sections';

export const revalidate = 60;

export async function GET() {
  try {
    const data = await getHomepageSectionsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Homepage sections API failed:', error);
    return NextResponse.json(
      {
        flashSaleProducts: [],
        dealProducts: [],
        trendingProducts: [],
        topSellerProducts: [],
        sponsoredProducts: [],
        launchingProducts: [],
        electronicsProducts: [],
        fashionProducts: [],
      },
      { status: 500 }
    );
  }
}
