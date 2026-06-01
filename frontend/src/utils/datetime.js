// Format a date (or now) as the value a <input type="datetime-local">
// expects: "YYYY-MM-DDTHH:mm" in the user's LOCAL time. Passing no arg
// returns the current local date+time (used as the default).
export const toLocalInput = (d) => {
  const date = d ? new Date(d) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};
