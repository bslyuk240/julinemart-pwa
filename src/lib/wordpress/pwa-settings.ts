/**
 * WordPress PWA Settings API
 * Fetches slider, banner, and settings from WordPress plugin
 */

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export interface PWASlide {
  type: 'image' | 'video' | 'gradient';
  title: string;
  description: string;
  button_text: string;
  button_link: string;
  button_text_2?: string;
  button_link_2?: string;
  media_url: string;
  media_id: string;
  overlay_opacity: number;
}

export interface PWABanner {
  enabled: boolean;
  text: string;
  background_color: string;
  text_color: string;
}

export interface PWAGeneralSettings {
  site_name: string;
  primary_color: string;
  secondary_color: string;
}

export interface PWASettings {
  sliders: PWASlide[];
  banner: PWABanner;
  settings: PWAGeneralSettings;
}

/**
 * Get all PWA settings from WordPress
 */
export async function getPWASettings(): Promise<PWASettings | null> {
  try {
    console.log('🔌 Fetching PWA settings from WordPress...');
    
    const response = await fetch(
      `${WP_URL}/wp-json/julinemart-pwa/v1/settings`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PWA settings: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ PWA settings fetched:', {
      sliders: data.sliders?.length || 0,
      banner: data.banner?.enabled ? 'enabled' : 'disabled',
    });
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching PWA settings:', error);
    return null;
  }
}

/**
 * Get only sliders
 */
export async function getPWASliders(): Promise<PWASlide[]> {
  try {
    const response = await fetch(
      `${WP_URL}/wp-json/julinemart-pwa/v1/sliders`,
      {
        next: { revalidate: 300 },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sliders: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching sliders:', error);
    return [];
  }
}

/**
 * Get only banner
 */
export async function getPWABanner(): Promise<PWABanner | null> {
  try {
    const response = await fetch(
      `${WP_URL}/wp-json/julinemart-pwa/v1/banner`,
      {
        next: { revalidate: 300 },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch banner: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching banner:', error);
    return null;
  }
}