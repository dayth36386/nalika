/** Edit these to change the credit shown in the ⓘ popover. */
export const SITE = {
  name: "Nalika",
  /** Set automatically on each release (see README → Versioning); "dev" for local builds. */
  version: process.env.NEXT_PUBLIC_APP_VERSION?.startsWith("0.0.0") ? "dev" : `v${process.env.NEXT_PUBLIC_APP_VERSION}`,
  creator: "Dechawiwatwong Detchang",
  /** Optional link for the creator's name (GitHub, website…). Leave "" for none. */
  creatorUrl: "https://github.com/dayth36386",
  year: 2026,
};
