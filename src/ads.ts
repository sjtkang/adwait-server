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
