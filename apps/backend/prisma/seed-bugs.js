/**
 * Seed 100 dữ liệu demo cho Bug & Issues module
 * Chạy: node prisma/seed-bugs.js
 */
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const db = new Client({
  host: 'localhost', port: 5432,
  user: 'loop', password: 'loop_password', database: 'loop_db',
});

const daysAgo  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
const daysFrom = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

async function main() {
  await db.connect();
  console.log('🐛 Seeding 100 Bug & Issues records...\n');

  // ── Tham chiếu ──────────────────────────────────────────────────────────────
  const { rows: [admin] } = await db.query(`SELECT id FROM users WHERE email = 'admin@loop.vn'`);
  if (!admin) throw new Error('admin@loop.vn không tìm thấy');

  const { rows: [pm] }  = await db.query(`SELECT id FROM users WHERE role = 'PM' LIMIT 1`);
  const { rows: pms }   = await db.query(`SELECT id FROM users WHERE role = 'PM' LIMIT 4`);
  const { rows: members } = await db.query(`SELECT id FROM users WHERE role = 'MEMBER' LIMIT 10`);
  const { rows: projects } = await db.query(`SELECT id, name FROM projects LIMIT 5`);
  if (!projects.length) throw new Error('Không có project');

  const { rows: allTasks } = await db.query(
    `SELECT id, project_id FROM tasks WHERE level = 1 LIMIT 20`
  );

  const tasksByProject = {};
  for (const t of allTasks) {
    if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = [];
    tasksByProject[t.project_id].push(t.id);
  }

  const uid  = (arr) => arr[Math.floor(Math.random() * arr.length)]?.id ?? admin.id;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const maybe = (val, prob = 0.5) => Math.random() < prob ? val : null;

  // ── Xoá cũ ──────────────────────────────────────────────────────────────────
  await db.query(`DELETE FROM bug_attachments`);
  await db.query(`DELETE FROM bug_tasks`);
  await db.query(`DELETE FROM bug_tags`);
  await db.query(`DELETE FROM bugs`);
  console.log('🗑️  Cleared old data\n');

  // ── Insert helper ────────────────────────────────────────────────────────────
  async function ins(b) {
    const id  = randomUUID();
    const now = new Date().toISOString();
    await db.query(
      `INSERT INTO bugs (
         id, project_id, reporter_id, assignee_id, pm_approver_id,
         title, description, severity, status,
         item_type, is_cr, requester_name,
         due_date, estimated_hours, approval_note, approved_at,
         resolved_at, closed_at, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        id, b.projectId, b.reporterId, b.assigneeId ?? null, b.pmApproverId ?? null,
        b.title, b.description ?? null, b.severity, b.status,
        b.itemType ?? 'BUG', b.isCR ?? false, b.requesterName ?? null,
        b.dueDate ?? null, b.estimatedHours ?? null, b.approvalNote ?? null, b.approvedAt ?? null,
        b.resolvedAt ?? null, b.closedAt ?? null, b.createdAt ?? now, now,
      ]
    );
    for (const tid of b.taskIds ?? []) {
      await db.query(
        `INSERT INTO bug_tasks (bug_id, task_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, tid]
      );
    }
    for (const tag of b.tags ?? []) {
      await db.query(
        `INSERT INTO bug_tags (bug_id, tag) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, tag]
      );
    }
    return id;
  }

  const p = projects.map(x => x.id);
  const m = members;
  const pmList = pms;

  // Assignee pools per project
  const reporter = (i) => m[i % m.length]?.id ?? admin.id;
  const assignee = (i) => m[(i + 3) % m.length]?.id ?? null;
  const pTasks   = (pid) => (tasksByProject[pid] ?? []).slice(0, 2);

  // ─────────────────────────────────────────────────────────────────────────────
  // 50 BUG records
  // ─────────────────────────────────────────────────────────────────────────────
  const bugs = [
    // ── CRITICAL ──────────────────────────────────────────────────────────────
    {
      projectId: p[0], reporterId: admin.id, assigneeId: reporter(0),
      title: '[CRITICAL] Toàn bộ API trả về 500 sau khi deploy v2.3.1',
      description: 'Deploy lên production lúc 14:30 → tất cả endpoint trả về HTTP 500.\nLog: NullPointerException tại OrderService:142.\nRollback ngay lập tức, đang điều tra root cause.',
      severity: 'CRITICAL', status: 'RESOLVED',
      dueDate: daysAgo(1), estimatedHours: 8, resolvedAt: daysAgo(1),
      createdAt: daysAgo(3),
      taskIds: pTasks(p[0]), tags: ['production', 'deploy', 'hotfix'],
    },
    {
      projectId: p[0], reporterId: reporter(1), assigneeId: assignee(1),
      title: '[CRITICAL] Race condition gây mất dữ liệu đơn hàng đồng thời',
      description: 'Khi 2 người dùng cùng checkout một sản phẩm cuối cùng, một đơn hàng bị mất dữ liệu.\nSteps: Mở 2 tab, cùng thêm item cuối vào cart, cùng checkout → 1 trong 2 đơn bị NULL total.',
      severity: 'CRITICAL', status: 'IN_PROGRESS',
      dueDate: daysFrom(2), estimatedHours: 12,
      createdAt: daysAgo(5),
      taskIds: pTasks(p[0]), tags: ['race-condition', 'data-loss', 'checkout'],
    },
    {
      projectId: p[1], reporterId: admin.id, assigneeId: reporter(2),
      title: '[CRITICAL] Lỗ hổng IDOR — user có thể truy cập hồ sơ người khác',
      description: 'GET /api/users/{id} không kiểm tra authorization.\nPOC: User A đổi id trong URL → xem được toàn bộ hồ sơ User B bao gồm CCCD, địa chỉ.',
      severity: 'CRITICAL', status: 'OPEN',
      dueDate: daysFrom(1), estimatedHours: 6,
      createdAt: daysAgo(1),
      tags: ['security', 'idor', 'authorization'],
    },
    {
      projectId: p[1], reporterId: reporter(3), assigneeId: assignee(3),
      title: '[CRITICAL] Database connection pool cạn kiệt giờ cao điểm 8-9h',
      description: 'Từ 8:00-9:00 sáng, pool PostgreSQL max 100 connections bị saturate.\nKết quả: app timeout, user không đăng nhập được.\nMonitor: avg 97/100 connections lúc 8:30.',
      severity: 'CRITICAL', status: 'IN_PROGRESS',
      dueDate: daysFrom(3), estimatedHours: 16,
      createdAt: daysAgo(7),
      tags: ['database', 'connection-pool', 'performance'],
    },
    {
      projectId: p[2], reporterId: admin.id, assigneeId: assignee(0),
      title: '[CRITICAL] JWT secret key bị hardcode trong repo public',
      description: 'Phát hiện JWT_SECRET = "loop@2024" trong file config.ts commit lên GitHub public.\nĐã rotate key, cần audit toàn bộ token đang active.',
      severity: 'CRITICAL', status: 'CLOSED',
      resolvedAt: daysAgo(10), closedAt: daysAgo(8),
      estimatedHours: 4,
      createdAt: daysAgo(14),
      tags: ['security', 'jwt', 'credential-leak'],
    },

    // ── HIGH ──────────────────────────────────────────────────────────────────
    {
      projectId: p[0], reporterId: reporter(1), assigneeId: assignee(2),
      title: '[HIGH] File upload không validate MIME type — upload shell script được',
      description: 'Form upload avatar nhận file .sh với Content-Type: image/jpeg giả mạo.\nRủi ro: RCE nếu file được execute phía server.',
      severity: 'HIGH', status: 'RESOLVED',
      resolvedAt: daysAgo(4), estimatedHours: 3,
      createdAt: daysAgo(8),
      tags: ['security', 'file-upload', 'mime-validation'],
    },
    {
      projectId: p[0], reporterId: reporter(2), assigneeId: null,
      title: '[HIGH] Memory leak trong WebSocket handler — RAM tăng 2GB/ngày',
      description: 'RAM process Node.js tăng từ 512MB lên 2GB trong 24h liên tục.\nHeap snapshot: 1.8M EventEmitter objects không được GC.\nWorkaround: restart service mỗi 12h.',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(5), estimatedHours: 10,
      createdAt: daysAgo(4),
      tags: ['memory-leak', 'websocket', 'nodejs'],
    },
    {
      projectId: p[1], reporterId: pm.id, assigneeId: assignee(4),
      title: '[HIGH] Báo cáo tháng tính sai tổng doanh thu — lệch 15%',
      description: 'Report tháng 4/2026: hệ thống tính 12.3 tỷ, kế toán xác nhận thực tế 14.1 tỷ.\nNguyên nhân nghi do double-count đơn hàng refund status=PENDING.',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(4), estimatedHours: 8,
      createdAt: daysAgo(6),
      tags: ['report', 'calculation', 'revenue'],
    },
    {
      projectId: p[1], reporterId: reporter(5), assigneeId: assignee(5),
      title: '[HIGH] Push notification không đến thiết bị iOS khi app ở background',
      description: 'Android nhận đầy đủ. iOS: khi app background >5 phút, notification bị drop.\nAPN log: Delivery status = "Unknown".\nKiểm tra APNs certificate còn hạn đến 12/2026.',
      severity: 'HIGH', status: 'RESOLVED',
      resolvedAt: daysAgo(2), estimatedHours: 6,
      createdAt: daysAgo(9),
      tags: ['push-notification', 'ios', 'apns'],
    },
    {
      projectId: p[2], reporterId: reporter(6), assigneeId: assignee(6),
      title: '[HIGH] Đồng bộ dữ liệu offline mobile bị conflict khi cùng edit',
      description: 'Nhân viên A và B cùng sửa cùng record khi offline → khi sync lên, record B ghi đè A không cảnh báo.\nCần implement conflict resolution strategy (last-write-wins hoặc merge).',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(10), estimatedHours: 20,
      createdAt: daysAgo(3),
      tags: ['offline', 'sync', 'conflict'],
    },
    {
      projectId: p[0], reporterId: admin.id, assigneeId: assignee(7),
      title: '[HIGH] Login bị bypass khi email chứa ký tự null byte',
      description: "POST /auth/login với email: `admin@loop.vn\\x00evil@test.com` → đăng nhập thành công.\nTest trên staging, chưa xác nhận production.",
      severity: 'HIGH', status: 'RESOLVED',
      resolvedAt: daysAgo(6), estimatedHours: 4,
      createdAt: daysAgo(10),
      tags: ['security', 'auth', 'null-byte'],
    },
    {
      projectId: p[1], reporterId: reporter(7), assigneeId: null,
      title: '[HIGH] Chứng từ kế toán bị duplicate khi double-click nút Lưu',
      description: 'Double-click nhanh nút "Lưu chứng từ" tạo ra 2 bản ghi giống nhau trong bảng accounting_entries.\nSố lượng: tìm thấy 47 cặp duplicate trong production tháng 4.',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(3), estimatedHours: 3,
      createdAt: daysAgo(5),
      tags: ['double-submit', 'accounting', 'idempotency'],
    },
    {
      projectId: p[2], reporterId: reporter(8), assigneeId: assignee(8),
      title: '[HIGH] API rate limit không hoạt động — có thể brute force OTP',
      description: 'Endpoint POST /auth/verify-otp không có rate limit.\nTest: 1000 request/phút không bị block.\nOTP 6 số có thể brute force trong ~17 phút.',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(2), estimatedHours: 4,
      createdAt: daysAgo(2),
      tags: ['security', 'rate-limit', 'brute-force', 'otp'],
    },
    {
      projectId: p[3 % p.length], reporterId: pm.id, assigneeId: assignee(9),
      title: '[HIGH] Import dữ liệu Excel >10MB bị timeout gateway 30s',
      description: 'File Excel 15MB → gateway timeout sau 30s mặc dù backend xử lý được.\nNginx proxy_read_timeout mặc định 30s, cần nâng lên cho route /api/import.',
      severity: 'HIGH', status: 'RESOLVED',
      resolvedAt: daysAgo(1), estimatedHours: 2,
      createdAt: daysAgo(7),
      tags: ['nginx', 'timeout', 'import', 'excel'],
    },
    {
      projectId: p[3 % p.length], reporterId: reporter(0), assigneeId: null,
      title: '[HIGH] Cron job gửi email reminder chạy double trên multiple instances',
      description: 'Khi scale lên 3 pod, cron job deadline reminder chạy 3 lần → user nhận 3 email giống nhau.\nCần distributed lock (Redis/DB advisory lock).',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(6), estimatedHours: 5,
      createdAt: daysAgo(4),
      tags: ['cron', 'distributed', 'redis', 'email'],
    },

    // ── MEDIUM ────────────────────────────────────────────────────────────────
    {
      projectId: p[0], reporterId: reporter(1), assigneeId: assignee(1),
      title: '[MEDIUM] Tìm kiếm full-text không trả kết quả với keyword tiếng Việt có dấu',
      description: 'Search "nguyen van a" không tìm ra "Nguyễn Văn A".\nCần tắt unaccent hoặc normalize text trước khi index.',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(14), estimatedHours: 4,
      createdAt: daysAgo(8),
      tags: ['search', 'unicode', 'vietnamese'],
    },
    {
      projectId: p[0], reporterId: reporter(2), assigneeId: assignee(2),
      title: '[MEDIUM] Sort cột ngày tháng bảng nhân sự không đúng thứ tự',
      description: 'Bấm sort cột "Ngày vào làm" → sort theo string "DD/MM/YYYY" thay vì sort theo Date.\nResult: 01/02/2026 xếp trước 31/01/2026.',
      severity: 'MEDIUM', status: 'IN_PROGRESS',
      estimatedHours: 2, createdAt: daysAgo(3),
      tags: ['sort', 'date', 'frontend'],
    },
    {
      projectId: p[1], reporterId: reporter(3), assigneeId: assignee(3),
      title: '[MEDIUM] Dropdown chọn phòng ban load chậm >3s khi có >500 đơn vị',
      description: 'Org unit tree có 521 nodes → dropdown "Chọn phòng ban" load 3.8s mỗi lần mở.\nCần lazy load hoặc virtual scroll.',
      severity: 'MEDIUM', status: 'OPEN',
      estimatedHours: 5, createdAt: daysAgo(6),
      tags: ['performance', 'dropdown', 'org-tree'],
    },
    {
      projectId: p[1], reporterId: reporter(4), assigneeId: assignee(4),
      title: '[MEDIUM] Ảnh avatar không hiển thị sau khi thay đổi — cần hard refresh',
      description: 'Upload ảnh avatar mới → URL trả về đúng nhưng browser vẫn cache ảnh cũ.\nFix: append cache-busting query string vào avatar URL.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(3), estimatedHours: 1,
      createdAt: daysAgo(10),
      tags: ['avatar', 'cache', 'frontend'],
    },
    {
      projectId: p[2], reporterId: reporter(5), assigneeId: null,
      title: '[MEDIUM] Form nhập liệu mất dữ liệu khi browser navigate back',
      description: 'Đang nhập form dài (>15 fields) → nhấn Back → Forward → tất cả field bị reset.\nExpected: browser lưu form state.',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(15), estimatedHours: 3,
      createdAt: daysAgo(5),
      tags: ['form', 'browser-history', 'ux'],
    },
    {
      projectId: p[2], reporterId: reporter(6), assigneeId: assignee(6),
      title: '[MEDIUM] Số liệu dashboard không nhất quán với trang chi tiết',
      description: 'Dashboard hiển thị 145 task OPEN; vào trang Tasks filter OPEN → 138.\nDifference: 7 task đang ở trạng thái OPEN nhưng soft-deleted.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(5), estimatedHours: 2,
      createdAt: daysAgo(12),
      tags: ['dashboard', 'data-inconsistency', 'soft-delete'],
    },
    {
      projectId: p[0], reporterId: pm.id, assigneeId: assignee(7),
      title: '[MEDIUM] PDF xuất hóa đơn bị vỡ layout khi tên công ty >80 ký tự',
      description: 'Tên công ty dài ví dụ "Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)" → tràn ra ngoài header hóa đơn.',
      severity: 'MEDIUM', status: 'IN_PROGRESS',
      dueDate: daysFrom(8), estimatedHours: 3,
      createdAt: daysAgo(4),
      tags: ['pdf', 'layout', 'invoice'],
    },
    {
      projectId: p[1], reporterId: reporter(8), assigneeId: assignee(8),
      title: '[MEDIUM] Timezone sai khi user ở múi giờ khác UTC+7',
      description: 'User đăng nhập từ Singapore (UTC+8) → deadline hiển thị sai 1 giờ.\nServer lưu UTC, FE format theo browser timezone nhưng backend business logic dùng hardcode UTC+7.',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(20), estimatedHours: 6,
      createdAt: daysAgo(9),
      tags: ['timezone', 'internationalization'],
    },
    {
      projectId: p[2], reporterId: reporter(9), assigneeId: assignee(9),
      title: '[MEDIUM] API trả về password hash trong response GET /users',
      description: 'GET /api/v1/users/:id response JSON chứa trường "passwordHash".\nCần exclude sensitive fields trong serialization layer.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(7), estimatedHours: 1,
      createdAt: daysAgo(14),
      tags: ['security', 'data-exposure', 'api'],
    },
    {
      projectId: p[0], reporterId: reporter(0), assigneeId: null,
      title: '[MEDIUM] Quên mật khẩu không expire link sau khi dùng',
      description: 'Reset password link vẫn còn dùng được sau khi đã đặt mật khẩu mới.\nRủi ro: nếu email bị intercept, attacker có thể reset lại sau đó.',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(12), estimatedHours: 2,
      createdAt: daysAgo(6),
      tags: ['security', 'reset-password', 'token-expiry'],
    },
    {
      projectId: p[1], reporterId: reporter(1), assigneeId: assignee(0),
      title: '[MEDIUM] Lọc dữ liệu theo khoảng ngày bỏ sót ngày cuối (off-by-one)',
      description: 'Filter createdFrom=2026-04-01 createdTo=2026-04-30 → bỏ sót records ngày 30/04.\nNguyên nhân: so sánh `< createdTo` thay vì `<= createdTo`.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(8), estimatedHours: 1,
      createdAt: daysAgo(15),
      tags: ['filter', 'date-range', 'off-by-one'],
    },
    {
      projectId: p[2], reporterId: reporter(2), assigneeId: assignee(1),
      title: '[MEDIUM] Scroll vô hạn trên mobile bỏ qua 20 records đầu trang mới',
      description: 'Trang 1 load 20 items đúng. Scroll xuống → trang 2 skip item 21-40, hiển thị từ 41.\nLỗi: page increment chạy 2 lần do onEndReached trigger kép.',
      severity: 'MEDIUM', status: 'IN_PROGRESS',
      estimatedHours: 3, createdAt: daysAgo(7),
      tags: ['mobile', 'infinite-scroll', 'pagination'],
    },
    {
      projectId: p[0], reporterId: pm.id, assigneeId: assignee(2),
      title: '[MEDIUM] Biểu đồ Pie chart hiển thị nhãn chồng lên nhau khi có >8 phần',
      description: 'Pie chart phân bổ nhân sự theo phòng ban: khi >8 phòng ban, label bị overlap, không đọc được.',
      severity: 'MEDIUM', status: 'OPEN',
      estimatedHours: 2, createdAt: daysAgo(3),
      tags: ['chart', 'ui', 'label-overlap'],
    },
    {
      projectId: p[1], reporterId: reporter(3), assigneeId: null,
      title: '[MEDIUM] Session không expire sau 8h idle — nguy cơ session hijack',
      description: 'Theo chính sách bảo mật, session phải expire sau 8h không hoạt động.\nTest: idle 12h vẫn đăng nhập được.',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(9), estimatedHours: 2,
      createdAt: daysAgo(4),
      tags: ['security', 'session', 'idle-timeout'],
    },
    {
      projectId: p[2], reporterId: reporter(4), assigneeId: assignee(3),
      title: '[MEDIUM] Không có loading state khi submit form chậm — user submit nhiều lần',
      description: 'Form tạo hợp đồng: backend ~2s → không có spinner → user click Lưu nhiều lần → duplicate records.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(9), estimatedHours: 1,
      createdAt: daysAgo(16),
      tags: ['ux', 'loading-state', 'duplicate-submit'],
    },
    {
      projectId: p[0], reporterId: reporter(5), assigneeId: assignee(4),
      title: '[MEDIUM] Thông báo real-time không nhận khi mạng kém (<2G)',
      description: 'WebSocket disconnect khi network quality thấp, app không fallback về polling.\nUser không biết có thông báo mới.',
      severity: 'MEDIUM', status: 'OPEN',
      estimatedHours: 5, createdAt: daysAgo(2),
      tags: ['websocket', 'offline', 'resilience'],
    },
    {
      projectId: p[1], reporterId: reporter(6), assigneeId: assignee(5),
      title: '[MEDIUM] Tên file đính kèm bị cắt nếu >50 ký tự trên mobile',
      description: 'Filename dài bị truncate ở giữa thay vì cuối: "hợp_đồng_dịch_vụ...hợp_đồng_dịch_vụ" → không biết đây là file gì.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(11), estimatedHours: 1,
      createdAt: daysAgo(18),
      tags: ['mobile', 'ui', 'filename', 'truncate'],
    },

    // ── LOW ──────────────────────────────────────────────────────────────────
    {
      projectId: p[0], reporterId: reporter(7), assigneeId: null,
      title: '[LOW] Màu badge status không phân biệt được khi in ra giấy (đen trắng)',
      description: 'In báo cáo ra giấy: badge OPEN và CLOSED đều ra màu xám, không phân biệt được.\nĐề xuất thêm ký hiệu/icon bên cạnh màu.',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 2, createdAt: daysAgo(10),
      tags: ['print', 'accessibility', 'badge'],
    },
    {
      projectId: p[1], reporterId: reporter(8), assigneeId: null,
      title: '[LOW] Placeholder text trong input search bị cắt trên iPhone SE',
      description: 'iPhone SE màn hình 4.7": placeholder "Tìm kiếm theo tên nhân viên..." bị cắt còn "Tìm kiếm theo tên nh..."',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 1, createdAt: daysAgo(7),
      tags: ['mobile', 'ui', 'responsive'],
    },
    {
      projectId: p[2], reporterId: reporter(9), assigneeId: assignee(6),
      title: '[LOW] Footer hiển thị năm 2025 thay vì 2026',
      description: 'Footer: "© 2025 Loop.vn" → cần cập nhật thành dynamic year.',
      severity: 'LOW', status: 'RESOLVED',
      resolvedAt: daysAgo(20), estimatedHours: 1,
      createdAt: daysAgo(25),
      tags: ['ui', 'footer', 'copyright'],
    },
    {
      projectId: p[0], reporterId: reporter(0), assigneeId: null,
      title: '[LOW] Tooltip button "Xoá" hiển thị tiếng Anh "Delete"',
      description: 'Tất cả tooltip trong app đã Việt hoá. Riêng nút Xoá trong bảng Phân quyền còn hiển thị "Delete".',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 1, createdAt: daysAgo(4),
      tags: ['i18n', 'tooltip', 'ui'],
    },
    {
      projectId: p[1], reporterId: reporter(1), assigneeId: null,
      title: '[LOW] Breadcrumb không cập nhật khi navigate bằng browser history',
      description: 'Nhấn Back → URL thay đổi đúng nhưng breadcrumb vẫn hiển thị path cũ cho đến khi refresh.',
      severity: 'LOW', status: 'CANCELLED',
      estimatedHours: 2, createdAt: daysAgo(12),
      tags: ['breadcrumb', 'routing', 'frontend'],
    },
    {
      projectId: p[2], reporterId: pm.id, assigneeId: null,
      title: '[LOW] Dark mode: icon sidebar hơi tối khi hover',
      description: 'Hover icon sidebar trong dark mode → icon mờ hơn thay vì sáng lên. Màu hover cần điều chỉnh.',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 1, createdAt: daysAgo(6),
      tags: ['dark-mode', 'sidebar', 'ui'],
    },
    {
      projectId: p[0], reporterId: reporter(2), assigneeId: null,
      title: '[LOW] Số thứ tự trong bảng reset về 1 sau khi sort',
      description: 'Bảng có cột STT (1,2,3...). Sau khi sort theo cột khác → STT vẫn giữ nguyên thứ tự cũ thay vì reset theo thứ tự mới.',
      severity: 'LOW', status: 'RESOLVED',
      resolvedAt: daysAgo(15), estimatedHours: 1,
      createdAt: daysAgo(22),
      tags: ['table', 'sort', 'row-index'],
    },
    {
      projectId: p[1], reporterId: reporter(3), assigneeId: null,
      title: '[LOW] Thiếu confirm dialog khi xoá nhiều records cùng lúc (bulk delete)',
      description: 'Bulk delete: chọn nhiều records → xoá ngay không có bước xác nhận. Rủi ro xoá nhầm.',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 1, createdAt: daysAgo(3),
      tags: ['ux', 'confirm-dialog', 'bulk-action'],
    },
    {
      projectId: p[2], reporterId: reporter(4), assigneeId: null,
      title: '[LOW] Trang 404 không có link "Về trang chủ"',
      description: 'User gặp lỗi 404 → trang trống chỉ có text "Không tìm thấy trang". Cần thêm button về Dashboard.',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 1, createdAt: daysAgo(8),
      tags: ['ux', '404', 'navigation'],
    },
    {
      projectId: p[0], reporterId: reporter(5), assigneeId: null,
      title: '[LOW] Email notification bị đánh dấu spam bởi Gmail',
      description: 'Một số user báo email từ noreply@loop.vn vào thư mục Spam.\nCần kiểm tra SPF/DKIM/DMARC records.',
      severity: 'LOW', status: 'OPEN',
      dueDate: daysFrom(30), estimatedHours: 3,
      createdAt: daysAgo(5),
      tags: ['email', 'spam', 'spf-dkim'],
    },
    // ── Thêm vào để đủ 50 BUG ─────────────────────────────────────────────────
    {
      projectId: p[1], reporterId: reporter(6), assigneeId: assignee(0),
      title: '[HIGH] Xác thực 2FA bị bỏ qua khi đăng nhập qua SSO Google',
      description: 'User bật 2FA nhưng đăng nhập qua "Sign in with Google" → không hỏi OTP.\nSSO callback không trigger 2FA middleware.',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(4), estimatedHours: 5,
      createdAt: daysAgo(2), tags: ['security', '2fa', 'sso'],
    },
    {
      projectId: p[2], reporterId: reporter(7), assigneeId: assignee(1),
      title: '[HIGH] Phân trang API không nhất quán — lúc trả cursor lúc trả offset',
      description: '/api/tasks dùng cursor-based pagination. /api/projects dùng offset. Mobile client xử lý sai vì dùng chung logic.',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(7), estimatedHours: 8,
      createdAt: daysAgo(4), tags: ['api', 'pagination', 'consistency'],
    },
    {
      projectId: p[0], reporterId: reporter(8), assigneeId: assignee(2),
      title: '[MEDIUM] Notification badge count không giảm sau khi đọc hết',
      description: 'Đọc tất cả notification → badge số đỏ trên icon chuông vẫn hiển thị số cũ. Cần call API mark-all-read.',
      severity: 'MEDIUM', status: 'IN_PROGRESS',
      estimatedHours: 2, createdAt: daysAgo(3), tags: ['notification', 'badge', 'ux'],
    },
    {
      projectId: p[1], reporterId: reporter(9), assigneeId: assignee(3),
      title: '[MEDIUM] Import CSV nhân viên bị lỗi khi file có BOM UTF-8',
      description: 'File CSV xuất từ Excel có BOM (byte order mark) 0xEFBBBF → parser bị lỗi dòng đầu tiên.\nCần strip BOM trước khi parse.',
      severity: 'MEDIUM', status: 'OPEN',
      estimatedHours: 2, createdAt: daysAgo(5), tags: ['import', 'csv', 'bom', 'encoding'],
    },
    {
      projectId: p[2], reporterId: reporter(0), assigneeId: null,
      title: '[MEDIUM] Danh sách dropdown không filter khi user gõ dấu tiếng Việt',
      description: 'Select dropdown với showSearch: gõ "nguyen" không ra "Nguyễn". Antd filterOption so sánh exact string.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(4), estimatedHours: 1,
      createdAt: daysAgo(11), tags: ['ui', 'dropdown', 'search', 'antd'],
    },
    {
      projectId: p[0], reporterId: reporter(1), assigneeId: assignee(4),
      title: '[MEDIUM] Nút "Lưu" trong modal bị disable khi form không có thay đổi nhưng vừa mở lần đầu',
      description: 'Mở modal edit → không sửa gì → nút Lưu bị disable dù cần enable để user confirm không thay đổi.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(6), estimatedHours: 1,
      createdAt: daysAgo(13), tags: ['ui', 'form', 'modal', 'dirty-state'],
    },
    {
      projectId: p[1], reporterId: reporter(2), assigneeId: null,
      title: '[LOW] Màn hình chờ (splash screen) mobile hiển thị quá lâu — 4s',
      description: 'Splash screen hiển thị 4s trước khi vào app. Nguyên nhân: preload toàn bộ config khi khởi động thay vì lazy.',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 2, createdAt: daysAgo(7), tags: ['mobile', 'performance', 'splash'],
    },
    {
      projectId: p[2], reporterId: pm.id, assigneeId: null,
      title: '[LOW] Shortcut bàn phím Ctrl+S không save form trên trình duyệt Firefox',
      description: 'Ctrl+S hoạt động trên Chrome/Edge nhưng không save form trên Firefox 124+.\nKeydown event bị override bởi browser save dialog.',
      severity: 'LOW', status: 'CANCELLED',
      estimatedHours: 2, createdAt: daysAgo(14), tags: ['keyboard-shortcut', 'firefox', 'ux'],
    },
    // ── Assign cho PM và Admin để sidebar badge hiển thị ─────────────────────
    {
      projectId: p[0], reporterId: reporter(0), assigneeId: pm.id,
      title: '[CRITICAL] Lỗi tính toán chi phí dự án — sai 30% so với thực tế',
      description: 'Cost module tính sai tổng chi phí khi có nhân viên part-time (allocation < 100%).\nPM phụ trách cần kiểm tra và fix công thức phân bổ chi phí.',
      severity: 'CRITICAL', status: 'IN_PROGRESS',
      dueDate: daysFrom(2), estimatedHours: 8,
      createdAt: daysAgo(3), taskIds: pTasks(p[0]),
      tags: ['cost', 'calculation', 'pm-assigned'],
    },
    {
      projectId: p[1], reporterId: reporter(1), assigneeId: pm.id,
      title: '[HIGH] Dashboard PM không hiện được project bị delay',
      description: 'Biểu đồ timeline trên Dashboard PM không highlight đúng các project bị delay so với baseline.\nPM cần review và xác nhận fix.',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(5), estimatedHours: 4,
      createdAt: daysAgo(2), tags: ['dashboard', 'timeline', 'pm-assigned'],
    },
    {
      projectId: p[0], reporterId: reporter(2), assigneeId: pm.id,
      title: '[HIGH] Phê duyệt task bị lỗi khi có attachment >5MB',
      description: 'PM bấm Duyệt task có attachment lớn → request timeout.\nNginx proxy buffer limit bị đạt ngưỡng khi response lớn.',
      severity: 'HIGH', status: 'PENDING',
      dueDate: daysFrom(4), estimatedHours: 3,
      createdAt: daysAgo(5), tags: ['approval', 'attachment', 'timeout', 'pm-assigned'],
    },
    {
      projectId: p[2], reporterId: reporter(3), assigneeId: pm.id,
      title: '[MEDIUM] Email thông báo deadline không gửi đúng múi giờ VN',
      description: 'Email nhắc deadline gửi lúc 9h UTC thay vì 9h UTC+7. Nhân viên nhận được lúc 4h sáng.',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(10), estimatedHours: 2,
      createdAt: daysAgo(4), tags: ['email', 'timezone', 'pm-assigned'],
    },
    {
      projectId: p[0], reporterId: reporter(4), assigneeId: admin.id,
      title: '[CRITICAL] Hệ thống không thể backup DB khi disk >80%',
      description: 'Cron backup PostgreSQL chạy mỗi đêm. Khi disk usage >80%, backup fail silently không alert.\nAdmin cần investigate và setup disk alert threshold.',
      severity: 'CRITICAL', status: 'IN_PROGRESS',
      dueDate: daysFrom(1), estimatedHours: 6,
      createdAt: daysAgo(2), tags: ['backup', 'database', 'disk', 'admin-assigned'],
    },
    {
      projectId: p[1], reporterId: reporter(5), assigneeId: admin.id,
      title: '[HIGH] Redis connection bị leak sau 48h uptime',
      description: 'Sau 48h không restart, số Redis connection tăng liên tục đến max 500.\nAdmin cần audit toàn bộ nơi tạo Redis client và đảm bảo disconnect đúng.',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(3), estimatedHours: 8,
      createdAt: daysAgo(3), tags: ['redis', 'connection-leak', 'admin-assigned'],
    },
    {
      projectId: p[0], reporterId: reporter(6), assigneeId: admin.id,
      title: '[HIGH] User role ADMIN không thể xem log audit của module BPM',
      description: 'ADMIN account vào Process Monitor → lỗi 403 Forbidden.\nPhân quyền BPM chưa whitelist role ADMIN, chỉ có PM.',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(6), estimatedHours: 2,
      createdAt: daysAgo(1), tags: ['authorization', 'bpm', 'admin-assigned'],
    },
    {
      projectId: p[2], reporterId: reporter(7), assigneeId: admin.id,
      title: '[MEDIUM] Seed dữ liệu demo fail khi DB có foreign key constraint',
      description: 'Script seed chạy theo thứ tự sai, insert bug_tasks trước khi insert bugs.\nAdmin cần review thứ tự seed và thêm transaction.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(1), estimatedHours: 2,
      createdAt: daysAgo(6), tags: ['seed', 'migration', 'admin-assigned'],
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // 25 ISSUE records (non-CR)
  // ─────────────────────────────────────────────────────────────────────────────
  const issues = [
    {
      projectId: p[0], reporterId: pm.id, assigneeId: assignee(0),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Màn hình duyệt hóa đơn thiếu bộ lọc theo trạng thái thanh toán',
      description: 'Kế toán phải cuộn qua hàng trăm hóa đơn để tìm loại "Chờ thanh toán". Cần thêm filter tab theo payment_status.',
      requesterName: 'Nguyễn Thị Lan — Kế toán trưởng Vietinbank',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(10), estimatedHours: 5,
      createdAt: daysAgo(4), tags: ['filter', 'invoice', 'ux'],
    },
    {
      projectId: p[0], reporterId: reporter(1), assigneeId: null,
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Không có tính năng in phiếu lương cho từng nhân viên',
      description: 'HR phải export Excel rồi in thủ công. Cần thêm nút "In phiếu lương" → PDF riêng từng người.',
      requesterName: 'Trần Thị Mai — Trưởng phòng Nhân sự',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(21), estimatedHours: 8,
      createdAt: daysAgo(7), tags: ['print', 'payslip', 'pdf'],
    },
    {
      projectId: p[1], reporterId: reporter(2), assigneeId: assignee(2),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Bảng chấm công hiển thị sai giờ OT khi làm qua 0h',
      description: 'Nhân viên làm từ 22:00-02:00 → hệ thống tính 2h OT thay vì 4h. Nguyên nhân: không xử lý giờ qua midnight.',
      requesterName: 'Lê Văn Đức — Quản đốc ca đêm Nhà máy Bình Dương',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(5), estimatedHours: 6,
      createdAt: daysAgo(3), tags: ['timesheet', 'overtime', 'midnight'],
    },
    {
      projectId: p[1], reporterId: pm.id, assigneeId: assignee(3),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Số dư phép năm không trừ đúng khi nghỉ nửa ngày',
      description: 'Nghỉ phép nửa ngày sáng/chiều → hệ thống trừ 1 ngày phép thay vì 0.5 ngày.',
      requesterName: 'Phạm Hồng Nhung — HR Manager',
      severity: 'HIGH', status: 'RESOLVED',
      resolvedAt: daysAgo(2), estimatedHours: 3,
      createdAt: daysAgo(9), tags: ['leave', 'half-day', 'calculation'],
    },
    {
      projectId: p[2], reporterId: reporter(4), assigneeId: null,
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Màn hình quản lý hợp đồng không hiện nút "Gia hạn" với HĐ hết hạn <30 ngày',
      description: 'Hợp đồng sắp hết hạn không có highlight và không có nút gia hạn nhanh. HR phải tìm thủ công.',
      requesterName: 'Võ Thị Hương — Trưởng phòng Hành chính',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(14), estimatedHours: 4,
      createdAt: daysAgo(6), tags: ['contract', 'expiry', 'ux'],
    },
    {
      projectId: p[2], reporterId: reporter(5), assigneeId: assignee(5),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Tìm kiếm nhân viên không hỗ trợ tìm theo mã nhân viên',
      description: 'Search chỉ tìm theo tên. HR muốn tìm theo mã NV (VD: EMP-001234) để xử lý nhanh.',
      requesterName: 'Nguyễn Minh Tuấn — HR Specialist',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(4), estimatedHours: 2,
      createdAt: daysAgo(11), tags: ['search', 'employee-id'],
    },
    {
      projectId: p[0], reporterId: reporter(6), assigneeId: assignee(6),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Lịch sử thay đổi lương không ghi nhận người thay đổi',
      description: 'Bảng salary_history thiếu cột modified_by. Audit log không biết ai đã điều chỉnh lương.',
      requesterName: 'Lê Hồng Phúc — Giám đốc Tài chính',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(8), estimatedHours: 4,
      createdAt: daysAgo(5), tags: ['audit-log', 'salary', 'compliance'],
    },
    {
      projectId: p[1], reporterId: reporter(7), assigneeId: null,
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] App mobile không hoạt động trên Android 8.0 (API 26)',
      description: 'React Native app crash khi khởi động trên Samsung J7 Android 8.0.\nCrash: "java.lang.UnsatisfiedLinkError: dlopen failed".\nCần kiểm tra JSC version compatibility.',
      requesterName: 'Đỗ Văn Mạnh — IT Support',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(7), estimatedHours: 8,
      createdAt: daysAgo(4), tags: ['android', 'compatibility', 'crash'],
    },
    {
      projectId: p[2], reporterId: pm.id, assigneeId: assignee(8),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Báo cáo thuế TNCN tính sai khi có giảm trừ gia cảnh >2 người phụ thuộc',
      description: 'Thuế TNCN tính sai với nhân viên có >2 người phụ thuộc. Mức giảm trừ theo luật 4.4tr/người phụ thuộc nhưng hệ thống chỉ tính đúng cho 2 người đầu.',
      requesterName: 'Bùi Thị Xuân — Kế toán thuế',
      severity: 'CRITICAL', status: 'IN_PROGRESS',
      dueDate: daysFrom(3), estimatedHours: 6,
      createdAt: daysAgo(2), tags: ['tax', 'pit', 'calculation', 'compliance'],
    },
    {
      projectId: p[0], reporterId: reporter(9), assigneeId: assignee(9),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Không thể upload file PDF vào hồ sơ nhân viên — lỗi MIME type',
      description: 'Upload CV dạng PDF → lỗi "Định dạng không hỗ trợ". Whitelist chỉ có image/*, thiếu application/pdf.',
      requesterName: 'Phan Thị Linh — HR Recruiter',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(6), estimatedHours: 1,
      createdAt: daysAgo(13), tags: ['upload', 'mime-type', 'pdf'],
    },
    {
      projectId: p[1], reporterId: reporter(0), assigneeId: null,
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Phiếu đề xuất mua hàng không gửi email cho cấp phê duyệt',
      description: 'Tạo phiếu đề xuất mua hàng → cấp quản lý không nhận được email thông báo dù notification trong app có.',
      requesterName: 'Trương Văn Khoa — Trưởng phòng Mua hàng',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(6), estimatedHours: 3,
      createdAt: daysAgo(3), tags: ['email', 'approval', 'purchase-order'],
    },
    {
      projectId: p[2], reporterId: reporter(1), assigneeId: assignee(0),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Lịch phỏng vấn trùng slot — không có cảnh báo conflict',
      description: 'Đặt 2 lịch phỏng vấn cùng phòng cùng giờ → hệ thống không cảnh báo.\nCần kiểm tra conflict phòng/interviewer trước khi confirm.',
      requesterName: 'Lê Hải Yến — Talent Acquisition Manager',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(12), estimatedHours: 4,
      createdAt: daysAgo(5), tags: ['calendar', 'conflict-check', 'interview'],
    },
    {
      projectId: p[0], reporterId: reporter(2), assigneeId: assignee(1),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Khi xoá dự án, task con vẫn hiển thị trong My Tasks',
      description: 'Project bị xoá (soft delete) → task của project đó vẫn xuất hiện trong danh sách My Tasks.\nCần cascade soft delete hoặc filter theo project.deletedAt.',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(7), estimatedHours: 2,
      createdAt: daysAgo(14), tags: ['soft-delete', 'cascade', 'my-tasks'],
    },
    {
      projectId: p[1], reporterId: reporter(3), assigneeId: null,
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Số trang pagination không đúng khi xoá record ở trang cuối',
      description: 'Đang ở trang 5 (20 records/page) → xoá item cuối → total giảm → nhưng vẫn hiển thị trang 5 (empty).\nCần redirect về trang trước.',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 2, createdAt: daysAgo(8), tags: ['pagination', 'delete', 'ux'],
    },
    {
      projectId: p[2], reporterId: reporter(4), assigneeId: assignee(3),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Widget tổng quan không load được dữ liệu khi phiên >2h',
      description: 'Sau 2h đăng nhập, dashboard widget trả về 401. AccessToken hết hạn nhưng refresh token flow không chạy tự động cho widget requests.',
      requesterName: 'Nguyễn Quốc Hùng — Giám đốc Điều hành',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(4), estimatedHours: 3,
      createdAt: daysAgo(2), tags: ['auth', 'token-refresh', 'dashboard'],
    },
    // ── Thêm vào để đủ 22 ISSUE ──────────────────────────────────────────────
    {
      projectId: p[0], reporterId: reporter(5), assigneeId: assignee(5),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Màn hình tạo đơn hàng không lưu nháp khi network mất kết nối',
      description: 'Sales nhập liệu đơn hàng dài (20 sản phẩm) → mất mạng giữa chừng → mất toàn bộ dữ liệu.\nCần auto-save nháp vào localStorage mỗi 30s.',
      requesterName: 'Phan Tuấn Anh — Sales Director',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(9), estimatedHours: 6,
      createdAt: daysAgo(3), tags: ['auto-save', 'offline', 'sales-order'],
    },
    {
      projectId: p[1], reporterId: reporter(6), assigneeId: assignee(6),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Không thể xem lịch sử duyệt đề xuất — chỉ thấy trạng thái cuối',
      description: 'Phiếu đề xuất qua 4 cấp duyệt nhưng chỉ hiển thị "Đã duyệt". Không xem được ai duyệt lúc mấy giờ, ai từ chối lý do gì.',
      requesterName: 'Lê Trung Kiên — Internal Audit Manager',
      severity: 'MEDIUM', status: 'IN_PROGRESS',
      dueDate: daysFrom(12), estimatedHours: 5,
      createdAt: daysAgo(4), tags: ['audit-trail', 'approval-history', 'compliance'],
    },
    {
      projectId: p[2], reporterId: reporter(7), assigneeId: null,
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Báo cáo nhân sự tính sai headcount khi nhân viên chuyển bộ phận trong tháng',
      description: 'NV chuyển bộ phận ngày 15/4 → báo cáo tháng 4 tính NV đó cho cả 2 bộ phận → headcount bị inflate.',
      requesterName: 'Võ Thị Thu Hương — HR Analytics',
      severity: 'HIGH', status: 'OPEN',
      dueDate: daysFrom(6), estimatedHours: 4,
      createdAt: daysAgo(5), tags: ['hr-report', 'headcount', 'transfer'],
    },
    {
      projectId: p[0], reporterId: pm.id, assigneeId: assignee(8),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Cần cho phép PM xem chi phí dự án của tất cả project trong org',
      description: 'PM hiện chỉ thấy cost của dự án mình phụ trách. Ban lãnh đạo muốn PM-level có thể xem cross-project để phân bổ nguồn lực.',
      requesterName: 'Nguyễn Hoàng Long — COO',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(3), estimatedHours: 3,
      createdAt: daysAgo(10), tags: ['authorization', 'cost', 'cross-project'],
    },
    {
      projectId: p[1], reporterId: reporter(8), assigneeId: null,
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Mobile app không cảnh báo khi nhập check-in trước 5:00 sáng',
      description: 'Nhân viên quên check-in hôm qua, hôm nay nhập bù lúc 4:30am → hệ thống accept mà không cảnh báo "Giờ bất thường".',
      requesterName: 'Trần Quốc Bảo — Timesheet Admin',
      severity: 'LOW', status: 'OPEN',
      estimatedHours: 2, createdAt: daysAgo(6), tags: ['mobile', 'timesheet', 'validation'],
    },
    {
      projectId: p[2], reporterId: reporter(9), assigneeId: assignee(9),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Màn hình phê duyệt hàng loạt (bulk approve) bị timeout >50 records',
      description: 'Chọn 60 phiếu chấm công → bấm Duyệt hàng loạt → request timeout sau 30s.\nCần xử lý bất đồng bộ + progress bar.',
      requesterName: 'Lê Văn Mạnh — HR Manager',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(5), estimatedHours: 8,
      createdAt: daysAgo(2), tags: ['bulk-action', 'timeout', 'async', 'timesheet'],
    },
    {
      projectId: p[0], reporterId: reporter(0), assigneeId: assignee(0),
      itemType: 'ISSUE', isCR: false,
      title: '[ISSUE] Không thể tải tệp đính kèm >50MB trên kết nối 3G',
      description: 'File hợp đồng PDF 60MB upload qua 3G → timeout sau 120s. Cần multipart upload hoặc nén file phía client.',
      requesterName: 'Đỗ Thanh Tuấn — Field Sales Manager',
      severity: 'MEDIUM', status: 'OPEN',
      dueDate: daysFrom(15), estimatedHours: 10,
      createdAt: daysAgo(7), tags: ['upload', 'large-file', 'mobile', '3g'],
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // 25 CR records (isCR = true) — full lifecycle
  // ─────────────────────────────────────────────────────────────────────────────
  const crs = [
    // ── PENDING_REVIEW (đang chờ PM duyệt) ────────────────────────────────────
    {
      projectId: p[0], reporterId: reporter(0), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm module quản lý hợp đồng khách hàng (B2B contracts)',
      description: 'Ban Kinh doanh yêu cầu module riêng quản lý hợp đồng B2B: tạo, theo dõi deadline, đính kèm file, gửi reminder tự động trước 30 ngày hết hạn.',
      requesterName: 'Ngô Thị Thu — Giám đốc Kinh doanh',
      severity: 'HIGH', status: 'PENDING_REVIEW',
      dueDate: daysFrom(30), estimatedHours: 80,
      createdAt: daysAgo(1), tags: ['crm', 'contract', 'b2b', 'cr'],
    },
    {
      projectId: p[0], reporterId: reporter(1), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Tích hợp eSign (FPT.eSign) cho hợp đồng lao động điện tử',
      description: 'Ký hợp đồng lao động qua eSign FPT thay vì in ra ký tay. Cần tích hợp API FPT.eSign, lưu trữ signed PDF.',
      requesterName: 'Hoàng Minh Châu — Giám đốc Nhân sự',
      severity: 'HIGH', status: 'PENDING_REVIEW',
      dueDate: daysFrom(45), estimatedHours: 60,
      createdAt: daysAgo(2), tags: ['esign', 'integration', 'contract', 'cr'],
    },
    {
      projectId: p[1], reporterId: reporter(2), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm tính năng đặt lịch họp và phòng họp online',
      description: 'Yêu cầu module booking phòng họp: calendar view, chọn phòng, mời người tham dự, gửi link Google Meet tự động.',
      requesterName: 'Vũ Thanh Hà — Trưởng phòng Hành chính',
      severity: 'MEDIUM', status: 'PENDING_REVIEW',
      dueDate: daysFrom(40), estimatedHours: 50,
      createdAt: daysAgo(3), tags: ['meeting-room', 'calendar', 'booking', 'cr'],
    },
    {
      projectId: p[1], reporterId: pm.id, assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Xuất báo cáo tổng hợp nhân sự sang định dạng Word (.docx)',
      description: 'BHXH yêu cầu nộp báo cáo dạng Word. Hiện hệ thống chỉ có Excel và PDF.',
      requesterName: 'Lê Thị Bích — Chuyên viên BHXH',
      severity: 'MEDIUM', status: 'PENDING_REVIEW',
      dueDate: daysFrom(20), estimatedHours: 16,
      createdAt: daysAgo(1), tags: ['export', 'word', 'docx', 'bhxh', 'cr'],
    },
    {
      projectId: p[2], reporterId: reporter(4), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Xây dựng app kiosk chấm công bằng nhận diện khuôn mặt',
      description: 'Thay thế máy chấm công vật lý. Kiosk tablet chạy app web, nhận diện khuôn mặt qua camera, ghi nhận check-in/out.',
      requesterName: 'Phạm Văn Toàn — Giám đốc Sản xuất',
      severity: 'HIGH', status: 'PENDING_REVIEW',
      dueDate: daysFrom(90), estimatedHours: 200,
      createdAt: daysAgo(5), tags: ['face-recognition', 'kiosk', 'checkin', 'cr'],
    },

    // ── APPROVED → IN_PROGRESS ─────────────────────────────────────────────────
    {
      projectId: p[0], reporterId: reporter(5), assigneeId: assignee(5),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm bảng KPI cá nhân — nhân viên tự theo dõi mục tiêu',
      description: 'Nhân viên muốn xem KPI tháng/quý của mình ngay trên dashboard cá nhân, không cần chờ HR gửi email.',
      requesterName: 'Trần Hoàng Anh — Sales Manager',
      severity: 'MEDIUM', status: 'IN_PROGRESS',
      dueDate: daysFrom(15), estimatedHours: 30,
      pmApproverId: pmList[0]?.id ?? pm.id,
      approvalNote: 'Approved — nằm trong sprint Q2. Ưu tiên sau epic timesheet.',
      approvedAt: daysAgo(8),
      createdAt: daysAgo(15), tags: ['kpi', 'dashboard', 'self-service', 'cr'],
    },
    {
      projectId: p[0], reporterId: reporter(6), assigneeId: assignee(6),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm màn hình quản lý tài khoản ngân hàng nhân viên',
      description: 'Kế toán cần lưu thông tin tài khoản ngân hàng (tên ngân hàng, số TK, tên chủ TK) để chuyển lương tự động qua API banking.',
      requesterName: 'Nguyễn Thị Hoa — Kế toán thanh toán',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(10), estimatedHours: 20,
      pmApproverId: pmList[0]?.id ?? pm.id,
      approvalNote: 'Approved. Yêu cầu thiết yếu cho module payroll tự động.',
      approvedAt: daysAgo(10),
      createdAt: daysAgo(18), tags: ['payroll', 'bank-account', 'cr'],
    },
    {
      projectId: p[1], reporterId: reporter(7), assigneeId: assignee(7),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Tích hợp chatbot Zalo OA trả lời tự động phiếu phép',
      description: 'Nhân viên gửi tin Zalo "xin nghỉ ngày mai" → chatbot tự tạo đơn xin nghỉ, gửi cho quản lý duyệt qua Zalo.',
      requesterName: 'Đặng Thị Lan — HR Business Partner',
      severity: 'MEDIUM', status: 'IN_PROGRESS',
      dueDate: daysFrom(25), estimatedHours: 40,
      pmApproverId: pmList[1]?.id ?? pm.id,
      approvalNote: 'OK. Tích hợp Zalo đã có SDK, estimate hợp lý.',
      approvedAt: daysAgo(6),
      createdAt: daysAgo(14), tags: ['zalo', 'chatbot', 'leave', 'cr'],
    },
    {
      projectId: p[2], reporterId: reporter(8), assigneeId: assignee(8),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm chức năng khóa bảng chấm công cuối tháng (payroll lock)',
      description: 'Sau khi kế toán chốt lương, cần lock bảng chấm công không cho sửa. Chỉ HR Manager mới unlock được.',
      requesterName: 'Lý Hồng Khanh — CFO',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(8), estimatedHours: 12,
      pmApproverId: pmList[2]?.id ?? pm.id,
      approvalNote: 'Critical for payroll finalization. Approved với điều kiện có audit log khi unlock.',
      approvedAt: daysAgo(12),
      createdAt: daysAgo(20), tags: ['payroll', 'lock', 'compliance', 'cr'],
    },
    {
      projectId: p[0], reporterId: pm.id, assigneeId: assignee(9),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Dashboard CEO — aggregated KPIs toàn công ty real-time',
      description: 'CEO cần màn hình tổng quan: headcount, OT cost, tỉ lệ nghỉ phép, top 10 dự án theo chi phí, cập nhật real-time.',
      requesterName: 'Bùi Quang Vinh — CEO',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(20), estimatedHours: 35,
      pmApproverId: pm.id,
      approvalNote: 'Priority 1 của quý. Làm ngay sau khi hoàn thành sprint hiện tại.',
      approvedAt: daysAgo(7),
      createdAt: daysAgo(12), tags: ['ceo-dashboard', 'kpi', 'real-time', 'cr'],
    },

    // ── RESOLVED ───────────────────────────────────────────────────────────────
    {
      projectId: p[0], reporterId: reporter(0), assigneeId: assignee(0),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm trường "Số điện thoại khẩn cấp" vào hồ sơ nhân viên',
      description: 'Nhân sự yêu cầu lưu SĐT khẩn cấp (gia đình) để liên lạc khi nhân viên có sự cố.',
      requesterName: 'Trần Thị Phương — HR Manager',
      severity: 'LOW', status: 'RESOLVED',
      resolvedAt: daysAgo(5), estimatedHours: 2,
      pmApproverId: pmList[0]?.id ?? pm.id,
      approvalNote: 'Approved. Thay đổi nhỏ, không ảnh hưởng data model.',
      approvedAt: daysAgo(15),
      createdAt: daysAgo(20), tags: ['employee-profile', 'emergency-contact', 'cr'],
    },
    {
      projectId: p[1], reporterId: reporter(1), assigneeId: assignee(1),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Bổ sung xuất danh sách nhân viên theo định dạng BHXH (mẫu D02-TS)',
      description: 'Cần export file Excel theo đúng mẫu D02-TS của BHXH để nộp hàng tháng.',
      requesterName: 'Hoàng Lan Anh — Chuyên viên BHXH',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(3), estimatedHours: 6,
      pmApproverId: pmList[1]?.id ?? pm.id,
      approvalNote: 'Approved. Đây là nghĩa vụ pháp lý, cần làm.',
      approvedAt: daysAgo(13),
      createdAt: daysAgo(18), tags: ['bhxh', 'export', 'compliance', 'cr'],
    },
    {
      projectId: p[2], reporterId: reporter(2), assigneeId: assignee(2),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm widget "Chúc mừng sinh nhật" trên dashboard nội bộ',
      description: 'Muốn hiển thị danh sách nhân viên sinh nhật hôm nay/tuần này trên trang chủ để văn hóa công ty tốt hơn.',
      requesterName: 'Mai Thị Thảo — Culture & Engagement Lead',
      severity: 'LOW', status: 'RESOLVED',
      resolvedAt: daysAgo(10), estimatedHours: 4,
      pmApproverId: pmList[2]?.id ?? pm.id,
      approvalNote: 'Nice to have. Approved vì estimate thấp.',
      approvedAt: daysAgo(20),
      createdAt: daysAgo(28), tags: ['dashboard', 'birthday', 'culture', 'cr'],
    },
    {
      projectId: p[0], reporterId: reporter(3), assigneeId: assignee(3),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Hiển thị số ngày phép còn lại trực tiếp trên app mobile',
      description: 'Nhân viên muốn xem nhanh số ngày phép còn lại ngay màn hình home thay vì phải vào menu sâu.',
      requesterName: 'Lê Quang Trung — Nhân viên đại diện',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(8), estimatedHours: 3,
      pmApproverId: pm.id,
      approvalNote: 'UX improvement hợp lý. Approved.',
      approvedAt: daysAgo(18),
      createdAt: daysAgo(24), tags: ['mobile', 'leave-balance', 'ux', 'cr'],
    },
    {
      projectId: p[1], reporterId: reporter(4), assigneeId: assignee(4),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm chức năng comment & đính kèm file trên phiếu đề xuất',
      description: 'Quá trình duyệt phiếu đề xuất mua hàng hiện không có comment thread. Người duyệt không thể hỏi thêm thông tin.',
      requesterName: 'Vũ Hồng Sơn — Procurement Manager',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(6), estimatedHours: 8,
      pmApproverId: pmList[0]?.id ?? pm.id,
      approvalNote: 'Approved. Cải thiện đáng kể workflow phê duyệt.',
      approvedAt: daysAgo(16),
      createdAt: daysAgo(22), tags: ['comment', 'attachment', 'approval-flow', 'cr'],
    },

    // ── CLOSED ─────────────────────────────────────────────────────────────────
    {
      projectId: p[2], reporterId: reporter(5), assigneeId: assignee(5),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Tích hợp Google Calendar để đồng bộ lịch nghỉ phép',
      description: 'Khi đơn xin nghỉ được duyệt → tự động tạo event trên Google Calendar của nhân viên và quản lý.',
      requesterName: 'Trần Văn Lộc — Operations Director',
      severity: 'MEDIUM', status: 'CLOSED',
      resolvedAt: daysAgo(15), closedAt: daysAgo(12),
      estimatedHours: 12,
      pmApproverId: pmList[1]?.id ?? pm.id,
      approvalNote: 'Approved. Tăng trải nghiệm nhân viên.',
      approvedAt: daysAgo(25),
      createdAt: daysAgo(32), tags: ['google-calendar', 'integration', 'leave', 'cr'],
    },
    {
      projectId: p[0], reporterId: reporter(6), assigneeId: assignee(6),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Báo cáo phân tích turnover rate theo phòng ban và thâm niên',
      description: 'Ban lãnh đạo cần báo cáo turnover rate 12 tháng, phân tách theo phòng ban và nhóm thâm niên (<1 năm, 1-3 năm, >3 năm).',
      requesterName: 'Nguyễn Thanh Bình — CHRO',
      severity: 'HIGH', status: 'CLOSED',
      resolvedAt: daysAgo(20), closedAt: daysAgo(18),
      estimatedHours: 16,
      pmApproverId: pmList[2]?.id ?? pm.id,
      approvalNote: 'Strategic report. Approved với ưu tiên cao.',
      approvedAt: daysAgo(30),
      createdAt: daysAgo(38), tags: ['report', 'turnover', 'analytics', 'cr'],
    },
    {
      projectId: p[1], reporterId: reporter(7), assigneeId: assignee(7),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Cổng thông tin nhân viên (ESS — Employee Self Service)',
      description: 'Nhân viên tự cập nhật thông tin cá nhân (địa chỉ, SĐT), xem lịch sử tăng lương, tải phiếu lương PDF.',
      requesterName: 'Phạm Ngọc Diệp — HR Director',
      severity: 'HIGH', status: 'CLOSED',
      resolvedAt: daysAgo(25), closedAt: daysAgo(22),
      estimatedHours: 40,
      pmApproverId: pm.id,
      approvalNote: 'Core HR feature. Approved full scope.',
      approvedAt: daysAgo(35),
      createdAt: daysAgo(45), tags: ['ess', 'self-service', 'employee-portal', 'cr'],
    },

    // ── REJECTED ───────────────────────────────────────────────────────────────
    {
      projectId: p[2], reporterId: reporter(8), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Xây dựng module ERP mua hàng tự động (P2P automation)',
      description: 'Tự động hoá toàn bộ quy trình Purchase to Pay: tạo PO từ requisition, gửi cho nhà cung cấp qua EDI, nhận invoice điện tử, tự động đối soát.',
      requesterName: 'Đinh Công Thắng — Giám đốc Vận hành',
      severity: 'HIGH', status: 'REJECTED',
      pmApproverId: pmList[0]?.id ?? pm.id,
      approvalNote: 'Ngoài phạm vi dự án Phase 1. Scope quá lớn (estimate 800h). Xem xét lại ở Phase 3 ERP roadmap.',
      approvedAt: daysAgo(8),
      estimatedHours: 800,
      createdAt: daysAgo(12), tags: ['erp', 'p2p', 'out-of-scope', 'cr'],
    },
    {
      projectId: p[0], reporterId: reporter(9), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Tích hợp AI chatbot HR hỏi đáp nội quy và chính sách',
      description: 'Chatbot AI trả lời tự động các câu hỏi của nhân viên về nội quy, chính sách phúc lợi, quy trình xin nghỉ.',
      requesterName: 'Lê Mạnh Hùng — Digital Transformation Lead',
      severity: 'MEDIUM', status: 'REJECTED',
      pmApproverId: pm.id,
      approvalNote: 'Ý tưởng hay nhưng chưa đủ ngân sách cho API LLM. Xem xét lại Q4/2026.',
      approvedAt: daysAgo(5),
      estimatedHours: 120,
      createdAt: daysAgo(9), tags: ['ai', 'chatbot', 'hr-policy', 'cr'],
    },
    {
      projectId: p[1], reporterId: reporter(0), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Xây dựng module quản lý đào tạo và chứng chỉ nhân viên',
      description: 'Theo dõi lịch sử đào tạo, chứng chỉ, hạn tái đào tạo (safety training, ISO). Gửi nhắc nhở tự động khi chứng chỉ sắp hết hạn.',
      requesterName: 'Ngô Bích Trâm — L&D Manager',
      severity: 'MEDIUM', status: 'REJECTED',
      pmApproverId: pmList[1]?.id ?? pm.id,
      approvalNote: 'Trùng với tính năng đang develop trong Epic 15. Gộp vào đó thay vì làm riêng.',
      approvedAt: daysAgo(10),
      estimatedHours: 60,
      createdAt: daysAgo(14), tags: ['training', 'certification', 'duplicate', 'cr'],
    },
    {
      projectId: p[2], reporterId: pm.id, assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm tính năng gamification — điểm thưởng khi hoàn thành task đúng hạn',
      description: 'Hệ thống điểm thưởng: hoàn thành task trước deadline +10pts, đúng deadline +5pts. Bảng xếp hạng theo tháng. Reward: voucher ăn uống.',
      requesterName: 'Trần Minh Khoa — Employee Experience Manager',
      severity: 'LOW', status: 'REJECTED',
      pmApproverId: pm.id,
      approvalNote: 'Thú vị nhưng không phải ưu tiên hiện tại. Backlog cho 2027.',
      approvedAt: daysAgo(3),
      estimatedHours: 50,
      createdAt: daysAgo(6), tags: ['gamification', 'engagement', 'non-priority', 'cr'],
    },
    // ── Thêm CR để đủ 28 CR ──────────────────────────────────────────────────
    {
      projectId: p[0], reporterId: reporter(3), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm màn hình so sánh đề xuất (RFQ comparison) nhiều nhà cung cấp',
      description: 'Khi có nhiều báo giá từ các nhà cung cấp, cần màn hình so sánh ngang hàng: giá, điều khoản, điểm chất lượng để PM quyết định nhanh.',
      requesterName: 'Nguyễn Đức Thịnh — Procurement Lead',
      severity: 'MEDIUM', status: 'PENDING_REVIEW',
      dueDate: daysFrom(35), estimatedHours: 24,
      createdAt: daysAgo(2), tags: ['procurement', 'rfq', 'comparison', 'cr'],
    },
    {
      projectId: p[1], reporterId: reporter(4), assigneeId: assignee(4),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Tự động tính và trích xuất báo cáo thuế TNCN cuối năm (mẫu 05/QTT-TNCN)',
      description: 'Cuối năm phải nộp quyết toán thuế. Cần tự động tổng hợp toàn bộ thu nhập chịu thuế, các khoản miễn thuế, và xuất đúng mẫu 05/QTT-TNCN.',
      requesterName: 'Trương Thị Kim Lan — Trưởng phòng Kế toán thuế',
      severity: 'HIGH', status: 'IN_PROGRESS',
      dueDate: daysFrom(18), estimatedHours: 32,
      pmApproverId: pmList[0]?.id ?? pm.id,
      approvalNote: 'Nghĩa vụ pháp lý. Phải xong trước 31/3/2027.',
      approvedAt: daysAgo(9),
      createdAt: daysAgo(17), tags: ['tax', 'pit', 'year-end', 'compliance', 'cr'],
    },
    {
      projectId: p[2], reporterId: reporter(5), assigneeId: assignee(5),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Tích hợp VNPay để thanh toán phí dịch vụ nội bộ online',
      description: 'Nhân viên đặt dịch vụ nội bộ (đặt xe, canteen, gym) → thanh toán trực tiếp qua VNPay QR thay vì trừ lương cuối tháng.',
      requesterName: 'Lê Hải Ninh — Head of Internal Services',
      severity: 'MEDIUM', status: 'RESOLVED',
      resolvedAt: daysAgo(7), estimatedHours: 20,
      pmApproverId: pmList[1]?.id ?? pm.id,
      approvalNote: 'Approved. VNPay SDK sẵn có, estimate hợp lý.',
      approvedAt: daysAgo(17),
      createdAt: daysAgo(25), tags: ['payment', 'vnpay', 'integration', 'cr'],
    },
    {
      projectId: p[0], reporterId: reporter(6), assigneeId: assignee(6),
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Xuất bảng lương sang định dạng file ngân hàng (NAPAS batch)',
      description: 'Kế toán hiện phải tải file Excel rồi reformat thủ công theo chuẩn NAPAS để nộp ngân hàng. Cần tự động xuất đúng format NAPAS từ hệ thống.',
      requesterName: 'Hoàng Thị Phương Linh — Payroll Accountant',
      severity: 'HIGH', status: 'CLOSED',
      resolvedAt: daysAgo(18), closedAt: daysAgo(15),
      estimatedHours: 10,
      pmApproverId: pmList[2]?.id ?? pm.id,
      approvalNote: 'Quick win. Loại bỏ được 2h thủ công/tháng.',
      approvedAt: daysAgo(28),
      createdAt: daysAgo(35), tags: ['payroll', 'napas', 'bank-export', 'cr'],
    },
    {
      projectId: p[1], reporterId: pm.id, assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Thêm quy trình onboarding nhân viên mới với checklist tự động',
      description: 'Khi tạo nhân viên mới, hệ thống tự tạo checklist onboarding: cấp badge, setup laptop, đăng ký email, đào tạo an ninh thông tin. Assign cho từng bộ phận.',
      requesterName: 'Bùi Thị Ngọc Ánh — HR Operations',
      severity: 'MEDIUM', status: 'PENDING_REVIEW',
      dueDate: daysFrom(28), estimatedHours: 30,
      createdAt: daysAgo(1), tags: ['onboarding', 'checklist', 'workflow', 'cr'],
    },
    {
      projectId: p[2], reporterId: reporter(7), assigneeId: null,
      itemType: 'ISSUE', isCR: true,
      title: '[CR] Báo cáo chi phí OT theo từng dự án và khách hàng',
      description: 'Finance muốn phân bổ chi phí OT về đúng từng dự án để tính profitability. Hiện OT đang đổ vào chi phí chung công ty.',
      requesterName: 'Trần Hữu Đức — Finance Business Partner',
      severity: 'HIGH', status: 'REJECTED',
      pmApproverId: pm.id,
      approvalNote: 'Cần refactor cost allocation model trước. Estimate 200h là quá lớn cho sprint hiện tại. Defer sang Phase 2.',
      approvedAt: daysAgo(4),
      estimatedHours: 200,
      createdAt: daysAgo(8), tags: ['cost-allocation', 'overtime', 'profitability', 'cr'],
    },
  ];

  // ── Insert ───────────────────────────────────────────────────────────────────
  console.log('📦 BUG entries...');
  for (const b of bugs) {
    await ins({ ...b, taskIds: maybe(pTasks(b.projectId), 0.6) ? pTasks(b.projectId) : [] });
    process.stdout.write('.');
  }

  console.log(`\n\n📋 ISSUE entries...`);
  for (const b of issues) {
    await ins({ ...b, taskIds: maybe(pTasks(b.projectId), 0.5) ? pTasks(b.projectId) : [] });
    process.stdout.write('.');
  }

  console.log(`\n\n🔄 CR (Change Request) entries...`);
  for (const b of crs) {
    await ins(b);
    process.stdout.write('.');
  }

  // ── Tổng kết ─────────────────────────────────────────────────────────────────
  const { rows: totals } = await db.query(`SELECT COUNT(*) FROM bugs`);
  const { rows: byType } = await db.query(
    `SELECT item_type, is_cr, COUNT(*) FROM bugs GROUP BY item_type, is_cr ORDER BY item_type, is_cr`
  );
  const { rows: bySev } = await db.query(
    `SELECT severity, COUNT(*) FROM bugs GROUP BY severity ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END`
  );
  const { rows: byStat } = await db.query(
    `SELECT status, COUNT(*) FROM bugs GROUP BY status ORDER BY status`
  );

  console.log(`\n\n✅ Tổng cộng: ${totals[0].count} records\n`);
  console.log('Theo loại:');
  byType.forEach((r) => {
    const label = r.item_type === 'ISSUE' && r.is_cr ? 'ISSUE (CR)' : r.item_type;
    console.log(`  ${label.padEnd(14)}: ${r.count}`);
  });
  console.log('\nTheo mức độ:');
  bySev.forEach((r) => console.log(`  ${r.severity.padEnd(10)}: ${r.count}`));
  console.log('\nTheo trạng thái:');
  byStat.forEach((r) => console.log(`  ${r.status.padEnd(16)}: ${r.count}`));
}

main()
  .catch((e) => { console.error('\n❌ Error:', e.message); console.error(e.stack); process.exit(1); })
  .finally(() => db.end());
