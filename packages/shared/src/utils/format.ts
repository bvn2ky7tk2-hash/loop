// Format utilities - currency, phone, email, etc.

export const formatCurrency = (value: number, currency = 'VND'): string => {
  if (!value && value !== 0) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
  }).format(value);
};

export const formatNumber = (value: number, decimals = 0): string => {
  if (!value && value !== 0) return '—';
  return value.toLocaleString('vi-VN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
};

export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
};

export const formatEmail = (email: string, mask = true): string => {
  if (!email) return '';
  if (!mask) return email;
  const [local, domain] = email.split('@');
  const masked = local.slice(0, 2) + '*'.repeat(local.length - 2);
  return `${masked}@${domain}`;
};
