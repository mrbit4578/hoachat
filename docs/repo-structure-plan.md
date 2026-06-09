# Repo structure plan for `mrbit4578/hoachat`

## Proposed monorepo layout

```text
hoachat/
├─ apps/
│  ├─ web/
│  │  ├─ public/
│  │  └─ src/
│  │     ├─ app/
│  │     │  ├─ router/
│  │     │  ├─ providers/
│  │     │  └─ layouts/
│  │     ├─ components/
│  │     │  ├─ ui/
│  │     │  ├─ common/
│  │     │  ├─ data-table/
│  │     │  ├─ filters/
│  │     │  ├─ forms/
│  │     │  └─ charts/
│  │     ├─ modules/
│  │     │  ├─ auth/
│  │     │  ├─ dashboard/
│  │     │  ├─ chemical-catalog/
│  │     │  ├─ zdhc-compliance/
│  │     │  ├─ inventory-lots/
│  │     │  ├─ inbound/
│  │     │  ├─ outbound/
│  │     │  ├─ stock-ledger/
│  │     │  ├─ reports/
│  │     │  ├─ audit-log/
│  │     │  └─ settings/
│  └─ api/
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ app.module.ts
│     │  ├─ config/
│     │  ├─ common/
│     │  ├─ database/
│     │  ├─ modules/
│     │  └─ jobs/
├─ packages/
│  ├─ ui/
│  ├─ shared/
│  └─ config/
├─ database/
│  ├─ schema/
│  ├─ migrations/
│  ├─ seeds/
│  └─ views/
├─ docs/
│  ├─ modules/
│  ├─ api/
│  ├─ database/
│  └─ repo-structure-plan.md
├─ .env.example
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

## Backend domain notes

### `chemicals`
- Manage chemical master data
- Code, name, supplier, category, usage status

### `zdhc-compliance`
- Track compliance status
- Store evidence and review history
- Flag chemicals blocked or pending review

### `inventory-lots`
- Track stock by `lot.no`
- Store inbound date and relevant date fields
- Keep available quantity and lot state

### `inbound`
- Inbound receipt header and lines
- Import inbound files
- Validate and create lot inventory

### `outbound`
- Outbound receipt header and lines
- Suggest matching lots by `lot.no` and nearest valid date
- Prevent over-issue and invalid lot issue

### `reports`
- Stock by lot
- Stock by date
- Stock by category
- Compliance-linked stock summaries

## Frontend priorities

- Reusable filter bar for all data-entry pages
- Reusable import/export actions for tables
- Fast table search for chemicals, lots, and transactions
- Clear forms for inbound and outbound flows
- Dashboard cards for stock and compliance overview

## Suggested implementation order

1. Repo foundation and shared packages
2. Auth and users
3. Chemical catalog
4. ZDHC compliance
5. Inventory lots
6. Inbound
7. Outbound
8. Stock ledger
9. Reports
10. Audit log
