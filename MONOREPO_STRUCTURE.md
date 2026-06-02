# Loop Monorepo Structure

> Cấu trúc monorepo cho phép phát triển FE, BE, Mobile trong một repo nhưng có thể tách độc lập sau này.

## 📁 Cấu trúc chính

```
Loop/
├── apps/
│   ├── web/              → React 18 + Vite (FE)
│   ├── backend/          → NestJS (BE)
│   └── mobile/           → React Native / Expo
├── packages/
│   └── shared/           → Shared types, utils, constants
├── .github/workflows/
│   ├── frontend.yml      → FE CI/CD (triggers when apps/web/* changes)
│   ├── backend.yml       → BE CI/CD (triggers when apps/backend/* changes)
│   ├── mobile.yml        → Mobile CI/CD (triggers when apps/mobile/* changes)
│   └── ci.yml            → Legacy (backward compat)
├── turbo.json            → Turbo repo config
└── MONOREPO_STRUCTURE.md → This file
```

---

## 🎯 Frontend (apps/web/src)

### Cấu trúc module

```
apps/web/src/
├── modules/                          # Business domains
│   ├── shared/                       # Shared across all modules
│   │   ├── components/
│   │   │   ├── ui/                  # Reusable UI atoms (Button, Modal, etc)
│   │   │   ├── layout/              # Layout components
│   │   │   ├── form/                # Form builders & helpers
│   │   │   ├── table/               # Table helpers
│   │   │   └── selects/             # Custom select components
│   │   ├── hooks/                   # Shared hooks (useThemePalette, usePagination)
│   │   ├── store/                   # Zustand stores
│   │   ├── utils/                   # Format, validation, date utils
│   │   └── types/                   # Shared types
│   │
│   ├── auth/
│   │   ├── pages/                   # Auth pages
│   │   ├── components/              # Auth-specific components
│   │   ├── hooks/                   # Auth hooks
│   │   └── utils/                   # Auth utils
│   │
│   ├── hr/
│   │   ├── pages/
│   │   │   ├── employees/
│   │   │   │   ├── EmployeePage.tsx
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── utils/
│   │   │   ├── attendance/
│   │   │   ├── leaves/
│   │   │   └── ... (other HR pages)
│   │   ├── sub-modules/             # Optional: group related pages
│   │   │   ├── employees/
│   │   │   ├── attendance/
│   │   │   └── ...
│   │   ├── components/              # HR shared components
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   │
│   ├── crm/
│   │   ├── pages/
│   │   ├── sub-modules/
│   │   │   ├── contacts/
│   │   │   ├── leads/
│   │   │   └── deals/
│   │   ├── components/
│   │   └── ...
│   │
│   ├── finance/
│   ├── payroll/
│   ├── projects/
│   ├── assets/
│   ├── admin/
│   └── dashboard/
│
├── api/                             # API clients (Axios + TanStack Query)
│   ├── modules/
│   │   ├── employees.ts
│   │   ├── crm.ts
│   │   ├── payroll.ts
│   │   └── ...
│   ├── client.ts                    # Axios instance
│   └── types.ts                     # API response types
│
├── config/                          # App config
│   └── constants.ts
│
├── shared/                          # Deprecated - use @/shared instead
├── hooks/                           # Deprecated - use @/shared/hooks
├── utils/                           # Deprecated - use @/shared/utils
├── store/                           # Deprecated - use @/shared/store
│
├── App.tsx
├── router.tsx                       # Route definitions (no changes needed)
└── main.tsx
```

### Các quy tắc import Frontend

```typescript
// ✅ ĐÚNG
import { useThemePalette } from '@/shared/hooks';
import { PageHeader } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils';
import { myEmployeeApi } from '@/api/modules/employees';
import { EmployeePage } from '@/modules/hr/pages/employees';

// ❌ SAI
import { useThemePalette } from '../../../hooks/useThemePalette';
import { formatCurrency } from '../../../../utils/format';
```

### Path aliases Frontend

```json
// tsconfig.app.json
"paths": {
  "@/*": ["src/*"],
  "@/modules/*": ["src/modules/*"],
  "@/shared/*": ["src/modules/shared/*"],
  "@/api/*": ["src/api/*"],
  "@/config/*": ["src/config/*"]
}
```

---

## 🛠️ Backend (apps/backend/src)

### Cấu trúc module

```
apps/backend/src/
├── modules/                         # Business domains (70+ modules)
│   ├── shared/                      # Shared between modules
│   │   ├── dto/                    # Common DTOs
│   │   ├── filters/                # Common filters
│   │   ├── guards/                 # Common guards (moved to common/)
│   │   ├── interceptors/
│   │   └── utils/
│   │
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── ...
│   │
│   ├── employees/
│   │   ├── employees.controller.ts
│   │   ├── employees.service.ts
│   │   ├── employees.module.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   └── ...
│   │
│   ├── crm/
│   ├── payroll/
│   ├── hr-attendance/
│   ├── hr-profile/
│   ├── ... (60+ more modules)
│   │
│   └── admin/
│       ├── health/
│       ├── announcements/
│       └── ...
│
├── common/                          # App-level shared code
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── require-permission.decorator.ts
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── permission.guard.ts
│   │   ├── tenant.guard.ts
│   │   └── org-scope.interceptor.ts
│   ├── interceptors/
│   ├── pipes/
│   ├── exceptions/
│   ├── dto/
│   │   └── pagination.dto.ts
│   ├── utils/
│   │   ├── org-subtree.ts
│   │   └── employee-include.ts
│   ├── events/
│   │   ├── events.module.ts
│   │   ├── hr-event-bus.service.ts
│   │   └── project-event-bus.service.ts
│   ├── services/
│   │   ├── tenant-aware.service.ts
│   │   └── org-scope.service.ts
│   ├── config/
│   ├── env-validation.ts
│   └── common.module.ts
│
├── prisma/                          # ORM
│   └── prisma.module.ts
│
├── generated/                       # Prisma generated types
│
├── app.module.ts                    # Root module
├── app.controller.ts
├── app.service.ts
└── main.ts
```

### Các quy tắc import Backend

```typescript
// ✅ ĐÚNG
import { AuthModule } from '@/modules/auth/auth.module';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PrismaService } from '@/prisma/prisma.service';

// ❌ SAI
import { AuthModule } from './auth/auth.module';
import { PaginationDto } from './common/dto/pagination.dto';
```

### Path aliases Backend

```json
// tsconfig.json
"paths": {
  "@/*": ["src/*"],
  "@/modules/*": ["src/modules/*"],
  "@/common/*": ["src/common/*"],
  "@/prisma/*": ["src/prisma/*"],
  "@/generated/*": ["src/generated/*"]
}
```

### Quy tắc module NestJS

**Mỗi module phải có:**
- `*.controller.ts` - HTTP endpoints
- `*.service.ts` - Business logic
- `*.module.ts` - Module definition
- `dto/` folder - Request/Response DTOs
- `*.spec.ts` - Tests (optional)

**Cross-module imports:**
- Chỉ import từ module khác qua **module.ts exports**
- Không import trực tiếp từ service/controller của module khác
- Ví dụ: `import { EmployeesModule } from '@/modules/employees/employees.module'`

---

## 📦 Shared Package (packages/shared/src)

Cung cấp:
- **types/models/** - Entity types (Employee, Project, etc)
- **types/api/** - API DTOs & responses
- **constants/** - Status, roles, permissions
- **utils/** - Format, validation, date utilities
- **enums/** - Shared enums

```
packages/shared/src/
├── types/
│   ├── models/
│   │   ├── index.ts          # Re-export all models
│   │   ├── hr.ts             # Employee, Department, Leave, etc
│   │   ├── crm.ts            # Contact, Lead, Deal, etc
│   │   ├── finance.ts        # Invoice, Expense, Budget, etc
│   │   ├── projects.ts       # Project, Task, etc
│   │   └── admin.ts          # Role, Permission, AuditLog, etc
│   ├── api/
│   │   ├── index.ts
│   │   ├── requests.ts       # API request types
│   │   └── responses.ts      # API response types
│   └── domain/               # Domain-specific types
│
├── constants/
│   ├── index.ts
│   ├── status.ts             # Entity status enums
│   ├── roles.ts              # Role enums & labels
│   └── permissions.ts        # Permission enums & labels
│
├── utils/
│   ├── index.ts
│   ├── format.ts             # Currency, phone, email formatting
│   ├── validation.ts         # Email, phone, URL validation
│   ├── date.ts               # Date utilities
│   ├── number.ts             # Math utilities
│   └── string.ts             # String manipulation
│
├── enums.ts                  # Legacy - moved to constants/
├── query-client.ts           # Legacy - TanStack Query client
└── index.ts                  # Main export
```

### Import từ Shared

```typescript
// Frontend
import { Employee, Department } from '@loop/shared';
import { formatCurrency, isValidEmail } from '@loop/shared';
import { Role, Permission } from '@loop/shared';

// Backend
import { Employee, Department } from '@loop/shared';
import { Role } from '@loop/shared';
```

---

## 🔄 CI/CD Workflows

### Workflows tách riêng (Recommended)

**frontend.yml** - Triggers khi:
- `apps/web/**` thay đổi
- `packages/shared/**` thay đổi
- Chạy: lint, typecheck, build, a11y tests

**backend.yml** - Triggers khi:
- `apps/backend/**` thay đổi
- `packages/shared/**` thay đổi
- Chạy: lint, typecheck, build, unit tests

**mobile.yml** - Triggers khi:
- `apps/mobile/**` thay đổi
- `packages/shared/**` thay đổi
- Chạy: lint, typecheck, build, tests

### Legacy ci.yml

- Giữ lại cho backward compatibility
- Chạy tất cả checks (less efficient)
- Recommend: Use per-app workflows thay vào đó

---

## 🚀 Hướng dẫn setup từng app

### Frontend setup

```bash
cd apps/web
npm install
npm run dev     # Start dev server at localhost:5173

# Import paths hoạt động?
# Try: import { useThemePalette } from '@/shared/hooks'
```

### Backend setup

```bash
cd apps/backend
npm install
npm run dev     # Start dev server at localhost:3000

# Import paths hoạt động?
# Try: import { AuthModule } from '@/modules/auth/auth.module'
```

### Shared package

```bash
cd packages/shared
npm install
npm run build   # Build types & utils

# Use in FE/BE
import { formatCurrency, Employee } from '@loop/shared'
```

---

## 📋 Checklist khi tạo module mới

### Frontend module

- [ ] Tạo folder `modules/[module-name]/`
- [ ] Tạo subfolders: `pages/`, `components/`, `hooks/`, `utils/`, `types/`
- [ ] Tạo `pages/[Page].tsx`
- [ ] Tạo `components/[Component].tsx`
- [ ] Tạo `hooks/use[Hook].ts` nếu cần
- [ ] Tạo `utils/index.ts` export utilities
- [ ] Update router.tsx nếu cần
- [ ] Import từ `@/shared/*`, không relative paths

### Backend module

- [ ] Tạo folder `modules/[module-name]/`
- [ ] Tạo `[module-name].controller.ts`
- [ ] Tạo `[module-name].service.ts`
- [ ] Tạo `[module-name].module.ts`
- [ ] Tạo `dto/` folder với DTOs
- [ ] Thêm rate limiting `@Throttle` (auth endpoints: 10/60s, others: 100/60s)
- [ ] Thêm pagination `PaginationDto` cho list endpoints
- [ ] Thêm role guards `@Roles(Role.ADMIN)` nếu cần
- [ ] Import từ `@/modules/`, `@/common/`
- [ ] Import shared types từ `@loop/shared`
- [ ] Update `app.module.ts` imports

### Shared package types

- [ ] Thêm models vào `types/models/[domain].ts`
- [ ] Thêm constants vào `constants/[feature].ts`
- [ ] Thêm utils vào `utils/[category].ts`
- [ ] Export tất cả từ `index.ts`

---

## 🔮 Tách repo sau này

Nếu muốn tách thành polyrepo:

```bash
# Extract FE as separate repo
git filter-branch --subdirectory-filter apps/web -- --all

# Extract BE as separate repo
git filter-branch --subdirectory-filter apps/backend -- --all

# Extract Shared as separate npm package
# Publish to npm registry
```

Nhưng giữ monorepo lâu dài vì:
- Shared types update dễ (không cần npm version)
- Testing FE + BE together
- Deployment coordination simple

---

## 📞 Liên hệ team

- **Frontend lead**: Xem cấu trúc trong `apps/web/src/modules/`
- **Backend lead**: Xem cấu trúc trong `apps/backend/src/modules/`
- **Shared lib maintainer**: Update `packages/shared/` → tất cả sẽ nhận changes
