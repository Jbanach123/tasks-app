// ─────────────────────────────────────────────────────────
// THEME — the single place to edit colors for the whole app.
// Every component imports colors from here instead of hardcoding hex values,
// so a palette change only needs to happen in one spot.
// ─────────────────────────────────────────────────────────
export const THEME = {
  bg1: "#0b1a17",         // background gradient: top corner
  bg2: "#081310",         // background gradient: middle
  bg3: "#050a08",         // background gradient: bottom corner
  ring: ["#8E7CF0", "#4FA8E0", "#C77DE0", "#57C2A3", "#E0B24F", "#E0705A"], // task color palette, #fffcfc
  accent: "#E39A63",      // stats / counters accent (orange)
  danger: "#E0705A",      // delete actions / error messages (red)
  text: "#F2F5F3",        // primary text color (near-white)
  surfaceDark: "#0e211d", // modal background / text color on light chips
};

// Shorthand alias used wherever a plain array of pickable colors is needed
export const RING_COLORS = THEME.ring;

// Monday-first weekday abbreviations (Polish UI labels), index 0 = Monday
export const DAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

// Full month names for the stats month header (Polish UI labels)
export const MONTH_NAMES = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

// Emoji picker options shown when creating/editing a task
export const EMOJI_CHOICES = ["💊","🏃","📚","🧘","🌱","💧","📝","🎯","🛌","🍎","💰","🎨","🧹","🐶","📞","💻","🎵","✈️","❤️","🔥","☕","🧠","🛒","⚽"];

// Font stack used across the whole app (rounded, iOS-Reminders-like feel)
export const FONT = "ui-rounded, -apple-system, 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif";
