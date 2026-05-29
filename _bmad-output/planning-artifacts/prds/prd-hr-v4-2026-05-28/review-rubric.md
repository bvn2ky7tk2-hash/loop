# PRD Quality Review — Loop HR v4.0

> Reviewer: Senior PRD Review (AI-assisted)
> Date: 2026-05-29
> Artifacts reviewed: `prd.md` + `addendum.md`

---

## Overall verdict

This is a **well-structured, largely ship-ready PRD** for an enterprise-tier internal HRIS upgrade. The thesis is clear, scope is honestly bounded, and downstream teams (UX, architecture, story-writing) can extract cleanly. The primary deficiencies are: (1) an unresolved architecture decision in the addendum that contradicts the resolution in the main PRD body, (2) shallow "done-ness" on the two highest-risk FRs (FR-10 workflow resolution, FR-29 LeaveBalance recalculation), and (3) success metrics that are adoption-counting rather than outcome-validating. These are fixable before sprint planning.

---

## 1. Decision-readiness — **adequate**

A decision-maker can read this PRD and act. The vision-to-feature trace is coherent; trade-offs (Excel vs XML for D02, acting manager defer, PDF template defer) are surfaced explicitly. Non-goals call out payroll, recruitment, and biometric scope clearly. The 6 OQ decisions are recorded with decision IDs.

### Findings

- **HIGH** — Addendum A2 still says "Cần sign-off từ: Tech Lead / Architect" for the Shift/WorkSchedule architecture, but the main PRD body (§8, OQ-1) declares it "resolved" as D-009 Option B. If the decision is truly resolved, A2 should be updated to reflect that and the decision rationale for Option B (not Option A as the addendum currently recommends) documented. A PM reading only the addendum will believe the architecture is still open. *Fix:* Update A2 to record the final decision (Option B — Timesheet owns Shift/WorkSchedule), strike "Cần sign-off từ", and note the BA recommendation was overridden and why. If sign-off is genuinely still pending, re-open OQ-1 in the main body.

- **MEDIUM** — The note `[NOTE FOR PM]` in §6.2 about D02-LT XML being high-priority for >200-employee customers is buried in Out-of-Scope prose. A decision-maker who skims the PRD will miss it. *Fix:* Surface as a named dependency risk at the top of §11, or add a `RISK-1` entry: "If pilot customer > 200 NV, D02-LT XML may need to be pulled into v4.0 scope; revisit before sprint kickoff."

- **LOW** — No explicit "version/approval" header. The PRD is `status: draft` — but there is no reviewer sign-off block. For an enterprise launch, the document should state who approves it before implementation starts. *Fix:* Add `approved_by` + `approved_date` fields to the YAML frontmatter.

---

## 2. Substance over theater — **strong**

Content is earned throughout. Personas are operationally grounded with real names and concrete contexts (Chị Lan, Anh Hùng, Anh Bình). User journeys include entry state, path, climax, resolution, and edge cases — the UJ-1 edge case ("đơn nghỉ phép chưa xử lý → cảnh báo nhưng không chặn") is particularly useful for engineering. The legal research in A1 is genuine and traceable to specific articles (BLLĐ 2019 Điều 113, 115, 123; QĐ 595/QĐ-BHXH).

### Findings

- **LOW** — SM-5 ("Hồ sơ nhân viên 360° được xem ≥1 lần/tháng/nhân viên") is activity theater, not an outcome. Page views do not validate that the 360° profile solves the pain point (CHRO answering questions in <30 seconds without opening Excel). *Fix:* Replace or supplement with "Số lần HR Staff mở Excel để trả lời câu hỏi về nhân viên giảm ≥ 60% so với baseline" — a harder metric but honest.

- **LOW** — The §0 "Mục đích tài liệu" mentions 6 epics but FR numbering implies 7 feature groups (4.1–4.7) with 33 FRs. The count "6 epic" is inconsistent with the content. *Fix:* Align the opening summary to "7 feature groups / 33 FRs."

---

## 3. Strategic coherence — **strong**

The PRD has a clear thesis: replace email + Excel + Word with a system-of-record where every HR lifecycle event has audit trail, approval workflow, and legal PDF output. The feature arc is tight: Org Structure → Positions → Decisions → 360° Profile → Insurance → Attendance. Each group traces to at least one UJ. The SECONDMENT type (OrgUnit tạm thời, lưu OrgUnit gốc) is a detail that shows the scope was thought through, not padded.

### Findings

- **MEDIUM** — FR-33 (Import lịch sử) is positioned as a feature group (§4.7) equal to Org Structure and HR Decisions, but it is a one-time migration tool. Promoting it to a feature group inflates the backlog and may mislead the team into over-engineering it. *Fix:* Move FR-33 to §6.1 MVP Scope as "Migration tooling" or a separate appendix. Keep it as a stated deliverable but remove it from the feature hierarchy.

- **LOW** — No explicit arc for the Employee self-service experience. UJ-5 covers leave balance; there is no UJ for an Employee reviewing their own 360° profile, checking their BHXH book number, or downloading their own PDF lý lịch nhân sự. These are referenced in the personas (§2.2) but never given a journey. A UX designer building self-service flows will have to guess the interaction model. *Fix:* Add UJ-6 "Nhân viên xem và tải hồ sơ cá nhân của mình" covering FR-15 (sensitive field masking), FR-19 (BHXH), FR-20 (PDF export).

---

## 4. Done-ness clarity — **thin**

Most FRs have testable "Consequences" blocks. The format (what the system does when X happens) is consistently applied. However, the two highest-complexity FRs lack enough specificity for an engineer to know when they are done.

### Findings

- **HIGH** — FR-10 (Workflow phê duyệt): "Approver tự động resolve theo OrgUnit của nhân viên (manager trực tiếp → HR Manager → CEO tùy loại quyết định và policy cấu hình được)" is the most critical business logic in the PRD, but it is described in one sentence with no resolution algorithm. Questions that remain unanswered: (a) Which decision types require CEO approval vs HR Manager only? (b) What happens if manager trực tiếp = the employee themselves (e.g., CEO being transferred)? (c) What is the timeout / escalation policy? (d) Can HR Staff bypass the workflow in exceptional cases, and if so, is it audited? *Fix:* Add a decision-type-to-approver-matrix table (even if approximate) and document at least the CEO self-approval edge case.

- **HIGH** — FR-29 (LeaveBalance calculation): The recalculation triggers ("LeaveRequest được approve/reject, sang năm mới, thay đổi LeavePolicy") are listed but the year-end accrual algorithm is not specified. Key unknowns: (a) Does accrual happen on January 1 for the full year, or pro-rata monthly? (b) If an employee joins on March 15, do they get 12 days, 10 days (10/12 of year), or the first full annual entitlement on their anniversary? (c) When LeavePolicy changes mid-year, is the balance recalculated retroactively or only prospective? *Fix:* Add a "Calculation rules" sub-section under FR-29 with at least 3 worked examples covering new-hire pro-rata, policy mid-year change, and carry-over expiry date enforcement.

- **MEDIUM** — FR-23 (Giảm lao động BHXH): "HR Staff có thể tạo thủ công nếu cần (vd nghỉ không lương dài hạn)" — this manual path has no specified access control or approval requirement. Insurance termination is a legally consequential action; the manual path needs at least a dual-confirmation step. *Fix:* Add consequence: "Manual TERMINATE InsuranceEvent yêu cầu HR Manager confirm; ghi AuditLog với lý do bắt buộc."

- **LOW** — FR-31 (Lock bảng công): "Sau khi lock, không thể chỉnh sửa" — but there is no unlock path described. In practice, payroll errors discovered post-lock require an unlock. *Fix:* Add consequence: "HR Manager có thể unlock bảng công đã lock trong vòng X ngày, ghi AuditLog; sau X ngày cần Admin privilege."

---

## 5. Scope honesty — **strong**

Non-goals are explicit and granular (8 callouts in §5, repeated in §6.2 with defer versions). ASSUMPTION tags are used consistently with A-1 through A-6 collected in §9. The cross-cutting scope separation from Epic 22 (payroll) is clearly articulated in §4.5 preamble. The D-009 to D-013 decision log references give traceability even if the decision log itself is not included.

### Findings

- **MEDIUM** — A2 in the addendum recommends Option A (HR owns Shift/WorkSchedule config) while the PRD body implements Option B (Timesheet owns it). The addendum's recommendation language was never updated after the decision was made. This inconsistency will cause confusion for any team member reading the addendum as a source of truth. Severity elevated because the architecture decision affects which team owns the Timesheet enhancement epic. *Fix:* Same as Decision-readiness Finding 1 — strike A2 recommendation or add explicit "Decision overridden: Option B chosen per D-009."

- **MEDIUM** — The addendum (A1) corrects a naming error: the form is D02-LT, not D02-TS. But the main PRD body inconsistently uses both names: §4.5 heading uses "D02-TS" (FR-25, FR-26 captions), §5 Non-Goals uses "D02-LT XML", §6.2 uses "D02-LT". *Fix:* Standardize to D02-LT throughout the main PRD body. This is a data model concern: if the export file is called D02-TS in code and D02-LT in legal documentation, someone will file the wrong form. See Mechanical Notes.

- **LOW** — FR-33 import assumption "[ASSUMPTION: Lịch sử import không trigger side effects (không tạo SalaryRecord retroactive trừ khi admin chọn)]" uses a parenthetical opt-in ("trừ khi admin chọn") that is not specified further. If the admin can opt-in to retroactive SalaryRecord creation, that is a significant Epic 22 integration risk. *Fix:* Either remove the opt-in clause and make the assumption unconditional, or promote it to an open question/risk with an explicit decision required before implementation.

---

## 6. Downstream usability — **adequate**

FR numbering is globally unique and stable (FR-1 to FR-33) — story writers can reference cleanly. Glossary (§3) is thorough and gives the right level of detail (e.g., distinguishing Position from JobTitle). The integration table in §10 is a strong artifact for architecture. Permission codes in A3 are enumerated with semantic names.

### Findings

- **MEDIUM** — FR-27 (Timesheet integration) splits responsibility mid-feature: "HR module hiển thị danh sách ca/lịch làm việc (read-only) ... Gán WorkSchedule cho nhân viên: thao tác qua HR Profile → gọi Timesheet service API." A UX designer reading this will design an HR screen that writes through to Timesheet. But the Timesheet epic does not yet exist ("cần được tạo song song"). The downstream usability breaks if the Timesheet epic is not created before HR v4.0 stories are written for FR-27, FR-30. *Fix:* Add a hard dependency flag: "FR-27, FR-30 stories BLOCKED until Timesheet enhancement epic is created and `GET /shifts`, `GET /work-schedules`, `POST /employees/{id}/work-schedule` endpoints are spec'd." Consider marking these FRs `[DEPENDS: Timesheet epic TBD]` in the PRD.

- **MEDIUM** — FR-18 salary history visibility rule: "Manager trực tiếp (amount masked, chỉ thấy trend)" — "trend" is undefined. Does the Manager see a line chart with Y-axis values hidden? Percentage change labels? A UX designer needs to know what "masked but trend visible" means concretely. *Fix:* Add one sentence: "Manager thấy biểu đồ line chart với Y-axis ẩn (không có giá trị tuyệt đối), chỉ thấy % thay đổi so với lần trước."

- **LOW** — §3 Glossary defines `D02-LT` correctly but does not distinguish between D02-LT (tăng) and D02-LT (giảm/thay đổi). The addendum A1 shows these are all on the same form (D02-LT covers tăng, giảm, and điều chỉnh as separate sections). The glossary entry should clarify: "D02-LT là một biểu mẫu duy nhất có 3 phần: tăng lao động, giảm lao động, thay đổi mức đóng." *Fix:* Update glossary entry.

- **LOW** — A3 lists 17 permission codes (not 16 as stated in §6.1 and §8 OQ-5). Count: hr:org:read, hr:org:manage, hr:positions:read, hr:positions:manage, hr:decisions:read, hr:decisions:create, hr:decisions:approve, hr:profile:read, hr:profile:full, hr:dependents:manage, hr:insurance:read, hr:insurance:manage, hr:insurance:export, hr:attendance:config, hr:attendance:read, hr:attendance:manage, hr:leave-policy:manage = 17. *Fix:* Correct all references from "16" to "17" or verify one was intentionally collapsed.

---

## 7. Shape fit — **strong**

The PRD shape is well-matched to an enterprise internal HRIS tool. Decision records and audit trails are first-class concerns. Compliance (BLLĐ 2019, QĐ 595) is embedded in FR consequences, not relegated to a boilerplate NFR section. Legal-form specifics (quốc hiệu, tiêu ngữ, watermark CHÍNH THỨC vs BẢN NHÁP) are called out at the right level of detail for an enterprise B2B tool in VN. The 50–500 employee target is operationalized through concrete performance targets (1000-employee list load, 500-employee D02-LT export, 200-node org chart).

### Findings

- **MEDIUM** — There is no rollout or migration strategy for the data model expansion. FR-15 adds ~10 new fields to Employee (idNumber, bankAccount, permanentAddress, etc.), and §6.1 mentions "Migration script: Employee data hiện có → thêm fields nhân thân (optional, không breaking)." But for an enterprise-tier tool, HR needs to know: will existing employee records show empty fields, or will HR be required to backfill before go-live? An empty `idNumber` field on a legal decision PDF is a compliance issue. *Fix:* Add a migration/rollout note: "Phase 1: fields optional (not shown on PDF if empty). Phase 2: HR must backfill before first HrDecision PDF is generated for that employee. Fields required for PDF generation: [list]."

- **LOW** — SM-2 in §7 validates FR-30 and FR-31 but the annotation is wrong: "Validates FR-30, FR-31" should be "Validates FR-28, FR-29" (LeavePolicy and LeaveBalance calculation). FR-30 and FR-31 are AttendanceRecord sync and MonthlyAttendance, unrelated to leave balance accuracy. *Fix:* Correct SM-2 annotation to `(FR-28, FR-29)`.

---

## Mechanical notes

**Glossary drift — D02-LT vs D02-TS:**
The most critical mechanical issue. The addendum explicitly corrects this ("Form đúng là D02-LT, không phải D02-TS"). Main PRD body FR-25 caption reads "D02-TS", FR-26 reads "D02-TS", §10 reads "D02-TS". §5 Non-Goals reads "D02-LT XML". §6.2 reads "D02-LT". The terminology is split 50/50 across the document. This MUST be corrected before stories are written — a developer will name API endpoints and file downloads after the PRD's terminology, and the wrong name will reach the user interface.
*Action:* Global replace D02-TS → D02-LT in prd.md. Confirm with legal/HR stakeholder that D02-LT is the current form code (Addendum A1 states it is).

**Assumption Index roundtrip:**
All 6 assumptions (A-1 to A-6) are cross-referenced from their originating FRs and collected in §9. Roundtrip is clean.

**ID continuity:**
FR-1 to FR-33: sequential and gap-free. Decision IDs D-007 through D-013: referenced but the decision log is external. For downstream usability, at minimum a stub decision log should be linked or included as addendum §A5.

**SM-2 annotation error:**
`Validates FR-30, FR-31` should be `Validates FR-28, FR-29`. (See Shape Fit finding.)

**Permission code count:**
A3 contains 17 codes; §6.1 and §8 say 16. Recount and correct.

**"6 epic" vs "7 feature groups":**
§0 says "6 epic", body has 7 feature groups (§4.1–§4.7). Align.
