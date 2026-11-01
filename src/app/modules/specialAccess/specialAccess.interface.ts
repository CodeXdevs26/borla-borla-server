export const SPECIAL_ACCESS_TYPES = ['support_team', 'sales_lead'] as const;

export type TSpecialAccessType = (typeof SPECIAL_ACCESS_TYPES)[number];

export interface ICreateSpecialAccessUserPayload {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  accountType: TSpecialAccessType;
}

export interface IGetSpecialAccessUsersQuery {
  page?: string;
  limit?: string;
  searchTerm?: string;
  accountType?: TSpecialAccessType;
}
