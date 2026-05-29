/**
 * patch-permissions-v2.js
 * Sync toàn bộ permission codes và role mappings từ permissions.constants.ts vào DB.
 * Idempotent — dùng ON CONFLICT DO NOTHING / DO UPDATE.
 * Usage: node prisma/patch-permissions-v2.js
 */
'use strict';
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

// Toàn bộ permission codes (lấy từ ALL_PERMISSIONS trong permissions.constants.ts)
const ALL_PERMISSIONS = [
  // Core
  { code: 'projects:read',   module: 'projects',   action: 'read',      description: 'Xem danh sách dự án' },
  { code: 'projects:create', module: 'projects',   action: 'create',    description: 'Tạo dự án mới' },
  { code: 'projects:update', module: 'projects',   action: 'update',    description: 'Cập nhật thông tin dự án' },
  { code: 'projects:delete', module: 'projects',   action: 'delete',    description: 'Xóa dự án' },
  { code: 'tasks:read',      module: 'tasks',      action: 'read',      description: 'Xem task' },
  { code: 'tasks:create',    module: 'tasks',      action: 'create',    description: 'Tạo task mới' },
  { code: 'tasks:update',    module: 'tasks',      action: 'update',    description: 'Cập nhật task' },
  { code: 'tasks:delete',    module: 'tasks',      action: 'delete',    description: 'Xóa task' },
  { code: 'tasks:approve',   module: 'tasks',      action: 'approve',   description: 'Duyệt/từ chối task' },
  { code: 'employees:read',   module: 'employees', action: 'read',      description: 'Xem danh sách nhân sự' },
  { code: 'employees:create', module: 'employees', action: 'create',    description: 'Thêm nhân sự mới' },
  { code: 'employees:update', module: 'employees', action: 'update',    description: 'Cập nhật hồ sơ nhân sự' },
  { code: 'employees:delete', module: 'employees', action: 'delete',    description: 'Xóa nhân sự' },
  { code: 'reports:read',    module: 'reports',    action: 'read',      description: 'Xem báo cáo' },
  { code: 'reports:export',  module: 'reports',    action: 'export',    description: 'Xuất báo cáo Excel' },
  { code: 'timesheets:read',    module: 'timesheets', action: 'read',    description: 'Xem timesheet' },
  { code: 'timesheets:approve', module: 'timesheets', action: 'approve', description: 'Duyệt timesheet' },
  { code: 'timelogs:read',   module: 'timelogs',   action: 'read',      description: 'Xem nhật ký ghi giờ' },
  { code: 'timelogs:create', module: 'timelogs',   action: 'create',    description: 'Ghi nhận giờ làm việc' },
  { code: 'timelogs:update', module: 'timelogs',   action: 'update',    description: 'Chỉnh sửa time log' },
  { code: 'bugs:read',    module: 'bugs', action: 'read',   description: 'Xem danh sách bug' },
  { code: 'bugs:create',  module: 'bugs', action: 'create', description: 'Tạo bug mới' },
  { code: 'bugs:update',  module: 'bugs', action: 'update', description: 'Cập nhật bug' },
  { code: 'bugs:assign',  module: 'bugs', action: 'assign', description: 'Giao bug cho người xử lý' },
  { code: 'bugs:close',   module: 'bugs', action: 'close',  description: 'Đóng bug' },
  { code: 'issues:read',    module: 'issues', action: 'read',    description: 'Xem issue register' },
  { code: 'issues:create',  module: 'issues', action: 'create',  description: 'Tạo issue mới' },
  { code: 'issues:update',  module: 'issues', action: 'update',  description: 'Cập nhật issue' },
  { code: 'issues:approve', module: 'issues', action: 'approve', description: 'Phê duyệt CR' },
  { code: 'bpm:read',   module: 'bpm', action: 'read',   description: 'Xem quy trình BPM' },
  { code: 'bpm:manage', module: 'bpm', action: 'manage', description: 'Quản lý quy trình BPM' },
  { code: 'alerts:read',      module: 'alerts', action: 'read',      description: 'Xem cảnh báo' },
  { code: 'alerts:configure', module: 'alerts', action: 'configure', description: 'Cấu hình ngưỡng cảnh báo' },
  { code: 'dashboard:read',   module: 'dashboard',  action: 'read',      description: 'Xem dashboard' },
  { code: 'finance:read',     module: 'finance',    action: 'read',      description: 'Xem tài chính' },
  { code: 'finance:create',   module: 'finance',    action: 'create',    description: 'Tạo phiếu tài chính' },
  { code: 'finance:approve',  module: 'finance',    action: 'approve',   description: 'Phê duyệt tài chính' },
  { code: 'finance:manage',   module: 'finance',    action: 'manage',    description: 'Quản lý tài chính' },
  { code: 'finance:export',   module: 'finance',    action: 'export',    description: 'Xuất báo cáo tài chính' },
  { code: 'leaves:read',    module: 'leaves',  action: 'read',    description: 'Xem đơn nghỉ phép' },
  { code: 'leaves:create',  module: 'leaves',  action: 'create',  description: 'Tạo đơn nghỉ phép' },
  { code: 'leaves:approve', module: 'leaves',  action: 'approve', description: 'Duyệt đơn nghỉ phép' },
  { code: 'contracts:read',    module: 'contracts', action: 'read',    description: 'Xem hợp đồng' },
  { code: 'contracts:create',  module: 'contracts', action: 'create',  description: 'Tạo hợp đồng' },
  { code: 'contracts:update',  module: 'contracts', action: 'update',  description: 'Cập nhật hợp đồng' },
  { code: 'contracts:approve', module: 'contracts', action: 'approve', description: 'Phê duyệt hợp đồng' },
  { code: 'crm:read',   module: 'crm', action: 'read',   description: 'Xem CRM' },
  { code: 'crm:create', module: 'crm', action: 'create', description: 'Tạo khách hàng/deal' },
  { code: 'crm:update', module: 'crm', action: 'update', description: 'Cập nhật CRM' },
  { code: 'crm:manage', module: 'crm', action: 'manage', description: 'Quản lý CRM' },
  { code: 'recruit:read',    module: 'recruit', action: 'read',    description: 'Xem tuyển dụng' },
  { code: 'recruit:create',  module: 'recruit', action: 'create',  description: 'Tạo tin tuyển dụng' },
  { code: 'recruit:update',  module: 'recruit', action: 'update',  description: 'Cập nhật tuyển dụng' },
  { code: 'recruit:approve', module: 'recruit', action: 'approve', description: 'Phê duyệt ứng viên' },
  { code: 'recruit:manage',  module: 'recruit', action: 'manage',  description: 'Quản lý tuyển dụng' },
  { code: 'asset:read',   module: 'asset', action: 'read',   description: 'Xem tài sản' },
  { code: 'asset:create', module: 'asset', action: 'create', description: 'Thêm tài sản mới' },
  { code: 'asset:update', module: 'asset', action: 'update', description: 'Cập nhật tài sản' },
  { code: 'asset:assign', module: 'asset', action: 'assign', description: 'Cấp phát tài sản' },
  { code: 'asset:manage', module: 'asset', action: 'manage', description: 'Quản lý bảo trì, xoá tài sản' },
  { code: 'procurement:read',    module: 'procurement', action: 'read',    description: 'Xem nhà cung cấp và đơn mua hàng' },
  { code: 'procurement:create',  module: 'procurement', action: 'create',  description: 'Tạo đơn mua hàng mới' },
  { code: 'procurement:update',  module: 'procurement', action: 'update',  description: 'Cập nhật đơn mua hàng' },
  { code: 'procurement:approve', module: 'procurement', action: 'approve', description: 'Phê duyệt đơn mua hàng' },
  { code: 'procurement:manage',  module: 'procurement', action: 'manage',  description: 'Quản lý nhà cung cấp toàn bộ' },
  { code: 'okr:read',   module: 'okr', action: 'read',   description: 'Xem OKR' },
  { code: 'okr:create', module: 'okr', action: 'create', description: 'Tạo OKR mới' },
  { code: 'okr:update', module: 'okr', action: 'update', description: 'Cập nhật OKR' },
  { code: 'okr:manage', module: 'okr', action: 'manage', description: 'Quản lý OKR' },
  { code: 'skills:read',   module: 'skills', action: 'read',   description: 'Xem ma trận kỹ năng' },
  { code: 'skills:manage', module: 'skills', action: 'manage', description: 'Cập nhật và quản lý ma trận kỹ năng' },
  { code: 'training:read',   module: 'training', action: 'read',   description: 'Xem chương trình đào tạo' },
  { code: 'training:create', module: 'training', action: 'create', description: 'Tạo khoá đào tạo mới' },
  { code: 'training:manage', module: 'training', action: 'manage', description: 'Quản lý toàn bộ đào tạo' },
  { code: 'hr:read', module: 'hr', action: 'read', description: 'Xem thông tin cá nhân (self-service)' },
  { code: 'room_booking:read',   module: 'room_booking', action: 'read',   description: 'Xem lịch đặt phòng họp' },
  { code: 'room_booking:create', module: 'room_booking', action: 'create', description: 'Đặt phòng họp' },
  { code: 'room_booking:manage', module: 'room_booking', action: 'manage', description: 'Quản lý phòng và lịch đặt phòng' },
  { code: 'admin:users',       module: 'admin', action: 'users',       description: 'Quản lý người dùng' },
  { code: 'admin:org',         module: 'admin', action: 'org',         description: 'Quản lý cây tổ chức' },
  { code: 'admin:permissions', module: 'admin', action: 'permissions', description: 'Quản lý phân quyền' },
  { code: 'admin:settings',    module: 'admin', action: 'settings',    description: 'Cài đặt hệ thống' },
  // Granular screen-level
  { code: 'feed:read',             module: 'feed',          action: 'read',   description: 'Xem bảng tin công ty' },
  { code: 'work_calendar:read',    module: 'work_calendar', action: 'read',   description: 'Xem lịch công ty' },
  { code: 'kanban:read',           module: 'kanban',        action: 'read',   description: 'Xem bảng Kanban' },
  { code: 'timeline:read',         module: 'timeline',      action: 'read',   description: 'Xem lịch trình dự án' },
  { code: 'knowledge_base:read',   module: 'knowledge_base',action: 'read',   description: 'Xem cơ sở tri thức' },
  { code: 'knowledge_base:manage', module: 'knowledge_base',action: 'manage', description: 'Quản lý cơ sở tri thức' },
  { code: 'my_bugs:read',          module: 'my_bugs',       action: 'read',   description: 'Xem lỗi của tôi' },
  { code: 'bugs_stats:read',       module: 'bugs_stats',    action: 'read',   description: 'Xem thống kê lỗi' },
  { code: 'timesheet_project:read',module: 'timesheet_project', action: 'read', description: 'Xem nhật ký dự án' },
  { code: 'bpm_inbox:read',        module: 'bpm_inbox',     action: 'read',   description: 'Xem hộp thư BPM' },
  { code: 'bpm_processes:read',    module: 'bpm_processes', action: 'read',   description: 'Xem định nghĩa quy trình' },
  { code: 'bpm_processes:manage',  module: 'bpm_processes', action: 'manage', description: 'Quản lý định nghĩa quy trình' },
  { code: 'bpm_instances:read',    module: 'bpm_instances', action: 'read',   description: 'Xem instances quy trình' },
  { code: 'bpm_instances:manage',  module: 'bpm_instances', action: 'manage', description: 'Giám sát instances quy trình' },
  { code: 'org_chart:read',            module: 'org_chart',           action: 'read',   description: 'Xem sơ đồ tổ chức' },
  { code: 'performance:read',          module: 'performance',         action: 'read',   description: 'Xem đánh giá năng lực' },
  { code: 'performance:manage',        module: 'performance',         action: 'manage', description: 'Quản lý đánh giá năng lực' },
  { code: 'payroll:read',              module: 'payroll',             action: 'read',   description: 'Xem bảng lương nhân viên' },
  { code: 'payroll:export',            module: 'payroll',             action: 'export', description: 'Xuất bảng lương' },
  { code: 'payroll_settings:manage',   module: 'payroll_settings',    action: 'manage', description: 'Cài đặt công thức lương' },
  { code: 'timesheet_approvals:read',    module: 'timesheet_approvals', action: 'read',    description: 'Xem danh sách duyệt chấm công' },
  { code: 'timesheet_approvals:approve', module: 'timesheet_approvals', action: 'approve', description: 'Duyệt / từ chối chấm công' },
  { code: 'timesheet_manager:read',    module: 'timesheet_manager',   action: 'read',   description: 'Xem bảng điểm danh nhóm' },
  { code: 'recruit_pipeline:read',     module: 'recruit_pipeline',    action: 'read',   description: 'Xem pipeline tuyển dụng' },
  { code: 'recruit_candidates:read',   module: 'recruit_candidates',  action: 'read',   description: 'Xem danh sách ứng viên' },
  { code: 'recruit_candidates:create', module: 'recruit_candidates',  action: 'create', description: 'Thêm ứng viên mới' },
  { code: 'recruit_candidates:approve',module: 'recruit_candidates',  action: 'approve',description: 'Phê duyệt ứng viên' },
  { code: 'recruit_interviews:read',   module: 'recruit_interviews',  action: 'read',   description: 'Xem lịch phỏng vấn' },
  { code: 'recruit_interviews:create', module: 'recruit_interviews',  action: 'create', description: 'Đặt lịch phỏng vấn' },
  { code: 'recruit_jobs:read',         module: 'recruit_jobs',        action: 'read',   description: 'Xem vị trí tuyển dụng' },
  { code: 'recruit_jobs:manage',       module: 'recruit_jobs',        action: 'manage', description: 'Quản lý vị trí tuyển dụng' },
  { code: 'project_cost:read',         module: 'project_cost',        action: 'read',   description: 'Xem chi phí dự án' },
  { code: 'project_cost:export',       module: 'project_cost',        action: 'export', description: 'Xuất báo cáo chi phí' },
  { code: 'budget:read',               module: 'budget',              action: 'read',   description: 'Xem ngân sách' },
  { code: 'budget:create',             module: 'budget',              action: 'create', description: 'Tạo kế hoạch ngân sách' },
  { code: 'budget:manage',             module: 'budget',              action: 'manage', description: 'Quản lý ngân sách' },
  { code: 'expenses:read',             module: 'expenses',            action: 'read',   description: 'Xem đề nghị thanh toán' },
  { code: 'expenses:create',           module: 'expenses',            action: 'create', description: 'Tạo đề nghị thanh toán' },
  { code: 'expenses:approve',          module: 'expenses',            action: 'approve',description: 'Phê duyệt đề nghị thanh toán' },
  { code: 'expenses:export',           module: 'expenses',            action: 'export', description: 'Xuất danh sách thanh toán' },
  { code: 'invoices:read',             module: 'invoices',            action: 'read',   description: 'Xem hoá đơn' },
  { code: 'invoices:create',           module: 'invoices',            action: 'create', description: 'Tạo hoá đơn mới' },
  { code: 'invoices:approve',          module: 'invoices',            action: 'approve',description: 'Phê duyệt hoá đơn' },
  { code: 'invoices:export',           module: 'invoices',            action: 'export', description: 'Xuất danh sách hoá đơn' },
  { code: 'accounts:read',             module: 'accounts',            action: 'read',   description: 'Xem hệ thống tài khoản' },
  { code: 'accounts:manage',           module: 'accounts',            action: 'manage', description: 'Quản lý tài khoản kế toán' },
  { code: 'journal:read',              module: 'journal',             action: 'read',   description: 'Xem nhật ký kế toán' },
  { code: 'journal:create',            module: 'journal',             action: 'create', description: 'Ghi bút toán kế toán' },
  { code: 'journal:manage',            module: 'journal',             action: 'manage', description: 'Quản lý nhật ký kế toán' },
  { code: 'financial_reports:read',    module: 'financial_reports',   action: 'read',   description: 'Xem báo cáo tài chính' },
  { code: 'financial_reports:export',  module: 'financial_reports',   action: 'export', description: 'Xuất báo cáo tài chính' },
  { code: 'crm_leads:read',        module: 'crm_leads',      action: 'read',   description: 'Xem khách hàng tiềm năng' },
  { code: 'crm_leads:create',      module: 'crm_leads',      action: 'create', description: 'Thêm lead mới' },
  { code: 'crm_leads:update',      module: 'crm_leads',      action: 'update', description: 'Cập nhật lead' },
  { code: 'crm_leads:manage',      module: 'crm_leads',      action: 'manage', description: 'Quản lý leads' },
  { code: 'crm_deals:read',        module: 'crm_deals',      action: 'read',   description: 'Xem cơ hội bán hàng' },
  { code: 'crm_deals:create',      module: 'crm_deals',      action: 'create', description: 'Tạo deal mới' },
  { code: 'crm_deals:update',      module: 'crm_deals',      action: 'update', description: 'Cập nhật deal' },
  { code: 'crm_deals:manage',      module: 'crm_deals',      action: 'manage', description: 'Quản lý deals' },
  { code: 'crm_contacts:read',     module: 'crm_contacts',   action: 'read',   description: 'Xem danh bạ liên hệ' },
  { code: 'crm_contacts:create',   module: 'crm_contacts',   action: 'create', description: 'Thêm liên hệ mới' },
  { code: 'crm_customers:read',    module: 'crm_customers',  action: 'read',   description: 'Xem danh sách khách hàng' },
  { code: 'crm_customers:create',  module: 'crm_customers',  action: 'create', description: 'Thêm khách hàng mới' },
  { code: 'crm_contracts:read',    module: 'crm_contracts',  action: 'read',   description: 'Xem hợp đồng khách hàng' },
  { code: 'crm_contracts:create',  module: 'crm_contracts',  action: 'create', description: 'Tạo hợp đồng khách hàng' },
  { code: 'crm_contracts:approve', module: 'crm_contracts',  action: 'approve',description: 'Phê duyệt hợp đồng' },
  { code: 'crm_activities:read',   module: 'crm_activities', action: 'read',   description: 'Xem nhật ký hoạt động CRM' },
  { code: 'crm_activities:create', module: 'crm_activities', action: 'create', description: 'Ghi nhật ký hoạt động' },
  { code: 'crm_forecast:read',     module: 'crm_forecast',   action: 'read',   description: 'Xem dự báo doanh số' },
  { code: 'crm_portal:read',       module: 'crm_portal',     action: 'read',   description: 'Xem cổng khách hàng' },
  { code: 'crm_portal:manage',     module: 'crm_portal',     action: 'manage', description: 'Quản lý cổng khách hàng' },
  { code: 'asset_assignments:read',   module: 'asset_assignments', action: 'read',   description: 'Xem cấp phát tài sản' },
  { code: 'asset_assignments:assign', module: 'asset_assignments', action: 'assign', description: 'Cấp phát / thu hồi tài sản' },
  { code: 'asset_maintenance:read',   module: 'asset_maintenance', action: 'read',   description: 'Xem lịch bảo trì' },
  { code: 'asset_maintenance:manage', module: 'asset_maintenance', action: 'manage', description: 'Quản lý bảo trì tài sản' },
  { code: 'vehicles:read',    module: 'vehicles',       action: 'read',   description: 'Xem xe công ty' },
  { code: 'vehicles:manage',  module: 'vehicles',       action: 'manage', description: 'Quản lý xe công ty' },
  { code: 'vendors:read',     module: 'vendors',        action: 'read',   description: 'Xem nhà cung cấp' },
  { code: 'vendors:manage',   module: 'vendors',        action: 'manage', description: 'Quản lý nhà cung cấp' },
  { code: 'purchase_orders:read',    module: 'purchase_orders', action: 'read',    description: 'Xem đơn mua hàng' },
  { code: 'purchase_orders:create',  module: 'purchase_orders', action: 'create',  description: 'Tạo đơn mua hàng' },
  { code: 'purchase_orders:approve', module: 'purchase_orders', action: 'approve', description: 'Phê duyệt đơn mua hàng' },
  { code: 'purchase_orders:manage',  module: 'purchase_orders', action: 'manage',  description: 'Quản lý đơn mua hàng' },
  { code: 'self_service:read',   module: 'self_service', action: 'read',   description: 'Xem thông tin cá nhân' },
  { code: 'self_service:update', module: 'self_service', action: 'update', description: 'Cập nhật thông tin cá nhân' },
  { code: 'my_payslips:read',    module: 'my_payslips',  action: 'read',   description: 'Xem phiếu lương của tôi' },
  { code: 'menu_config:manage',       module: 'menu_config',       action: 'manage', description: 'Cấu hình menu / module' },
  { code: 'integrations:read',        module: 'integrations',      action: 'read',   description: 'Xem tích hợp hệ thống' },
  { code: 'integrations:manage',      module: 'integrations',      action: 'manage', description: 'Quản lý tích hợp' },
  { code: 'data_import:manage',       module: 'data_import',       action: 'manage', description: 'Nhập dữ liệu hàng loạt' },
  { code: 'audit_log:read',           module: 'audit_log',         action: 'read',   description: 'Xem nhật ký hệ thống' },
  { code: 'automation:read',          module: 'automation',        action: 'read',   description: 'Xem cấu hình tự động hóa' },
  { code: 'automation:manage',        module: 'automation',        action: 'manage', description: 'Quản lý tự động hóa' },
  { code: 'scheduled_reports:read',   module: 'scheduled_reports', action: 'read',   description: 'Xem báo cáo định kỳ' },
  { code: 'scheduled_reports:manage', module: 'scheduled_reports', action: 'manage', description: 'Cấu hình báo cáo định kỳ' },
  { code: 'module_config:manage',     module: 'module_config',     action: 'manage', description: 'Cấu hình module hệ thống' },
  { code: 'system_health:read',       module: 'system_health',     action: 'read',   description: 'Giám sát sức khoẻ hệ thống' },
  { code: 'demo_mode:manage',         module: 'demo_mode',         action: 'manage', description: 'Quản lý chế độ demo' },
  { code: 'onboarding:manage',        module: 'onboarding',        action: 'manage', description: 'Quản lý onboarding wizard' },
  { code: 'hr_decisions:read',  module: 'hr_decisions', action: 'read',  description: 'Xem quyết định nhân sự' },
  { code: 'hr_decisions:write', module: 'hr_decisions', action: 'write', description: 'Tạo/sửa quyết định nhân sự' },
  { code: 'insurance:read',   module: 'insurance', action: 'read',   description: 'Xem bảo hiểm xã hội' },
  { code: 'insurance:manage', module: 'insurance', action: 'manage', description: 'Quản lý bảo hiểm xã hội' },
  { code: 'leave_policy:read',   module: 'leave_policy', action: 'read',   description: 'Xem chính sách phép' },
  { code: 'leave_policy:manage', module: 'leave_policy', action: 'manage', description: 'Quản lý chính sách phép' },
  { code: 'attendance:read',   module: 'attendance', action: 'read',   description: 'Xem bảng công' },
  { code: 'attendance:manage', module: 'attendance', action: 'manage', description: 'Quản lý bảng công' },
  { code: 'holidays:read',   module: 'holidays', action: 'read',   description: 'Xem ngày lễ' },
  { code: 'holidays:manage', module: 'holidays', action: 'manage', description: 'Quản lý ngày lễ' },
];

// Role → permission mappings (đồng bộ với DEFAULT_ROLE_PERMISSIONS trong constants)
const MEMBER_PERMS = [
  'projects:read',
  'tasks:read', 'tasks:create', 'tasks:update',
  'employees:read',
  'timesheets:read',
  'timelogs:read', 'timelogs:create', 'timelogs:update',
  'bugs:read', 'bugs:create', 'bugs:update',
  'issues:read', 'issues:create',
  'leaves:read', 'leaves:create',
  'okr:read', 'okr:create', 'okr:update',
  'skills:read',
  'training:read',
  'hr:read',
  'dashboard:read',
  'room_booking:read', 'room_booking:create',
  // Granular screen codes
  'feed:read', 'work_calendar:read', 'kanban:read', 'timeline:read',
  'knowledge_base:read',
  'my_bugs:read', 'timesheet_project:read', 'bpm_inbox:read',
  'org_chart:read', 'performance:read',
  'recruit_pipeline:read',
  'self_service:read', 'self_service:update',
  'my_payslips:read',
  'vehicles:read',
  'asset_assignments:read',
  'asset_maintenance:read',
  'vendors:read',
  'purchase_orders:read',
  'crm_leads:read', 'crm_deals:read', 'crm_contacts:read', 'crm_customers:read',
  'crm_activities:read', 'crm_forecast:read',
  'expenses:read', 'expenses:create',
  'invoices:read',
];

const PM_PERMS = [
  ...MEMBER_PERMS,
  'projects:create', 'projects:update',
  'tasks:delete', 'tasks:approve',
  'reports:read', 'reports:export',
  'timesheets:approve',
  'bugs:assign', 'bugs:close',
  'issues:update', 'issues:approve',
  'bpm:read', 'bpm:manage',
  'alerts:read', 'alerts:configure',
  'contracts:read',
  'recruit:read', 'recruit:create', 'recruit:update',
  'procurement:read',
  'leaves:approve',
  'knowledge_base:manage',
  'bugs_stats:read',
  'bpm_processes:read', 'bpm_processes:manage',
  'bpm_instances:read', 'bpm_instances:manage',
  'payroll:read',
  'timesheet_approvals:read', 'timesheet_approvals:approve', 'timesheet_manager:read',
  'recruit_candidates:create', 'recruit_candidates:approve',
  'recruit_interviews:create',
  'recruit_jobs:read',
  'project_cost:read',
  'crm_leads:create', 'crm_leads:update',
  'crm_deals:create', 'crm_deals:update',
  'crm_contacts:create',
  'crm_contracts:read',
  'crm_activities:create',
];

const LEADERSHIP_PERMS = [
  ...PM_PERMS,
  'projects:delete',
  'tasks:delete',
  'employees:create', 'employees:update',
  'finance:read', 'finance:create', 'finance:approve', 'finance:manage', 'finance:export',
  'leaves:approve',
  'contracts:create', 'contracts:update', 'contracts:approve',
  'crm:read', 'crm:create', 'crm:update',
  'recruit:approve',
  'asset:read', 'asset:create', 'asset:update', 'asset:assign', 'asset:manage',
  'procurement:create', 'procurement:approve', 'procurement:manage',
  'okr:manage',
  'skills:manage',
  'training:create', 'training:manage',
  'room_booking:manage',
  'crm_leads:manage', 'crm_deals:manage',
  'crm_customers:create', 'crm_contracts:create', 'crm_contracts:approve',
  'crm_portal:read', 'crm_portal:manage',
  'asset_assignments:assign', 'asset_maintenance:manage',
  'vehicles:manage',
  'vendors:manage',
  'purchase_orders:create', 'purchase_orders:approve', 'purchase_orders:manage',
  'budget:read', 'budget:create', 'budget:manage',
  'expenses:approve', 'expenses:export',
  'invoices:create', 'invoices:approve', 'invoices:export',
  'accounts:read', 'accounts:manage',
  'journal:read', 'journal:create', 'journal:manage',
  'financial_reports:read', 'financial_reports:export',
  'project_cost:export',
  'payroll:export', 'payroll_settings:manage',
  'recruit_candidates:approve', 'recruit_jobs:manage',
  'performance:manage',
  'scheduled_reports:read', 'system_health:read', 'audit_log:read',
];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('✓ Connected to loop_db');

  // 1. Upsert permission codes
  let inserted = 0;
  for (const p of ALL_PERMISSIONS) {
    await client.query(
      `INSERT INTO permissions (code, module, action, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (code) DO UPDATE SET module=$2, action=$3, description=$4`,
      [p.code, p.module, p.action, p.description],
    );
    inserted++;
  }
  console.log(`✓ ${inserted} permission codes upserted`);

  // 2. Upsert role_permissions
  const roleMap = {
    MEMBER:     [...new Set(MEMBER_PERMS)],
    PM:         [...new Set(PM_PERMS)],
    LEADERSHIP: [...new Set(LEADERSHIP_PERMS)],
    ADMIN:      ALL_PERMISSIONS.map(p => p.code),
  };

  let rpCount = 0;
  for (const [role, codes] of Object.entries(roleMap)) {
    for (const code of codes) {
      // Chỉ insert nếu permission code tồn tại trong bảng
      await client.query(
        `INSERT INTO role_permissions (role, permission_code, created_at)
         SELECT $1, $2, NOW() WHERE EXISTS (SELECT 1 FROM permissions WHERE code = $2)
         ON CONFLICT (role, permission_code) DO NOTHING`,
        [role, code],
      );
      rpCount++;
    }
  }
  console.log(`✓ ${rpCount} role-permission rows processed`);

  // 3. Invalidate Redis permission cache cho tất cả users
  try {
    const { createClient } = require('redis');
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redis.connect();
    const keys = await redis.keys('perm:*');
    if (keys.length > 0) {
      await redis.del(keys);
      console.log(`✓ Cleared ${keys.length} permission cache entries from Redis`);
    } else {
      console.log('✓ No Redis permission cache to clear');
    }
    await redis.disconnect();
  } catch (e) {
    console.log('⚠ Redis clear skipped:', e.message);
  }

  await client.end();
  console.log('✅ Patch permissions v2 hoàn tất!');
}

main().catch(err => { console.error(err); process.exit(1); });
