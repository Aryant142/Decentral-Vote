export type KYCStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'voter';
export type ElectionStatus = 'upcoming' | 'active' | 'ended';

export interface User {
  uid: string;
  name: string;
  email: string;
  aadhaarId: string;
  state: string;
  role: UserRole;
  kycStatus: KYCStatus;
  did?: string;
  walletAddress?: string;
  kycDocumentUrl?: string;
  createdAt: any;
}

export interface Candidate {
  id: string;
  electionId: string;
  name: string;
  party: string;
  description?: string;
  imageUrl?: string;
}

export interface Election {
  id: string;
  title: string;
  state: string;
  status: ElectionStatus;
  startDate?: any;
  endDate?: any;
}

export interface VoteRecord {
  voterUid: string;
  candidateId: string;
  timestamp: any;
}
