// Scale khoảng cách / bo góc / cỡ chữ — đồng bộ borderRadius 8, fontSize gốc giữa web & mobile.

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 6,
  md: 8,   // chuẩn hệ thống (AntD borderRadius:8)
  lg: 12,
  pill: 999,
} as const;

export const FONT_SIZE = {
  caption: 11,
  body:    13,   // chuẩn hệ thống (AntD fontSize:13)
  subtitle: 15,
  title:   18,
  heading: 22,
} as const;
