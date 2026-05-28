/**
 * seed-full.js — Tạo lại toàn bộ dữ liệu mẫu
 * 100 nhân sự · 10 dự án · 1000 task
 */
const { Client } = require('pg');
const { seedPermissions, seedPermissionDemo } = require('./seed-permissions');
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');

const db = new Client({
  host: 'localhost', port: 5432,
  user: 'loop', password: 'loop_password', database: 'loop_db',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, step = 0.5) {
  const steps = Math.round((max - min) / step);
  return min + Math.round(Math.random() * steps) * step;
}
function dateStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Dữ liệu tên tiếng Việt ──────────────────────────────────────────────────

const HO = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Đặng','Bùi',
            'Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Tô','Trịnh','Cao','Lưu',
            'Hà','Vương','Tạ','Dư','Giang'];

const TEN_DEM_NAM = ['Văn','Hữu','Minh','Đức','Quốc','Công','Trung','Thanh','Anh','Quang',
                     'Thành','Xuân','Tiến','Phúc','Bảo','Gia','Khắc','Ngọc'];
const TEN_DEM_NU  = ['Thị','Ngọc','Thúy','Thu','Mai','Hồng','Kim','Lan','Phương','Diễm',
                     'Khánh','Tuyết','Ánh','Thanh','Mỹ','Bích','Yến'];

const TEN_NAM = ['An','Bình','Cường','Dũng','Đạt','Giang','Hải','Hùng','Khoa','Lâm',
                 'Long','Minh','Nam','Phong','Quân','Sơn','Tài','Thắng','Toàn','Tuấn',
                 'Tùng','Vinh','Vũ','Huy','Khôi','Lực','Mạnh','Nghĩa','Phát','Quý',
                 'Thái','Thiện','Trọng','Tú','Việt','Duy','Hiếu','Linh','Nhân','Trí'];

const TEN_NU  = ['Anh','Chi','Giang','Hà','Hương','Lan','Linh','Mai','Nga','Ngân',
                 'Nhung','Phương','Quỳnh','Tâm','Thảo','Thu','Trang','Vy','Xuân','Yến',
                 'Bảo','Diễm','Hằng','Khánh','Liên','Minh','Nhi','Oanh','Phúc','Thư'];

function genName(gender) {
  const ho = pick(HO);
  if (gender === 'M') return `${ho} ${pick(TEN_DEM_NAM)} ${pick(TEN_NAM)}`;
  return `${ho} ${pick(TEN_DEM_NU)} ${pick(TEN_NU)}`;
}

function nameToEmail(fullName, idx) {
  const parts = fullName.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/đ/g,'d').replace(/[^a-z ]/g,'').trim().split(' ');
  return `${parts[parts.length-1]}.${parts[0]}${idx}@looptech.vn`;
}

function genCCCD() {
  return String(Math.floor(Math.random() * 900000000000) + 100000000000);
}

// ─── Org Units ───────────────────────────────────────────────────────────────

const ORG_UNITS = [
  { code:'ROOT',    name:'Công ty Loop Technology',        parent:null },
  { code:'IT',      name:'Phòng Công nghệ thông tin',      parent:'ROOT' },
  { code:'BE',      name:'Nhóm Phát triển Backend',        parent:'IT' },
  { code:'FE',      name:'Nhóm Phát triển Frontend',       parent:'IT' },
  { code:'MOBILE',  name:'Nhóm Mobile',                    parent:'IT' },
  { code:'DEVOPS',  name:'Nhóm DevOps & Hạ tầng',         parent:'IT' },
  { code:'QA',      name:'Nhóm Kiểm thử QA',              parent:'IT' },
  { code:'DESIGN',  name:'Nhóm Thiết kế UI/UX',           parent:'IT' },
  { code:'PMO',     name:'Phòng Quản lý Dự án',           parent:'ROOT' },
  { code:'BA',      name:'Nhóm Phân tích nghiệp vụ',      parent:'PMO' },
  { code:'BIZ',     name:'Phòng Kinh doanh',               parent:'ROOT' },
  { code:'HR',      name:'Phòng Nhân sự',                  parent:'ROOT' },
  { code:'FIN',     name:'Phòng Tài chính',                parent:'ROOT' },
];

// ─── Tech stacks theo bộ phận ────────────────────────────────────────────────

const TECH = {
  BE:     [['Java','Spring Boot','PostgreSQL','Redis','Docker'],
           ['Node.js','NestJS','MongoDB','RabbitMQ','Kubernetes'],
           ['Go','gRPC','Kafka','PostgreSQL','Docker'],
           ['Python','Django','FastAPI','PostgreSQL','Celery'],
           ['Java','Microservices','Kafka','Redis','AWS']],
  FE:     [['React','TypeScript','Redux','Tailwind CSS','Jest'],
           ['Vue.js','Nuxt.js','Pinia','SCSS','Cypress'],
           ['React','Next.js','GraphQL','Styled Components','Storybook'],
           ['Angular','TypeScript','RxJS','Material UI','Karma'],
           ['React','TypeScript','Zustand','Vite','Playwright']],
  MOBILE: [['React Native','TypeScript','Redux','Expo','Jest'],
           ['Flutter','Dart','Provider','Firebase','GetX'],
           ['iOS','Swift','UIKit','SwiftUI','Combine'],
           ['Android','Kotlin','Jetpack Compose','Room','Hilt'],
           ['React Native','TypeScript','Reanimated','Detox','MobX']],
  DEVOPS: [['Docker','Kubernetes','Jenkins','AWS','Terraform'],
           ['GitLab CI','Docker','GCP','Ansible','Prometheus'],
           ['GitHub Actions','AWS','Terraform','Helm','Grafana'],
           ['ArgoCD','Kubernetes','GCP','Istio','ELK Stack'],
           ['Jenkins','Docker','Azure','Nginx','Zabbix']],
  QA:     [['Selenium','TestNG','JMeter','Postman','JIRA'],
           ['Cypress','Jest','Playwright','k6','Allure'],
           ['Robot Framework','Python','Appium','LoadRunner','Xray'],
           ['Katalon','SoapUI','JMeter','TestRail','Confluence'],
           ['Playwright','TypeScript','k6','Postman','JIRA']],
  DESIGN: [['Figma','Adobe XD','Zeplin','Photoshop','Illustrator'],
           ['Figma','Sketch','InVision','After Effects','Principle'],
           ['Figma','Framer','Webflow','Maze','Hotjar'],
           ['Adobe XD','Figma','Miro','Zeroheight','ProtoPie'],
           ['Figma','FigJam','Notion','Maze','Lottie']],
  BA:     [['BPMN','UML','Jira','Confluence','SQL'],
           ['User Story','Use Case','Wireframe','Balsamiq','Trello'],
           ['Business Analysis','Data Flow Diagram','Agile','Scrum','Miro'],
           ['Requirements Analysis','ERD','Figma','Confluence','Power BI'],
           ['BPMN 2.0','ArchiMate','Jira','Confluence','Visio']],
  BIZ:    [['CRM','Salesforce','Excel','PowerPoint','SQL'],
           ['HubSpot','Tableau','Google Analytics','Excel','JIRA'],
           ['Salesforce','Power BI','SAP','Excel','Confluence']],
  HR:     [['HRMS','Excel','Word','Recruitment','Payroll'],
           ['SAP HR','Excel','Power BI','Recruitment','Onboarding']],
  FIN:    [['SAP FI','Excel','Power BI','Accounting','MISA'],
           ['QuickBooks','Tableau','Excel','Financial Analysis','SQL']],
};

// ─── Phân bổ nhân sự 100 người ───────────────────────────────────────────────

const DIST = [
  { dept:'BE',     count:18, levels:['JUNIOR','JUNIOR','JUNIOR','JUNIOR','MID','MID','MID','MID','MID','SENIOR','SENIOR','SENIOR','SENIOR','EXPERT','EXPERT','EXPERT','MID','SENIOR'] },
  { dept:'FE',     count:18, levels:['JUNIOR','JUNIOR','JUNIOR','JUNIOR','MID','MID','MID','MID','MID','SENIOR','SENIOR','SENIOR','SENIOR','EXPERT','EXPERT','EXPERT','MID','SENIOR'] },
  { dept:'MOBILE', count:10, levels:['JUNIOR','JUNIOR','JUNIOR','MID','MID','MID','MID','SENIOR','SENIOR','EXPERT'] },
  { dept:'DEVOPS', count:8,  levels:['JUNIOR','JUNIOR','MID','MID','MID','SENIOR','SENIOR','EXPERT'] },
  { dept:'QA',     count:12, levels:['JUNIOR','JUNIOR','JUNIOR','JUNIOR','MID','MID','MID','MID','SENIOR','SENIOR','SENIOR','EXPERT'] },
  { dept:'DESIGN', count:10, levels:['JUNIOR','JUNIOR','JUNIOR','MID','MID','MID','MID','SENIOR','SENIOR','EXPERT'] },
  { dept:'BA',     count:10, levels:['JUNIOR','JUNIOR','MID','MID','MID','MID','SENIOR','SENIOR','SENIOR','EXPERT'] },
  { dept:'BIZ',    count:7,  levels:['JUNIOR','JUNIOR','MID','MID','SENIOR','SENIOR','EXPERT'] },
  { dept:'HR',     count:4,  levels:['JUNIOR','MID','SENIOR','EXPERT'] },
  { dept:'FIN',    count:3,  levels:['JUNIOR','MID','SENIOR'] },
];

// ─── 10 Dự án ────────────────────────────────────────────────────────────────

const PROJECTS_DEF = [
  {
    code:'HMS01', name:'Hệ thống quản lý bệnh viện', type:'OSDC', status:'ACTIVE',
    customer:'Bệnh viện Đa khoa Trung ương', budget:24,
    start:'2025-01-15', end:'2026-06-30',
    tags:['BE','FE','MOBILE','QA','BA','DEVOPS'],
    taskTopics: [
      ['Phân tích yêu cầu hệ thống','Thiết kế kiến trúc tổng thể','Thiết lập môi trường dev'],
      ['Module đăng ký bệnh nhân','Module đặt lịch khám','Module hồ sơ bệnh án điện tử','Module kê đơn thuốc','Module thanh toán viện phí'],
      ['API quản lý bác sĩ','API quản lý phòng khám','API thống kê báo cáo','API tích hợp BHYT','API thông báo SMS'],
      ['Màn hình tiếp nhận bệnh nhân','Màn hình lịch khám','Dashboard báo cáo','App mobile bệnh nhân','Màn hình quản lý giường bệnh'],
      ['Kiểm thử API hệ thống','Kiểm thử hiệu năng','Kiểm thử bảo mật','UAT với khách hàng','Fix bug sau UAT'],
      ['Triển khai môi trường staging','Cấu hình server production','Go-live hệ thống','Đào tạo người dùng','Hỗ trợ vận hành sau go-live'],
    ]
  },
  {
    code:'ECO02', name:'Sàn thương mại điện tử MegaShop', type:'OSDC', status:'ACTIVE',
    customer:'Tập đoàn MegaCorp Vietnam', budget:36,
    start:'2025-03-01', end:'2026-09-30',
    tags:['BE','FE','MOBILE','QA','BA','DEVOPS','DESIGN'],
    taskTopics: [
      ['Phân tích nghiệp vụ thương mại điện tử','Thiết kế hệ thống microservices','Thiết kế UI/UX sàn mua sắm'],
      ['Service quản lý sản phẩm','Service giỏ hàng & đặt hàng','Service thanh toán đa phương thức','Service vận chuyển & giao hàng','Service đánh giá & review'],
      ['Tích hợp cổng thanh toán VNPay','Tích hợp Momo & ZaloPay','Tích hợp GHN & Giao hàng tiết kiệm','Module quản lý kho hàng','Module khuyến mãi & voucher'],
      ['Trang chủ sàn thương mại','Trang chi tiết sản phẩm','Trang giỏ hàng & checkout','App mobile mua sắm','Trang quản trị seller'],
      ['Kiểm thử luồng mua hàng end-to-end','Kiểm thử thanh toán','Load test 10.000 concurrent users','Security audit','Kiểm thử app mobile'],
      ['Setup CDN & cache layer','Cấu hình Kubernetes cluster','Monitoring & alerting','Performance tuning','Triển khai production'],
    ]
  },
  {
    code:'PAY03', name:'Cổng thanh toán LoopPay', type:'PKG', status:'ACTIVE',
    customer:'FinTech Solutions JSC', budget:18,
    start:'2025-02-01', end:'2026-03-31',
    tags:['BE','QA','BA','DEVOPS'],
    taskTopics: [
      ['Phân tích yêu cầu cổng thanh toán','Thiết kế kiến trúc bảo mật PCI-DSS','Thiết kế API chuẩn RESTful'],
      ['Core payment processing engine','Module xác thực 2FA','Module quản lý merchant','Module reconciliation & settlement','Module phát hiện gian lận'],
      ['SDK tích hợp cho merchant','API docs & sandbox environment','Webhook notification system','Admin dashboard thanh toán','Báo cáo giao dịch real-time'],
      ['Kiểm thử bảo mật penetration test','Kiểm thử stress test 100k TPS','PCI-DSS compliance audit','Kiểm thử tích hợp với các ngân hàng','UAT với merchant thực tế'],
      ['Triển khai HA với 99.99% uptime','Setup disaster recovery','Cấu hình WAF & DDoS protection','Go-live và monitoring','Tài liệu kỹ thuật cho merchant'],
    ]
  },
  {
    code:'ERP04', name:'Hệ thống ERP sản xuất SmartFactory', type:'OSDC', status:'ACTIVE',
    customer:'Công ty CP Sản xuất Việt Tiến', budget:30,
    start:'2024-10-01', end:'2026-04-30',
    tags:['BE','FE','QA','BA','DEVOPS'],
    taskTopics: [
      ['Khảo sát quy trình sản xuất','Phân tích nghiệp vụ ERP','Thiết kế database tổng thể','Thiết kế kiến trúc hệ thống'],
      ['Module quản lý nguyên vật liệu','Module kế hoạch sản xuất MRP','Module quản lý máy móc thiết bị','Module kiểm soát chất lượng QC','Module quản lý kho thành phẩm'],
      ['Module kế toán tài chính','Module nhân sự & chấm công','Module mua hàng & nhà cung cấp','Module bán hàng & CRM','Dashboard báo cáo quản trị'],
      ['Tích hợp máy quét mã vạch','Tích hợp cân điện tử','API sync với hệ thống ERP cũ','Module báo cáo BI','Module cảnh báo tồn kho'],
      ['Kiểm thử nghiệm thu module','Kiểm thử tích hợp toàn hệ thống','UAT với người dùng nhà máy','Đào tạo vận hành ERP','Go-live và hỗ trợ'],
    ]
  },
  {
    code:'HLT05', name:'App chăm sóc sức khỏe HealthOn', type:'OSDC', status:'ACTIVE',
    customer:'HealthCare Digital Vietnam', budget:20,
    start:'2025-04-01', end:'2026-07-31',
    tags:['BE','FE','MOBILE','QA','BA','DESIGN'],
    taskTopics: [
      ['Nghiên cứu thị trường & người dùng','Thiết kế UX/UI app sức khỏe','Phân tích yêu cầu hệ thống'],
      ['Module theo dõi sức khỏe cá nhân','Module tư vấn bác sĩ trực tuyến','Module quản lý đơn thuốc','Module nhắc nhở uống thuốc','Module kết nối thiết bị wearable'],
      ['Backend API quản lý user health data','Tích hợp Apple Health & Google Fit','AI recommendation engine','Push notification system','Module thanh toán telemedicine'],
      ['App iOS theo dõi sức khỏe','App Android chăm sóc sức khỏe','Web portal cho bác sĩ','Dashboard quản trị hệ thống','Landing page & marketing site'],
      ['Kiểm thử tính năng theo dõi','Kiểm thử telemedicine flow','Security audit dữ liệu y tế','UAT với bác sĩ và bệnh nhân','Fix bug & polish UI'],
    ]
  },
  {
    code:'EDU06', name:'Platform học trực tuyến EduLoop', type:'PKG', status:'PLANNING',
    customer:'EduTech Vietnam Consortium', budget:15,
    start:'2026-01-01', end:'2027-06-30',
    tags:['BE','FE','MOBILE','QA','BA','DESIGN'],
    taskTopics: [
      ['Phân tích thị trường e-learning','Thiết kế product roadmap','Thiết kế UX/UI platform học','Phân tích yêu cầu kỹ thuật'],
      ['Kiến trúc hệ thống microservices','Module quản lý khóa học','Module video streaming','Module bài tập & quiz','Module certificate'],
      ['Module thanh toán subscription','Module live class & webinar','Module forum & discussion','Mobile app cho học viên','Instructor dashboard'],
      ['Tích hợp Zoom SDK cho live class','CDN cho video content','Tích hợp payment gateway','Analytics & learning insights','Gamification system'],
      ['PoC kiến trúc hệ thống','Prototype tính năng core','Đánh giá công nghệ video streaming','Lập kế hoạch sprint chi tiết'],
    ]
  },
  {
    code:'WMS07', name:'Hệ thống quản lý kho LogiSmart', type:'PKG', status:'ACTIVE',
    customer:'Logistics Pro Vietnam', budget:12,
    start:'2025-06-01', end:'2026-05-31',
    tags:['BE','FE','MOBILE','QA','BA'],
    taskTopics: [
      ['Phân tích quy trình kho hàng','Thiết kế database quản lý kho','Thiết kế UI/UX WMS'],
      ['Module nhập kho & kiểm hàng','Module xuất kho & đóng gói','Module quản lý vị trí kho','Module kiểm kê định kỳ','Module quản lý nhà cung cấp'],
      ['Tích hợp barcode scanner','Tích hợp RFID system','API kết nối ERP khách hàng','Mobile app cho nhân viên kho','Dashboard báo cáo tồn kho'],
      ['Kiểm thử luồng nhập xuất kho','Kiểm thử tích hợp thiết bị','UAT tại kho thực tế','Performance test với data lớn','Go-live tại 3 kho thí điểm'],
    ]
  },
  {
    code:'RIDE08', name:'App đặt xe RideFast', type:'OSDC', status:'ON_HOLD',
    customer:'Urban Mobility Vietnam', budget:28,
    start:'2024-08-01', end:'2026-08-31',
    tags:['BE','FE','MOBILE','QA','BA','DEVOPS','DESIGN'],
    taskTopics: [
      ['Phân tích nghiệp vụ đặt xe','Thiết kế kiến trúc real-time system','Thiết kế UX/UI app đặt xe'],
      ['Real-time matching algorithm','Module quản lý tài xế','Module theo dõi hành trình GPS','Module thanh toán & ví điện tử','Module rating & feedback'],
      ['App mobile cho hành khách iOS','App mobile cho hành khách Android','App tài xế iOS','App tài xế Android','Web admin dashboard'],
      ['Backend API real-time','WebSocket cho tracking','Tích hợp bản đồ Google Maps','Module surge pricing','Notification system'],
      ['Kiểm thử matching algorithm','Kiểm thử real-time tracking','Load test concurrent users','Security audit','UAT với tài xế thực tế'],
    ]
  },
  {
    code:'BI09', name:'Dashboard phân tích dữ liệu DataInsight', type:'PKG', status:'ACTIVE',
    customer:'Data Analytics Corp', budget:10,
    start:'2025-05-01', end:'2026-02-28',
    tags:['BE','FE','QA','BA','DEVOPS'],
    taskTopics: [
      ['Thu thập yêu cầu báo cáo','Thiết kế data warehouse','Thiết kế dashboard UX'],
      ['ETL pipeline từ các nguồn dữ liệu','Data warehouse PostgreSQL','API cung cấp dữ liệu','Module báo cáo tùy chỉnh','Scheduled report & alert'],
      ['Dashboard tổng quan KPI','Biểu đồ phân tích xu hướng','Report export PDF/Excel','Self-service BI cho non-tech','Mobile responsive dashboard'],
      ['Tích hợp nguồn dữ liệu CRM','Tích hợp nguồn dữ liệu ERP','Data quality & validation','Performance optimization query','Kiểm thử độ chính xác dữ liệu'],
    ]
  },
  {
    code:'CRM10', name:'Hệ thống CRM doanh nghiệp SalesPro', type:'OSDC', status:'ACTIVE',
    customer:'VinaSales Corporation', budget:16,
    start:'2025-02-15', end:'2026-08-31',
    tags:['BE','FE','QA','BA','DESIGN'],
    taskTopics: [
      ['Khảo sát quy trình bán hàng','Phân tích yêu cầu CRM','Thiết kế UI/UX CRM'],
      ['Module quản lý khách hàng','Module quản lý cơ hội bán hàng','Module quản lý hợp đồng','Module chăm sóc sau bán','Module báo cáo doanh thu'],
      ['Pipeline quản lý deal','Email marketing integration','Tích hợp tổng đài call center','API sync với kế toán','Mobile CRM cho sales'],
      ['Dashboard KPI kinh doanh','Báo cáo hiệu suất sales','Forecast doanh thu','Quản lý chiến dịch marketing','Chăm sóc khách hàng omnichannel'],
      ['Kiểm thử nghiệm thu CRM','UAT với team sales','Đào tạo người dùng','Go-live từng phase','Hỗ trợ và tối ưu sau go-live'],
    ]
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await db.connect();
  console.log('✅ Kết nối DB thành công');

  // ── 1. Xóa dữ liệu cũ ────────────────────────────────────────────────────
  console.log('🗑️  Xóa dữ liệu cũ...');
  await db.query(`
    TRUNCATE time_logs, notifications, push_tokens, tasks, allocations,
             employee_rates, employees, projects, users, org_units
    RESTART IDENTITY CASCADE
  `);
  console.log('✅ Đã xóa toàn bộ data cũ');

  // ── 2. Tạo Org Units ──────────────────────────────────────────────────────
  console.log('🏢 Tạo cơ cấu tổ chức...');
  const orgIds = {};
  for (const u of ORG_UNITS) {
    const id = randomUUID();
    orgIds[u.code] = id;
    const parentId = u.parent ? orgIds[u.parent] : null;
    await db.query(
      `INSERT INTO org_units(id, name, code, parent_id, level, created_at, updated_at)
       VALUES($1,$2,$3,$4,$5,NOW(),NOW())`,
      [id, u.name, u.code, parentId, parentId ? 1 : 0]
    );
  }
  console.log(`✅ Tạo ${ORG_UNITS.length} đơn vị tổ chức`);

  // ── 3. Tạo Admin user ─────────────────────────────────────────────────────
  console.log('👤 Tạo tài khoản...');
  const SALT = 12;
  const adminHash = await bcrypt.hash('Admin@123', SALT);
  const adminId = randomUUID();
  await db.query(
    `INSERT INTO users(id,email,password_hash,name,role,org_unit_id,is_active,created_at,updated_at)
     VALUES($1,$2,$3,$4,'ADMIN',$5,true,NOW(),NOW())`,
    [adminId, 'admin@looptech.vn', adminHash, 'Nguyễn Quản Trị', orgIds['ROOT']]
  );

  // ── 4. Tạo 100 Nhân sự + User ─────────────────────────────────────────────
  console.log('👥 Tạo 100 nhân sự...');
  const employees = [];
  let empIdx = 1;
  const genders = ['M','M','M','F','F','M','F','M','M','F']; // ~60% nam

  for (const { dept, count, levels } of DIST) {
    for (let i = 0; i < count; i++) {
      const gender = genders[(empIdx - 1) % genders.length];
      const fullName = genName(gender);
      const code = `EMP${String(empIdx).padStart(3,'0')}`;
      const level = levels[i];
      const orgUnitId = orgIds[dept];
      const email = nameToEmail(fullName, empIdx);
      const cccd = genCCCD();

      // Birth date dựa theo level
      const birthYear = { JUNIOR: rand(1998,2002), MID: rand(1993,1997),
                           SENIOR: rand(1988,1992), EXPERT: rand(1983,1987) }[level];
      const birthdate = dateStr(birthYear, rand(1,12), rand(1,28));

      // Start date - senior/expert vào sớm hơn
      const yearsExp = { JUNIOR: rand(0,2), MID: rand(2,5), SENIOR: rand(5,9), EXPERT: rand(9,15) }[level];
      const startYear = 2025 - yearsExp;
      const startDate = dateStr(startYear, rand(1,12), rand(1,28));

      // CCCD issue date
      const cccdIssueDate = dateStr(rand(birthYear+18, 2024), rand(1,12), rand(1,28));
      const cccdIssuePlaces = ['Cục Cảnh sát QLHC về TTXH','Công an TP Hà Nội','Công an TP HCM',
                               'Công an TP Đà Nẵng','Công an TP Cần Thơ','Công an tỉnh Bình Dương'];

      // Rate per day
      const rates = { JUNIOR: rand(300,500), MID: rand(500,800),
                      SENIOR: rand(800,1200), EXPERT: rand(1200,2000) };
      const ratePerDay = rates[level] * 1000;

      // Tech stack
      const techArr = TECH[dept] || TECH.BA;
      const techStack = pick(techArr);

      // Tạo user account
      const userId = randomUUID();
      const pwHash = await bcrypt.hash('Loop@2025', SALT);
      const role = (dept === 'BA' || dept === 'PMO') ? 'PM' : 'MEMBER';
      await db.query(
        `INSERT INTO users(id,email,password_hash,name,role,org_unit_id,is_active,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,true,NOW(),NOW())`,
        [userId, email, pwHash, fullName, role, orgUnitId]
      );

      // Tạo employee
      const empId = randomUUID();
      await db.query(
        `INSERT INTO employees(id,code,user_id,org_unit_id,full_name,birthdate,tech_stack,
          level,start_date,email,cccd,cccd_issue_date,cccd_issue_place,is_active,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,NOW(),NOW())`,
        [empId, code, userId, orgUnitId, fullName,
         birthdate, techStack, level, startDate,
         email, cccd, cccdIssueDate, pick(cccdIssuePlaces)]
      );

      // Rate lương
      const rateId = randomUUID();
      await db.query(
        `INSERT INTO employee_rates(id,employee_id,rate_per_day,currency,effective_date,created_at)
         VALUES($1,$2,$3,'VND',$4,NOW())`,
        [rateId, empId, ratePerDay, startDate]
      );

      employees.push({ id: empId, userId, code, fullName, level, dept, orgUnitId, email });
      empIdx++;
    }
  }
  console.log(`✅ Tạo ${employees.length} nhân sự`);

  // ── 5. Chọn PM cho từng dự án ─────────────────────────────────────────────
  // Lấy các user có role PM hoặc SENIOR/EXPERT để làm PM
  const pmCandidates = employees.filter(e =>
    ['BA','PMO','BE','FE'].includes(e.dept) && ['SENIOR','EXPERT'].includes(e.level)
  );

  // ── 6. Tạo 10 Dự án + Allocation ─────────────────────────────────────────
  console.log('📁 Tạo dự án và phân bổ nhân sự...');
  const projects = [];

  for (const pDef of PROJECTS_DEF) {
    const pm = pmCandidates[projects.length % pmCandidates.length];
    const projId = randomUUID();

    // Cập nhật PM thành LEADERSHIP nếu chưa
    await db.query(`UPDATE users SET role='PM' WHERE id=$1`, [pm.userId]);

    await db.query(
      `INSERT INTO projects(id,name,code,type,status,pm_id,org_unit_id,start_date,end_date,
        budget_effort_mm,currency,description,progress,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'VND',$11,0,NOW(),NOW())`,
      [projId, pDef.name, pDef.code, pDef.type, pDef.status, pm.userId,
       orgIds['PMO'], pDef.start, pDef.end, pDef.budget,
       `Dự án ${pDef.name} cho khách hàng ${pDef.customer}`]
    );

    // Chọn thành viên dự án theo tags
    const eligible = employees.filter(e => pDef.tags.includes(e.dept));
    const memberCount = Math.min(rand(8, 15), eligible.length);
    const shuffled = [...eligible].sort(() => Math.random() - 0.5).slice(0, memberCount);

    // Thêm PM vào team nếu chưa có
    if (!shuffled.find(m => m.id === pm.id)) shuffled.push(pm);

    for (const member of shuffled) {
      const roles = { BE:'Backend Developer', FE:'Frontend Developer', MOBILE:'Mobile Developer',
                      DEVOPS:'DevOps Engineer', QA:'QA Engineer', DESIGN:'UI/UX Designer',
                      BA:'Business Analyst', PMO:'Project Manager', BIZ:'Sales', HR:'HR', FIN:'Finance' };
      const allocId = randomUUID();
      const allocPct = member.id === pm.id ? 100 : pick([50,60,70,80,100]);
      const rateDay = { JUNIOR:400000, MID:650000, SENIOR:1000000, EXPERT:1600000 }[member.level];
      await db.query(
        `INSERT INTO allocations(id,project_id,employee_id,role,level,allocation_pct,
          rate_per_day,start_date,end_date,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [allocId, projId, member.id, roles[member.dept] || 'Member',
         member.level, allocPct, rateDay, pDef.start, pDef.end]
      );
    }

    projects.push({ ...pDef, id: projId, pm, members: shuffled });
  }
  console.log(`✅ Tạo ${projects.length} dự án`);

  // ── 7. Tạo 1000 Task ──────────────────────────────────────────────────────
  console.log('📋 Tạo 1000 task...');
  let totalTasks = 0;
  const allTaskIds = []; // để tạo time logs

  for (const proj of projects) {
    const targetCount = Math.round(1000 / 10); // ~100 task / dự án
    const topicGroups = proj.taskTopics;
    const projMembers = proj.members;

    // Status weights theo project status
    const statusWeights = {
      ACTIVE:   {TODO:0.25, IN_PROGRESS:0.25, DONE:0.25, PENDING_APPROVAL:0.10, RETURNED:0.05, CANCELLED:0.10},
      PLANNING: {TODO:0.60, IN_PROGRESS:0.15, DONE:0.05, PENDING_APPROVAL:0.10, RETURNED:0.05, CANCELLED:0.05},
      ON_HOLD:  {TODO:0.15, IN_PROGRESS:0.10, DONE:0.35, PENDING_APPROVAL:0.05, RETURNED:0.05, CANCELLED:0.30},
      CLOSED:   {TODO:0.02, IN_PROGRESS:0.03, DONE:0.65, PENDING_APPROVAL:0.05, RETURNED:0.05, CANCELLED:0.20},
    };
    const sw = statusWeights[proj.status] || statusWeights.ACTIVE;

    function pickStatus() {
      const r = Math.random();
      let cum = 0;
      for (const [s, w] of Object.entries(sw)) {
        cum += w;
        if (r < cum) return s;
      }
      return 'TODO';
    }

    const rootTasks = [];

    // Tạo root tasks từ topic groups
    for (const group of topicGroups) {
      for (const title of group) {
        const status = pickStatus();
        const progress = status === 'DONE' ? 100
          : status === 'IN_PROGRESS' ? rand(20, 80)
          : status === 'CANCELLED' ? 0
          : status === 'RETURNED' ? rand(10, 50)
          : 0;
        const estimate = randFloat(4, 40, 0.5);
        const actual = status === 'DONE' ? randFloat(estimate * 0.8, estimate * 1.3, 0.5)
          : status === 'IN_PROGRESS' ? randFloat(estimate * 0.1, estimate * 0.9, 0.5)
          : 0;
        const assignee = progress > 0 ? pick(projMembers) : (Math.random() > 0.3 ? pick(projMembers) : null);
        const taskStart = addDays(proj.start, rand(0, 60));
        const dueDate = addDays(taskStart, rand(7, 60));

        const taskId = randomUUID();
        await db.query(
          `INSERT INTO tasks(id,project_id,parent_id,level,title,status,progress,
            estimate_hours,actual_hours,assignee_id,start_date,due_date,position,created_at,updated_at)
           VALUES($1,$2,NULL,1,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
          [taskId, proj.id, title, status, progress, estimate, actual,
           assignee?.id || null, taskStart, dueDate, rootTasks.length]
        );
        rootTasks.push({ id: taskId, status, estimate, actual: actual, title, assignee });
        totalTasks++;

        if (status === 'DONE' || (status === 'IN_PROGRESS' && actual > 0)) {
          allTaskIds.push({ taskId, actual, assignee: assignee?.userId, projStart: proj.start });
        }
      }
    }

    // Tạo subtasks để đủ ~100 task / dự án
    const needed = targetCount - rootTasks.length;
    let added = 0;

    for (const rootTask of rootTasks) {
      if (added >= needed) break;
      const subCount = rand(2, 6);
      for (let s = 0; s < subCount && added < needed; s++) {
        const subTitles = [
          `Phân tích chi tiết: ${rootTask.title}`,
          `Thiết kế giải pháp: ${rootTask.title}`,
          `Implement backend: ${rootTask.title}`,
          `Implement frontend: ${rootTask.title}`,
          `Viết unit test: ${rootTask.title}`,
          `Code review: ${rootTask.title}`,
          `Deploy & kiểm thử: ${rootTask.title}`,
          `Viết tài liệu: ${rootTask.title}`,
        ];
        const subTitle = subTitles[s % subTitles.length];
        const status = pickStatus();
        const progress = status === 'DONE' ? 100
          : status === 'IN_PROGRESS' ? rand(20, 80)
          : 0;
        const estimate = randFloat(1, 16, 0.5);
        const actual = status === 'DONE' ? randFloat(estimate * 0.7, estimate * 1.2, 0.5)
          : status === 'IN_PROGRESS' ? randFloat(estimate * 0.1, estimate * 0.7, 0.5)
          : 0;
        const assignee = pick(projMembers);
        const taskStart = addDays(proj.start, rand(7, 90));
        const dueDate = addDays(taskStart, rand(3, 21));

        const subId = randomUUID();
        await db.query(
          `INSERT INTO tasks(id,project_id,parent_id,level,title,status,progress,
            estimate_hours,actual_hours,assignee_id,start_date,due_date,position,created_at,updated_at)
           VALUES($1,$2,$3,2,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
          [subId, proj.id, rootTask.id, subTitle, status, progress, estimate, actual,
           assignee.id, taskStart, dueDate, s]
        );
        totalTasks++;
        added++;

        if (status === 'DONE' || (status === 'IN_PROGRESS' && actual > 0)) {
          allTaskIds.push({ taskId: subId, actual, assignee: assignee.userId, projStart: proj.start });
        }

        // Level 3 (20% chance)
        if (Math.random() < 0.2 && added < needed) {
          const l3Title = `Xử lý edge case: ${subTitle.split(':')[0]}`;
          const l3Status = pickStatus();
          const l3Est = randFloat(0.5, 8, 0.5);
          const l3Act = l3Status === 'DONE' ? randFloat(l3Est * 0.8, l3Est * 1.2, 0.5) : 0;
          const l3Assignee = pick(projMembers);
          const l3Id = randomUUID();
          const l3Start = addDays(proj.start, rand(14, 120));
          await db.query(
            `INSERT INTO tasks(id,project_id,parent_id,level,title,status,progress,
              estimate_hours,actual_hours,assignee_id,start_date,due_date,position,created_at,updated_at)
             VALUES($1,$2,$3,3,$4,$5,$6,$7,$8,$9,$10,$11,0,NOW(),NOW())`,
            [l3Id, proj.id, subId, l3Title, l3Status,
             l3Status === 'DONE' ? 100 : l3Status === 'IN_PROGRESS' ? rand(20,70) : 0,
             l3Est, l3Act, l3Assignee.id, l3Start, addDays(l3Start, rand(2,14))]
          );
          totalTasks++;
          added++;
          if (l3Status === 'DONE' && l3Act > 0) {
            allTaskIds.push({ taskId: l3Id, actual: l3Act, assignee: l3Assignee.userId, projStart: proj.start });
          }
        }
      }
    }
    console.log(`  📌 ${proj.code}: ${rootTasks.length} root + ${added} subtask = ${rootTasks.length + added} task`);
  }
  console.log(`✅ Tổng cộng ${totalTasks} task`);

  // ── 8. Tạo Time Logs ──────────────────────────────────────────────────────
  console.log('⏱️  Tạo time logs...');
  let logCount = 0;
  for (const { taskId, actual, assignee, projStart } of allTaskIds) {
    if (!assignee || actual <= 0) continue;
    // Chia thành 1-3 log entries
    const logEntries = rand(1, Math.min(3, Math.ceil(actual)));
    let remaining = actual;
    for (let l = 0; l < logEntries; l++) {
      const hours = l === logEntries - 1 ? remaining : randFloat(0.5, remaining / (logEntries - l), 0.5);
      remaining = Math.max(0, remaining - hours);
      if (hours <= 0) break;
      const logDate = addDays(projStart, rand(5, 180));
      await db.query(
        `INSERT INTO time_logs(id,task_id,user_id,hours,log_date,note,created_at)
         VALUES($1,$2,$3,$4,$5,$6,NOW())`,
        [randomUUID(), taskId, assignee, hours, logDate,
         pick(['Làm theo plan','Hoàn thành feature','Fix bug phát sinh','Review và chỉnh sửa','Hỗ trợ team member',null,null])]
      );
      logCount++;
    }
  }
  console.log(`✅ Tạo ${logCount} time logs`);

  // ── 9. Cập nhật project progress ──────────────────────────────────────────
  console.log('📊 Tính toán tiến độ dự án...');
  for (const proj of projects) {
    const res = await db.query(
      `SELECT COALESCE(AVG(progress),0) as avg_progress FROM tasks WHERE project_id=$1`,
      [proj.id]
    );
    const avg = Math.round(res.rows[0].avg_progress);
    await db.query(`UPDATE projects SET progress=$1 WHERE id=$2`, [avg, proj.id]);
  }

  // ── Tổng kết ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('🎉 SEED HOÀN THÀNH!');
  const counts = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM org_units) as org_units,
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM employees) as employees,
      (SELECT COUNT(*) FROM projects) as projects,
      (SELECT COUNT(*) FROM allocations) as allocations,
      (SELECT COUNT(*) FROM tasks) as tasks,
      (SELECT COUNT(*) FROM time_logs) as time_logs
  `);
  const c = counts.rows[0];
  console.log(`  📦 Đơn vị tổ chức : ${c.org_units}`);
  console.log(`  👤 Tài khoản       : ${c.users}`);
  console.log(`  👥 Nhân sự         : ${c.employees}`);
  console.log(`  📁 Dự án           : ${c.projects}`);
  console.log(`  🔗 Phân bổ         : ${c.allocations}`);
  console.log(`  📋 Task            : ${c.tasks}`);
  console.log(`  ⏱️  Time logs       : ${c.time_logs}`);
  console.log(`\n  🔑 Admin: admin@looptech.vn / Admin@123`);
  console.log(`  🔑 Nhân sự: <email>@looptech.vn / Loop@2025`);
  console.log('═══════════════════════════════════════');

  console.log('\nSeeding permissions...');
  await seedPermissions(db);
  console.log('\nSeeding permission demo data...');
  await seedPermissionDemo(db);

  await db.end();
}

main().catch(e => { console.error('❌ Lỗi:', e.message); process.exit(1); });
