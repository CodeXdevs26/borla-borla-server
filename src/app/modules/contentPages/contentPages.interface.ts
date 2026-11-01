export interface IUpdatePagePayload {
  content: string;
}

export interface IPageContentResponse {
  key: 'aboutUs' | 'termsAndCondition' | 'privacyPolicy';
  content: string | null;
}
