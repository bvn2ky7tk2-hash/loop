// Number utilities

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const round = (value: number, decimals = 0): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const percentage = (value: number, total: number): number => {
  return total === 0 ? 0 : round((value / total) * 100, 2);
};

export const bytesToMB = (bytes: number): number => {
  return round(bytes / (1024 * 1024), 2);
};
