export type IRiderVerificationUpdate = {
  userId: string;
  status: 'verified' | 'rejected';
};

export type IRiderVerificationQuery = {
  status?: 'pending' | 'verified' | 'rejected';
  page?: number;
  limit?: number;
  searchTerm?: string;
};
