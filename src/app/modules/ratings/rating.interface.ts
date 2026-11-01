export interface ICreateRating {
  bookingId: string;
  rating: number;
  feedback?: string;
}

export interface IUpdateRating {
  rating?: number;
  feedback?: string;
}
