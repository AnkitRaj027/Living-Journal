import type { MoodType } from '../types/journal';

export interface MoodConfig {
  id: MoodType;
  label: string;
  sublabel: string;
  sealColor: string;
  textColor: string;
  symbol: string;
}

export const MOODS: MoodConfig[] = [
  {
    id: 'peaceful',
    label: 'Peaceful',
    sublabel: 'Still & calm waters',
    sealColor: '#4A6B53', // Deep olive moss
    textColor: '#EAE6D9',
    symbol: '🌿'
  },
  {
    id: 'inspired',
    label: 'Inspired',
    sublabel: 'Sparks & clarity',
    sealColor: '#B58231', // Antique gold / amber
    textColor: '#FFF6DF',
    symbol: '✨'
  },
  {
    id: 'contemplative',
    label: 'Contemplative',
    sublabel: 'Deep reflections',
    sealColor: '#394B66', // Midnight navy
    textColor: '#E3ECF8',
    symbol: '🌙'
  },
  {
    id: 'weary',
    label: 'Weary',
    sublabel: 'Tired & seeking rest',
    sealColor: '#6B5446', // Weathered walnut
    textColor: '#E8DED6',
    symbol: '🍂'
  },
  {
    id: 'stormy',
    label: 'Stormy',
    sublabel: 'Turbulence & ache',
    sealColor: '#6D2424', // Rich crimson wax
    textColor: '#FBE8E8',
    symbol: '🌧️'
  }
];
