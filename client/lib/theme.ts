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

// Edit profile screen tokens (from the Figma edit profile design); background reuses profileColors.surface.
export const editProfileColors = {
  card: '#442022', // maroon form card, also the title
  label: 'rgba(255,255,255,0.8)',
  value: '#FFFFFF',
  placeholder: 'rgba(255,255,255,0.6)',
  saveText: '#182A2A',
  deleteText: '#FFFFFF',
}

// Bottom tab bar: white floating bar, teal selected tab, orange + button.
export const tabColors = {
  active: '#1F4F4A',
  inactive: '#565D58',
  createActivity: '#E4502A', // the orange + (create activity) button
  bar: '#FFFFFF',
  shadow: '#1E321E',
}

// Edit profile and interest picker (Whim green redesign).
export const whimColors = {
  ink: '#163A2A', // dark green text and buttons
  label: '#3D5A49', // field labels
  body: '#1F3D2D', // subtitles, small headings
  cream: '#FFFBEF',
  creamCard: 'rgba(255,251,239,0.85)',
  brown: '#4A2A22', // ID card
  brownText: '#F4EFE2',
  brownSecondary: '#E2D2BE',
  stars: '#D8C6B4',
  photoPlaceholder: '#C9D6E0',
  danger: '#8E2A17', // Delete account
  divider: 'rgba(22,58,42,0.12)',
  dashed: 'rgba(22,58,42,0.4)', // dashed outlines on unpicked chips and the interests box
  glass: 'rgba(255,255,255,0.3)', // see-through fill behind dashed outlines
}

// You tab (profile) redesign: two gradient "bubbles" with frosted cards on them.
export const youColors = {
  page: '#F2F1EC', // page background, also the gap between the bubbles and the chip fill
  ink: '#1C2420',
  secondary: '#5A5F58',
  cardCream: 'rgba(255,251,239,0.88)', // ID card
  frosted: 'rgba(246,245,240,0.62)', // tint over the blur on frosted cards
  frostedBorder: 'rgba(255,255,255,0.55)',
  stars: '#8C8A84',
  photoBorder: '#1E2B22',
  handle: '#4A4A44',
  bio: '#2E2E28',
  ring: '#7EA46E', // outer ring of the rank bubble
  statDivider: '#E6DFCB',
  scrapPaper: '#FAF6EC', // behind scrapbook page previews while they load
}

// New whim (create activity) screen.
export const createColors = {
  ink: '#1C2420',
  secondary: '#3F453D',
  muted: '#5A5F58',
  placeholder: '#7E837B',
  border: '#E2DED5',
  field: '#FFFFFF',
  page: '#F2F1EC',
  brown: '#4A2A22',
  brownText: '#F4EFE2',
  green: '#1F5C46', // selected time, radio cards, switch
  polaroid: '#FFFDF6',
  coverEmpty: '#EFEBE0',
  coverDashed: '#C9C3B4',
  radioOff: '#B9B5AA',
  switchOff: '#C9C5BA',
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

// FONTS Loaded in client/app/_layout.tsx via @expo-google-fonts (bricolage-grotesque, intel-one-mono, inter, jost,
// fraunces, space-mono, gaegu and dm-serif-display; the last two are for scrapbook text).
export const fonts = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  semiBold: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_700Bold',
  mono: 'IntelOneMono_400Regular',
  monoBold: 'IntelOneMono_700Bold',
  interBold: 'Inter_700Bold',
  jostBold: 'Jost_700Bold',
  // Edit profile + interest picker (Whim green redesign).
  fraunces: 'Fraunces_700Bold',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  spaceMono: 'SpaceMono_400Regular',
  spaceMonoBold: 'SpaceMono_700Bold',
  hand: 'Gaegu_700Bold',
  serif: 'DMSerifDisplay_400Regular',
}
