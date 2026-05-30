// Các template key mặc định của hệ thống
export const DEFAULT_TEMPLATES: Record<string, { subject: string; bodyHtml: string; description: string }> = {
  LEAVE_APPROVED: {
    description: 'Thông báo nghỉ phép được duyệt',
    subject: '[Loop 360] Đơn nghỉ phép của bạn đã được duyệt',
    bodyHtml: `<p>Xin chào <strong>{{employeeName}}</strong>,</p>
<p>Đơn nghỉ phép của bạn từ <strong>{{startDate}}</strong> đến <strong>{{endDate}}</strong> đã được duyệt.</p>
<p>Chúc bạn nghỉ ngơi vui vẻ!</p>`,
  },
  LEAVE_REJECTED: {
    description: 'Thông báo nghỉ phép bị từ chối',
    subject: '[Loop 360] Đơn nghỉ phép của bạn đã bị từ chối',
    bodyHtml: `<p>Xin chào <strong>{{employeeName}}</strong>,</p>
<p>Đơn nghỉ phép của bạn từ <strong>{{startDate}}</strong> đến <strong>{{endDate}}</strong> đã bị từ chối.</p>
<p>Lý do: <strong>{{reason}}</strong></p>`,
  },
  EXPENSE_APPROVED: {
    description: 'Thông báo chi phí được duyệt',
    subject: '[Loop 360] Đề xuất chi phí của bạn đã được duyệt',
    bodyHtml: `<p>Xin chào <strong>{{employeeName}}</strong>,</p>
<p>Đề xuất chi phí <strong>{{expenseTitle}}</strong> ({{amount}}) của bạn đã được duyệt.</p>`,
  },
  EXPENSE_REJECTED: {
    description: 'Thông báo chi phí bị từ chối',
    subject: '[Loop 360] Đề xuất chi phí của bạn đã bị từ chối',
    bodyHtml: `<p>Xin chào <strong>{{employeeName}}</strong>,</p>
<p>Đề xuất chi phí <strong>{{expenseTitle}}</strong> của bạn đã bị từ chối.</p>
<p>Lý do: <strong>{{reason}}</strong></p>`,
  },
  TASK_ASSIGNED: {
    description: 'Thông báo được giao task mới',
    subject: '[Loop 360] Bạn được giao task mới: {{taskTitle}}',
    bodyHtml: `<p>Xin chào <strong>{{assigneeName}}</strong>,</p>
<p>Bạn vừa được giao task: <strong>{{taskTitle}}</strong></p>
<p>Deadline: <strong>{{dueDate}}</strong></p>
<p>Project: <strong>{{projectName}}</strong></p>`,
  },
  TASK_DUE_SOON: {
    description: 'Thông báo task sắp đến hạn',
    subject: '[Loop 360] Task sắp đến hạn: {{taskTitle}}',
    bodyHtml: `<p>Xin chào <strong>{{assigneeName}}</strong>,</p>
<p>Task <strong>{{taskTitle}}</strong> sẽ đến hạn vào <strong>{{dueDate}}</strong>.</p>`,
  },
  BUG_ASSIGNED: {
    description: 'Thông báo được giao bug',
    subject: '[Loop 360] Bug được giao cho bạn: {{bugTitle}}',
    bodyHtml: `<p>Xin chào <strong>{{assigneeName}}</strong>,</p>
<p>Bug <strong>{{bugTitle}}</strong> ({{severity}}) đã được giao cho bạn.</p>`,
  },
  ASSET_WARRANTY_EXPIRY: {
    description: 'Nhắc nhở bảo hành tài sản sắp hết hạn',
    subject: '[Loop 360] Tài sản sắp hết bảo hành: {{assetName}}',
    bodyHtml: `<p>Xin chào Admin,</p>
<p>Tài sản <strong>{{assetName}}</strong> ({{assetCode}}) sẽ hết bảo hành vào <strong>{{warrantyExpiry}}</strong>.</p>`,
  },
  ASSET_INSURANCE_EXPIRY: {
    description: 'Nhắc nhở bảo hiểm tài sản sắp hết hạn',
    subject: '[Loop 360] Tài sản sắp hết bảo hiểm: {{assetName}}',
    bodyHtml: `<p>Xin chào Admin,</p>
<p>Tài sản <strong>{{assetName}}</strong> ({{assetCode}}) sẽ hết bảo hiểm vào <strong>{{insuranceExpiry}}</strong>.</p>`,
  },
};
