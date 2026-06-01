/**
 * Seed dữ liệu demo Finance — Invoice, PO, Budget, Journal, Expense
 *
 * Chạy: npx tsx prisma/seed-finance.ts
 *
 * Tạo:
 *  - 20 Vendor (nếu chưa đủ)
 *  - 60 Invoice (20 DRAFT, 15 SENT, 20 PAID, 5 OVERDUE)
 *  - 40 PurchaseOrder (10 DRAFT, 15 APPROVED, 10 RECEIVED, 5 PAID)
 *  - 10 BudgetPlan (8 ACTIVE/approved, 2 DRAFT) mỗi plan 5-8 BudgetLine + 3-5 BudgetTransaction/line
 *  - 50 Expense (20 APPROVED, 15 PENDING, 10 PAID, 5 REJECTED)
 *  - 30 JournalEntry + JournalLines
 *  - ChartOfAccount: 111, 112, 131, 331, 511, 621, 627 (upsert)
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] || 'postgresql://loop:loop_password@localhost:5432/loop_db' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ─── Hàm helper ───────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Dữ liệu Vendor ───────────────────────────────────────────────────────────

const VENDOR_LIST = [
  { code: 'VND-F01', name: 'Công ty TNHH Phần mềm Tiên Phong', category: 'Software', contactName: 'Nguyễn Tiên Phong', email: 'contact@tienphuong.vn', phone: '028-3812-0001', taxCode: '0301110001', bankAccount: '1100001234567', bankName: 'Vietcombank', rating: 5 },
  { code: 'VND-F02', name: 'FPT Software HCM', category: 'IT Services', contactName: 'Lê Minh Khoa', email: 'lmkhoa@fpt.com.vn', phone: '028-7300-6001', taxCode: '0100686210', bankAccount: '9870001234567', bankName: 'Techcombank', rating: 5 },
  { code: 'VND-F03', name: 'Công ty CP Thiết bị Văn phòng Hoa Mai', category: 'Office Supplies', contactName: 'Trần Thị Hoa', email: 'tthoa@hoamai.vn', phone: '028-3812-0002', taxCode: '0302110002', bankAccount: '5670001234567', bankName: 'BIDV', rating: 4 },
  { code: 'VND-F04', name: 'Synnex FPT Distribution', category: 'Hardware', contactName: 'Phạm Văn Đức', email: 'pvduc@synnexfpt.com.vn', phone: '028-6290-8889', taxCode: '0303110003', bankAccount: '2340001234567', bankName: 'ACB', rating: 4 },
  { code: 'VND-F05', name: 'VNPT Technology Solutions', category: 'Telecom', contactName: 'Nguyễn Thị Mai', email: 'ntmai@vnpt.vn', phone: '028-3721-3457', taxCode: '0101688766', bankAccount: '3450001234567', bankName: 'Vietinbank', rating: 4 },
  { code: 'VND-F06', name: 'Công ty TNHH Logistics Phú Xuân', category: 'Logistics', contactName: 'Vũ Đình Phúc', email: 'vdphuc@phuxuan-logistics.vn', phone: '028-3550-6790', taxCode: '0304110004', bankAccount: '4560001234567', bankName: 'MB Bank', rating: 3 },
  { code: 'VND-F07', name: 'CloudBase Vietnam Ltd', category: 'Cloud Services', contactName: 'David Trần', email: 'david@cloudbase.vn', phone: '028-7307-8800', taxCode: '0401110005', bankAccount: '6780001234567', bankName: 'HSBC', rating: 5 },
  { code: 'VND-F08', name: 'Công ty In ấn & Truyền thông Nam Việt', category: 'Marketing', contactName: 'Lê Thị Nam', email: 'ltnam@namviet-print.vn', phone: '028-3812-0003', taxCode: '0305110006', bankAccount: '7890001234567', bankName: 'Sacombank', rating: 3 },
  { code: 'VND-F09', name: 'Delta Office Furniture', category: 'Furniture', contactName: 'Nguyễn Đức Delta', email: 'delta@deltaoffice.vn', phone: '028-3812-0004', taxCode: '0306110007', bankAccount: '8900001234567', bankName: 'VPBank', rating: 4 },
  { code: 'VND-F10', name: 'Thắng Lợi Security Systems', category: 'Security', contactName: 'Trần Thắng Lợi', email: 'ttloi@thang-loi.vn', phone: '028-3812-0005', taxCode: '0307110008', bankAccount: '9010001234567', bankName: 'SHB', rating: 3 },
  { code: 'VND-F11', name: 'Công ty CP Điện lực Miền Nam', category: 'Utilities', contactName: 'Phạm Điện Nam', email: 'pdnam@diennam.vn', phone: '028-3812-0006', taxCode: '0308110009', bankAccount: '1230001234567', bankName: 'Vietcombank', rating: 4 },
  { code: 'VND-F12', name: 'Saigon Internet Services', category: 'ISP', contactName: 'Huỳnh Văn Mạng', email: 'hvmang@saigon-isp.vn', phone: '028-3812-0007', taxCode: '0309110010', bankAccount: '2340000234567', bankName: 'BIDV', rating: 4 },
  { code: 'VND-F13', name: 'Công ty TNHH Cung ứng Lao động Trường Sinh', category: 'HR Services', contactName: 'Lê Trường Sinh', email: 'lts@truongsinh-hr.vn', phone: '028-3812-0008', taxCode: '0310110011', bankAccount: '3450000234567', bankName: 'Techcombank', rating: 3 },
  { code: 'VND-F14', name: 'GreenClean Facility Management', category: 'Facility', contactName: 'Nguyễn Xanh Sạch', email: 'nxs@greenclean.vn', phone: '028-3812-0009', taxCode: '0311110012', bankAccount: '4560000234567', bankName: 'ACB', rating: 4 },
  { code: 'VND-F15', name: 'Công ty Bảo hiểm Bảo Việt HCM', category: 'Insurance', contactName: 'Trần Bảo Việt', email: 'tbviet@baoviet.com.vn', phone: '028-3812-0010', taxCode: '0100150064', bankAccount: '5670000234567', bankName: 'Vietinbank', rating: 5 },
  { code: 'VND-F16', name: 'HotelServ Catering Co.', category: 'Catering', contactName: 'Vũ Ẩm Thực', email: 'vat@hotelserv.vn', phone: '028-3812-0011', taxCode: '0312110013', bankAccount: '6780000234567', bankName: 'MB Bank', rating: 3 },
  { code: 'VND-F17', name: 'Công ty TNHH Kiểm toán KPMG VN', category: 'Audit', contactName: 'Nguyễn Kiểm Toán', email: 'nkt@kpmg.com.vn', phone: '028-3821-9266', taxCode: '0100415698', bankAccount: '7890000234567', bankName: 'HSBC', rating: 5 },
  { code: 'VND-F18', name: 'Vina Cleaning Supplies', category: 'Consumables', contactName: 'Lê Vệ Sinh', email: 'lvs@vinacleaning.vn', phone: '028-3812-0012', taxCode: '0313110014', bankAccount: '8900000234567', bankName: 'Sacombank', rating: 2 },
  { code: 'VND-F19', name: 'TechRent Equipment Leasing', category: 'Equipment Rental', contactName: 'Phạm Cho Thuê', email: 'pct@techrent.vn', phone: '028-3812-0013', taxCode: '0314110015', bankAccount: '9010000234567', bankName: 'VPBank', rating: 4 },
  { code: 'VND-F20', name: 'An Phú Travel & Events', category: 'Events', contactName: 'Trần An Phú', email: 'tap@anphu-travel.vn', phone: '028-3812-0014', taxCode: '0315110016', bankAccount: '1230000234567', bankName: 'SHB', rating: 3 },
];

// ─── ChartOfAccount cần thiết ─────────────────────────────────────────────────

const REQUIRED_ACCOUNTS = [
  { code: '111', name: 'Tiền mặt', type: 'ASSET' as const },
  { code: '112', name: 'Tiền gửi ngân hàng', type: 'ASSET' as const },
  { code: '131', name: 'Phải thu của khách hàng', type: 'ASSET' as const },
  { code: '331', name: 'Phải trả cho người bán', type: 'LIABILITY' as const },
  { code: '511', name: 'Doanh thu bán hàng và cung cấp dịch vụ', type: 'REVENUE' as const },
  { code: '621', name: 'Chi phí nguyên vật liệu trực tiếp', type: 'EXPENSE' as const },
  { code: '627', name: 'Chi phí sản xuất chung', type: 'EXPENSE' as const },
];

// ─── Tên dịch vụ/sản phẩm cho InvoiceItem ────────────────────────────────────

const INVOICE_ITEMS = [
  'Phí tư vấn triển khai hệ thống ERP',
  'Dịch vụ phát triển phần mềm tháng',
  'Phí bảo trì hệ thống hàng tháng',
  'Dịch vụ hosting & cloud infrastructure',
  'Phí đào tạo người dùng cuối',
  'Dịch vụ tích hợp API bên thứ ba',
  'Phí license phần mềm năm',
  'Dịch vụ kiểm thử và QA',
  'Phí quản lý dự án',
  'Dịch vụ thiết kế UI/UX',
  'Phí triển khai module HR',
  'Dịch vụ phân tích dữ liệu & báo cáo',
  'Phí tư vấn bảo mật hệ thống',
  'Dịch vụ migration dữ liệu',
  'Phí hỗ trợ kỹ thuật ưu tiên (24/7)',
];

const EXPENSE_TITLES = [
  'Chi phí công tác TP.HCM - Hà Nội',
  'Ăn uống tiếp khách Q1',
  'Mua thiết bị văn phòng phẩm',
  'Phí đăng ký hội thảo công nghệ',
  'Chi phí in ấn tài liệu dự án',
  'Xăng xe đi lại tháng',
  'Phí đào tạo kỹ năng chuyên môn',
  'Mua phần mềm diệt virus',
  'Chi phí sửa chữa thiết bị văn phòng',
  'Tiền điện thoại làm việc',
  'Phí taxi/Grab phục vụ công tác',
  'Chi phí đặt phòng khách sạn công tác',
  'Mua sách chuyên môn & tài liệu',
  'Phí ăn trưa nhóm dự án',
  'Chi phí thuốc men nhân viên bệnh',
];

const BUDGET_CATEGORIES = [
  'Nhân sự & Lương',
  'Công nghệ thông tin',
  'Marketing & Quảng cáo',
  'Đào tạo & Phát triển',
  'Văn phòng phẩm',
  'Chi phí vận hành',
  'Nghiên cứu & Phát triển',
  'Pháp lý & Kiểm toán',
  'Sự kiện & PR',
  'Thiết bị & Cơ sở hạ tầng',
];

// ─── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Bắt đầu seed Finance data...\n');

  // ── 0. Lấy User + Customer + Project từ DB ──────────────────────────────────
  const users = await prisma.user.findMany({ take: 10, select: { id: true } });
  if (users.length === 0) throw new Error('Không tìm thấy User nào — hãy chạy seed-data.js trước');
  const userIds = users.map(u => u.id);

  const customers = await prisma.customer.findMany({ take: 20, select: { id: true } });
  const customerIds = customers.map(c => c.id);

  const projects = await prisma.project.findMany({ take: 20, select: { id: true } });
  const projectIds = projects.map(p => p.id);

  const employees = await prisma.employee.findMany({ take: 20, select: { id: true } });
  const employeeIds = employees.map(e => e.id);

  const orgUnits = await prisma.orgUnit.findMany({ take: 8, select: { id: true } });
  const orgUnitIds = orgUnits.map(o => o.id);

  // ── 1. Upsert ChartOfAccount ────────────────────────────────────────────────
  console.log('📊 Upsert ChartOfAccount...');
  for (const acc of REQUIRED_ACCOUNTS) {
    await prisma.chartOfAccount.upsert({
      where: { code: acc.code },
      update: { name: acc.name, type: acc.type },
      create: { code: acc.code, name: acc.name, type: acc.type, isActive: true },
    });
  }
  console.log(`  ✅ ${REQUIRED_ACCOUNTS.length} tài khoản kế toán đảm bảo tồn tại\n`);

  // ── 2. Seed 20 Vendor ───────────────────────────────────────────────────────
  console.log('🏢 Seeding Vendors...');
  const vendorIds: string[] = [];

  for (const v of VENDOR_LIST) {
    const existing = await prisma.vendor.findFirst({ where: { code: v.code } });
    if (existing) {
      vendorIds.push(existing.id);
    } else {
      const created = await prisma.vendor.create({
        data: {
          code: v.code,
          name: v.name,
          category: v.category,
          contactName: v.contactName,
          email: v.email,
          phone: v.phone,
          taxCode: v.taxCode,
          bankAccount: v.bankAccount,
          bankName: v.bankName,
          rating: v.rating,
          status: 'ACTIVE',
        },
      });
      vendorIds.push(created.id);
    }
  }
  console.log(`  ✅ ${vendorIds.length} Vendor sẵn sàng\n`);

  // ── 3. Seed 60 Invoice ──────────────────────────────────────────────────────
  console.log('🧾 Seeding Invoices (60 bản ghi)...');

  // Đếm Invoice đã có để tránh duplicate code
  const existingInvoiceCount = await prisma.invoice.count();
  const invoiceStart = existingInvoiceCount + 1;

  const invoiceStatuses: Array<{ status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'; count: number }> = [
    { status: 'DRAFT', count: 20 },
    { status: 'SENT', count: 15 },
    { status: 'PAID', count: 20 },
    { status: 'OVERDUE', count: 5 },
  ];

  const createdInvoiceIds: string[] = [];
  let invoiceSeq = invoiceStart;

  for (const { status, count } of invoiceStatuses) {
    for (let i = 0; i < count; i++) {
      const issueDate = daysAgo(randInt(10, 120));
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const paidAt = status === 'PAID' ? new Date(dueDate.getTime() - randInt(1, 15) * 86400000) : null;

      // Tạo amount ngẫu nhiên 50M - 500M
      const subtotal = randInt(50, 500) * 1_000_000;
      const taxAmount = Math.round(subtotal * 0.1);
      const totalAmount = subtotal + taxAmount;

      const code = `INV-F${String(invoiceSeq).padStart(4, '0')}`;
      invoiceSeq++;

      const inv = await prisma.invoice.create({
        data: {
          code,
          type: 'SALES',
          customerId: customerIds.length > 0 ? pick(customerIds) : undefined,
          projectId: projectIds.length > 0 && Math.random() > 0.3 ? pick(projectIds) : undefined,
          issueDate,
          dueDate,
          status,
          subtotal,
          taxAmount,
          totalAmount,
          currency: 'VND',
          notes: status === 'OVERDUE' ? 'Quá hạn thanh toán — cần nhắc nhở khách hàng' : undefined,
          paidAt,
          createdById: pick(userIds),
          items: {
            create: Array.from({ length: randInt(1, 3) }, () => {
              const qty = randInt(1, 5);
              const unitPrice = randInt(5, 100) * 1_000_000;
              return {
                description: pick(INVOICE_ITEMS),
                quantity: qty,
                unitPrice,
                amount: qty * unitPrice,
                taxRate: 10,
              };
            }),
          },
        },
      });
      createdInvoiceIds.push(inv.id);
    }
  }
  console.log(`  ✅ ${createdInvoiceIds.length} Invoice được tạo (DRAFT:20, SENT:15, PAID:20, OVERDUE:5)\n`);

  // ── 4. Seed 40 PurchaseOrder ────────────────────────────────────────────────
  console.log('📦 Seeding PurchaseOrders (40 bản ghi)...');

  const existingPoCount = await prisma.purchaseOrder.count();
  const poStart = existingPoCount + 1;

  // PoStatus mapping: yêu cầu APPROVED, RECEIVED, PAID → schema dùng APPROVED, RECEIVED, + thêm paidAt
  const poStatuses: Array<{ status: 'DRAFT' | 'APPROVED' | 'RECEIVED'; paidAt?: Date | null; count: number }> = [
    { status: 'DRAFT', paidAt: null, count: 10 },
    { status: 'APPROVED', paidAt: null, count: 15 },
    { status: 'RECEIVED', paidAt: null, count: 10 },
    { status: 'RECEIVED', paidAt: daysAgo(5), count: 5 }, // RECEIVED + paidAt = đã thanh toán
  ];

  const createdPoIds: string[] = [];
  let poSeq = poStart;

  for (const { status, paidAt, count } of poStatuses) {
    for (let i = 0; i < count; i++) {
      const approvedAt = status !== 'DRAFT' ? daysAgo(randInt(5, 60)) : null;
      const receivedAt = status === 'RECEIVED' ? daysAgo(randInt(1, 20)) : null;

      const poItems = Array.from({ length: randInt(2, 5) }, () => {
        const qty = randInt(1, 20);
        const unitPrice = randInt(2, 50) * 1_000_000;
        return {
          description: pick([
            'Laptop Dell Latitude i7',
            'Monitor LG 27" 4K',
            'Bàn làm việc ergonomic',
            'Ghế văn phòng cao cấp',
            'Phần mềm Microsoft 365 Business',
            'Switch mạng Cisco 24-port',
            'UPS 1000VA APC',
            'Webcam Logitech 4K',
            'Headset Jabra Evolve2',
            'Máy in HP LaserJet Pro',
            'Mực in HP 85A',
            'Giấy in A4 (thùng 5 ram)',
            'Bút bi Thiên Long (hộp 50)',
            'Màn hình cong Samsung 32"',
            'Server Dell PowerEdge R350',
          ]),
          unit: pick(['cái', 'bộ', 'hộp', 'thùng', 'bản quyền']),
          quantity: qty,
          unitPrice,
          totalPrice: qty * unitPrice,
          receivedQty: status === 'RECEIVED' ? qty : 0,
          status: status === 'RECEIVED' ? 'RECEIVED' as const : 'PENDING' as const,
        };
      });

      const totalAmount = poItems.reduce((s, item) => s + item.totalPrice, 0);
      const poNumber = `PO-F${String(poSeq).padStart(4, '0')}`;
      poSeq++;

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          vendorId: pick(vendorIds),
          requesterId: pick(userIds),
          approverId: status !== 'DRAFT' ? pick(userIds) : undefined,
          status,
          currency: 'VND',
          totalAmount,
          taxAmount: Math.round(totalAmount * 0.1),
          notes: `Đơn mua hàng ${poNumber} — ${status}`,
          deliveryDate: daysFromNow(randInt(7, 30)),
          approvedAt,
          receivedAt,
          paidAt: paidAt ?? undefined,
          items: { create: poItems },
        },
      });
      createdPoIds.push(po.id);
    }
  }

  const draftPo = poStatuses.filter(s => s.status === 'DRAFT').reduce((s, x) => s + x.count, 0);
  const approvedPo = poStatuses.filter(s => s.status === 'APPROVED').reduce((s, x) => s + x.count, 0);
  const receivedPo = poStatuses.filter(s => s.status === 'RECEIVED' && !s.paidAt).reduce((s, x) => s + x.count, 0);
  const paidPo = poStatuses.filter(s => s.status === 'RECEIVED' && s.paidAt).reduce((s, x) => s + x.count, 0);
  console.log(`  ✅ ${createdPoIds.length} PurchaseOrder được tạo (DRAFT:${draftPo}, APPROVED:${approvedPo}, RECEIVED:${receivedPo}, PAID:${paidPo})\n`);

  // ── 5. Seed 10 BudgetPlan ───────────────────────────────────────────────────
  console.log('💰 Seeding BudgetPlans (10 kế hoạch ngân sách)...');

  // 8 ACTIVE (approved) + 2 DRAFT
  // 1 per quarter (4) + 2 per company (2) + 4 department = 10 total
  const budgetPlanDefs = [
    // Company-wide
    { name: 'Ngân sách Công ty Q1/2026', type: 'COMPANY' as const, status: 'ACTIVE' as const, total: 2_000_000_000, note: 'Kế hoạch chi tiêu toàn công ty Q1 2026' },
    { name: 'Ngân sách Công ty Q2/2026', type: 'COMPANY' as const, status: 'ACTIVE' as const, total: 2_200_000_000, note: 'Kế hoạch chi tiêu toàn công ty Q2 2026' },
    // Per-quarter department
    { name: 'Ngân sách CNTT Q1/2026', type: 'DEPARTMENT' as const, status: 'ACTIVE' as const, total: 400_000_000, note: 'Ngân sách phòng CNTT quý 1 2026' },
    { name: 'Ngân sách CNTT Q2/2026', type: 'DEPARTMENT' as const, status: 'ACTIVE' as const, total: 450_000_000, note: 'Ngân sách phòng CNTT quý 2 2026' },
    { name: 'Ngân sách Marketing Q1/2026', type: 'DEPARTMENT' as const, status: 'ACTIVE' as const, total: 300_000_000, note: 'Ngân sách Marketing quý 1 2026' },
    { name: 'Ngân sách Marketing Q2/2026', type: 'DEPARTMENT' as const, status: 'ACTIVE' as const, total: 350_000_000, note: 'Ngân sách Marketing quý 2 2026' },
    { name: 'Ngân sách Nhân sự Q1/2026', type: 'DEPARTMENT' as const, status: 'ACTIVE' as const, total: 600_000_000, note: 'Ngân sách phòng Nhân sự Q1 2026' },
    { name: 'Ngân sách Dự án Loop v5', type: 'PROJECT' as const, status: 'ACTIVE' as const, total: 1_500_000_000, note: 'Ngân sách toàn dự án nâng cấp Loop v5' },
    // DRAFT
    { name: 'Ngân sách CNTT Q3/2026', type: 'DEPARTMENT' as const, status: 'DRAFT' as const, total: 480_000_000, note: 'Dự thảo ngân sách CNTT Q3 — chờ phê duyệt' },
    { name: 'Ngân sách Sales Q3/2026', type: 'DEPARTMENT' as const, status: 'DRAFT' as const, total: 250_000_000, note: 'Dự thảo ngân sách Sales Q3 — đang xem xét' },
  ];

  let budgetPlanCount = 0;
  let budgetLineCount = 0;
  let budgetTxCount = 0;

  for (const def of budgetPlanDefs) {
    const existing = await prisma.budgetPlan.findFirst({ where: { name: def.name } });
    if (existing) {
      console.log(`  ⏭️  "${def.name}" đã tồn tại`);
      continue;
    }

    // Chọn 5-8 categories ngẫu nhiên
    const numLines = randInt(5, 8);
    const shuffledCats = [...BUDGET_CATEGORIES].sort(() => Math.random() - 0.5).slice(0, numLines);

    // Phân bổ amount cho từng line
    const lineAmounts = shuffledCats.map(() => randInt(30, 300) * 1_000_000);
    const total = lineAmounts.reduce((s, v) => s + v, 0);

    const plan = await prisma.budgetPlan.create({
      data: {
        name: def.name,
        fiscalYear: 2026,
        type: def.type,
        status: def.status,
        orgUnitId: orgUnitIds.length > 0 && def.type === 'DEPARTMENT' ? pick(orgUnitIds) : undefined,
        projectId: projectIds.length > 0 && def.type === 'PROJECT' ? pick(projectIds) : undefined,
        totalAmount: total,
        note: def.note,
        approvedAt: def.status === 'ACTIVE' ? daysAgo(randInt(10, 60)) : undefined,
        approvedById: def.status === 'ACTIVE' ? pick(userIds) : undefined,
        createdById: pick(userIds),
        lines: {
          create: shuffledCats.map((cat, idx) => {
            const allocated = lineAmounts[idx];
            const usedPct = def.status === 'ACTIVE' ? randInt(20, 85) : 0;
            const used = Math.round(allocated * usedPct / 100);
            return {
              category: cat,
              description: `Chi phí ${cat.toLowerCase()} theo kế hoạch ${def.name}`,
              allocatedAmount: allocated,
              usedAmount: used,
              committedAmount: Math.round(allocated * randInt(0, 10) / 100),
              alertThreshold: pick([75, 80, 85, 90]),
            };
          }),
        },
      },
      include: { lines: true },
    });

    budgetPlanCount++;
    budgetLineCount += plan.lines.length;

    // Tạo BudgetTransaction 3-5 per approved line
    if (def.status === 'ACTIVE') {
      for (const line of plan.lines) {
        const numTx = randInt(3, 5);
        const perTx = Math.round((line.usedAmount as any) / numTx);
        for (let t = 0; t < numTx; t++) {
          await prisma.budgetTransaction.create({
            data: {
              lineId: line.id,
              sourceType: pick(['EXPENSE', 'PO', 'PAYROLL']),
              sourceId: `demo-${line.category.slice(0, 6)}-${t + 1}`.toLowerCase().replace(/\s/g, '-'),
              amount: t === numTx - 1 ? (line.usedAmount as any) - perTx * t : perTx,
              type: 'ACTUAL',
              note: `Thực chi ${line.category} đợt ${t + 1}`,
            },
          });
          budgetTxCount++;
        }
      }
    }
  }

  console.log(`  ✅ ${budgetPlanCount} BudgetPlan | ${budgetLineCount} BudgetLine | ${budgetTxCount} BudgetTransaction\n`);

  // ── 6. Seed 50 Expense ──────────────────────────────────────────────────────
  console.log('💳 Seeding Expenses (50 bản ghi)...');

  const expenseStatuses: Array<{ status: 'APPROVED' | 'PENDING' | 'PAID' | 'REJECTED'; count: number }> = [
    { status: 'APPROVED', count: 20 },
    { status: 'PENDING', count: 15 },
    { status: 'PAID', count: 10 },
    { status: 'REJECTED', count: 5 },
  ];

  const expenseCategories = ['TRAVEL', 'MEALS', 'EQUIPMENT', 'SOFTWARE', 'TRAINING', 'OTHER'] as const;

  let expenseCount = 0;

  for (const { status, count } of expenseStatuses) {
    for (let i = 0; i < count; i++) {
      const submittedBy = pick(userIds);
      const approvedBy = status !== 'PENDING' ? pick(userIds) : undefined;
      const approvedAt = (status === 'APPROVED' || status === 'PAID') ? daysAgo(randInt(1, 30)) : undefined;
      const totalAmount = randInt(1, 50) * 1_000_000;

      await prisma.expense.create({
        data: {
          title: pick(EXPENSE_TITLES),
          category: pick(expenseCategories),
          totalAmount,
          currency: 'VND',
          status,
          submittedById: submittedBy,
          approvedById: approvedBy,
          approvedAt,
          employeeId: employeeIds.length > 0 ? pick(employeeIds) : undefined,
          projectId: projectIds.length > 0 && Math.random() > 0.5 ? pick(projectIds) : undefined,
          rejectedReason: status === 'REJECTED' ? 'Không đủ chứng từ hoặc vượt hạn mức cho phép' : undefined,
          note: `Expense #${expenseCount + 1} — ${status}`,
          items: {
            create: Array.from({ length: randInt(1, 3) }, () => ({
              description: pick(EXPENSE_TITLES),
              amount: Math.round(totalAmount / randInt(1, 3)),
            })),
          },
        },
      });
      expenseCount++;
    }
  }

  console.log(`  ✅ ${expenseCount} Expense được tạo (APPROVED:20, PENDING:15, PAID:10, REJECTED:5)\n`);

  // ── 7. Seed 30 JournalEntry ─────────────────────────────────────────────────
  console.log('📒 Seeding JournalEntries (30 bản ghi)...');

  // Lấy Invoice PAID để tạo journal (link qua reference)
  const paidInvoices = await prisma.invoice.findMany({
    where: { status: 'PAID', journalEntryId: null },
    take: 15,
    select: { id: true, code: true, totalAmount: true },
  });

  // Lấy PO RECEIVED để tạo journal
  const receivedPos = await prisma.purchaseOrder.findMany({
    where: { status: 'RECEIVED', journalEntryId: null },
    take: 10,
    select: { id: true, poNumber: true, totalAmount: true },
  });

  let journalCount = 0;

  // Journal cho Invoice PAID (ghi nhận thu tiền: Nợ 112 / Có 131)
  for (const inv of paidInvoices) {
    const journal = await prisma.journalEntry.create({
      data: {
        date: daysAgo(randInt(1, 60)),
        description: `Thu tiền hóa đơn ${inv.code}`,
        reference: inv.code,
        createdById: pick(userIds),
        lines: {
          create: [
            {
              accountCode: '112',
              debit: inv.totalAmount,
              credit: 0,
              description: 'Thu tiền khách hàng qua ngân hàng',
            },
            {
              accountCode: '131',
              debit: 0,
              credit: inv.totalAmount,
              description: `Ghi giảm phải thu — ${inv.code}`,
            },
          ],
        },
      },
    });
    // Link journal vào invoice
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { journalEntryId: journal.id },
    });
    journalCount++;
  }

  // Journal cho PO RECEIVED (ghi nhận nhập hàng: Nợ 621 / Có 331)
  for (const po of receivedPos) {
    const journal = await prisma.journalEntry.create({
      data: {
        date: daysAgo(randInt(1, 40)),
        description: `Nhập hàng theo đơn mua ${po.poNumber}`,
        reference: po.poNumber,
        createdById: pick(userIds),
        lines: {
          create: [
            {
              accountCode: '621',
              debit: po.totalAmount,
              credit: 0,
              description: `Nhập chi phí mua hàng — ${po.poNumber}`,
            },
            {
              accountCode: '331',
              debit: 0,
              credit: po.totalAmount,
              description: 'Phải trả nhà cung cấp',
            },
          ],
        },
      },
    });
    // Link journal vào PO
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: { journalEntryId: journal.id },
    });
    journalCount++;
  }

  // Thêm journal doanh thu tổng hợp cho đủ 30
  const remaining = 30 - journalCount;
  for (let i = 0; i < remaining; i++) {
    const amount = randInt(50, 500) * 1_000_000;
    const isRevenue = i % 2 === 0;
    await prisma.journalEntry.create({
      data: {
        date: daysAgo(randInt(1, 90)),
        description: isRevenue ? `Ghi nhận doanh thu dịch vụ tháng ${i + 1}/2026` : `Chi phí hoạt động tháng ${i + 1}/2026`,
        reference: `MISC-${String(i + 1).padStart(3, '0')}`,
        createdById: pick(userIds),
        lines: {
          create: isRevenue
            ? [
                { accountCode: '131', debit: amount, credit: 0, description: 'Phải thu khách hàng' },
                { accountCode: '511', debit: 0, credit: amount, description: 'Doanh thu dịch vụ' },
              ]
            : [
                { accountCode: '627', debit: amount, credit: 0, description: 'Chi phí sản xuất chung' },
                { accountCode: '112', debit: 0, credit: amount, description: 'Thanh toán qua ngân hàng' },
              ],
        },
      },
    });
    journalCount++;
  }

  console.log(`  ✅ ${journalCount} JournalEntry được tạo\n`);

  // ── Tổng kết ────────────────────────────────────────────────────────────────
  const [
    totalVendors,
    totalInvoices,
    totalPo,
    totalBudgetPlans,
    totalBudgetLines,
    totalBudgetTx,
    totalExpenses,
    totalJournals,
  ] = await Promise.all([
    prisma.vendor.count(),
    prisma.invoice.count(),
    prisma.purchaseOrder.count(),
    prisma.budgetPlan.count(),
    prisma.budgetLine.count(),
    prisma.budgetTransaction.count(),
    prisma.expense.count(),
    prisma.journalEntry.count(),
  ]);

  console.log('═══════════════════════════════════════════════');
  console.log('✅ SEED FINANCE HOÀN TẤT — TỔNG KẾT:');
  console.log(`   Vendor          : ${totalVendors}`);
  console.log(`   Invoice         : ${totalInvoices}`);
  console.log(`   PurchaseOrder   : ${totalPo}`);
  console.log(`   BudgetPlan      : ${totalBudgetPlans}`);
  console.log(`   BudgetLine      : ${totalBudgetLines}`);
  console.log(`   BudgetTransaction: ${totalBudgetTx}`);
  console.log(`   Expense         : ${totalExpenses}`);
  console.log(`   JournalEntry    : ${totalJournals}`);
  console.log('═══════════════════════════════════════════════');
}

main()
  .catch(e => {
    console.error('❌ Lỗi seed finance:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
