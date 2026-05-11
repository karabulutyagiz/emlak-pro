export type AuthenticatedUser = {
  id: string;
  publicId: string;
  email: string;
  displayName: string;
  phoneNumber?: string | null;
  role?: 'MUHASEBE' | 'YONETIM' | 'OPERASYON';
};
