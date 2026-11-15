// Design tokens: colors, spacing and fonts shared across screens.
// `colors` and `space` are the original placeholders, still used by Home, +, Map, Inbox
// and Edit profile; the groups below them come from the Figma designs.

// Original placeholder colors (first starter code version).
export const colors = {
  background: '#FBF7EF', // sand
  surface: '#FFFFFF',
  text: '#1E2A2B',
  muted: '#6B7778',
  primary: '#0F6E6A', // oasis water
  danger: '#B3261E',
  border: '#E3DCCD',
}

// Spacing sizes (in points) for padding and margins.
export const space = { xs: 4, sm: 8, md: 16, lg: 24 }

// Whim brand tokens (from the Figma sign-in screen).
export const brand = {
  green: '#008570', // also the native splash background in app.json
  butter: '#FFEFAA', // logo
  deepTeal: '#0B5F5C',
  cream: '#F7F0E6', // input fields, links
  creamButton: '#F7EFE5',
}

// Profile screen tokens (from the Figma profile design).
export const profileColors = {
  header: '#77A638',
  surface: '#F4F1EC',
  card: '#FFFFFF',
  border: '#DCE7E5',
  ink: '#16262E',
  slate: '#5B7078',
  handle: '#3B3B3B',
  black: '#000000',
}

// Bottom tab bar (Figma "Nav bar tabs"); surfaces and border reuse profileColors.
export const tabColors = {
  active: '#0B5F5C',
  inactive: '#5B7078',
  createActivity: '#F04400', // the orange + (create activity) button
}

// Activity details screen (from whim-prototype.html); text and borders reuse profileColors.
export const detailColors = {
  accent: '#0B5F5C', // same teal as brand.deepTeal, for "You're in"
  iconTile: '#DDF5F0', // light teal squares behind the row icons
  sun: '#FFB321', // timer circle and the "I'm in" button
  sunSoft: '#FFF1D2', // safety note background
  sunInk: '#2B1D00', // text on the sun button
  urgent: '#C2412D', // timer color in the last 10 minutes
}

// Avatar background colors (from whim-prototype.html); each person gets one based on their id.
export const avatarColors = ['#FFC1A6', '#B9E3FF', '#C9F0C1', '#FFE08A', '#E3C9FF', '#FFB8C8', '#A9EBDF', '#F5D6B0']

// Scrapbook screens (styled after the WOB diary reference: paper, tape, handwriting).
export const scrapbookColors = {
  desk: '#E7E1D6', // the table the page sits on
  selection: '#F04400', // dashed outline around the item you're moving
}

// FONTS Loaded in client/app/_layout.tsx via @expo-google-fonts (bricolage-grotesque, intel-one-mono, inter,
// gaegu and dm-serif-display; the last two are for scrapbook text).
export const fonts = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semiBold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  mono: 'IntelOneMono_400Regular',
  monoBold: 'IntelOneMono_700Bold',
  interBold: 'Inter_700Bold',
  hand: 'Gaegu_700Bold',
  serif: 'DMSerifDisplay_400Regular',
}
