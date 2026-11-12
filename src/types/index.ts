export type UserRole = "admin" | "editor" | "viewer";

export type Platform =
  | "instagram"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "tiktok";

export type CompanyPlan = "free" | "basic" | "premium";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  isSuperAdmin?: boolean;
}

export interface SocialAccount {
  id: string;
  platform: Platform;
  name: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  connectedBy: string;
  connectedAt: Date;
}

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  filename: string;
  size: number;
  uploadedBy: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  platform: Platform;
  content: string;
  mediaIds: string[];
  status: "published" | "failed";
  publishedAt: Date;
  publishedBy: string;
  platformPostId?: string;
  error?: string;
  createdAt: Date;
  pageId: string;
  message?: string;
  title?: string;
  imageUrl?: string;
  videoUrl?: string;
  link?: string | null;
  permalink?: string | null;
  facebookPostId?: string | null;
  instagramPostId?: string | null;
  linkedinPostId?: string | null;
  youtubeVideoId?: string | null;
  tiktokPublishId?: string | null;
  publishedByUid: string;
  publishedByName: string | null;
  publishedByEmail: string | null;
  source?: "manual" | "schedule";
  scheduledPostId?: string | null;
}

export interface PlatformCredentials {
  platform: Platform;
  appId: string;
  appSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishedPost {
  id: string;
  platform: "facebook";
  pageId: string;
  pageName: string;
  message?: string;
  imageUrl?: string;
  videoUrl?: string;
  link?: string;
  facebookPostId?: string;
  publishedAt: Date;
  status: "published" | "failed";
}
export type MemberRole = "admin" | "editor" | "viewer";

export interface Company {
  id: string;
  name: string;
  createdAt: Date;
  logoUrl: string | null;
  createdBy: string;
  plan: CompanyPlan;
  planStatus: "active" | "past_due" | "canceled" | "trialing";
  limits?: StorageLimits;
  storageUsedBytes?: number;
}

export interface Membership {
  id: string;
  uid: string;
  companyId: string;
  role: MemberRole;
  createdAt: Date;
}

export type CompanyCourtesy = {
  active?: boolean;
  plan?: CompanyPlan | string;
  until?: unknown;
  reason?: string | null;
  limits?: StorageLimits;
  grantedBy?: string | null;
  grantedAt?: string | null;
};

export type CompanyPartner = {
  active?: boolean;
  tier?: "basic" | "premium" | string;
  until?: unknown;
  reason?: string | null;
  limits?: StorageLimits;
  grantedBy?: string | null;
  grantedAt?: string | null;
};

export type CompanyDoc = {
  id: string;
  name?: string | null;
  logoUrl?: string | null;
  aiInstructions?: string | null;
  plan?: CompanyPlan | string;
  planStatus?: string;
  planSource?: string;
  features?: { aiEnabled?: boolean };
  limits?: StorageLimits;
  storageUsedBytes?: number;
  courtesy?: CompanyCourtesy | null;
  partner?: CompanyPartner | null;
  paypalSubscriptionId?: string | null;
  nextBillingTime?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};
export type StorageLimits = {
  aiCaptionsPerMonth?: number;
  aiImagesPerMonth?: number;
  storageBytes?: number;
};
