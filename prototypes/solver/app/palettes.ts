export type Palette = {
  id: string;
  name: string;
  family: 'cool' | 'warm' | 'neutral';
  description: string;
  accent: string;
  accentDeep: string;
  secondary: string;
  tertiary: string;
  canvas: string;
  ink: string;
};

export const DEFAULT_PALETTE_ID = 'tidal';

// Every foreground accent has at least 4.5:1 contrast against white and
// its own 13% tint, the strongest background used by the appearance provider.
// Pale backgrounds are derived from these colors by the appearance provider.
export const PALETTES: readonly Palette[] = [
  { id: 'tidal', name: 'Tidal', family: 'cool', description: 'Teal, blue, coral', accent: '#08746a', accentDeep: '#07584f', secondary: '#315fbc', tertiary: '#a94838', canvas: '#f4faf9', ink: '#243438' },
  { id: 'lagoon', name: 'Lagoon', family: 'cool', description: 'Ocean, indigo, clay', accent: '#08727e', accentDeep: '#075565', secondary: '#4c60b4', tertiary: '#a84937', canvas: '#f3f9fb', ink: '#25363d' },
  { id: 'mint', name: 'Mint', family: 'cool', description: 'Mint, blue, cinnamon', accent: '#197651', accentDeep: '#15583e', secondary: '#4166a6', tertiary: '#9a5231', canvas: '#f4faf6', ink: '#29372f' },
  { id: 'botanical', name: 'Botanical', family: 'cool', description: 'Fern, iris, ochre', accent: '#3b7242', accentDeep: '#2b5431', secondary: '#7d55a2', tertiary: '#a34f2d', canvas: '#f6f9f3', ink: '#2d352b' },
  { id: 'cobalt', name: 'Cobalt', family: 'cool', description: 'Blue, teal, rose', accent: '#345cc5', accentDeep: '#294596', secondary: '#176f76', tertiary: '#a24c66', canvas: '#f5f7fd', ink: '#293247' },
  { id: 'periwinkle', name: 'Periwinkle', family: 'cool', description: 'Indigo, sea glass, coral', accent: '#6051b7', accentDeep: '#473b8a', secondary: '#327273', tertiary: '#a9493a', canvas: '#f7f6fc', ink: '#333247' },
  { id: 'lavender', name: 'Lavender', family: 'cool', description: 'Violet, blue, rose', accent: '#7851ac', accentDeep: '#593b82', secondary: '#236b81', tertiary: '#9c4c71', canvas: '#faf7fc', ink: '#393046' },
  { id: 'plum', name: 'Plum', family: 'warm', description: 'Plum, eucalyptus, amber', accent: '#865076', accentDeep: '#643b58', secondary: '#377269', tertiary: '#a14e2a', canvas: '#fcf7fa', ink: '#3e303a' },
  { id: 'rose', name: 'Rose', family: 'warm', description: 'Rose, violet, sage', accent: '#aa4562', accentDeep: '#82354b', secondary: '#7956a7', tertiary: '#357269', canvas: '#fdf6f8', ink: '#402f35' },
  { id: 'coral', name: 'Coral', family: 'warm', description: 'Coral, gold, sage', accent: '#a94836', accentDeep: '#89392d', secondary: '#8a5e1c', tertiary: '#447063', canvas: '#fff8f4', ink: '#3e322e' },
  { id: 'terracotta', name: 'Terracotta', family: 'warm', description: 'Clay, lilac, sea glass', accent: '#a05132', accentDeep: '#7e412a', secondary: '#6a6296', tertiary: '#3a7267', canvas: '#fcf8f3', ink: '#3c342d' },
  { id: 'marigold', name: 'Marigold', family: 'warm', description: 'Gold, denim, cranberry', accent: '#8d5e1a', accentDeep: '#704b16', secondary: '#446a93', tertiary: '#a14c52', canvas: '#fffbf2', ink: '#3b3628' },
  { id: 'espresso', name: 'Espresso', family: 'neutral', description: 'Coffee, sage, mauve', accent: '#805c43', accentDeep: '#5e4332', secondary: '#4f6d5f', tertiary: '#895b70', canvas: '#faf7f3', ink: '#37312b' },
  { id: 'sand', name: 'Sand', family: 'neutral', description: 'Sandstone, slate, clay', accent: '#766646', accentDeep: '#605239', secondary: '#486c7a', tertiary: '#905b4f', canvas: '#fbf9f3', ink: '#36352d' },
  { id: 'slate', name: 'Slate', family: 'neutral', description: 'Slate, iris, eucalyptus', accent: '#506a7f', accentDeep: '#3e5263', secondary: '#666198', tertiary: '#377266', canvas: '#f6f8fa', ink: '#2d353d' },
  { id: 'graphite', name: 'Graphite', family: 'neutral', description: 'Graphite, bronze, plum', accent: '#52616c', accentDeep: '#3b4750', secondary: '#8e5c34', tertiary: '#755b91', canvas: '#f7f8f9', ink: '#2d3237' },
  { id: 'orchid', name: 'Orchid', family: 'cool', description: 'Orchid, denim, amber', accent: '#8b4d9d', accentDeep: '#683975', secondary: '#396d8b', tertiary: '#99572e', canvas: '#fcf7fd', ink: '#3a2e40' },
  { id: 'citrus', name: 'Citrus', family: 'warm', description: 'Citron, teal, berry', accent: '#656d18', accentDeep: '#505615', secondary: '#227174', tertiary: '#a04b5e', canvas: '#fafbf2', ink: '#333729' },
];

export function getPalette(id: string): Palette {
  return PALETTES.find(palette => palette.id === id) ?? PALETTES[0];
}
