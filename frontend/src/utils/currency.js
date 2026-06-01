// Single source of truth for currency display. Currency is a per-GROUP
// setting (chosen by the owner at group creation): every member sees a
// group's amounts in that group's currency, with no conversion. Use
// getCurrencySymbol(group.currency) wherever money is shown. The user's
// personal currency (userInfo.currency) is only a default that pre-fills
// the picker when they create a new group.
export const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  AED: "د.إ",
};

// Full list (code + symbol + label) for currency pickers — e.g. the
// group-create form and the profile menu.
export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
];

export const getCurrencySymbol = (code) =>
  CURRENCY_SYMBOLS[code] || code || "₹";

// Number-only formatting (no symbol). Replaces the copy-pasted
// formatMoney that lived in every screen.
export const formatMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
