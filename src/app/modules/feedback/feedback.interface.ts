export interface ICreateFeedback {
  receiverId: string;
  rating: number;
  text: string;
  photo?: string;
}

export interface IFeedbackQuery {
  page: number;
  limit: number;
}
