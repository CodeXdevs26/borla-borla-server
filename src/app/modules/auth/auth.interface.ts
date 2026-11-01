export type QueryObject = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type ISignup = {
  name: string;
  email?: string;
  phoneNumber?: string;
  role?: 'user' | 'institute' | 'rider';
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  locationName?: string;
  dateOfBirth?: string;
  ghanaCardId?: string[]; // Array of image URLs
  tricycleLicense?: string[];
  sanitationPermit?: string[];
  wasteCapacity?: number;
  password: string;
  confirmPassword: string;
  referralCode?: string;
};

export type ILogin = {
  email?: string;
  phoneNumber?: string;
  password: string;
};
export type IChangePassword = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};
export type IResetPassword = {
  newPassword: string;
  confirmPassword: string;
};

export interface IJwtPayload {
  userId: string;
  role: string;
}

export interface JwtPayload {
  userId: string;
  role: string;
}

export type ISocialAuth = {
  email: string;
  name: string;
  socialId: string;
  provider: 'google' | 'apple';
  phoneNumber?: string;
  profile?: string;
  profilePicture?: string;
};
