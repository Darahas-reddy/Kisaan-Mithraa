export type Season = 'kharif' | 'rabi' | 'zaid';

export function getSeason(date: Date): Season {
  const m = date.getMonth() + 1; // 1..12
  if (m >= 6 && m <= 9) return 'kharif';
  if (m >= 10 || m <= 3) return 'rabi';
  return 'zaid';
}

export const cropRecommendations: Record<Season, string[]> = {
  kharif: ['Rice', 'Maize', 'Cotton', 'Soybean'],
  rabi: ['Wheat', 'Mustard', 'Barley', 'Gram'],
  zaid: ['Watermelon', 'Cucumber', 'Pumpkin', 'Maize'],
};
