export interface ICreateSavedPlace {
  placeType: 'home' | 'office' | 'shop' | 'hotel';
  placeTitle: string;
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface IUpdateSavedPlace {
  placeType?: 'home' | 'office' | 'shop' | 'hotel';
  placeTitle?: string;
  placeName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}
