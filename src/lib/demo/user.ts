/**
 * Single source of truth for the demo persona shown throughout the app
 * (dashboard greeting, sidebar identity, profile page, and the marketing
 * globe's monitoring footer). Previously "Alex Morgan" and "RENE F" were
 * hardcoded independently in multiple components — this module replaces
 * both so the demo identity stays consistent everywhere.
 */

export interface DemoUser {
  displayName: string;
  initials: string;
  email: string;
  plan: string;
  activeNode: string;
}

export const DEMO_USER: DemoUser = {
  displayName: "Alex Morgan",
  initials: "AM",
  email: "alex@synsight.de",
  plan: "SynSight Protect",
  activeNode: "Gera, Thüringen",
};
