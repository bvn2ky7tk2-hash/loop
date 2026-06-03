export const STATUS_LABEL: Record<string, string> = {
  DRAFT:      'Bản nháp',
  PROCESSING: 'Đang xử lý',
  REVIEWED:   'Chờ duyệt',
  APPROVED:   'Đã duyệt',
  PAID:       'Đã trả lương',
};

export const STATUS_COLOR: Record<string, string> = {
  DRAFT:      'default',
  PROCESSING: 'orange',
  REVIEWED:   'blue',
  APPROVED:   'green',
  PAID:       'success',
};
