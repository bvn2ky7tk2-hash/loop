"""
Chuyển đổi User Manual (Markdown) → Word (.docx)
Chạy: python3 docs/user-manual/build_word.py
"""
import re
import os
from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

MANUAL_DIR  = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(MANUAL_DIR, "Loop_User_Manual.docx")
SHOTS_DIR   = os.path.join(MANUAL_DIR, "screenshots")

# Map: heading text (sau khi strip role annotation) → list[(filename, caption)]
# Mỗi heading có thể có nhiều ảnh: danh sách, thêm mới, sửa, chi tiết, v.v.
SCREENSHOT_MAP = {
    "1.1 Đăng Nhập": [
        ("login_01_trang_dang_nhap", "Trang đăng nhập"),
    ],
    "1.2 Dashboard — Trang Tổng Quan": [
        ("dashboard_01_tong_quan", "Dashboard — tổng quan hệ thống"),
    ],
    "2.1 Nhân Sự": [
        ("nhansu_01_danh_sach",  "Nhân sự — danh sách"),
        ("nhansu_03_them_moi",   "Nhân sự — form thêm mới"),
    ],
    "2.2 Quản Lý Dự Án": [
        ("duán_01_danh_sach",  "Dự án — danh sách"),
        ("duán_02_tao_moi",    "Dự án — form tạo mới"),
        ("duán_03_chi_tiet",   "Dự án — chi tiết & thành viên"),
    ],
    "2.3 Danh Sách Task": [
        ("task_01_danh_sach",        "Task — danh sách theo dự án"),
        ("task_02_tao_moi",          "Task — form tạo mới"),
        ("task_03_cap_nhat_tiendo",  "Task — cập nhật tiến độ"),
        ("task_04_phe_duyet",        "Task — tab phê duyệt"),
    ],
    "2.4 Kanban Board — My Tasks": [
        ("kanban_01_board", "Kanban — toàn bộ board"),
    ],
    "2.5 Gantt Chart — Timeline": [
        ("gantt_01_timeline", "Gantt — timeline dự án"),
    ],
    "2.6 Chi Phí Dự Án": [
        ("chiphi_01_tong_quan", "Chi phí — tổng quan dự án"),
    ],
    "3.1 Bảng Công Cá Nhân": [
        ("bangcong_01_ca_nhan", "Bảng công — cá nhân tháng hiện tại"),
    ],
    "3.2 Duyệt Bảng Công": [
        ("bangcong_02_duyet_ds", "Bảng công — danh sách chờ duyệt"),
        ("bangcong_03_tu_choi",  "Bảng công — modal từ chối"),
    ],
    "3.3 Báo Cáo Chấm Công Real-time": [
        ("chamcong_01_realtime", "Chấm công — báo cáo real-time"),
    ],
    "4.2 Danh Sách Bug": [
        ("bug_01_danh_sach", "Bug — danh sách toàn bộ"),
        ("bug_02_tao_moi",   "Bug — form tạo mới"),
        ("bug_03_chi_tiet",  "Bug — xem chi tiết"),
    ],
    "4.3 Bug Của Tôi": [
        ("mybug_01_cua_toi", "My Bugs — bug được giao cho tôi"),
    ],
    "4.4 Dashboard Bug": [
        ("bugdashboard_01_bieu_do", "Bug Dashboard — biểu đồ phân tích"),
    ],
    "5.1.1 Quản Lý Định Nghĩa Quy Trình": [
        ("process_01_danh_sach", "Quy trình — danh sách định nghĩa"),
        ("process_02_tao_moi",   "Quy trình — form tạo mới"),
        ("process_03_sua",       "Quy trình — sửa thông tin"),
    ],
    "5.1.3 Hộp Thư Đến": [
        ("inbox_01_hop_thu", "Quy trình — hộp thư đến"),
    ],
    "5.1.2 Theo Dõi Instance": [
        ("instances_01_dang_chay", "Quy trình — các instance đang chạy"),
    ],
    "5.2 Báo Cáo": [
        ("report_01_gio_lam_viec",  "Báo cáo — giờ làm việc"),
        ("report_02_tien_do",       "Báo cáo — tiến độ dự án"),
        ("report_03_theo_don_vi",   "Báo cáo — theo đơn vị"),
    ],
    "5.3 Cảnh Báo": [
        ("alert_01_danh_sach",  "Cảnh báo — danh sách cấu hình"),
        ("alert_02_tao_moi",    "Cảnh báo — form tạo mới"),
        ("alert_03_thong_bao",  "Cảnh báo — tab thông báo"),
    ],
    "5.4 Cài Đặt Hệ Thống": [
        ("settings_01_nguoi_dung",       "Cài đặt — tab người dùng"),
        ("settings_02_tao_nguoi_dung",   "Cài đặt — form tạo người dùng"),
        ("settings_03_tich_hop",         "Cài đặt — tích hợp Telegram"),
    ],
}

FILES = [
    "00-tong-quan.md",
    "01-bat-dau.md",
    "02-du-an-nhiem-vu.md",
    "03-bang-cong.md",
    "04-bug-issue.md",
    "05-quy-trinh-baocao.md",
]

PRIMARY   = RGBColor(0x5C, 0x6B, 0xC0)  # Loop indigo
DARK_TEXT = RGBColor(0x0F, 0x17, 0x2A)
GRAY_TEXT = RGBColor(0x47, 0x55, 0x69)
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
TH_BG     = "5C6BC0"   # header row hex (no #)
ALT_ROW   = "EEF2FF"


def set_cell_bg(cell, hex_color):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd  = OxmlElement("w:shd")
    shd.set(qn("w:val"),   "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"),  hex_color)
    tcPr.append(shd)


def set_cell_border(cell, **kwargs):
    tc   = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        tag = OxmlElement(f"w:{edge}")
        tag.set(qn("w:val"),   kwargs.get("val",   "single"))
        tag.set(qn("w:sz"),    kwargs.get("sz",    "4"))
        tag.set(qn("w:space"), "0")
        tag.set(qn("w:color"), kwargs.get("color", "CCCCCC"))
        tcBorders.append(tag)
    tcPr.append(tcBorders)


def setup_document(doc):
    sec = doc.sections[0]
    sec.page_width  = Cm(21)
    sec.page_height = Cm(29.7)
    sec.left_margin = sec.right_margin = Cm(2.5)
    sec.top_margin  = sec.bottom_margin = Cm(2.2)

    styles = doc.styles

    # Normal
    n = styles["Normal"]
    n.font.name      = "Calibri"
    n.font.size      = Pt(11)
    n.font.color.rgb = DARK_TEXT
    n.paragraph_format.space_after  = Pt(6)
    n.paragraph_format.line_spacing = Pt(16)

    # Heading 1
    h1 = styles["Heading 1"]
    h1.font.name       = "Calibri"
    h1.font.size       = Pt(20)
    h1.font.bold       = True
    h1.font.color.rgb  = PRIMARY
    h1.paragraph_format.space_before = Pt(18)
    h1.paragraph_format.space_after  = Pt(8)

    # Heading 2
    h2 = styles["Heading 2"]
    h2.font.name       = "Calibri"
    h2.font.size       = Pt(14)
    h2.font.bold       = True
    h2.font.color.rgb  = PRIMARY
    h2.paragraph_format.space_before = Pt(14)
    h2.paragraph_format.space_after  = Pt(4)

    # Heading 3
    h3 = styles["Heading 3"]
    h3.font.name       = "Calibri"
    h3.font.size       = Pt(12)
    h3.font.bold       = True
    h3.font.color.rgb  = GRAY_TEXT
    h3.paragraph_format.space_before = Pt(10)
    h3.paragraph_format.space_after  = Pt(2)

    # Code / monospace
    if "Code" not in [s.name for s in styles]:
        code_style = styles.add_style("Code", 1)
    else:
        code_style = styles["Code"]
    code_style.font.name      = "Courier New"
    code_style.font.size      = Pt(9.5)
    code_style.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)


def add_screenshot(doc, shot_name, caption=""):
    """Chèn một ảnh màn hình có caption."""
    path = os.path.join(SHOTS_DIR, f"{shot_name}.png")
    if not os.path.exists(path):
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after  = Pt(2)
    p.add_run().add_picture(path, width=Cm(15.5))

    if caption:
        cap = doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap.paragraph_format.space_before = Pt(0)
        cap.paragraph_format.space_after  = Pt(12)
        r = cap.add_run(f"▲ {caption}")
        r.font.size      = Pt(9)
        r.font.italic    = True
        r.font.color.rgb = GRAY_TEXT


def add_screenshots_for_heading(doc, lookup_key):
    """Chèn tất cả ảnh thuộc heading key (có thể nhiều ảnh)."""
    entries = SCREENSHOT_MAP.get(lookup_key)
    if not entries:
        return
    for shot_name, caption in entries:
        add_screenshot(doc, shot_name, caption)


def add_cover(doc):
    doc.add_paragraph()
    doc.add_paragraph()

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("LOOP.VN")
    run.font.name      = "Calibri"
    run.font.size      = Pt(36)
    run.font.bold      = True
    run.font.color.rgb = PRIMARY

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = sub.add_run("Hướng Dẫn Sử Dụng")
    r.font.name      = "Calibri"
    r.font.size      = Pt(20)
    r.font.color.rgb = GRAY_TEXT

    doc.add_paragraph()
    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    mr = meta.add_run("Phiên bản 1.0  ·  2026-05-27")
    mr.font.name      = "Calibri"
    mr.font.size      = Pt(11)
    mr.font.color.rgb = GRAY_TEXT
    mr.font.italic    = True

    doc.add_page_break()


def inline_format(para, text):
    """Apply **bold** and `code` inline formatting."""
    parts = re.split(r'(\*\*.*?\*\*|`.*?`)', text)
    for part in parts:
        if part.startswith("**") and part.endswith("**"):
            r = para.add_run(part[2:-2])
            r.bold = True
        elif part.startswith("`") and part.endswith("`"):
            r = para.add_run(part[1:-1])
            r.font.name      = "Courier New"
            r.font.size      = Pt(9.5)
            r.font.color.rgb = RGBColor(0x5C, 0x6B, 0xC0)
        else:
            para.add_run(part)


def add_table(doc, lines, start):
    """Parse markdown table and add styled Word table. Returns next line index."""
    # Collect rows until non-table line
    rows = []
    i    = start
    while i < len(lines) and lines[i].strip().startswith("|"):
        raw = lines[i].strip()
        # Skip separator rows (|---|---|)
        if re.match(r'^\|[-:\s|]+\|$', raw):
            i += 1
            continue
        cells = [c.strip() for c in raw.split("|")[1:-1]]
        rows.append(cells)
        i += 1

    if not rows:
        return i

    cols = len(rows[0])
    tbl  = doc.add_table(rows=len(rows), cols=cols)
    tbl.style = "Table Grid"

    for r_idx, row_data in enumerate(rows):
        for c_idx, cell_text in enumerate(row_data):
            cell = tbl.cell(r_idx, c_idx)
            cell.paragraphs[0].clear()
            p = cell.paragraphs[0]
            # Strip markdown links from cell text
            cell_text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', cell_text)
            if r_idx == 0:
                set_cell_bg(cell, TH_BG)
                r = p.add_run(cell_text)
                r.font.bold       = True
                r.font.color.rgb  = WHITE
                r.font.name       = "Calibri"
                r.font.size       = Pt(10)
            else:
                if r_idx % 2 == 0:
                    set_cell_bg(cell, ALT_ROW)
                inline_format(p, cell_text)
                for run in p.runs:
                    run.font.name = "Calibri"
                    run.font.size = Pt(10)
            set_cell_border(cell)
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after  = Pt(2)

    doc.add_paragraph()
    return i


def add_code_block(doc, code_lines):
    para = doc.add_paragraph(style="Code")
    para.paragraph_format.left_indent  = Cm(0.8)
    para.paragraph_format.space_before = Pt(4)
    para.paragraph_format.space_after  = Pt(4)
    # Light gray shading
    pPr = para._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"),   "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"),  "F1F5F9")
    pPr.append(shd)
    para.add_run("\n".join(code_lines))


def process_file(doc, filepath):
    with open(filepath, encoding="utf-8") as f:
        lines = f.readlines()

    lines = [l.rstrip("\n") for l in lines]
    i     = 0
    in_code_block   = False
    code_lines      = []

    while i < len(lines):
        line = lines[i]

        # ── Code block fence ────────────────────────────────────────────
        if line.strip().startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_lines    = []
            else:
                in_code_block = False
                add_code_block(doc, code_lines)
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # ── Headings ─────────────────────────────────────────────────────
        if line.startswith("# "):
            text = line[2:].strip()
            # Skip the very first H1 of 00-tong-quan (handled by cover)
            if text != "Hướng Dẫn Sử Dụng Loop.vn":
                doc.add_heading(text, level=1)
            i += 1
            continue

        if line.startswith("## "):
            heading_text = line[3:].strip()
            doc.add_heading(heading_text, level=2)
            lookup_key = re.sub(r'\s*\*\(.*?\)\*', '', heading_text).strip()
            add_screenshots_for_heading(doc, lookup_key)
            i += 1
            continue

        if line.startswith("### "):
            heading_text = line[4:].strip()
            doc.add_heading(heading_text, level=3)
            lookup_key = re.sub(r'\s*\*\(.*?\)\*', '', heading_text).strip()
            add_screenshots_for_heading(doc, lookup_key)
            i += 1
            continue

        if line.startswith("#### "):
            p = doc.add_paragraph()
            r = p.add_run(line[5:].strip())
            r.bold           = True
            r.font.color.rgb = GRAY_TEXT
            i += 1
            continue

        # ── Horizontal rule / separator ──────────────────────────────────
        if line.strip() in ("---", "***", "___"):
            doc.add_paragraph()
            i += 1
            continue

        # ── Table ────────────────────────────────────────────────────────
        if line.strip().startswith("|") and "|" in line:
            i = add_table(doc, lines, i)
            continue

        # ── Blockquote ───────────────────────────────────────────────────
        if line.startswith("> "):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(1)
            text = line[2:].strip()
            text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
            r    = p.add_run(text)
            r.font.italic    = True
            r.font.color.rgb = GRAY_TEXT
            i += 1
            continue

        # ── Unordered list ───────────────────────────────────────────────
        if re.match(r'^(\s*)[*\-] ', line):
            indent = len(re.match(r'^(\s*)', line).group(1))
            level  = indent // 2
            text   = re.sub(r'^\s*[*\-] ', '', line)
            text   = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
            p      = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.left_indent  = Cm(0.6 + level * 0.5)
            p.paragraph_format.space_after  = Pt(3)
            p.paragraph_format.space_before = Pt(1)
            inline_format(p, text)
            i += 1
            continue

        # ── Ordered list ─────────────────────────────────────────────────
        if re.match(r'^\s*\d+\. ', line):
            text = re.sub(r'^\s*\d+\. ', '', line)
            text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
            p    = doc.add_paragraph(style="List Number")
            p.paragraph_format.left_indent  = Cm(0.6)
            p.paragraph_format.space_after  = Pt(3)
            p.paragraph_format.space_before = Pt(1)
            inline_format(p, text)
            i += 1
            continue

        # ── Empty line ───────────────────────────────────────────────────
        if line.strip() == "":
            i += 1
            continue

        # ── Normal paragraph ─────────────────────────────────────────────
        # Skip metadata lines (> **Phiên bản...**)
        if line.startswith("> **") and "Phiên bản" in line:
            i += 1
            continue

        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', line)
        p    = doc.add_paragraph()
        inline_format(p, text)
        i += 1


def main():
    doc = Document()
    setup_document(doc)
    add_cover(doc)

    for fname in FILES:
        fpath = os.path.join(MANUAL_DIR, fname)
        if os.path.exists(fpath):
            process_file(doc, fpath)
            # Page break between chapters (but not after last)
            if fname != FILES[-1]:
                doc.add_page_break()
        else:
            print(f"  ⚠ Bỏ qua (không tìm thấy): {fname}")

    doc.save(OUTPUT_FILE)
    print(f"\n✅ Đã tạo: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
