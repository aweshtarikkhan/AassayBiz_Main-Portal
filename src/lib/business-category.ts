export type BusinessCategory = 'industrial' | 'retail';

export interface BusinessCategoryInfo {
  id: BusinessCategory;
  title: string;
  subtitle: string;
  targetAudience: string;
  description: string;
  features: string[];
}

export const BUSINESS_CATEGORIES: Record<BusinessCategory, BusinessCategoryInfo> = {
  industrial: {
    id: 'industrial',
    title: 'Industrial / Business Use',
    subtitle: 'Standard B2B & Enterprise Operations',
    targetAudience: 'Manufacturers, Wholesalers, Distributors, Agencies & Service Providers',
    description:
      'Full B2B/B2C software suite with client catalog management, vendor purchase invoices, custom credit payment terms (Net 15/30/60), delivery challans, and complete multi-department navigation.',
    features: [
      'Full Client Master directory with saved profiles & GSTINs',
      'Configurable credit payment terms & due dates',
      'Complete Terms & Conditions and Display Options',
      'Purchase Orders, GRNs, Vendor Invoices & Returns',
      'Full sidebar view with all modules and channels',
    ],
  },
  retail: {
    id: 'retail',
    title: 'Retail Use',
    subtitle: 'Retailer & Shop Owner Use Case',
    targetAudience: 'Retail Shops, Supermarkets, Counter Sales, Showrooms & B2C Outlets',
    description:
      'Fast counter billing designed for retail shop owners. Create invoices instantly with just customer name and optional mobile number without mandatory client master registration. Defaults to immediate 0-day payment terms, automatic CGST & SGST tax breakdown, and clean one-suite-at-a-time sidebar navigation.',
    features: [
      'Fast counter billing with simple Customer Name & Mobile (no mandatory client save)',
      '0-day default payment terms (Due on receipt)',
      'Due date, payment terms, and terms & conditions hidden from invoice & PDF',
      'Display options simplified and hidden from builder (configurable in Settings)',
      'One-suite-at-a-time sidebar navigation with quick suite switcher icons at the bottom',
    ],
  },
};

/**
 * Resolves the business category for any organization.
 * Guarantees 100% backward compatibility by defaulting to 'industrial' for all existing accounts.
 */
export function getOrgCategory(org: any): BusinessCategory {
  if (!org) return 'industrial';
  
  const rawCategory =
    org.business_category ||
    org.org_type ||
    org.invoice_preferences?.business_category ||
    org.address?.business_category;

  if (typeof rawCategory === 'string' && rawCategory.toLowerCase().trim() === 'retail') {
    return 'retail';
  }

  return 'industrial';
}

export function isRetailOrg(org: any): boolean {
  return getOrgCategory(org) === 'retail';
}
