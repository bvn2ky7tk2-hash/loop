# Loop Monorepo Restructure Plan

## Goal
Cấu trúc module sạch cho monorepo, có thể tách BE/FE độc lập sau này.

## Phases

### Phase 1: Create Folder Structure (no file move yet)
- Backend: `apps/backend/src/modules/` (move all domain modules here)
- Backend: `apps/backend/src/common/` (shared: decorators, filters, exceptions)
- Frontend: `apps/web/src/modules/` (organize by business domain)
- Frontend: `apps/web/src/shared/` (truly shared UI, hooks, utils)
- Shared: Expand `packages/shared/src/` (types, utils, constants)

### Phase 2-8: Move files, update imports, CI/CD, README

## Status: Starting Phase 1
