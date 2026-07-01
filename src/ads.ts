export type AdFormat = 'image' | 'text';

export interface Ad {
  id: string;
  format: AdFormat;
  headline: string;
  body: string;
  imageUrl?: string;
  clickUrl: string;
  // The user's earnings for one viewable view of this ad (cpm/1000 * revenue
  // share). Only set on the serving path (pickEligibleAd); drives the live
  // counter in the overlay. The popup remains the source-of-truth ledger.
  valuePerView?: number;
}

export interface Campaign extends Ad {
  impressionsPurchased: number;
  // What the advertiser pays per 1,000 viewable impressions (USD). House ads
  // use a PLACEHOLDER rate so the earnings UI has something to show in dev.
  cpm: number;
}

export const houseAds: Campaign[] = [
  { id: 'house-image-1', format: 'image', headline: 'Your ad could be here', body: 'Wait & Earn — get paid while you wait.', imageUrl: 'https://placehold.co/300x180/161616/ffffff?text=Wait+%26+Earn', clickUrl: 'https://example.com', impressionsPurchased: 1000, cpm: 2.0 },
  { id: 'house-text-1', format: 'text', headline: 'Earn while you wait', body: 'This is a placeholder house ad. Real campaigns will appear here.', clickUrl: 'https://example.com', impressionsPurchased: 1000, cpm: 2.0 },
];
