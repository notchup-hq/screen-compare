// Screen presets: the single data file. Real panel numbers, not marketing sizes.
//
// Fields:
//   id          stable slug used in the URL (?from=...&to=...)
//   group       heading in the screen lists (Apple, Framework, Microsoft, Generic sizes)
//   name        label shown in the picker list
//   short       short name used in the toolbar and the area chip; keep the size in
//               inches in it (MacBook Pro 14"), the chip reads it
//   diagonalIn  panel diagonal in inches, as the maker's spec page states it
//   resX, resY  native panel pixels (aspect ratio = resX / resY)
//   looksLike   [w, h] default scaled "looks like" size in points, used by the
//               sample-content view
//   source      maker spec page the numbers were checked against (omit for generic sizes)
//
// To add a preset, see "Adding a screen preset" in README.md.

export const SCREENS = [
  {
    id: 'mbp16',
    group: 'Apple',
    name: 'MacBook Pro 16" (M1 Pro – M4)',
    short: 'MacBook Pro 16"',
    diagonalIn: 16.2,
    resX: 3456,
    resY: 2234,
    looksLike: [1728, 1117],
    source: 'https://support.apple.com/en-us/121554',
  },
  {
    id: 'mbp14',
    group: 'Apple',
    name: 'MacBook Pro 14" (M1 Pro – M4)',
    short: 'MacBook Pro 14"',
    diagonalIn: 14.2,
    resX: 3024,
    resY: 1964,
    looksLike: [1512, 982],
    source: 'https://support.apple.com/en-us/121553',
  },
  {
    id: 'mba13',
    group: 'Apple',
    name: 'MacBook Air 13" (M2 – M4)',
    short: 'MacBook Air 13"',
    diagonalIn: 13.6,
    resX: 2560,
    resY: 1664,
    looksLike: [1470, 956],
    source: 'https://www.apple.com/macbook-air/specs/',
  },
  {
    id: 'mba15',
    group: 'Apple',
    name: 'MacBook Air 15" (M2 – M4)',
    short: 'MacBook Air 15"',
    diagonalIn: 15.3,
    resX: 2880,
    resY: 1864,
    looksLike: [1710, 1107],
    source: 'https://www.apple.com/macbook-air/specs/',
  },
  {
    id: 'fw13',
    group: 'Framework',
    name: 'Framework Laptop 13 (2256 × 1504)',
    short: 'Framework 13"',
    diagonalIn: 13.5,
    resX: 2256,
    resY: 1504,
    looksLike: [1504, 1003],
    source: 'https://frame.work/laptop13',
  },
  {
    id: 'sl13',
    group: 'Microsoft',
    name: 'Surface Laptop 13"',
    short: 'Surface Laptop 13"',
    diagonalIn: 13,
    resX: 1920,
    resY: 1280,
    looksLike: [1280, 853],
    source: 'https://www.microsoft.com/en-us/surface/devices/surface-laptop-7th-edition',
  },
  {
    id: 'sl138',
    group: 'Microsoft',
    name: 'Surface Laptop 13.8"',
    short: 'Surface Laptop 13.8"',
    diagonalIn: 13.8,
    resX: 2304,
    resY: 1536,
    looksLike: [1536, 1024],
    source: 'https://www.microsoft.com/en-us/surface/devices/surface-laptop-7th-edition',
  },
  {
    id: 'sl15',
    group: 'Microsoft',
    name: 'Surface Laptop 15"',
    short: 'Surface Laptop 15"',
    diagonalIn: 15,
    resX: 3270,
    resY: 2180,
    looksLike: [1635, 1090],
    source: 'https://www.microsoft.com/en-us/surface/devices/surface-laptop-7th-edition',
  },
  // Generic sizes: typical panels, no single maker, so no source.
  { id: 'g133', group: 'Generic sizes', name: 'Generic 13.3" 16:10', short: '13.3" laptop', diagonalIn: 13.3, resX: 2560, resY: 1600, looksLike: [1440, 900] },
  { id: 'g14', group: 'Generic sizes', name: 'Generic 14" 16:10', short: '14" laptop', diagonalIn: 14, resX: 2560, resY: 1600, looksLike: [1440, 900] },
  { id: 'g156', group: 'Generic sizes', name: 'Generic 15.6" 16:9', short: '15.6" laptop', diagonalIn: 15.6, resX: 1920, resY: 1080, looksLike: [1920, 1080] },
  { id: 'g16', group: 'Generic sizes', name: 'Generic 16" 16:10', short: '16" laptop', diagonalIn: 16, resX: 2560, resY: 1600, looksLike: [1680, 1050] },
  { id: 'g173', group: 'Generic sizes', name: 'Generic 17.3" 16:9', short: '17.3" laptop', diagonalIn: 17.3, resX: 1920, resY: 1080, looksLike: [1920, 1080] },
];

// Aspect-ratio chips offered for custom screens ("Other").
export const RATIOS = [
  { id: '16x10', label: '16:10', value: 16 / 10 },
  { id: '16x9', label: '16:9', value: 16 / 9 },
  { id: '3x2', label: '3:2', value: 3 / 2 },
  { id: '4x3', label: '4:3', value: 4 / 3 },
];

export const BANK_CARD_MM = { width: 85.6, height: 53.98 };
