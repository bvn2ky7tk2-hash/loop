'use strict';
/**
 * seed-crm.js — Seed CRM toàn diện cho Loop ERP
 * Tạo: 50 Customers, 100 Leads, 50 Deals, 150 CrmActivities,
 *      10 ClientContracts, 20 LeadFollowUpSchedules, 10 CustomerSurveySchedules
 *
 * Chạy: node prisma/seed-crm.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://loop:loop_password@localhost:5432/loop_db',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function dateOnly(iso) {
  return iso.slice(0, 10);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Data: 40 new customers (+ 10 existing = 50 total) ───────────────────────

const NEW_CUSTOMERS = [
  // ─ Fintech ─
  {
    code: 'VTPAY', name: 'VTPay Financial Services', industry: 'fintech',
    website: 'https://vtpay.vn', taxCode: '0109876543',
    contacts: [
      { name: 'Nguyễn Minh Tuấn', title: 'CTO', email: 'tuan.nguyen@vtpay.vn', phone: '0901234501' },
      { name: 'Trần Thị Lan Anh', title: 'CFO', email: 'lananh.tran@vtpay.vn', phone: '0901234502' },
      { name: 'Lê Văn Đức', title: 'IT Director', email: 'duc.le@vtpay.vn', phone: '0901234503' },
    ],
  },
  {
    code: 'ZALOPAY', name: 'ZaloPay Technology', industry: 'fintech',
    website: 'https://zalopay.vn', taxCode: '0311234568',
    contacts: [
      { name: 'Phạm Quang Huy', title: 'CEO', email: 'huy.pham@zalopay.vn', phone: '0901234511' },
      { name: 'Ngô Thị Hằng', title: 'Head of Product', email: 'hang.ngo@zalopay.vn', phone: '0901234512' },
    ],
  },
  {
    code: 'VNLIFE', name: 'VNLife Corporation', industry: 'fintech',
    website: 'https://vnlife.vn', taxCode: '0312345679',
    contacts: [
      { name: 'Đinh Văn Sơn', title: 'COO', email: 'son.dinh@vnlife.vn', phone: '0901234521' },
      { name: 'Bùi Thị Thu', title: 'Business Development', email: 'thu.bui@vnlife.vn', phone: '0901234522' },
      { name: 'Võ Minh Khoa', title: 'Technology Lead', email: 'khoa.vo@vnlife.vn', phone: '0901234523' },
    ],
  },
  {
    code: 'TPBANK', name: 'TPBank Digital', industry: 'fintech',
    website: 'https://tpbank.vn', taxCode: '0100686209',
    contacts: [
      { name: 'Nguyễn Hưng Thịnh', title: 'Chief Digital Officer', email: 'thinh.nguyen@tpbank.vn', phone: '0901234531' },
      { name: 'Lê Thị Bích Ngọc', title: 'IT Manager', email: 'ngoc.le@tpbank.vn', phone: '0901234532' },
    ],
  },
  {
    code: 'MBBANK', name: 'MB Bank Technology Center', industry: 'fintech',
    website: 'https://mbbank.com.vn', taxCode: '0100283873',
    contacts: [
      { name: 'Trương Đình Lâm', title: 'CIO', email: 'lam.truong@mbbank.com.vn', phone: '0901234541' },
      { name: 'Đặng Minh Phước', title: 'IT Procurement', email: 'phuoc.dang@mbbank.com.vn', phone: '0901234542' },
      { name: 'Hoàng Thị Yến', title: 'Project Manager', email: 'yen.hoang@mbbank.com.vn', phone: '0901234543' },
    ],
  },
  {
    code: 'KIOTVIET', name: 'KiotViet Technology', industry: 'fintech',
    website: 'https://kiotviet.vn', taxCode: '0312301902',
    contacts: [
      { name: 'Trần Văn Toàn', title: 'CEO', email: 'toan.tran@kiotviet.vn', phone: '0901234781' },
      { name: 'Nguyễn Thị Hoài', title: 'CTO', email: 'hoai.nguyen@kiotviet.vn', phone: '0901234782' },
      { name: 'Bùi Đức Mạnh', title: 'Product Manager', email: 'manh.bui@kiotviet.vn', phone: '0901234783' },
    ],
  },
  {
    code: 'HARAVAN', name: 'Haravan Commerce Platform', industry: 'fintech',
    website: 'https://haravan.com', taxCode: '0314120882',
    contacts: [
      { name: 'Huỳnh Nhật Minh', title: 'CEO', email: 'minh.huynh@haravan.com', phone: '0901234791' },
      { name: 'Đặng Thị Thu Hường', title: 'Head of B2B', email: 'huong.dang@haravan.com', phone: '0901234792' },
    ],
  },
  // ─ Retail ─
  {
    code: 'TGDD', name: 'Thế Giới Di Động', industry: 'retail',
    website: 'https://thegioididong.com', taxCode: '0303609683',
    contacts: [
      { name: 'Lê Anh Minh', title: 'IT Director', email: 'minhanh.le@thegioididong.com', phone: '0901234551' },
      { name: 'Trần Quốc Hùng', title: 'Systems Manager', email: 'hung.tran@thegioididong.com', phone: '0901234552' },
    ],
  },
  {
    code: 'BHX', name: 'Bách Hóa Xanh', industry: 'retail',
    website: 'https://bachhoaxanh.com', taxCode: '0314229800',
    contacts: [
      { name: 'Nguyễn Thị Xuân', title: 'Supply Chain Director', email: 'xuan.nguyen@bachhoaxanh.com', phone: '0901234561' },
      { name: 'Phạm Văn Tùng', title: 'IT Manager', email: 'tung.pham@bachhoaxanh.com', phone: '0901234562' },
      { name: 'Vũ Thị Mỹ Linh', title: 'Operations Lead', email: 'linh.vu@bachhoaxanh.com', phone: '0901234563' },
    ],
  },
  {
    code: 'WINMART', name: 'WinMart Vietnam', industry: 'retail',
    website: 'https://winmart.vn', taxCode: '0301452709',
    contacts: [
      { name: 'Cao Xuân Phong', title: 'CTO', email: 'phong.cao@winmart.vn', phone: '0901234571' },
      { name: 'Đỗ Thị Hải', title: 'ERP Manager', email: 'hai.do@winmart.vn', phone: '0901234572' },
    ],
  },
  {
    code: 'COOPMART', name: 'Co.opmart Chain', industry: 'retail',
    website: 'https://coopmart.com.vn', taxCode: '0301452321',
    contacts: [
      { name: 'Hồ Văn Nam', title: 'IT Director', email: 'nam.ho@coopmart.com.vn', phone: '0901234581' },
      { name: 'Nguyễn Thị Nguyệt', title: 'Procurement Head', email: 'nguyet.nguyen@coopmart.com.vn', phone: '0901234582' },
      { name: 'Lý Trọng Đức', title: 'Digital Transformation Lead', email: 'duc.ly@coopmart.com.vn', phone: '0901234583' },
    ],
  },
  {
    code: 'CIRCLEK', name: 'Circle K Vietnam', industry: 'retail',
    website: 'https://circlek.vn', taxCode: '0312876543',
    contacts: [
      { name: 'Phan Thị Diệu', title: 'Country IT Manager', email: 'dieu.phan@circlek.vn', phone: '0901234591' },
      { name: 'Bùi Quang Thành', title: 'Systems Administrator', email: 'thanh.bui@circlek.vn', phone: '0901234592' },
    ],
  },
  {
    code: 'VCCORP', name: 'VCCorp Technology', industry: 'retail',
    website: 'https://vccorp.vn', taxCode: '0103233502',
    contacts: [
      { name: 'Ngô Minh Hiếu', title: 'CTO', email: 'hieu.ngo@vccorp.vn', phone: '0901234801' },
      { name: 'Vũ Xuân Đông', title: 'IT Director', email: 'dong.vu@vccorp.vn', phone: '0901234802' },
      { name: 'Trần Thị Phúc', title: 'Project Manager', email: 'phuc.tran@vccorp.vn', phone: '0901234803' },
    ],
  },
  {
    code: 'GOTIT', name: 'Got It! Vietnam', industry: 'retail',
    website: 'https://gotit.vn', taxCode: '0314506218',
    contacts: [
      { name: 'Đỗ Tuấn Anh', title: 'CEO', email: 'tuananh.do@gotit.vn', phone: '0901234811' },
      { name: 'Nguyễn Lan Chi', title: 'COO', email: 'chi.nguyen@gotit.vn', phone: '0901234812' },
    ],
  },
  {
    code: 'AHAMOVE', name: 'Ahamove Logistics', industry: 'retail',
    website: 'https://ahamove.com', taxCode: '0313761786',
    contacts: [
      { name: 'Phạm Ngọc Duy', title: 'CEO', email: 'duy.pham@ahamove.com', phone: '0901234821' },
      { name: 'Lê Văn Khải', title: 'CTO', email: 'khai.le@ahamove.com', phone: '0901234822' },
      { name: 'Trần Minh Trí', title: 'Operations IT Lead', email: 'tri.tran@ahamove.com', phone: '0901234823' },
    ],
  },
  {
    code: 'GHN', name: 'Giao Hàng Nhanh', industry: 'retail',
    website: 'https://giaohangnhanh.vn', taxCode: '0107797586',
    contacts: [
      { name: 'Nguyễn Trần Phi Long', title: 'CEO', email: 'long.nguyen@ghn.vn', phone: '0901234831' },
      { name: 'Hoàng Thị Kim Liên', title: 'IT Director', email: 'lien.hoang@ghn.vn', phone: '0901234832' },
    ],
  },
  {
    code: 'SAVILLS', name: 'Savills Vietnam', industry: 'retail',
    website: 'https://savills.com.vn', taxCode: '0310987651',
    contacts: [
      { name: 'Neil MacGregor', title: 'Managing Director', email: 'neil.mac@savills.com.vn', phone: '0901234751' },
      { name: 'Đặng Thị Lan Hương', title: 'IT Manager', email: 'huong.dang@savills.com.vn', phone: '0901234752' },
    ],
  },
  // ─ Manufacturing ─
  {
    code: 'VINATEX', name: 'Vinatex Corporation', industry: 'manufacturing',
    website: 'https://vinatex.com.vn', taxCode: '0100107827',
    contacts: [
      { name: 'Nguyễn Văn Hải', title: 'COO', email: 'hai.nguyen@vinatex.com.vn', phone: '0901234601' },
      { name: 'Trần Thị Kim Oanh', title: 'ERP Project Lead', email: 'oanh.tran@vinatex.com.vn', phone: '0901234602' },
      { name: 'Lê Đức Thắng', title: 'IT Manager', email: 'thang.le@vinatex.com.vn', phone: '0901234603' },
    ],
  },
  {
    code: 'HOAPHAT', name: 'Hòa Phát Group', industry: 'manufacturing',
    website: 'https://hoaphat.com.vn', taxCode: '0200578801',
    contacts: [
      { name: 'Đinh Quốc Toàn', title: 'IT Director', email: 'toan.dinh@hoaphat.com.vn', phone: '0901234611' },
      { name: 'Vũ Thị Hồng', title: 'Systems Manager', email: 'hong.vu@hoaphat.com.vn', phone: '0901234612' },
    ],
  },
  {
    code: 'TRUNGNGUYENCF', name: 'Trung Nguyên Coffee', industry: 'manufacturing',
    website: 'https://trungnguyencoffee.com', taxCode: '0308985743',
    contacts: [
      { name: 'Đặng Lê Nguyên Vũ', title: 'Chairman Office', email: 'office@trungnguyencoffee.com', phone: '0901234621' },
      { name: 'Ngô Thị Bảo Châu', title: 'IT Manager', email: 'chau.ngo@trungnguyencoffee.com', phone: '0901234622' },
      { name: 'Phạm Đức Khải', title: 'Operations Director', email: 'khai.pham@trungnguyencoffee.com', phone: '0901234623' },
    ],
  },
  {
    code: 'VINAMILK', name: 'Vinamilk Technology Division', industry: 'manufacturing',
    website: 'https://vinamilk.com.vn', taxCode: '0300588569',
    contacts: [
      { name: 'Cao Thị Ngọc Dung', title: 'CIO', email: 'dung.cao@vinamilk.com.vn', phone: '0901234631' },
      { name: 'Lâm Quốc Tuấn', title: 'Digital Head', email: 'tuan.lam@vinamilk.com.vn', phone: '0901234632' },
    ],
  },
  {
    code: 'VINACOMIN', name: 'Vinacomin Technology', industry: 'manufacturing',
    website: 'https://vinacomin.vn', taxCode: '0100105866',
    contacts: [
      { name: 'Trịnh Văn Hòa', title: 'IT Director', email: 'hoa.trinh@vinacomin.vn', phone: '0901234641' },
      { name: 'Đỗ Thị Hạnh', title: 'Project Manager', email: 'hanh.do@vinacomin.vn', phone: '0901234642' },
      { name: 'Nguyễn Trung Dũng', title: 'Systems Analyst', email: 'dung.nguyen@vinacomin.vn', phone: '0901234643' },
    ],
  },
  {
    code: 'SAMSUNG_VN', name: 'Samsung HCMC CE Complex', industry: 'manufacturing',
    website: 'https://samsung.com/vn', taxCode: '0312008088',
    contacts: [
      { name: 'Kim Young Jin', title: 'Plant Manager', email: 'youngjin.kim@samsung.com', phone: '0901234771' },
      { name: 'Lê Thị Thanh Tâm', title: 'HR IT Lead', email: 'tamthanh.le@samsung.com', phone: '0901234772' },
    ],
  },
  {
    code: 'ACCENTURE', name: 'Accenture Vietnam', industry: 'manufacturing',
    website: 'https://accenture.com/vn-en', taxCode: '0102877889',
    contacts: [
      { name: 'Nguyễn Huy Hùng', title: 'Managing Director', email: 'huy.nguyen@accenture.com', phone: '0901234761' },
      { name: 'Trần Thị Phương', title: 'IT Sourcing Lead', email: 'phuong.tran@accenture.com', phone: '0901234762' },
      { name: 'Cao Văn Tú', title: 'Technology Head', email: 'tu.cao@accenture.com', phone: '0901234763' },
    ],
  },
  // ─ Healthcare ─
  {
    code: 'VINMEC', name: 'Vinmec International Hospital', industry: 'healthcare',
    website: 'https://vinmec.com', taxCode: '0108322807',
    contacts: [
      { name: 'Nguyễn Thanh Liêm', title: 'Medical Director', email: 'liem.nguyen@vinmec.com', phone: '0901234651' },
      { name: 'Phạm Thị Minh Châu', title: 'IT Director', email: 'chau.pham@vinmec.com', phone: '0901234652' },
    ],
  },
  {
    code: 'MEDLATEC', name: 'Medlatec Healthcare', industry: 'healthcare',
    website: 'https://medlatec.vn', taxCode: '0104212527',
    contacts: [
      { name: 'Vũ Hải Toàn', title: 'CEO', email: 'toan.vu@medlatec.vn', phone: '0901234661' },
      { name: 'Lê Thị Thanh Huyền', title: 'CTO', email: 'huyen.le@medlatec.vn', phone: '0901234662' },
      { name: 'Bùi Văn Tài', title: 'IT Manager', email: 'tai.bui@medlatec.vn', phone: '0901234663' },
    ],
  },
  {
    code: 'DIAG', name: 'Diag Diagnostics Center', industry: 'healthcare',
    website: 'https://diag.vn', taxCode: '0314019820',
    contacts: [
      { name: 'Trần Đức Trí', title: 'COO', email: 'tri.tran@diag.vn', phone: '0901234671' },
      { name: 'Nguyễn Thị Ngân', title: 'Business Director', email: 'ngan.nguyen@diag.vn', phone: '0901234672' },
    ],
  },
  {
    code: 'PHARMACITY', name: 'Pharmacity Chain', industry: 'healthcare',
    website: 'https://pharmacity.vn', taxCode: '0310631116',
    contacts: [
      { name: 'Chris Blank', title: 'CEO', email: 'chris.blank@pharmacity.vn', phone: '0901234681' },
      { name: 'Lê Thị Thu Thảo', title: 'IT Director', email: 'thao.le@pharmacity.vn', phone: '0901234682' },
      { name: 'Hoàng Minh Quân', title: 'Supply Chain IT', email: 'quan.hoang@pharmacity.vn', phone: '0901234683' },
    ],
  },
  {
    code: 'LONGCHAU', name: 'Long Châu Pharmacy Group', industry: 'healthcare',
    website: 'https://nhathuoclongchau.com', taxCode: '0310643406',
    contacts: [
      { name: 'Nguyễn Thị Phương Thảo', title: 'COO', email: 'thao.nguyen@longchau.com', phone: '0901234691' },
      { name: 'Phạm Công Thành', title: 'Digital Manager', email: 'thanh.pham@longchau.com', phone: '0901234692' },
    ],
  },
  // ─ Education ─
  {
    code: 'TOPICA', name: 'Topica EdTech', industry: 'education',
    website: 'https://topica.vn', taxCode: '0103453990',
    contacts: [
      { name: 'Phạm Minh Tuấn', title: 'CEO', email: 'tuan.pham@topica.vn', phone: '0901234701' },
      { name: 'Nguyễn Thị Thúy', title: 'CTO', email: 'thuy.nguyen@topica.vn', phone: '0901234702' },
      { name: 'Đặng Thành Long', title: 'IT Manager', email: 'long.dang@topica.vn', phone: '0901234703' },
    ],
  },
  {
    code: 'HOCMAI', name: 'Hoc Mai Education', industry: 'education',
    website: 'https://hocmai.vn', taxCode: '0101778967',
    contacts: [
      { name: 'Trần Trung Hiếu', title: 'CTO', email: 'hieu.tran@hocmai.vn', phone: '0901234711' },
      { name: 'Vũ Lan Anh', title: 'Product Director', email: 'lananh.vu@hocmai.vn', phone: '0901234712' },
    ],
  },
  {
    code: 'CLEVAI', name: 'Clevai Learning Platform', industry: 'education',
    website: 'https://clevai.vn', taxCode: '0312809811',
    contacts: [
      { name: 'Đỗ Hữu Lộc', title: 'CEO', email: 'loc.do@clevai.vn', phone: '0901234721' },
      { name: 'Ngô Thị Kim Chi', title: 'Head of Engineering', email: 'chi.ngo@clevai.vn', phone: '0901234722' },
      { name: 'Lý Nhật Minh', title: 'Product Manager', email: 'minh.ly@clevai.vn', phone: '0901234723' },
    ],
  },
  {
    code: 'ELSA', name: 'ELSA Speak Vietnam', industry: 'education',
    website: 'https://elsaspeak.com', taxCode: '0311787895',
    contacts: [
      { name: 'Văn Đinh Hiếu', title: 'Country Manager', email: 'hieu.van@elsaspeak.com', phone: '0901234731' },
      { name: 'Bùi Thị Hoa', title: 'B2B Sales Director', email: 'hoa.bui@elsaspeak.com', phone: '0901234732' },
    ],
  },
  {
    code: 'EDUHOME', name: 'EduHome Vietnam', industry: 'education',
    website: 'https://eduhome.com.vn', taxCode: '0313892103',
    contacts: [
      { name: 'Phùng Thị Lan', title: 'CEO', email: 'lan.phung@eduhome.com.vn', phone: '0901234741' },
      { name: 'Trương Minh Khoa', title: 'Technical Director', email: 'khoa.truong@eduhome.com.vn', phone: '0901234742' },
      { name: 'Lê Nhật Hương', title: 'Operations Manager', email: 'huong.le@eduhome.com.vn', phone: '0901234743' },
    ],
  },
  {
    code: 'NANFO', name: 'Nấu Ăn Ngon Platform', industry: 'retail',
    website: 'https://nanfo.vn', taxCode: '0316123450',
    contacts: [
      { name: 'Bùi Thị Mỹ', title: 'CEO', email: 'my.bui@nanfo.vn', phone: '0901234841' },
      { name: 'Lý Minh Quốc', title: 'CTO', email: 'quoc.ly@nanfo.vn', phone: '0901234842' },
    ],
  },
];

const LEAD_TITLES = {
  fintech: [
    'Triển khai hệ thống quản lý giao dịch tài chính',
    'Nâng cấp core banking với ERP tích hợp',
    'Tích hợp API thanh toán đa kênh',
    'Hệ thống báo cáo tuân thủ NHNN',
    'Giải pháp quản lý rủi ro tín dụng',
  ],
  retail: [
    'Triển khai ERP quản lý chuỗi bán lẻ',
    'Tích hợp POS và quản lý kho',
    'Hệ thống loyalty và CRM khách hàng',
    'Digital transformation cho chuỗi siêu thị',
    'Nền tảng quản lý nhà cung cấp B2B',
  ],
  manufacturing: [
    'Hệ thống quản lý sản xuất MES tích hợp',
    'ERP quản lý chuỗi cung ứng toàn diện',
    'Tự động hóa báo cáo chất lượng sản phẩm',
    'Quản lý kho nguyên vật liệu và thành phẩm',
    'Tích hợp IoT với hệ thống ERP',
  ],
  healthcare: [
    'Phần mềm quản lý bệnh viện HIS tích hợp',
    'Hệ thống quản lý hồ sơ bệnh nhân điện tử',
    'Quản lý dược phẩm và vật tư y tế',
    'Nền tảng telemedicine tích hợp ERP',
    'Hệ thống quản lý phòng khám đa chi nhánh',
  ],
  education: [
    'Nền tảng LMS tích hợp quản lý học sinh',
    'Hệ thống quản lý trường học toàn diện',
    'Tích hợp thanh toán học phí và ERP',
    'Portal phụ huynh và báo cáo kết quả học tập',
    'Quản lý giáo viên và lịch giảng dạy',
  ],
};

const INDUSTRIES = Object.keys(LEAD_TITLES);
const LEAD_SOURCES = ['WEBSITE', 'REFERRAL', 'SOCIAL', 'EVENT', 'COLD_OUTREACH', 'OTHER'];

const ACTIVITY_SUBJECTS = {
  CALL: [
    'Gọi điện giới thiệu giải pháp ERP Loop',
    'Follow-up sau buổi demo sản phẩm',
    'Tư vấn package phù hợp với nhu cầu',
    'Xác nhận lịch họp chính thức',
    'Kiểm tra tiến độ triển khai',
    'Gọi điện chăm sóc sau ký hợp đồng',
    'Thảo luận yêu cầu mở rộng thêm module',
  ],
  EMAIL: [
    'Gửi brochure sản phẩm và case study',
    'Gửi proposal triển khai và báo giá',
    'Gửi tài liệu kỹ thuật đặc tả hệ thống',
    'Xác nhận lịch demo theo yêu cầu',
    'Gửi hợp đồng ký kết cho khách hàng',
    'Gửi báo cáo tiến độ triển khai tháng',
    'Gửi thông báo cập nhật tính năng mới',
  ],
  MEETING: [
    'Demo hệ thống tại văn phòng khách hàng',
    'Workshop phân tích yêu cầu nghiệp vụ',
    'Họp kickoff dự án chính thức',
    'Thuyết trình ROI và business case',
    'Review thiết kế hệ thống với team kỹ thuật',
    'Quarterly business review với ban lãnh đạo',
    'Demo module mới theo yêu cầu',
  ],
  SURVEY: [
    'Khảo sát mức độ hài lòng Q1/2026',
    'Đánh giá NPS sau 6 tháng sử dụng',
    'Khảo sát nhu cầu nâng cấp hệ thống',
    'Survey trải nghiệm người dùng cuối',
    'Đánh giá hiệu quả sau triển khai',
  ],
  DEMO: [
    'Demo toàn bộ tính năng ERP cho C-level',
    'Demo module HR và Payroll theo yêu cầu',
    'Demo tích hợp với hệ thống hiện tại',
    'Demo dashboard và báo cáo phân tích',
    'POC (Proof of Concept) với team kỹ thuật',
  ],
};

const ACTIVITY_OUTCOMES = {
  CALL: [
    'Khách hàng quan tâm, yêu cầu gửi proposal.',
    'Đồng ý lịch demo tuần tới.',
    'Cần thêm thời gian cân nhắc ngân sách.',
    'Rất hài lòng với cuộc trao đổi, muốn gặp trực tiếp.',
    'Đang trong giai đoạn đánh giá nhà cung cấp.',
  ],
  EMAIL: [
    'Email đã gửi thành công, đang chờ phản hồi.',
    'Khách hàng xác nhận nhận được, sẽ review trong tuần.',
    'Đã đọc, có một số câu hỏi kỹ thuật cần làm rõ.',
    'Yêu cầu bổ sung thêm case study ngành tương tự.',
    'Chuyển cho bộ phận kỹ thuật review.',
  ],
  MEETING: [
    'Buổi meeting rất hiệu quả. Khách hàng ấn tượng với platform.',
    'Đã xác định được scope dự án, cần báo giá chính xác hơn.',
    'Team kỹ thuật approve giải pháp, chờ approval từ CFO.',
    'Cần thêm demo về module BPM và workflow approval.',
    'Đề xuất triển khai pilot 3 tháng trước khi quyết định.',
  ],
  SURVEY: [
    'NPS: 8/10. Hài lòng với support, muốn thêm tính năng báo cáo.',
    'Satisfaction: 4.2/5. Một số phản hồi về hiệu suất hệ thống.',
    'Rất hài lòng, sẵn sàng giới thiệu cho đối tác.',
    'Cần cải thiện thời gian response của support team.',
    'Hài lòng với tính năng hiện tại, muốn thêm mobile app.',
  ],
  DEMO: [
    'Demo ấn tượng. C-level approve tiếp tục đàm phán.',
    'Team kỹ thuật đánh giá cao khả năng tích hợp API.',
    'Cần customize thêm module báo cáo theo yêu cầu đặc thù.',
    'POC thành công, tiến hành đàm phán thương mại.',
    'Yêu cầu demo thêm một lần với CFO và Procurement team.',
  ],
};

const NEXT_ACTIONS = [
  'Gửi proposal chi tiết và báo giá',
  'Follow-up nếu không nhận phản hồi sau 3 ngày',
  'Lên lịch demo lần 2 với C-level',
  'Chuẩn bị tài liệu kỹ thuật chi tiết',
  'Gửi contract draft để review',
  'Check-in tiến độ triển khai',
  'Gửi case study ngành tương tự',
  'Lên lịch quarterly review',
  'Chuẩn bị báo giá gói upsell',
  'Thảo luận điều khoản hợp đồng',
];

const CONTRACT_TITLES = [
  'Hợp đồng triển khai ERP Phase 1',
  'Hợp đồng dịch vụ SLA 24/7 năm 2026',
  'Hợp đồng phát triển tùy chỉnh module HR',
  'Hợp đồng tích hợp hệ thống thanh toán',
  'Hợp đồng bảo trì và nâng cấp hệ thống',
  'Hợp đồng đào tạo và chuyển giao công nghệ',
  'Hợp đồng triển khai CRM và Marketing Automation',
  'Hợp đồng phát triển mobile app nội bộ',
  'Hợp đồng tư vấn digital transformation',
  'Hợp đồng hỗ trợ kỹ thuật Premium',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await db.connect();
  console.log('Kết nối database thành công.');

  // ── Load existing IDs ──
  const custRows = await db.query(`SELECT id, code FROM customers WHERE deleted_at IS NULL`);
  const existingCodes = new Set(custRows.rows.map(r => r.code));
  const allCustomerIds = custRows.rows.map(r => r.id);

  const userRows = await db.query(`SELECT id, email FROM users ORDER BY email LIMIT 50`);
  const adminId = userRows.rows.find(u => u.email === 'admin@loop.vn')?.id ?? userRows.rows[0].id;
  const cmoId   = userRows.rows.find(u => u.email === 'cmo@loop.vn')?.id   ?? adminId;
  const cooId   = userRows.rows.find(u => u.email === 'coo@loop.vn')?.id   ?? adminId;
  const cfoId   = userRows.rows.find(u => u.email === 'cfo@loop.vn')?.id   ?? adminId;
  const salesUsers = [adminId, cmoId, cooId, cfoId];

  const projectRows = await db.query(`SELECT id FROM projects WHERE deleted_at IS NULL LIMIT 20`);
  const projectIds = projectRows.rows.map(r => r.id);

  // ─── 1. Customers ────────────────────────────────────────────────────────
  console.log('\n[1/7] Tạo Customers và Contacts...');
  let newCustomers = 0, newContacts = 0;

  for (const cust of NEW_CUSTOMERS) {
    if (existingCodes.has(cust.code)) continue;

    const custId = uid();
    await db.query(
      `INSERT INTO customers (id, code, name, industry, website, tax_code, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       ON CONFLICT DO NOTHING`,
      [custId, cust.code, cust.name, cust.industry, cust.website, cust.taxCode],
    );

    // Verify insert happened
    const check = await db.query(`SELECT id FROM customers WHERE code = $1`, [cust.code]);
    if (!check.rows.length) continue;
    const realId = check.rows[0].id;
    if (!allCustomerIds.includes(realId)) allCustomerIds.push(realId);
    newCustomers++;

    for (const c of cust.contacts) {
      await db.query(
        `INSERT INTO contacts (id, name, email, phone, title, customer_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
         ON CONFLICT DO NOTHING`,
        [uid(), c.name, c.email, c.phone, c.title, realId],
      );
      newContacts++;
    }
  }
  console.log(`  → ${newCustomers} customers mới, ${newContacts} contacts mới.`);

  // ─── 2. Deals (50) ───────────────────────────────────────────────────────
  console.log('\n[2/7] Tạo Deals...');
  const dealPlan = [
    { stage: 'QUALIFICATION', count: 10 },
    { stage: 'PROPOSAL',      count: 10 },
    { stage: 'NEGOTIATION',   count: 5  },
    { stage: 'WON',           count: 15 },
    { stage: 'LOST',          count: 10 },
  ];

  const seqRow = await db.query(`SELECT COUNT(*) AS cnt FROM deals`);
  let dealSeq = parseInt(seqRow.rows[0].cnt, 10) + 1;
  const dealIds = [];
  const wonDealIds = [];
  let dealInserted = 0;

  for (const { stage, count } of dealPlan) {
    for (let i = 0; i < count; i++) {
      const dealId = uid();
      const dealCode = `DEAL-2026-${String(dealSeq).padStart(4, '0')}`;
      dealSeq++;

      const custId = pick(allCustomerIds);
      const assigneeId = pick(salesUsers);
      const value = rand(100, 5000) * 1_000_000;
      const probability =
        stage === 'QUALIFICATION' ? rand(20, 40) :
        stage === 'PROPOSAL'      ? rand(40, 60) :
        stage === 'NEGOTIATION'   ? rand(60, 80) :
        stage === 'WON'           ? 100 : 0;

      const expectedCloseDate =
        stage === 'WON'  ? daysAgo(rand(10, 180)) :
        stage === 'LOST' ? daysAgo(rand(5, 90))   :
        daysFromNow(rand(15, 90));

      const wonAt     = stage === 'WON'  ? daysAgo(rand(5, 120)) : null;
      const lostAt    = stage === 'LOST' ? daysAgo(rand(5, 60))  : null;
      const lostReason = stage === 'LOST' ? pick([
        'Giá cao hơn đối thủ', 'Khách hàng chọn giải pháp khác',
        'Ngân sách bị cắt giảm', 'Dự án bị hoãn', 'Yêu cầu kỹ thuật không phù hợp',
      ]) : null;
      const projectId = stage === 'WON' && projectIds.length ? pick(projectIds) : null;

      const industryKey = pick(INDUSTRIES);
      const title = `${pick(LEAD_TITLES[industryKey])} — ${dealCode}`;

      // Check unique constraint (tenantId IS NULL, code)
      const exists = await db.query(
        `SELECT id FROM deals WHERE code = $1 AND tenant_id IS NULL`, [dealCode],
      );
      if (exists.rows.length) { dealIds.push(exists.rows[0].id); continue; }

      await db.query(
        `INSERT INTO deals
          (id, code, title, customer_id, stage, value, currency, probability,
           expected_close_date, assignee_id, won_at, lost_at, lost_reason,
           project_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'VND',$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
        [dealId, dealCode, title, custId, stage, value, probability,
         expectedCloseDate, assigneeId, wonAt, lostAt, lostReason, projectId],
      );
      dealIds.push(dealId);
      if (stage === 'WON') wonDealIds.push(dealId);
      dealInserted++;
    }
  }
  console.log(`  → ${dealInserted} deals tạo thành công.`);

  // ─── 3. Leads (100) ──────────────────────────────────────────────────────
  console.log('\n[3/7] Tạo Leads...');
  const leadPlan = [
    { status: 'NEW',       count: 20 },
    { status: 'CONTACTED', count: 30 },
    { status: 'QUALIFIED', count: 20 },
    { status: 'CONVERTED', count: 20 },
    { status: 'LOST',      count: 10 },
  ];

  const leadIds = [];
  let leadInserted = 0, convertedCount = 0;

  for (const { status, count } of leadPlan) {
    for (let i = 0; i < count; i++) {
      const leadId = uid();
      const industryKey = pick(INDUSTRIES);
      const title = `${pick(LEAD_TITLES[industryKey])} — Prospect ${rand(1000, 9999)}`;
      const source = pick(LEAD_SOURCES);
      const assigneeId = pick(salesUsers);
      const estimatedValue = rand(50, 3000) * 1_000_000;

      let convertedDealId = null, convertedAt = null;
      if (status === 'CONVERTED') {
        const allDealPool = [...wonDealIds, ...dealIds];
        if (convertedCount < 30 && allDealPool.length > 0) {
          convertedDealId = allDealPool[convertedCount % allDealPool.length];
          convertedAt = daysAgo(rand(10, 90));
          convertedCount++;
        }
      }

      const notes =
        status === 'NEW'       ? `Lead tiềm năng từ ${source.toLowerCase()}. Cần contact và qualify.` :
        status === 'CONTACTED' ? `Đã liên hệ lần đầu. ${pick(['Khách hàng quan tâm.', 'Đang cân nhắc.', 'Yêu cầu thêm thông tin.'])}` :
        status === 'QUALIFIED' ? `Lead đủ điều kiện. Budget ~${(estimatedValue/1e6).toFixed(0)}M VND. Timeline: Q${rand(2,4)}/2026.` :
        status === 'CONVERTED' ? 'Lead đã chuyển thành deal. Khách hàng đồng ý tiến hành đàm phán chính thức.' :
        `Lead không đủ điều kiện. ${pick(['Ngân sách quá thấp.', 'Không phải decision maker.', 'Nhu cầu không phù hợp.'])}`;

      await db.query(
        `INSERT INTO leads
          (id, title, source, status, estimated_value, currency, assignee_id,
           notes, converted_deal_id, converted_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'VND',$6,$7,$8,$9,NOW(),NOW())`,
        [leadId, title, source, status, estimatedValue, assigneeId,
         notes, convertedDealId, convertedAt],
      );
      leadIds.push(leadId);
      leadInserted++;
    }
  }
  console.log(`  → ${leadInserted} leads tạo thành công (${convertedCount} converted có dealId).`);

  // ─── 4. CrmActivity (150) ────────────────────────────────────────────────
  console.log('\n[4/7] Tạo CrmActivities...');
  const actPlan = [
    { type: 'CALL',    count: 40 },
    { type: 'EMAIL',   count: 40 },
    { type: 'MEETING', count: 40 },
    { type: 'SURVEY',  count: 20 },
    { type: 'DEMO',    count: 10 },
  ];

  let actInserted = 0, nextActionCount = 0;

  for (const { type, count } of actPlan) {
    const subjects = ACTIVITY_SUBJECTS[type] || ['Hoạt động CRM'];
    const outcomes = ACTIVITY_OUTCOMES[type] || ['Hoàn thành.'];

    for (let i = 0; i < count; i++) {
      const actId = uid();
      const subject = pick(subjects);
      const createdById = pick(salesUsers);
      const isCompleted = Math.random() > 0.3;
      const daysBack = rand(1, 120);
      const scheduledAt = daysAgo(daysBack);
      const completedAt = isCompleted ? scheduledAt : null;
      const customerId = pick(allCustomerIds);
      const dealId = Math.random() > 0.5 && dealIds.length ? pick(dealIds) : null;
      const leadId = Math.random() > 0.6 && leadIds.length ? pick(leadIds) : null;

      const hasNextAction = nextActionCount < 30 && Math.random() > 0.4;
      const nextAction = hasNextAction ? pick(NEXT_ACTIONS) : null;
      const nextActionDueAt = hasNextAction ? daysFromNow(rand(7, 30)) : null;
      if (hasNextAction) nextActionCount++;

      const duration =
        type === 'CALL'                          ? rand(10, 60)   :
        type === 'MEETING' || type === 'DEMO'    ? rand(60, 180)  :
        null;

      await db.query(
        `INSERT INTO crm_activities
          (id, type, subject, content, customer_id, deal_id, lead_id,
           scheduled_at, completed_at, duration, outcome, next_action,
           next_action_due_at, created_by_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())`,
        [actId, type, subject,
         `Chi tiết hoạt động ${type.toLowerCase()} với khách hàng. Người thực hiện đã ghi chép thông tin trao đổi.`,
         customerId, dealId, leadId,
         scheduledAt, completedAt, duration,
         isCompleted ? pick(outcomes) : null,
         nextAction, nextActionDueAt, createdById],
      );
      actInserted++;
    }
  }
  console.log(`  → ${actInserted} activities tạo thành công (${nextActionCount} có nextAction).`);

  // ─── 5. ClientContracts (10) ─────────────────────────────────────────────
  console.log('\n[5/7] Tạo ClientContracts...');
  const contractTypes   = ['SERVICE', 'PRODUCT', 'SUPPORT', 'SLA', 'OTHER'];
  const contractStatuses = ['DRAFT', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'COMPLETED', 'COMPLETED'];
  let contractInserted = 0;

  for (let i = 0; i < 10; i++) {
    const contractNo = `CC-2026-${String(i + 1).padStart(3, '0')}`;
    const exists = await db.query(
      `SELECT id FROM client_contracts WHERE contract_no = $1 AND tenant_id IS NULL`,
      [contractNo],
    );
    if (exists.rows.length) continue;

    const contractId = uid();
    const custId  = allCustomerIds[i % allCustomerIds.length];
    const dealId  = dealIds[i] ?? null;
    const type    = pick(contractTypes);
    const status  = pick(contractStatuses);
    const value   = rand(200, 8000) * 1_000_000;
    const startDate = dateOnly(daysAgo(rand(30, 180)));
    const endDate   = dateOnly(daysFromNow(rand(90, 365)));
    const signedAt  = status !== 'DRAFT' ? dateOnly(daysAgo(rand(20, 100))) : null;

    await db.query(
      `INSERT INTO client_contracts
        (id, contract_no, title, customer_id, deal_id, type, value, currency,
         start_date, end_date, signed_at, status, payment_terms_days, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'VND',$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
      [contractId, contractNo, CONTRACT_TITLES[i], custId, dealId,
       type, value, startDate, endDate, signedAt, status, pick([15,30,45,60]),
       `Hợp đồng ${type.toLowerCase()} giá trị ${(value/1e6).toFixed(0)}M VND.`],
    );

    // Milestones
    const msCount = rand(1, 2);
    for (let m = 0; m < msCount; m++) {
      await db.query(
        `INSERT INTO contract_milestones
          (id, contract_id, name, due_date, amount, status, created_at)
         VALUES ($1,$2,$3,$4,$5,'PENDING',NOW())`,
        [uid(), contractId,
         `Đợt ${m+1}: ${m === 0 ? 'Ký kết và khởi động' : 'Bàn giao hoàn thành'}`,
         dateOnly(daysFromNow(rand(30 + m*60, 90 + m*90))),
         Math.floor(value / msCount)],
      );
    }
    contractInserted++;
  }
  console.log(`  → ${contractInserted} contracts tạo thành công.`);

  // ─── 6. LeadFollowUpSchedules (20) ───────────────────────────────────────
  console.log('\n[6/7] Tạo LeadFollowUpSchedules...');
  const fuStatuses = ['PENDING', 'PENDING', 'DONE', 'SKIPPED'];
  const fuTypes    = ['CALL', 'EMAIL', 'MEETING'];
  const fuNotes    = [
    'Gọi điện kiểm tra nhu cầu và progress',
    'Gửi thông tin mới nhất về sản phẩm',
    'Họp đánh giá tiến độ deal',
    'Follow-up sau demo lần trước',
    'Chăm sóc định kỳ theo lịch',
  ];
  let fuInserted = 0;

  for (let i = 0; i < 20; i++) {
    const status = pick(fuStatuses);
    const useLeadNotDeal = Math.random() > 0.5;
    const leadId = useLeadNotDeal && leadIds[i] ? leadIds[i] : null;
    const dealId = !useLeadNotDeal && dealIds[i] ? dealIds[i] : null;
    const scheduledDate = status === 'DONE'
      ? dateOnly(daysAgo(rand(1, 30)))
      : dateOnly(daysFromNow(rand(1, 45)));

    await db.query(
      `INSERT INTO lead_follow_up_schedules
        (id, lead_id, deal_id, scheduled_date, type, note, status, assignee_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [uid(), leadId, dealId, scheduledDate,
       pick(fuTypes), pick(fuNotes), status, pick(salesUsers)],
    );
    fuInserted++;
  }
  console.log(`  → ${fuInserted} follow-up schedules tạo thành công.`);

  // ─── 7. CustomerSurveySchedules (10) ─────────────────────────────────────
  console.log('\n[7/7] Tạo CustomerSurveySchedules...');
  const svFreqs = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
  let svInserted = 0;

  for (let i = 0; i < 10; i++) {
    const custId = allCustomerIds[i % allCustomerIds.length];
    const freq   = pick(svFreqs);
    const lastSentAt = Math.random() > 0.4 ? daysAgo(rand(30, 120)) : null;
    const nextDueAt  = dateOnly(daysFromNow(
      freq === 'MONTHLY'   ? rand(5, 30)  :
      freq === 'QUARTERLY' ? rand(10, 90) :
      rand(30, 180),
    ));

    await db.query(
      `INSERT INTO customer_survey_schedules
        (id, customer_id, frequency, last_sent_at, next_due_at, template_content,
         assignee_id, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW())`,
      [uid(), custId, freq, lastSentAt, nextDueAt,
       `Bảng khảo sát ${freq.toLowerCase()} — Đánh giá mức độ hài lòng và nhu cầu hỗ trợ.`,
       pick(salesUsers)],
    );
    svInserted++;
  }
  console.log(`  → ${svInserted} survey schedules tạo thành công.`);

  // ─── Summary ─────────────────────────────────────────────────────────────
  const cnt = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM customers        WHERE deleted_at IS NULL) AS customers,
      (SELECT COUNT(*) FROM contacts)                                  AS contacts,
      (SELECT COUNT(*) FROM leads)                                     AS leads,
      (SELECT COUNT(*) FROM deals            WHERE deleted_at IS NULL) AS deals,
      (SELECT COUNT(*) FROM crm_activities)                            AS crm_activities,
      (SELECT COUNT(*) FROM client_contracts)                          AS client_contracts,
      (SELECT COUNT(*) FROM lead_follow_up_schedules)                  AS lead_follow_ups,
      (SELECT COUNT(*) FROM customer_survey_schedules)                 AS customer_surveys
  `);

  const c = cnt.rows[0];
  console.log('\n=== KẾT QUẢ SEED CRM ===');
  console.log(`Customers:              ${c.customers}`);
  console.log(`Contacts:               ${c.contacts}`);
  console.log(`Leads:                  ${c.leads}`);
  console.log(`Deals:                  ${c.deals}`);
  console.log(`CrmActivities:          ${c.crm_activities}`);
  console.log(`ClientContracts:        ${c.client_contracts}`);
  console.log(`LeadFollowUpSchedules:  ${c.lead_follow_ups}`);
  console.log(`CustomerSurveySchedules:${c.customer_surveys}`);
  console.log('=========================\n');

  await db.end();
}

main().catch(e => {
  console.error('Lỗi seed CRM:', e);
  process.exit(1);
});
