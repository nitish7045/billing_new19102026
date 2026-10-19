export const today = () =>
  new Date().toISOString().slice(0, 10);

export const firstDayOfYear = () =>
  `${new Date().getFullYear()}-01-01`;

export const numberValue = (value) =>
  Number(value || 0);

export const money = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export const dateText = (value) => {
  if (!value) return "-";

  const date = new Date(
    `${String(value).slice(0, 10)}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB");
};
