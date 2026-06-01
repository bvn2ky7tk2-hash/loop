import React from 'react';
import { useThemePalette } from '../../hooks/useThemePalette';

export interface EmployeeInfoCellEmployee {
  code?: string;
  fullName: string;
  orgUnit?: { name: string } | null;
  jobTitle?: { name: string } | null;
  position?: { jobTitle?: { name: string } | null } | null;
}

export interface EmployeeInfoCellProps {
  employee: EmployeeInfoCellEmployee;
  /**
   * 'row'          — 2 dòng: [CODE] Họ tên / phòng ban · chức danh (mặc định)
   * 'inline'       — 1 dòng compact: [CODE] Họ tên · Phòng ban · Chức danh
   * 'descriptions' — dùng bên trong Descriptions.Item (không có wrapper div dư)
   */
  variant?: 'row' | 'inline' | 'descriptions';
  /** Override — nếu không truyền sẽ lấy từ useThemePalette() */
  isDark?: boolean;
  textPrimary?: string;
  textMuted?: string;
  linkColor?: string;
}

/**
 * Hiển thị thông tin nhân sự: [CODE] Họ tên / Phòng ban · Chức danh.
 *
 * Dùng chung cho mọi màn hình thay vì viết lại từng nơi.
 *
 * @example
 * // Trong cột Table
 * render: (_, r) => <EmployeeInfoCell employee={r.employee} />
 *
 * // Trong Descriptions
 * <Descriptions.Item label="Nhân viên">
 *   <EmployeeInfoCell employee={emp} variant="descriptions" />
 * </Descriptions.Item>
 */
export function EmployeeInfoCell({
  employee,
  variant = 'row',
  isDark: isDarkProp,
  textPrimary: textPrimaryProp,
  textMuted: textMutedProp,
  linkColor: linkColorProp,
}: EmployeeInfoCellProps) {
  const palette = useThemePalette();

  // Ưu tiên prop override, fallback về palette
  const textPrimary = textPrimaryProp ?? palette.textPrimary;
  const textMuted   = textMutedProp   ?? palette.textMuted;
  const linkColor   = linkColorProp   ?? palette.linkColor;

  const { code, fullName, orgUnit, jobTitle: jobTitleObj, position } = employee;
  const dept      = orgUnit?.name ?? null;
  const jobTitle  = jobTitleObj?.name ?? position?.jobTitle?.name ?? null;

  // Dòng phụ: phòng ban + chức danh
  const subParts: string[] = [];
  if (dept)     subParts.push(dept);
  if (jobTitle) subParts.push(jobTitle);
  const subLine = subParts.join(' · ') || null;

  if (variant === 'inline') {
    // 1 dòng: [CODE] Họ tên · Phòng ban · Chức danh
    const allParts: React.ReactNode[] = [];
    if (code) {
      allParts.push(
        <span
          key="code"
          style={{ fontSize: 10, fontWeight: 700, color: linkColor, fontFamily: 'monospace' }}
        >
          [{code}]
        </span>,
      );
    }
    allParts.push(
      <span key="name" style={{ fontWeight: 600, fontSize: 13, color: textPrimary }}>
        {fullName}
      </span>,
    );
    if (subLine) {
      allParts.push(
        <span key="sub" style={{ fontSize: 12, color: textMuted }}>
          · {subLine}
        </span>,
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {allParts}
      </span>
    );
  }

  // variant === 'row' | 'descriptions' — cùng layout 2 dòng, chỉ khác wrapper
  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {code && (
          <span
            style={{ fontSize: 10, fontWeight: 700, color: linkColor, fontFamily: 'monospace' }}
          >
            {code}
          </span>
        )}
        <span style={{ fontWeight: 600, fontSize: 13, color: textPrimary }}>{fullName}</span>
      </div>
      {subLine && (
        <div style={{ fontSize: 11, color: textMuted, marginTop: 1 }}>{subLine}</div>
      )}
    </>
  );

  if (variant === 'descriptions') {
    // Không có div bao ngoài dư — dùng Fragment để Descriptions.Item tự căn chỉnh
    return <>{inner}</>;
  }

  // variant === 'row' (mặc định)
  return <div>{inner}</div>;
}
