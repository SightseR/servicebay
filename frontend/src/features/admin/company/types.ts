export interface CompanyProfile {
  companyName: string | null; tagline: string | null;
  addressLine1: string | null; addressLine2: string | null; postalCode: string | null; city: string | null; country: string | null;
  phone: string | null; email: string | null; website: string | null;
  businessId: string | null; vatId: string | null; logoPath: string | null;
}
export type CompanyProfileInput = Omit<CompanyProfile, 'logoPath'>;
