// Realistic flat colours for each object. `tone` says whether its drawn details
// (seams, screens, labels) are light or dark. Every object also gets a dark
// outline in the board, so pale objects stay clear on the pale background.
export const COLORS: Record<string, [string, 'light' | 'dark']> = {
  'credit-card': ['#2F5FB3', 'light'], 'golf-ball': ['#FFFFFF', 'dark'], 'tt-ball': ['#F28C28', 'light'], 'sd-card': ['#2B3A67', 'light'],
  cd: ['#B8BEC9', 'light'], floppy: ['#33373D', 'light'], cassette: ['#4A4F57', 'light'], vhs: ['#26282C', 'light'],
  'tennis-ball': ['#CFE04A', 'light'], baseball: ['#FFFFFF', 'dark'], 'pool-ball': ['#1D1D1F', 'light'], 'dollar-bill': ['#86A873', 'light'],
  passport: ['#7A1F2B', 'light'], 'bowling-pin': ['#FFFFFF', 'dark'], basketball: ['#E0762A', 'dark'], 'basketball-6': ['#E0762A', 'dark'],
  'flying-disc': ['#E94E3C', 'light'], 'vinyl-lp': ['#1C1C1E', 'light'], 'us-quarter': ['#C0C4CC', 'dark'], 'us-penny': ['#B8733A', 'dark'],
  'us-nickel': ['#BFC3C9', 'dark'], 'us-dime': ['#C6CAD1', 'dark'], 'euro-2': ['#C9CCD2', 'dark'], loonie: ['#C9A44C', 'dark'], toonie: ['#C9CCD2', 'dark'],
  'cricket-ball': ['#A3262A', 'light'], pickleball: ['#F2D21B', 'dark'], volleyball: ['#FFFFFF', 'dark'], 'soccer-ball': ['#FFFFFF', 'dark'],
  'bowling-ball': ['#3B2A6B', 'light'], 'hockey-puck': ['#1C1C1E', 'light'], dartboard: ['#2A2A2A', 'light'], 'jewel-case': ['#DCE3EA', 'dark'],
  'dvd-case': ['#2A2D33', 'light'], 'business-card': ['#FFFFFF', 'dark'], 'index-card': ['#FFFFFF', 'dark'], 'a4-sheet': ['#FFFFFF', 'dark'],
  'a5-sheet': ['#FFFFFF', 'dark'], 'a6-sheet': ['#FFFFFF', 'dark'], 'letter-sheet': ['#FFFFFF', 'dark'], 'photo-print': ['#FFFFFF', 'dark'],
  'euro-20': ['#5B8FD1', 'light'], 'us-plate': ['#FFFFFF', 'dark'], 'drink-can': ['#D7352B', 'light'], 'iphone-15': ['#C9CED6', 'dark'],
  'ipad-10': ['#C9CED6', 'dark'], 'game-boy': ['#C9C7BD', 'dark'], 'switch-2': ['#E4483B', 'dark'], 'xbox-controller': ['#F2F2F2', 'dark'],
  'magic-mouse': ['#FFFFFF', 'dark'], crayon: ['#E53935', 'light'], 'jenga-block': ['#D9B382', 'dark'], 'post-it': ['#F7E36B', 'dark'],
  'stop-sign': ['#C62828', 'light'],
};
