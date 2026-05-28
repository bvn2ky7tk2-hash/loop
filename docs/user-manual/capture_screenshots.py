"""
Chụp ảnh từng thao tác cụ thể trên Loop.vn.
Chạy: cd /Users/leophan188/Downloads/Loop && python3 docs/user-manual/capture_screenshots.py
"""
import os, time, re
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

BASE_URL  = "http://localhost:5173"
EMAIL     = "admin@loop.vn"
PASSWORD  = "admin"
OUT       = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
os.makedirs(OUT, exist_ok=True)

W, H = 1440, 900

done, failed = [], []

def shot(page, name, label):
    path = os.path.join(OUT, f"{name}.png")
    page.screenshot(path=path, clip={"x":0,"y":0,"width":W,"height":H})
    size = os.path.getsize(path) // 1024
    print(f"  ✅ {name}.png ({size}KB)  — {label}")
    done.append((name, label))

def wait(page, sel, ms=6000):
    try: page.wait_for_selector(sel, timeout=ms)
    except PWTimeout: pass

def close_modal(page):
    for sel in [".ant-modal-close", ".ant-drawer-close-x", ".ant-drawer-close"]:
        try:
            btn = page.query_selector(sel)
            if btn and btn.is_visible():
                btn.click(); time.sleep(0.6); return
        except: pass

def goto(page, path):
    page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=20000)
    time.sleep(1.2)

def click_first_row_action(page, action_text):
    """Click action button (Sửa/Chi tiết/Xem) trên dòng đầu tiên."""
    try:
        btns = page.query_selector_all(f"button:has-text('{action_text}'), a:has-text('{action_text}')")
        for b in btns:
            if b.is_visible():
                b.click(); time.sleep(1.2); return True
    except: pass
    return False

def click_btn(page, *texts):
    """Thử lần lượt các text cho đến khi click được."""
    for text in texts:
        try:
            btns = page.query_selector_all(f"button:has-text('{text}')")
            for b in btns:
                if b.is_visible():
                    b.click(); time.sleep(1.0); return True
        except: pass
    return False

def select_first_option(page, selector=".ant-select-selector"):
    """Mở select và chọn option đầu tiên."""
    try:
        sel = page.query_selector_all(selector)
        if sel:
            sel[0].click(); time.sleep(0.5)
            opt = page.query_selector(".ant-select-item-option:first-child")
            if opt: opt.click(); time.sleep(1.0); return True
    except: pass
    return False


def main():
    with sync_playwright() as pw:
        br  = pw.chromium.launch(headless=True)
        ctx = br.new_context(viewport={"width": W, "height": H}, locale="vi-VN")
        page = ctx.new_page()

        # ════════════════════════════════════════════════
        # LOGIN
        # ════════════════════════════════════════════════
        print("\n── LOGIN ──")
        goto(page, "/login")
        wait(page, "input[type=password]")
        shot(page, "login_01_trang_dang_nhap", "Trang đăng nhập")

        page.fill("input[type=text],input[type=email]", EMAIL)
        page.fill("input[type=password]", PASSWORD)
        page.click("button[type=submit]")
        wait(page, ".ant-card", 10000)
        time.sleep(1.5)

        # ════════════════════════════════════════════════
        # DASHBOARD
        # ════════════════════════════════════════════════
        print("\n── DASHBOARD ──")
        goto(page, "/")
        wait(page, ".ant-card")
        shot(page, "dashboard_01_tong_quan", "Dashboard tổng quan")

        # ════════════════════════════════════════════════
        # NHÂN SỰ
        # ════════════════════════════════════════════════
        print("\n── NHÂN SỰ ──")
        goto(page, "/personnel")
        wait(page, ".ant-table-tbody")
        shot(page, "nhansu_01_danh_sach", "Nhân sự — danh sách")

        # Mở drawer chi tiết nhân sự (click tên đầu tiên)
        try:
            row = page.query_selector(".ant-table-tbody tr:first-child td:nth-child(2)")
            if row and row.is_visible():
                row.click(); time.sleep(1.2)
                wait(page, ".ant-drawer-content")
                shot(page, "nhansu_02_chi_tiet", "Nhân sự — xem chi tiết")
                close_modal(page)
        except: pass

        # Mở form tạo nhân sự
        if click_btn(page, "Thêm nhân sự", "Tạo nhân sự", "Thêm mới"):
            wait(page, ".ant-modal-content,.ant-drawer-content")
            shot(page, "nhansu_03_them_moi", "Nhân sự — form thêm mới")
            close_modal(page)

        # ════════════════════════════════════════════════
        # DỰ ÁN
        # ════════════════════════════════════════════════
        print("\n── DỰ ÁN ──")
        goto(page, "/projects")
        wait(page, ".ant-table-tbody")
        shot(page, "duán_01_danh_sach", "Dự án — danh sách")

        # Mở form tạo dự án
        if click_btn(page, "Tạo dự án", "Thêm dự án", "Tạo mới"):
            wait(page, ".ant-modal-content")
            shot(page, "duán_02_tao_moi", "Dự án — form tạo mới")
            close_modal(page)

        # Mở chi tiết dự án (click tên dự án đầu tiên)
        try:
            link = page.query_selector(".ant-table-tbody tr:first-child td:first-child a, .ant-table-tbody tr:first-child td:nth-child(2)")
            if link and link.is_visible():
                link.click(); time.sleep(1.2)
                wait(page, ".ant-modal-content,.ant-drawer-content,.ant-tabs")
                shot(page, "duán_03_chi_tiet", "Dự án — chi tiết & thành viên")
                close_modal(page)
        except: pass

        # ════════════════════════════════════════════════
        # TASKS — DANH SÁCH CÔNG VIỆC
        # ════════════════════════════════════════════════
        print("\n── TASKS ──")
        goto(page, "/tasks")
        wait(page, ".ant-select")
        # Chọn dự án đầu tiên
        select_first_option(page)
        wait(page, ".ant-table-tbody,.ant-empty", 5000)
        shot(page, "task_01_danh_sach", "Task — danh sách theo dự án")

        # Mở form tạo task
        if click_btn(page, "Tạo task", "Thêm task", "Tạo mới"):
            wait(page, ".ant-modal-content")
            shot(page, "task_02_tao_moi", "Task — form tạo mới")
            close_modal(page)

        # Mở cập nhật tiến độ (icon trên dòng đầu)
        try:
            progress_btn = page.query_selector(".ant-table-tbody tr:first-child [title*='tiến'], .ant-table-tbody tr:first-child .anticon-edit")
            if not progress_btn:
                progress_btn = page.query_selector(".ant-table-tbody tr:first-child td:last-child button:first-child")
            if progress_btn and progress_btn.is_visible():
                progress_btn.click(); time.sleep(1.0)
                wait(page, ".ant-modal-content,.ant-popover", 3000)
                shot(page, "task_03_cap_nhat_tiendo", "Task — cập nhật tiến độ")
                close_modal(page)
        except: pass

        # Tab phê duyệt
        try:
            tab = page.query_selector("div.ant-tabs-tab:has-text('Phê duyệt'), div.ant-tabs-tab:has-text('phê duyệt')")
            if tab and tab.is_visible():
                tab.click(); time.sleep(1.2)
                shot(page, "task_04_phe_duyet", "Task — tab phê duyệt")
        except: pass

        # ════════════════════════════════════════════════
        # KANBAN
        # ════════════════════════════════════════════════
        print("\n── KANBAN ──")
        goto(page, "/my-tasks")
        wait(page, ".ant-select")
        select_first_option(page)
        time.sleep(1.5)
        shot(page, "kanban_01_board", "Kanban — toàn bộ board")

        # ════════════════════════════════════════════════
        # GANTT / TIMELINE
        # ════════════════════════════════════════════════
        print("\n── GANTT ──")
        goto(page, "/timeline")
        wait(page, ".ant-select")
        select_first_option(page)
        time.sleep(2.0)
        shot(page, "gantt_01_timeline", "Gantt — timeline dự án")

        # ════════════════════════════════════════════════
        # CHI PHÍ
        # ════════════════════════════════════════════════
        print("\n── CHI PHÍ ──")
        goto(page, "/cost")
        wait(page, ".ant-select")
        select_first_option(page)
        time.sleep(1.5)
        shot(page, "chiphi_01_tong_quan", "Chi phí — tổng quan dự án")

        # ════════════════════════════════════════════════
        # BẢNG CÔNG CÁ NHÂN
        # ════════════════════════════════════════════════
        print("\n── BẢNG CÔNG ──")
        goto(page, "/timesheet")
        wait(page, ".ant-card")
        shot(page, "bangcong_01_ca_nhan", "Bảng công — cá nhân tháng hiện tại")

        # ════════════════════════════════════════════════
        # DUYỆT BẢNG CÔNG
        # ════════════════════════════════════════════════
        print("\n── DUYỆT BẢNG CÔNG ──")
        goto(page, "/timesheet/approvals")
        wait(page, ".ant-table,.ant-empty")
        shot(page, "bangcong_02_duyet_ds", "Bảng công — danh sách chờ duyệt")

        # Modal từ chối (click Từ chối nếu có dữ liệu)
        try:
            reject_btn = page.query_selector(".ant-table-tbody tr:first-child button:has-text('Từ chối')")
            if reject_btn and reject_btn.is_visible():
                reject_btn.click(); time.sleep(1.0)
                wait(page, ".ant-modal-content", 3000)
                shot(page, "bangcong_03_tu_choi", "Bảng công — modal từ chối")
                close_modal(page)
        except: pass

        # ════════════════════════════════════════════════
        # CHẤM CÔNG MANAGER
        # ════════════════════════════════════════════════
        print("\n── CHẤM CÔNG MANAGER ──")
        goto(page, "/timesheet/manager")
        wait(page, ".ant-card")
        shot(page, "chamcong_01_realtime", "Chấm công — báo cáo real-time")

        # ════════════════════════════════════════════════
        # BUG LIST
        # ════════════════════════════════════════════════
        print("\n── BUGS ──")
        goto(page, "/bugs")
        wait(page, ".ant-table")
        shot(page, "bug_01_danh_sach", "Bug — danh sách toàn bộ")

        # Mở drawer tạo bug mới
        if click_btn(page, "Tạo Bug", "Tạo bug", "Thêm Bug", "Tạo mới", "Báo cáo Bug"):
            wait(page, ".ant-drawer-content")
            shot(page, "bug_02_tao_moi", "Bug — form tạo mới")
            close_modal(page)

        # Mở drawer chi tiết bug (click vào tiêu đề bug đầu tiên)
        try:
            row = page.query_selector(".ant-table-tbody tr:first-child td:nth-child(2) a, .ant-table-tbody tr:first-child td:nth-child(2)")
            if row and row.is_visible():
                row.click(); time.sleep(1.2)
                wait(page, ".ant-drawer-content", 4000)
                shot(page, "bug_03_chi_tiet", "Bug — xem chi tiết")
                close_modal(page)
        except: pass

        # ════════════════════════════════════════════════
        # MY BUGS
        # ════════════════════════════════════════════════
        print("\n── MY BUGS ──")
        goto(page, "/my-bugs")
        wait(page, ".ant-table,.ant-empty")
        shot(page, "mybug_01_cua_toi", "My Bugs — bug được giao cho tôi")

        # ════════════════════════════════════════════════
        # BUG DASHBOARD
        # ════════════════════════════════════════════════
        print("\n── BUG DASHBOARD ──")
        goto(page, "/bugs/dashboard")
        wait(page, ".recharts-wrapper,.ant-card")
        time.sleep(1.5)
        shot(page, "bugdashboard_01_bieu_do", "Bug Dashboard — biểu đồ phân tích")

        # ════════════════════════════════════════════════
        # PROCESSES
        # ════════════════════════════════════════════════
        print("\n── PROCESSES ──")
        goto(page, "/processes")
        wait(page, ".ant-table,.ant-empty")
        shot(page, "process_01_danh_sach", "Quy trình — danh sách định nghĩa")

        # Mở form tạo quy trình
        if click_btn(page, "Tạo quy trình", "Tạo mới", "Thêm quy trình"):
            wait(page, ".ant-modal-content")
            shot(page, "process_02_tao_moi", "Quy trình — form tạo mới")
            close_modal(page)

        # Mở drawer sửa thông tin quy trình (click Edit trên dòng đầu)
        try:
            edit_btns = page.query_selector_all(".ant-table-tbody tr:first-child button")
            for b in edit_btns:
                if b.is_visible():
                    b.click(); time.sleep(1.2)
                    wait(page, ".ant-drawer-content,.ant-modal-content", 3000)
                    shot(page, "process_03_sua", "Quy trình — sửa thông tin")
                    close_modal(page)
                    break
        except: pass

        # ════════════════════════════════════════════════
        # PROCESS INBOX
        # ════════════════════════════════════════════════
        print("\n── PROCESS INBOX ──")
        goto(page, "/processes/inbox")
        wait(page, ".ant-table,.ant-empty")
        shot(page, "inbox_01_hop_thu", "Quy trình — hộp thư đến")

        # ════════════════════════════════════════════════
        # PROCESS INSTANCES
        # ════════════════════════════════════════════════
        print("\n── PROCESS INSTANCES ──")
        goto(page, "/processes/instances")
        wait(page, ".ant-table,.ant-empty")
        shot(page, "instances_01_dang_chay", "Quy trình — các instance đang chạy")

        # ════════════════════════════════════════════════
        # REPORTS
        # ════════════════════════════════════════════════
        print("\n── REPORTS ──")
        goto(page, "/reports")
        wait(page, ".recharts-wrapper,.ant-card")
        time.sleep(1.5)
        shot(page, "report_01_gio_lam_viec", "Báo cáo — giờ làm việc")

        # Tab tiến độ dự án
        try:
            tabs = page.query_selector_all(".ant-tabs-tab")
            if len(tabs) > 1:
                tabs[1].click(); time.sleep(1.0)
                select_first_option(page)
                time.sleep(1.5)
                shot(page, "report_02_tien_do", "Báo cáo — tiến độ dự án")
            if len(tabs) > 2:
                tabs[2].click(); time.sleep(1.5)
                shot(page, "report_03_theo_don_vi", "Báo cáo — theo đơn vị")
        except: pass

        # ════════════════════════════════════════════════
        # ALERTS
        # ════════════════════════════════════════════════
        print("\n── ALERTS ──")
        goto(page, "/alerts")
        wait(page, ".ant-table,.ant-empty,.ant-tabs")
        shot(page, "alert_01_danh_sach", "Cảnh báo — danh sách cấu hình")

        # Mở modal tạo cảnh báo
        if click_btn(page, "Tạo cảnh báo", "Thêm cảnh báo", "Tạo mới"):
            wait(page, ".ant-modal-content")
            shot(page, "alert_02_tao_moi", "Cảnh báo — form tạo mới")
            close_modal(page)

        # Tab thông báo
        try:
            tab = page.query_selector(".ant-tabs-tab:has-text('Thông báo')")
            if tab and tab.is_visible():
                tab.click(); time.sleep(1.0)
                shot(page, "alert_03_thong_bao", "Cảnh báo — tab thông báo")
        except: pass

        # ════════════════════════════════════════════════
        # SETTINGS
        # ════════════════════════════════════════════════
        print("\n── SETTINGS ──")
        goto(page, "/settings")
        wait(page, ".ant-tabs")
        shot(page, "settings_01_nguoi_dung", "Cài đặt — tab người dùng")

        # Mở form tạo người dùng
        if click_btn(page, "Tạo người dùng", "Thêm người dùng", "Tạo mới"):
            wait(page, ".ant-modal-content")
            shot(page, "settings_02_tao_nguoi_dung", "Cài đặt — form tạo người dùng")
            close_modal(page)

        # Tab tích hợp
        try:
            tabs = page.query_selector_all(".ant-tabs-tab")
            for tab in tabs:
                if "Tích hợp" in (tab.text_content() or ""):
                    tab.click(); time.sleep(1.0)
                    shot(page, "settings_03_tich_hop", "Cài đặt — tích hợp Telegram")
                    break
        except: pass

        # ════════════════════════════════════════════════
        # NHÂN SỰ — Form Sửa (quay lại để chụp form edit)
        # ════════════════════════════════════════════════
        print("\n── NHÂN SỰ — FORM SỬA ──")
        goto(page, "/personnel")
        wait(page, ".ant-table-tbody")
        try:
            edit_btns = page.query_selector_all(".ant-table-tbody tr:first-child button")
            for b in edit_btns:
                txt = b.text_content() or ""
                if "Sửa" in txt or "Edit" in txt or b.query_selector(".anticon-edit"):
                    b.click(); time.sleep(1.2)
                    wait(page, ".ant-modal-content,.ant-drawer-content", 4000)
                    shot(page, "nhansu_04_sua", "Nhân sự — form sửa thông tin")
                    close_modal(page)
                    break
        except: pass

        br.close()

    print(f"\n{'='*50}")
    print(f"✅ Hoàn thành: {len(done)} ảnh")
    print(f"📁 Thư mục: {OUT}")
    if failed:
        print(f"⚠  Thất bại: {len(failed)}")
    print("\nDanh sách ảnh:")
    for name, label in done:
        print(f"  {name}.png — {label}")


if __name__ == "__main__":
    main()
