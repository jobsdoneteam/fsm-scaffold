# FSM Scaffold — AI Agent Build Checklist

This is the step-by-step build guide. Execute each phase in order. Each phase must be fully working before moving to the next.

---

## PHASE 0 — Repo Bootstrap

- [ ] Run `npx create-next-app@latest fsm-scaffold --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`
- [ ] Install all dependencies:
  ```bash
  npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter
  npm install @tanstack/react-query @tanstack/react-table
  npm install zustand
  npm install react-hook-form @hookform/resolvers zod
  npm install resend
  npm install @react-pdf/renderer
  npm install date-fns
  npm install lucide-react
  npm install clsx tailwind-merge class-variance-authority
  npm install bcryptjs && npm install -D @types/bcryptjs
  npm install cmdk react-day-picker
  npm install @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-dialog
  npm install @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-popover
  npm install @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slot
  npm install @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast
  npm install @radix-ui/react-tooltip tailwindcss-animate
  npm install -D ts-node
  npx prisma init
  ```
- [ ] Initialize shadcn: `npx shadcn@latest init`
- [ ] Add all shadcn components:
  ```bash
  npx shadcn@latest add button input label card table badge dialog sheet
  npx shadcn@latest add select textarea checkbox switch tabs toast avatar
  npx shadcn@latest add separator skeleton dropdown-menu popover command
  npx shadcn@latest add scroll-area tooltip alert progress
  ```
- [ ] Copy `config/brand.ts`, `docker-compose.yml`, `Dockerfile`, `.env.example` from repo
- [ ] Copy `prisma/schema.prisma` from repo
- [ ] Run `npx prisma generate`
- [ ] Run `npm run db:push` (requires Postgres running via `docker compose up -d db`)
- [ ] Confirm `npm run dev` starts without errors

---

## PHASE 1 — Core Utilities

- [ ] `lib/db.ts` — Singleton PrismaClient (already in repo)
- [ ] `lib/auth.ts` — NextAuth v5 config:
  - Credentials provider (email + password, bcrypt compare)
  - PrismaAdapter
  - JWT strategy
  - Session callback: include `user.id` and `user.role`
  - Export `{ handlers, auth, signIn, signOut }`
- [ ] `lib/utils.ts` — Utility functions:
  - `cn(...inputs)` — clsx + tailwind-merge
  - `formatCurrency(amount: number): string` — USD with cents
  - `formatDate(date: Date | string): string` — "Jan 15, 2024"
  - `formatDateTime(date: Date | string): string` — "Jan 15, 2024 2:30 PM"
  - `generateJobNumber(): string` — "JOB-2024-0001" using date + sequence
  - `getInitials(name: string): string` — "John Doe" -> "JD"
  - `calculateDuration(start: Date, end: Date): string` — "2h 30m"
- [ ] `lib/validations/` — Zod schemas (one file per entity):
  - `customer.ts` — createCustomerSchema, updateCustomerSchema
  - `property.ts` — createPropertySchema, updatePropertySchema
  - `job.ts` — createJobSchema, updateJobSchema, updateJobStatusSchema
  - `timecard.ts` — clockInSchema, clockOutSchema, manualTimecardSchema
  - `item.ts` — createItemSchema, updateItemSchema (dynamic attributes as z.record)
  - `pricebook.ts` — createPricebookItemSchema, updatePricebookItemSchema
  - `invoice.ts` — generateInvoiceSchema, updateInvoiceSchema
  - `user.ts` — createUserSchema, updateUserSchema, changePasswordSchema
- [ ] `lib/actions/` — Server actions (one file per domain, each returns `{ data, error }`):
  - `customers.ts` — getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer
  - `properties.ts` — getProperties, getProperty, createProperty, updateProperty
  - `jobs.ts` — getJobs, getJob, createJob, updateJob, updateJobStatus, assignTechnician
  - `timecards.ts` — getTimecards, getMyTimecards, createTimecard, approveTimecard, rejectTimecard
  - `items.ts` — getItems, getItem, createItem, updateItem, adjustInventory
  - `pricebook.ts` — getPricebookItems, createPricebookItem, updatePricebookItem
  - `invoices.ts` — getInvoices, getInvoice, generateInvoice, updateInvoice, markPaid
  - `users.ts` — getUsers, createUser, updateUser, deactivateUser

---

## PHASE 2 — Auth Pages

- [ ] `app/api/auth/[...nextauth]/route.ts`:
  ```typescript
  import { handlers } from "@/lib/auth"
  export const { GET, POST } = handlers
  ```
- [ ] `middleware.ts` — Protect dashboard routes:
  - Import `auth` from `@/lib/auth`
  - Redirect unauthenticated users to `/login`
  - Allow `/login`, `/api/auth/**` without auth
- [ ] `app/(auth)/login/page.tsx`:
  - Brand logo at top center
  - Email + password form
  - Uses `signIn` from next-auth, redirect to `/` on success
  - Show error message on failed login
  - No "register" link (admin-only user creation)

---

## PHASE 3 — Layout Shell

- [ ] `components/layout/sidebar.tsx`:
  - Fixed 240px wide on desktop
  - Collapsible to icon-only (64px) with toggle button
  - Mobile: hidden by default, hamburger opens as overlay
  - Brand logo + name at top
  - Nav items with Lucide icons (see list below)
  - Active link highlighted
  - User avatar + name + role at bottom
  - Sign out button
- [ ] `components/layout/nav-link.tsx` — Wrapper with active state detection
- [ ] `app/(dashboard)/layout.tsx` — Wraps all dashboard pages with sidebar + main content area
- [ ] Nav items (icon | label | href | roles):
  - LayoutDashboard | Dashboard | `/` | all
  - Users | Customers | `/customers` | Admin, Dispatcher
  - MapPin | Properties | `/properties` | Admin, Dispatcher
  - Briefcase | Jobs | `/jobs` | all
  - Calendar | Dispatch | `/dispatch` | Admin, Dispatcher
  - Package | Inventory | `/inventory` | Admin, Dispatcher
  - Clock | Timecards | `/timecards` | all (Technician sees only own)
  - BookOpen | Pricebook | `/pricebook` | Admin, Dispatcher
  - FileText | Invoices | `/invoices` | Admin, Dispatcher
  - Settings | Settings | `/settings` | Admin only

---

## PHASE 4 — Dashboard

- [ ] `app/(dashboard)/page.tsx`:
  - Stat cards row (use `components/ui/stat-card.tsx`):
    - Open Jobs (count where status IN [ESTIMATE, SCHEDULED])
    - In Progress (count where status = IN_PROGRESS)
    - Unpaid Invoices (sum total where status IN [SENT, PARTIAL, OVERDUE])
    - Active Technicians Today (count distinct users with clock-in today, no clock-out)
  - Recent Jobs table (last 10 by createdAt):
    - Columns: Job #, Customer, Property, Status badge, Technician(s), Scheduled Date
    - Clicking a row navigates to `/jobs/[id]`
  - All data fetched server-side via server actions

---

## PHASE 5 — Customers Module

- [ ] `app/(dashboard)/customers/page.tsx`:
  - Search input (debounced 300ms, searches name + email + phone)
  - Filter: All / Residential / Commercial / Industrial
  - Table: Name, Type badge, Company, Email, Phone, Properties count, Jobs count, Created
  - "New Customer" button -> `/customers/new`
  - Clicking row -> `/customers/[id]`
- [ ] `app/(dashboard)/customers/new/page.tsx`:
  - Form fields: Name (required), Type (select), Company, Email, Phone, Billing Address, Tags (comma-separated), Tax Exempt (toggle), Tax ID
  - Submit -> createCustomer action -> redirect to `/customers/[id]`
- [ ] `app/(dashboard)/customers/[id]/page.tsx`:
  - Header: Customer name, type badge, edit button
  - Tabs:
    - **Overview**: all fields editable inline or via edit sheet
    - **Contacts**: list of CustomerContact, add/edit/delete inline
    - **Properties**: list of properties, link to each, "Add Property" button
    - **Jobs**: all jobs across all properties, table view
    - **Notes**: CustomerNote list with add form at bottom

---

## PHASE 6 — Properties Module

- [ ] `app/(dashboard)/properties/page.tsx`:
  - Search by address or customer name
  - Table: Address, Customer, City/State, Active Jobs count, Equipment count
  - "New Property" button
- [ ] `app/(dashboard)/properties/new/page.tsx`:
  - Customer selector (searchable combobox)
  - Address fields: Address, City, State, Zip, Country
  - Optional: Name/Label for property
  - Access info: Access Instructions, Gate Code, Key Location, Special Warnings
  - Submit -> createProperty -> redirect to `/properties/[id]`
- [ ] `app/(dashboard)/properties/[id]/page.tsx`:
  - Tabs:
    - **Overview**: address, access instructions, link to Google Maps
    - **Equipment**: list of PropertyEquipment, each showing name, brand, model, serial, install date, warranty; dynamic attributes displayed as key-value pairs; "Add Equipment" button opens sheet
    - **Jobs**: all jobs at this property
    - **Notes**: PropertyNote list
    - **Attachments**: photo/doc grid, upload button

---

## PHASE 7 — Jobs Module

- [ ] `app/(dashboard)/jobs/page.tsx`:
  - Filters: Status (multi-select), Priority, Technician (select), Date range
  - Table: Job #, Title, Customer, Property, Status badge, Priority badge, Technician(s), Scheduled Date, Updated
  - "New Job" button
- [ ] `app/(dashboard)/jobs/new/page.tsx`:
  - Property selector (searchable, shows customer name + address)
  - Title, Description, Job Type (text)
  - Priority (select)
  - Scheduled Date + Start Time + End Time
  - Estimated Duration (minutes, shown as "2 hours 30 min")
  - Assign Technicians (multi-select user picker)
  - Submit -> createJob (generates job number) -> redirect to `/jobs/[id]`
- [ ] `app/(dashboard)/jobs/[id]/page.tsx`:
  - Header: Job number, status badge with change dropdown (logs to JobStatusHistory, sets timestamps)
  - Priority badge, assigned technicians, property + customer link
  - Tabs:
    - **Details**: all fields, editable
    - **Line Items**: table of JobLineItem, add from pricebook (combobox) or custom, edit quantity/price inline, subtotal
    - **Required Items**: checklist of JobRequiredItem (what to bring), confirm checkboxes
    - **Notes**: internal + external notes, add form
    - **Timecards**: timecards linked to this job
    - **Attachments**: photo/doc grid
    - **Invoice**: if invoice exists show summary + link; if not show "Generate Invoice" button
  - Status change -> updateJobStatus action -> creates JobStatusHistory row, sets startedAt (IN_PROGRESS) or completedAt (COMPLETED)

---

## PHASE 8 — Timecards Module

- [ ] `app/(dashboard)/timecards/page.tsx` (Admin/Dispatcher view):
  - Week selector (prev/next week navigation)
  - Technician filter dropdown
  - Weekly grid: rows = technicians, columns = Mon-Sun, cells show total hours per day
  - Below grid: list view of all timecards for selected week/tech
  - Each timecard row: tech name, job (if linked), clock in, clock out, duration, status badge, Approve/Reject buttons
  - Approve -> approveTimecard action; Reject -> rejectTimecard with optional note
- [ ] `app/(dashboard)/timecards/my/page.tsx` (Technician view):
  - Clock In button (disabled if already clocked in)
  - Job selector (optional — which job are you working on?)
  - If clocked in: show elapsed timer (live, JS interval), clock out button
  - Manual entry form: date, clock in time, clock out time, break minutes, job, notes
  - Weekly table of own timecards
- [ ] `app/api/timecards/clock-in/route.ts` (POST):
  - Auth required
  - Body: `{ jobId?: string, notes?: string }`
  - Creates TimeCard with clockIn = now(), status = ACTIVE
  - Returns created timecard
- [ ] `app/api/timecards/clock-out/route.ts` (POST):
  - Auth required
  - Body: `{ timecardId: string, breakMinutes?: number, notes?: string }`
  - Sets clockOut = now(), status = COMPLETED
  - Returns updated timecard

---

## PHASE 9 — Inventory & Tools Module

- [ ] `app/(dashboard)/inventory/page.tsx`:
  - Tabs: **Inventory** | **Tools**
  - Inventory tab:
    - Filter by category, search by name/brand/model/SKU
    - Table: Name, Category, Brand, Model, SKU, Qty on Hand (red if below reorder), Location, Unit Cost
    - "New Item" button
  - Tools tab:
    - Filter by category, assigned user
    - Table: Name, Category, Brand, Model, Serial, Condition badge, Assigned To, Last Service
    - "New Tool" button (same form, isTool=true)
- [ ] `app/(dashboard)/inventory/new/page.tsx`:
  - Category selector -> loads ItemTypeDefinitions for that category
  - Type Definition selector -> loads ItemTypeFields
  - Common fields always shown: Name, Brand, Model Number, Serial Number, SKU, Description
  - If inventory (not tool): Quantity on Hand, Reorder Threshold, Reorder Quantity, Location, Unit Cost, Unit of Measure
  - If tool: Condition, Purchase Date, Last Service Date, Next Service Date, Assign To User
  - Dynamic fields rendered from ItemTypeField definitions (see DynamicItemForm below)
  - Submit -> createItem action
- [ ] `app/(dashboard)/inventory/[id]/page.tsx`:
  - Header: item name, category badge, condition badge (if tool)
  - Tabs:
    - **Details**: all fields, dynamic attributes displayed via ItemTypeField labels
    - **History**: InventoryTransaction list (inventory) or ToolAssignment list (tools)
    - **Jobs**: JobLineItems and JobRequiredItems referencing this item
- [ ] `components/inventory/dynamic-item-form.tsx`:
  - Props: `fields: ItemTypeField[], control: Control, errors: FieldErrors`
  - Uses React Hook Form Controller for each field
  - Renders per FieldType:
    - TEXT -> Input
    - TEXTAREA -> Textarea
    - NUMBER -> Input type="number" with unit label
    - BOOLEAN -> Switch with label
    - SELECT -> Select component with options from field.options
    - MULTI_SELECT -> Checkboxes or multi-select
    - DATE -> date Input
    - URL -> Input type="url"
  - All values stored under `attributes.{fieldKey}` in form state

---

## PHASE 10 — Pricebook Module

- [ ] `app/(dashboard)/pricebook/page.tsx`:
  - Tabs: **Services** | **Parts** (filter by LineItemType)
  - Search by name
  - Filter by category, pricing type, tier
  - Table: Name, Category, Pricing Type, Unit Price, Cost, Margin %, Tier, Active toggle
  - "New Item" button -> inline sheet or `/pricebook/new`
- [ ] `app/(dashboard)/pricebook/[id]/page.tsx` or edit sheet:
  - Fields: Category (select), Linked Item (optional item selector), Name, Description, Pricing Type, Unit Price, Unit Cost, Tier, Active
  - Margin % calculated and displayed (read-only): `((unitPrice - unitCost) / unitPrice * 100).toFixed(1)`

---

## PHASE 11 — Invoicing Module

- [ ] `app/(dashboard)/invoices/page.tsx`:
  - Filter by status, date range, customer
  - Table: Invoice #, Job #, Customer, Total, Status badge, Due Date, Sent At, Paid At
  - Clicking row -> `/invoices/[id]`
- [ ] `app/(dashboard)/invoices/[id]/page.tsx`:
  - Header: Invoice #, status badge, action buttons
  - Customer + property info block
  - Line items table (editable if status = DRAFT):
    - Columns: Type, Description, Qty, Unit Price, Total, Taxable checkbox
    - Add row button
    - Delete row button
  - Totals block: Subtotal, Tax (rate % + amount), **Total**
  - Notes + Terms fields
  - Action buttons:
    - **Send Invoice** (DRAFT -> SENT, sends email via Resend with PDF attachment)
    - **Mark Paid** (-> PAID, sets paidAt)
    - **Download PDF** (GET /api/invoices/[id]/pdf)
    - **Void** (confirmation dialog -> VOID)
- [ ] `lib/actions/invoices.ts` — `generateInvoice(jobId)`:
  - Check no invoice exists for job
  - Copy JobLineItems -> InvoiceLineItems (snapshot, not references)
  - Calculate subtotal, taxAmount (subtotal * taxRate), total
  - Set status = DRAFT, dueDate = today + 30 days
  - Generate invoiceNumber: `INV-{YYYY}-{NNNN}` (padded sequence)
  - Return created invoice
- [ ] `components/invoices/invoice-pdf.tsx`:
  - Uses `@react-pdf/renderer`
  - Sections: brand header (name, logo, contact), customer block (name, address, contact), job info, line items table (type, description, qty, price, total), totals block, notes, payment terms, footer
  - Matches brand colors from `config/brand.ts`
- [ ] `app/api/invoices/[id]/pdf/route.ts`:
  - GET handler, auth required
  - Fetches invoice + line items + job + property + customer
  - Renders PDF via `@react-pdf/renderer` renderToStream
  - Returns with Content-Type: application/pdf, Content-Disposition: attachment

---

## PHASE 12 — Dispatch / Calendar

- [ ] `app/(dashboard)/dispatch/page.tsx`:
  - Week navigation (prev/next, "Today" button)
  - Technician filter dropdown (All or specific tech)
  - Layout: two-panel
    - Left panel (200px): Unscheduled Jobs queue
      - Cards: job #, customer name, title, priority badge
      - HTML5 draggable={true}
    - Right panel: 7-column CSS grid (Mon-Sun)
      - Header row: day names + dates
      - Time rows: 8am to 6pm, hourly
      - Job cards positioned by scheduledStart/scheduledEnd
      - Card content: job #, customer, tech initials circles, status color
      - Drop zone: droppable cells update job's scheduledDate + scheduledStart
  - Clicking any job card opens a Sheet with job detail summary + link to full job page
  - No external calendar library — pure CSS Grid

---

## PHASE 13 — Settings (Admin Only)

- [ ] `app/(dashboard)/settings/page.tsx` — Tabs:
  - **Company**: org name, contact info, logo upload (saves to /public/uploads/logo.png)
  - **Users**:
    - Table: name, email, role badge, status, last login
    - "Invite User" button -> dialog: name, email, role, temp password
    - Edit role + active status inline
  - **Item Categories** (the field builder UI):
    - List of ItemCategory with expand to show ItemTypeDefinitions
    - Add/edit/delete ItemCategory
    - For each category: list ItemTypeDefinitions, add/edit/delete
    - For each type definition: list ItemTypeFields in sortable table
      - Columns: Sort, Field Key, Label, Type, Unit, Required, Filterable, Show in Table, Actions
      - Add field: form with all properties
      - Edit inline
      - Delete with confirmation
  - **Pricebook Categories**: simple CRUD list

---

## PHASE 14 — Shared Components

Build these before or alongside the modules that need them:

- [ ] `components/ui/status-badge.tsx`:
  - JobStatus colors: ESTIMATE=gray, SCHEDULED=blue, IN_PROGRESS=yellow, ON_HOLD=orange, COMPLETED=green, INVOICED=purple, CANCELLED=red
  - InvoiceStatus colors: DRAFT=gray, SENT=blue, PAID=green, PARTIAL=yellow, OVERDUE=red, VOID=gray
  - TimecardStatus colors: ACTIVE=blue, COMPLETED=gray, APPROVED=green, REJECTED=red
- [ ] `components/ui/data-table.tsx`:
  - TanStack Table v8
  - Sortable columns (click header to sort)
  - Pagination (10/25/50 per page)
  - Loading skeleton (shows 5 skeleton rows)
  - Empty state slot
- [ ] `components/ui/stat-card.tsx` — icon, label, value, optional trend
- [ ] `components/ui/empty-state.tsx` — icon, title, description, optional action button
- [ ] `components/ui/page-header.tsx` — title, optional breadcrumb, optional action slot
- [ ] `components/ui/form-section.tsx` — titled section wrapper for form groups
- [ ] `components/ui/user-select.tsx` — searchable combobox of users (filterable by role)
- [ ] `components/ui/customer-select.tsx` — searchable combobox of customers
- [ ] `components/ui/property-select.tsx` — searchable combobox of properties (shows customer name)
- [ ] `components/ui/item-select.tsx` — searchable combobox of items (filterable by category)
- [ ] `components/ui/loading-spinner.tsx` — centered spinner for async states
- [ ] `components/ui/error-message.tsx` — error display with optional retry button
- [ ] `components/ui/confirm-dialog.tsx` — reusable "Are you sure?" dialog with destructive confirm

---

## PHASE 15 — API Routes

- [ ] `app/api/auth/[...nextauth]/route.ts` (done in Phase 2)
- [ ] `app/api/timecards/clock-in/route.ts` (done in Phase 8)
- [ ] `app/api/timecards/clock-out/route.ts` (done in Phase 8)
- [ ] `app/api/uploads/route.ts`:
  - POST, auth required
  - Accepts multipart/form-data with `file` field
  - Validates: max 10MB, allowed types (image/*, application/pdf)
  - Saves to `./public/uploads/{uuid}-{filename}`
  - Returns `{ url: "/uploads/{uuid}-{filename}" }`
- [ ] `app/api/invoices/[id]/pdf/route.ts` (done in Phase 11)

---

## PHASE 16 — Seed Script

- [ ] `prisma/seed.ts`:
  ```typescript
  // Creates minimal bootstrap data only. No demo data.
  // Run with: npm run db:seed

  async function main() {
    // 1. Admin user
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@yourcompany.com'
    const password = process.env.SEED_ADMIN_PASSWORD || 'changeme123'
    const hash = await bcrypt.hash(password, 12)
    await db.user.upsert({
      where: { email },
      create: { email, name: 'Admin', passwordHash: hash, role: 'ADMIN' },
      update: {}
    })

    // 2. Default item categories
    await db.itemCategory.createMany({
      skipDuplicates: true,
      data: [
        { name: 'General Parts', slug: 'general-parts', isConsumable: true },
        { name: 'General Tools', slug: 'general-tools', isConsumable: false },
      ]
    })

    // 3. Default pricebook categories
    await db.pricebookCategory.createMany({
      skipDuplicates: true,
      data: [
        { name: 'Labor', slug: 'labor', sortOrder: 1 },
        { name: 'Parts', slug: 'parts', sortOrder: 2 },
        { name: 'Service Calls', slug: 'service-calls', sortOrder: 3 },
      ]
    })
  }
  ```
- [ ] Run `npm run db:seed` and confirm admin login works

---

## PHASE 17 — Final Checks

- [ ] `npm run typecheck` — zero TypeScript errors
- [ ] `npm run build` — clean build, no errors or warnings
- [ ] `npm run lint` — zero ESLint errors
- [ ] End-to-end smoke test:
  1. Login as admin
  2. Create a customer
  3. Add a property to that customer
  4. Create a job at that property, assign a technician
  5. Clock in on that job (as technician)
  6. Clock out
  7. Approve the timecard (as admin)
  8. Add a line item to the job from pricebook
  9. Change job status to COMPLETED
  10. Generate invoice
  11. Download PDF
  12. Mark invoice as sent
- [ ] Create an item with dynamic attributes (add a type definition with fields first in Settings)
- [ ] `docker compose up` — confirm full stack starts, migrations run, app is reachable
- [ ] Push final commit to `main`

---

## File Structure Reference

```
fsm-scaffold/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── properties/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── jobs/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── dispatch/page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── timecards/
│   │   │   ├── page.tsx
│   │   │   └── my/page.tsx
│   │   ├── pricebook/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── timecards/
│   │   │   ├── clock-in/route.ts
│   │   │   └── clock-out/route.ts
│   │   ├── uploads/route.ts
│   │   └── invoices/[id]/pdf/route.ts
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   └── nav-link.tsx
│   ├── ui/
│   │   ├── status-badge.tsx
│   │   ├── data-table.tsx
│   │   ├── stat-card.tsx
│   │   ├── empty-state.tsx
│   │   ├── page-header.tsx
│   │   ├── form-section.tsx
│   │   ├── user-select.tsx
│   │   ├── customer-select.tsx
│   │   ├── property-select.tsx
│   │   ├── item-select.tsx
│   │   ├── loading-spinner.tsx
│   │   ├── error-message.tsx
│   │   └── confirm-dialog.tsx
│   ├── inventory/
│   │   └── dynamic-item-form.tsx
│   └── invoices/
│       └── invoice-pdf.tsx
├── config/
│   └── brand.ts
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── utils.ts
│   ├── validations/
│   │   ├── customer.ts
│   │   ├── property.ts
│   │   ├── job.ts
│   │   ├── timecard.ts
│   │   ├── item.ts
│   │   ├── pricebook.ts
│   │   ├── invoice.ts
│   │   └── user.ts
│   └── actions/
│       ├── customers.ts
│       ├── properties.ts
│       ├── jobs.ts
│       ├── timecards.ts
│       ├── items.ts
│       ├── pricebook.ts
│       ├── invoices.ts
│       └── users.ts
├── middleware.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── next.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

---

## Notes for AI Agent

- Always check `config/brand.ts` for terminology before hardcoding strings (e.g. use `brand.terms.job` not "Job")
- All server actions return `{ data: T | null, error: string | null }` — never throw
- Use `db` from `lib/db.ts` — never instantiate PrismaClient directly
- All forms use React Hook Form + Zod via `@hookform/resolvers/zod`
- All tables use TanStack Table v8 via `components/ui/data-table.tsx`
- Role checks: use `auth()` from `lib/auth.ts` in server components; `useSession()` in client components
- Never store plain passwords — always bcrypt hash before saving
- `attributes` JSON field: always initialize with `{}`, never null
- Item type fields with `showInTable: true` should appear as columns in the inventory list table
- When adding a new module, add its nav item to `components/layout/sidebar.tsx` and check role guard
