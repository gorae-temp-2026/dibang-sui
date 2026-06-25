const emojiSticker = (emoji: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="72" font-size="72" text-anchor="middle">${emoji}</text></svg>`)}`;

export interface StickerPreset {
  id: string;
  name: string;
  /** i18n 키 — 렌더 시 t(nameKey)로 번역. name은 ko 폴백/디버그용. */
  nameKey: string;
  url: string;
}

export const STICKER_PRESETS: StickerPreset[] = [
  { id: 'heart', name: '하트', nameKey: 'sticker.heart', url: emojiSticker('❤️') },
  { id: 'sparkles', name: '반짝', nameKey: 'sticker.sparkles', url: emojiSticker('✨') },
  { id: 'ring', name: '반지', nameKey: 'sticker.ring', url: emojiSticker('💍') },
  { id: 'bouquet', name: '꽃다발', nameKey: 'sticker.bouquet', url: emojiSticker('💐') },
  { id: 'ribbon', name: '리본', nameKey: 'sticker.ribbon', url: emojiSticker('🎀') },
  { id: 'star', name: '별', nameKey: 'sticker.star', url: emojiSticker('⭐') },
  { id: 'dove', name: '비둘기', nameKey: 'sticker.dove', url: emojiSticker('🕊️') },
  { id: 'champagne', name: '샴페인', nameKey: 'sticker.champagne', url: emojiSticker('🥂') },
  { id: 'cake', name: '케이크', nameKey: 'sticker.cake', url: emojiSticker('🎂') },
  { id: 'cherry-blossom', name: '벚꽃', nameKey: 'sticker.cherryBlossom', url: emojiSticker('🌸') },
  { id: 'crown', name: '왕관', nameKey: 'sticker.crown', url: emojiSticker('👑') },
  { id: 'church', name: '교회', nameKey: 'sticker.church', url: emojiSticker('⛪') },
];
