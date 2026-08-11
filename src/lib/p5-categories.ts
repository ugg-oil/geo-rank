/** Phase 4 P5 categories — same public node when launched. */
export const P5_CATEGORIES = [
  "VPN Services",
  "E-commerce Platforms",
  "Online Course Platforms",
  "Language Learning Apps",
  "Password Managers",
  "AI Meeting Assistants",
  "AI Cybersecurity Tools",
  "Recruiting Tools",
] as const;

export type P5Category = (typeof P5_CATEGORIES)[number];
