/**
 * Playable groom/bride sprites come from Bonelli wedding pack manifest
 * (`21_bride`, `22_groom`). See `src/phaser/bonelliCharacters.ts`.
 */
export const CHARACTER_ASSETS = {
  groom: {
    manifestId: '22_groom',
    sheetKey: 'bonelli_char_groom',
  },
  bride: {
    manifestId: '21_bride',
    sheetKey: 'bonelli_char_bride',
  },
} as const

export type CharacterRole = keyof typeof CHARACTER_ASSETS
