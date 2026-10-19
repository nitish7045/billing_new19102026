// src/utils/billing/calculations.js

export function calculateItemAmount(qty, rate) {
  const quantity = Number(qty) || 0;
  const itemRate = Number(rate) || 0;

  return quantity * itemRate;
}

export function calculateSubtotal(items = []) {
  return items.reduce((total, item) => {
    if (item.type === "manual") {
      return total;
    }

    return total + (Number(item.amount) || 0);
  }, 0);
}

export function calculateRoundOff(amount) {
  return Math.round(Number(amount) || 0) - (Number(amount) || 0);
}

export function calculateFinalTotal(amount, roundTotal) {
  const value = Number(amount) || 0;

  if (!roundTotal) {
    return value;
  }

  return Math.round(value);
}

export function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}