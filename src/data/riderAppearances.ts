export const riderAppearances = [
  { id: 'cream', name: 'Cream', color: 0xf4e9cf },
  { id: 'chestnut', name: 'Chestnut', color: 0xb96545 },
  { id: 'midnight', name: 'Midnight', color: 0x425878 },
] as const;

export type RiderAppearanceId = (typeof riderAppearances)[number]['id'];

export function getRiderAppearance(id: RiderAppearanceId | undefined) {
  return riderAppearances.find((appearance) => appearance.id === id) ?? riderAppearances[0];
}
