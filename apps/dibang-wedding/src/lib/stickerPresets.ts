const emojiSticker = (emoji: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="72" font-size="72" text-anchor="middle">${emoji}</text></svg>`)}`;

export interface StickerPreset {
  id: string;
  name: string;
  url: string;
}

export const STICKER_PRESETS: StickerPreset[] = [
  { id: 'heart', name: '하트', url: emojiSticker('❤️') },
  { id: 'sparkles', name: '반짝', url: emojiSticker('✨') },
  { id: 'ring', name: '반지', url: emojiSticker('💍') },
  { id: 'bouquet', name: '꽃다발', url: emojiSticker('💐') },
  { id: 'ribbon', name: '리본', url: emojiSticker('🎀') },
  { id: 'star', name: '별', url: emojiSticker('⭐') },
  { id: 'dove', name: '비둘기', url: emojiSticker('🕊️') },
  { id: 'champagne', name: '샴페인', url: emojiSticker('🥂') },
  { id: 'cake', name: '케이크', url: emojiSticker('🎂') },
  { id: 'cherry-blossom', name: '벚꽃', url: emojiSticker('🌸') },
  { id: 'crown', name: '왕관', url: emojiSticker('👑') },
  { id: 'church', name: '교회', url: emojiSticker('⛪') },
];
