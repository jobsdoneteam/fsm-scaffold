# Field Service Management (FSM) Platform — Architecture Plan

## Overview

Two repos to be built:

1. **`fsm-scaffold`** — Clean, sanitized, white-label scaffold. Zero demo data, no branding. Ready to clone and configure for any client (HVAC, plumbing, electrical, landscaping, etc.)
2. **`fsm-demo`** — Fully populated demo with a fictional "Mark Jacob HVAC" brand, realistic seed data, all features wired end-to-end. Used for sales demos and client onboarding.

---

## Confirmed Decisions

| Decision | Choice | Notes |
|---|---|---|
| Deployment | Self-hosted (own server) + GitHub | No Vercel. Docker Compose for dev and prod. |
| Multi-tenancy | Single-tenant per client | One deployment per client. Cleanest isolation. |
| Mobile | Responsive web (PWA) now | React Native Expo companion app in a later phase. |
| Build order | Scaffold first | Demo forks from scaffold, not the other way around. |
| Item schema | Flexible/extensible | Each trade has different fields per item type — see below. |

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + API routes in one repo |
| Language | TypeScript | Enterprise-grade type safety |
| Database | PostgreSQL (self-hosted or managed) | Full control, no vendor lock-in |
| ORM | Prisma | Type-safe queries, clean migrations |
| Auth | NextAuth.js v5 | Self-hosted, flexible, role-based |
| UI | shadcn/ui + Tailwind CSS | Composable, white-label friendly |
| State | Zustand + TanStack Query | Server cache + local UI state |
| Forms | React Hook Form + Zod | Schema-driven validation |
| File storage | Local FS or MinIO (S3-compatible) | Self-hosted, no cloud vendor required |
| Email | Resend | Job dispatching, invoice delivery |
| Deployment | Docker Compose + GitHub Actions | CI/CD to own server |

---

## Flexible Item Schema (Critical Design Decision)

This is the most important architectural decision in the platform. Different trades have fundamentally different data shapes for their equipment, inventory, and tools.

### The Problem

- HVAC: A furnace has BTU rating, SEER, fuel type, refrigerant type, tonnage, filter size
- Plumbing: A water heater has gallon capacity, recovery rate, gas/electric, inlet/outlet size
- Electrical: A panel has amperage, breaker count, 3-phase flag, bus rating
- Landscaping: Equipment has engine size, blade width, fuel type
- A generic "Item" table cannot accommodate all of these without either (a) 50 nullable columns or (b) a mess of JSON blobs

### The Solution: Item Type Definitions + JSON Attributes

Use a hybrid approach:

1. **`ItemCategory`** — Admin-defined categories (e.g. "Furnaces", "Air Handlers", "Refrigerants")
2. **`ItemTypeDefinition`** — Per-category schema: defines which fields exist, their labels, types (text, number, select, boolean, date), and whether required
3. **`Item`** — The actual inventory/tool record, with a `attributes: Json` column storing the values for that item's type definition
4. **`ItemTypeField`** — Rows defining each field in a type definition (name, label, field_type, required, options for selects)

This means:
- Adding a new field to "Furnaces" = add one row to `ItemTypeField`. No migration needed.
- The UI renders the form dynamically from the field definitions.
- JSON attributes are validated against the definition before save (via Zod, built from the definition at runtime).
- Filtering/searching on common fields (model, serial, brand) is still on typed columns.

### Item Table Structure

```
ItemCategory
  id, name, slug, description, icon
  trade_type (HVAC | PLUMBING | ELECTRICAL | GENERAL | ...)
  is_consumable (bool)  -- consumables deplete, tools don't

ItemTypeDefinition
  id, category_id, name, slug
  fields -> [ItemTypeField]

ItemTypeField
  id, type_definition_id
  field_key        -- machine name, e.g. "btu_rating"
  label            -- human name, e.g. "BTU Rating"
  field_type       -- TEXT | NUMBER | BOOLEAN | SELECT | DATE | TEXTAREA
  options          -- Json (for SELECT: ["Single Stage","Two Stage","Modulating"])
  is_required      -- bool
  unit             -- e.g. "BTU/hr", "tons", "gallons"
  sort_order       -- display order in form/table

Item
  id, org_id
  category_id      -- FK to ItemCategory
  type_definition_id -- FK to ItemTypeDefinition
  name             -- human readable name
  brand            -- indexed column (common filter)
  model_number     -- indexed column (common filter)
  serial_number    -- indexed column (common search)
  sku              -- for pricebook linkage
  attributes       -- Json (dynamic fields per type definition)
  -- Inventory-specific:
  quantity_on_hand -- Decimal (null for tools)
  reorder_threshold -- Decimal
  location         -- e.g. "Warehouse", "Van #3"
  unit_cost        -- Decimal
  -- Tool-specific:
  is_tool          -- bool (tracked but not consumed)
  condition        -- EXCELLENT | GOOD | FAIR | NEEDS_SERVICE
  purchase_date    -- Date
  last_service_date -- Date
  assigned_to_user_id -- FK (tools only)
```

### Example: HVAC Furnace Type Definition

```json
ItemTypeDefinition: "Residential Gas Furnace"
Fields:
  - btu_rating       | NUMBER  | "BTU Rating"      | unit: "BTU/hr" | required
  - afue_rating      | NUMBER  | "AFUE %"          | unit: "%"      | required
  - stage_type       | SELECT  | "Stage Type"      | options: ["Single","Two Stage","Modulating"]
  - fuel_type        | SELECT  | "Fuel Type"       | options: ["Natural Gas","Propane"]
  - filter_size      | TEXT    | "Filter Size"     | e.g. "16x25x1"
  - tonnage          | NUMBER  | "Tonnage"         | unit: "tons"
  - refrigerant_type | SELECT  | "Refrigerant"     | options: ["R-410A","R-32","R-22"]
  - install_date     | DATE    | "Install Date"
  - warranty_expiry  | DATE    | "Warranty Expiry"
```

This definition is stored in the DB. The UI builds the form and the table columns from it dynamically.

---

## Core Data Model

### Full Entity Map

```
Organization
  └── Users (Admin | Dispatcher | Technician)

Customer
  ├── has many Contacts (name, phone, email, role)
  ├── has many Properties
  └── has many Notes

Property
  ├── belongs to Customer
  ├── has many Jobs
  ├── has many PropertyEquipment (items installed on site)
  └── has many PropertyNotes

Job
  ├── belongs to Property
  ├── has many JobAssignments (Technician + role)
  ├── Status: ESTIMATE | SCHEDULED | IN_PROGRESS | ON_HOLD | COMPLETED | INVOICED | CANCELLED
  ├── has many JobLineItems (Labor + Parts from Pricebook)
  ├── has many JobRequiredItems (checklist before dispatch)
  ├── has many JobNotes
  ├── has many JobAttachments (photos, docs)
  └── has one Invoice

TimeCard
  ├── belongs to User (Technician)
  ├── belongs to Job (optional — can be non-job time)
  ├── clock_in / clock_out timestamps
  ├── break_minutes
  └── approved_by (Admin/Dispatcher)

Item (see Flexible Item Schema above)
  ├── ItemCategory
  ├── ItemTypeDefinition + ItemTypeFields
  └── Item.attributes (Json)

InventoryTransaction
  ├── item_id
  ├── job_id (optional)
  ├── user_id
  ├── quantity (positive = restock, negative = usage)
  └── reason / note

ToolAssignment
  ├── item_id (where is_tool = true)
  ├── assigned_to_user_id
  ├── job_id (optional)
  ├── assigned_at / returned_at
  └── condition_on_return

Pricebook
  ├── PricebookCategory (Labor, Parts, Service Calls, etc.)
  ├── PricebookItem
  │   ├── name, description
  │   ├── pricing_type: FLAT_RATE | HOURLY | PER_UNIT
  │   ├── unit_price
  │   ├── cost (for margin tracking)
  │   └── tier: RESIDENTIAL | COMMERCIAL | BOTH
  └── linked to Item (for parts pricing)

Invoice
  ├── belongs to Job
  ├── line items (copied from Job at generation time)
  ├── status: DRAFT | SENT | PAID | PARTIAL | OVERDUE | VOID
  ├── due_date
  ├── notes / terms
  └── pdf_url
```

---

## Application Modules

### 1. Customers
- List with search/filter
- Profile: name, type (Residential/Commercial), contacts, tags
- Multiple contacts per customer (name, phone, email, role)
- Activity history (all jobs across all properties)
- Notes

### 2. Properties
- Linked to customer
- Address + optional geo coordinates
- Access instructions (gate code, key box, dog warning, etc.)
- Equipment list (installed items — uses the flexible Item system)
- Service history (all jobs at this property)
- Attachments (permits, warranties, blueprints)

### 3. Jobs (Work Orders)
- Created from a property
- Assign one or many technicians
- Schedule: date, arrival window, estimated duration
- Required items checklist (what to bring — resolved from inventory)
- Status pipeline with timestamps per transition
- Line items: labor + parts (from pricebook)
- Job notes (internal) + customer-visible notes
- Photo attachments
- Completion sign-off

### 4. Dispatch / Calendar
- Week/day calendar view
- Unscheduled job queue (drag to schedule)
- Technician filter
- Color-coded by status

### 5. Inventory & Tools
- Unified item browser with category/type filters
- Dynamic form per item type (rendered from ItemTypeDefinition)
- Stock levels, reorder alerts
- Usage history per item
- Tools: separate view, assignment tracking, condition log

### 6. Timecards
- Clock in/out per job (one tap on mobile)
- Manual entry with approval workflow
- Weekly grid view per technician
- Export CSV for payroll

### 7. Pricebook
- Service and parts catalog
- Flat rate / hourly / per-unit pricing
- Residential vs. commercial tiers
- Used to populate job line items

### 8. Invoicing
- Auto-generated from completed job
- Editable line items before sending
- PDF generation
- Email delivery via Resend
- Payment status tracking

---

## Roles & Permissions

| Role | Access |
|---|---|
| Admin | Full access: all modules, settings, user management |
| Dispatcher | Jobs, scheduling, customers, properties, read-only inventory |
| Technician | Assigned jobs only, clock in/out, inventory usage on jobs |

---

## Repo Structure

```
fsm-scaffold/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Dashboard home
│   │   ├── customers/
│   │   │   ├── page.tsx             # List
│   │   │   ├── [id]/page.tsx        # Detail
│   │   │   └── new/page.tsx
│   │   ├── properties/
│   │   ├── jobs/
│   │   ├── dispatch/
│   │   ├── inventory/
│   │   ├── tools/
│   │   ├── timecards/
│   │   ├── pricebook/
│   │   └── invoices/
│   └── api/
│       ├── customers/
│       ├── properties/
│       ├── jobs/
│       ├── inventory/
│       ├── timecards/
│       ├── pricebook/
│       └── invoices/
├── components/
│   ├── ui/                          # shadcn primitives
│   ├── layout/                      # Sidebar, Header, Breadcrumb
│   ├── customers/
│   ├── properties/
│   ├── jobs/
│   ├── inventory/
│   │   └── DynamicItemForm.tsx      # Renders form from ItemTypeDefinition
│   ├── timecards/
│   └── shared/
│       ├── DataTable.tsx
│       ├── StatusBadge.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── db.ts                        # Prisma client singleton
│   ├── auth.ts                      # NextAuth config + helpers
│   ├── utils.ts
│   ├── item-schema.ts               # Build Zod schema from ItemTypeDefinition at runtime
│   └── validations/                 # Static Zod schemas per entity
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                      # Empty in scaffold, populated in demo
│   └── migrations/
├── config/
│   └── brand.ts                     # Name, logo, colors, feature flags, terminology
├── docker-compose.yml               # Postgres + app
├── .env.example
├── README.md
└── package.json
```

---

## Build Phases

### Phase 1 — Foundation
- [ ] Repo init: Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [ ] Docker Compose: Postgres + app
- [ ] Prisma schema (all entities including flexible item schema)
- [ ] NextAuth: login, session, role middleware
- [ ] Layout: sidebar, nav, responsive shell
- [ ] brand.ts config system

### Phase 2 — Core CRUD
- [ ] Customers module
- [ ] Properties module
- [ ] Jobs module (full status pipeline)
- [ ] Pricebook module

### Phase 3 — Operations
- [ ] Inventory module (dynamic item forms from type definitions)
- [ ] Tools module
- [ ] Timecards module

### Phase 4 — Invoicing
- [ ] Invoice generation from job
- [ ] PDF export
- [ ] Email delivery

### Phase 5 — Dispatch
- [ ] Calendar view
- [ ] Drag-and-drop scheduling
- [ ] Unscheduled queue

### Phase 6 — Demo
- [ ] Fork to fsm-demo
- [ ] Brand config (HVAC theme)
- [ ] Seed data: customers, properties, jobs, inventory type definitions with HVAC fields

### Phase 7 — Reporting & Integrations
- [ ] Dashboard metrics
- [ ] QuickBooks / Stripe (Phase 2 integrations)
- [ ] React Native companion app planning

---

## White-Label Config (brand.ts)

```typescript
export const brand = {
  name: "Your Company",           // "Mark Jacob HVAC"
  tagline: "",
  logo: "/logo.png",
  primaryColor: "#your-hex",
  accentColor: "#your-hex",
  trade: "general",               // "hvac" | "plumbing" | "electrical" | "general"
  terminology: {
    job: "Job",                   // or "Work Order", "Service Call", "Ticket"
    property: "Property",         // or "Site", "Location"
    technician: "Technician",     // or "Tech", "Field Rep"
  },
  features: {
    dispatch: true,
    inventory: true,
    tools: true,
    timecards: true,
    invoicing: true,
    customerPortal: false,        // Phase 2
  },
}
```

---

## GitHub Repos to Create

- `jobsdoneteam/fsm-scaffold` — The clean scaffold (this is built first)
- `jobsdoneteam/fsm-demo` — Forked from scaffold, populated with demo data

Both repos use the same Docker Compose deployment pattern for the self-hosted server.
