# Feature Adapt Inspiration

Reverse engineer external feature/system and create concrete feature blueprint for Beauty Shop.

## Objective
Use Playwright MCP to explore external system (Shopify, admin panels, SaaS features), extract data models, flows and UX patterns, and translate them into a concrete implementation blueprint for Beauty Shop (Medusa backend, Strapi plugin, or storefront feature).

## Context
- **Uses Playwright MCP** to explore and document external system visually
- **AI analysis** to reverse engineer data models, flows, and business logic
- Maps inspiration to Beauty Shop architecture (Medusa/Strapi/Next.js)
- Generates Feature Blueprint ready for implementation planning
- Reduces manual "translation" work from external inspiration to internal spec

## Problem This Solves

**Without this command:**
- You find great feature (Shopify purchase orders, admin module, workflow system)
- You manually describe every field, button, flow step-by-step to AI
- Easy to forget details (edge cases, states, fields, validations)
- Hard to get AI to "see" the complete system
- Tedious documentation work before you can even start planning

**With this command:**
- Give URL + brief idea
- Playwright explores the system automatically
- AI reverse engineers data model and flows from visuals
- Get structured Feature Blueprint in minutes
- Ready to feed into `/research-feature-patterns` → `/create-implementation-plan`

## Prerequisites
- [ ] Inspiration URL accessible (demo site, documentation, live system)
- [ ] Clear idea of what feature/flow you want to adapt
- [ ] Know where it should live (Medusa backend, Strapi plugin, storefront)
- [ ] Playwright MCP enabled in Cursor

## Input Parameters

Define what to explore:
- [ ] **Inspiration URL:** `{{url}}` (e.g., shopify.com/purchase-orders, notion.so/templates)
- [ ] **Feature name:** `{{feature_name}}` (e.g., Purchase Order System, Inventory Tracking)
- [ ] **What's cool about it:** `{{why_interesting}}` (e.g., "Great flow for receiving stock")
- [ ] **Target system:** `{{target}}` (medusa-backend | strapi-plugin | storefront-feature)
- [ ] **Specific flows to explore:** `{{flows}}` (optional: "Create PO → Approve → Receive")

## Process

### Phase 1: Explore System (Playwright MCP)

**Navigate and capture:**
```
Playwright: Navigate to {{url}}
Wait for: Page fully loaded
```

**Screenshot key views:**
1. **Overview/List view**
   - Table/grid showing all items
   - Columns, filters, search, actions
   - Empty state (if visible)

2. **Detail view**
   - Single item full view
   - All fields and their values
   - Actions/buttons available
   - Status badges, metadata

3. **Create/Edit forms**
   - All form fields
   - Field types (text, dropdown, date, etc.)
   - Validation hints
   - Submit/cancel actions

4. **Key flows** (if specified)
   - Follow user journey (e.g., Create → Submit → Approve)
   - Screenshot each step
   - Note state changes, notifications, redirects

5. **Supporting views**
   - Modals (confirm actions, quick edits)
   - Settings/config pages
   - Filter panels, bulk actions

**Save screenshots:**
- Location: `.design/screenshots/feature-inspiration/{{feature_name}}/`
- Descriptive names: `list-view.png`, `detail-view.png`, `create-form.png`

### Phase 2: Reverse Engineer (AI Analysis)

Analyze screenshots to extract:

#### A. Purpose & Value

**Questions to answer:**
- What problem does this feature solve?
- Who uses it? (user roles)
- What's the core value proposition?
- Why is it better than manual process?

**Extract from:**
- Page titles, descriptions
- Empty states (explain purpose)
- Help text, tooltips
- Marketing copy (if visible)

#### B. Domain Model

**Identify entities:**
- Main entity (e.g., PurchaseOrder)
- Related entities (Supplier, Product, Warehouse, Status)
- Relationships (1:N, N:M)

**Extract from:**
- Table columns hint at properties
- Detail view shows all fields
- Form structure reveals data model
- Dropdowns/selects show related entities

**Example output:**
```
Entities identified:

1. PurchaseOrder
   - id (auto)
   - orderNumber (string, unique)
   - supplier (relation → Supplier)
   - status (enum: draft, submitted, approved, received, closed)
   - expectedDate (date)
   - totalAmount (number)
   - notes (text, optional)
   - createdAt, updatedAt

2. PurchaseOrderLine
   - id (auto)
   - purchaseOrder (relation → PurchaseOrder)
   - product (relation → Product)
   - quantity (number)
   - unitPrice (number)
   - receivedQuantity (number, default 0)

3. Supplier
   - id, name, email, phone, address
```

#### C. User Flows

**Map complete journeys:**

For each major flow (e.g., Create Purchase Order):

```
Flow: Create Purchase Order

1. Start: List view → "Create PO" button
2. Form view:
   - Select supplier (dropdown)
   - Set expected delivery date (date picker)
   - Add order lines:
     - Select product (search/dropdown)
     - Enter quantity
     - Unit price auto-fills or manual
   - Add notes (optional)
3. Submit → "Draft" status
4. Detail view: Can edit or submit for approval
5. Submit for approval → "Submitted" status
6. (Admin) Approve → "Approved" status
7. Receive stock:
   - Enter received quantities per line
   - Partial receive allowed
8. When all received → "Closed" status

Edge cases:
- Cancel at any stage → "Cancelled" status
- Edit only allowed in "Draft"
- Delete only if never submitted
```

#### D. UX Patterns & Components

**Document UI structure:**

**List view:**
- Columns: [Order #, Supplier, Status, Date, Amount, Actions]
- Filters: [Status, Date range, Supplier]
- Search: By order number or supplier name
- Bulk actions: [Export, Delete drafts]
- Pagination: 50 per page

**Detail view:**
- Header: Order # + Status badge
- Sections:
  1. Supplier info (name, contact)
  2. Order details (dates, amounts)
  3. Line items (table)
  4. History/timeline (status changes)
- Actions: [Edit, Submit, Approve, Receive, Cancel]
  - Conditional based on status

**Forms:**
- Layout: 2-column on desktop, stacked mobile
- Validation: Real-time, inline errors
- Required fields: Marked with *
- Submit: Primary button, "Save draft" secondary

#### E. Business Logic & Rules

**Extract implicit rules:**
- Who can do what? (permissions)
- When are actions available? (state machine)
- Validations (e.g., "quantity > 0", "expected date in future")
- Calculations (e.g., "line total = quantity × price")
- Notifications/side effects (e.g., "email supplier on submit")

### Phase 3: Map to Beauty Shop Architecture

Based on `{{target}}`, determine implementation:

#### If Target: Medusa Backend

**Custom module structure:**
```
beauty-shop/src/modules/purchase-orders/
  ├── models/
  │   ├── purchase-order.ts
  │   └── purchase-order-line.ts
  ├── services/
  │   └── purchase-order.ts
  ├── repositories/
  │   └── purchase-order.ts
  ├── workflows/
  │   ├── create-purchase-order.ts
  │   ├── approve-purchase-order.ts
  │   └── receive-stock.ts
  └── api/
      └── routes/
          └── admin/
              └── purchase-orders.ts
```

**Database tables:**
- Use Medusa conventions (id, created_at, updated_at, deleted_at)
- Foreign keys to existing tables (products, etc.)

**Integration points:**
- Link to Inventory (update stock on receive)
- Link to Products (select products in lines)
- Permissions via Medusa admin roles

#### If Target: Strapi Plugin

**Plugin structure:**
```
beauty-shop-cms/src/plugins/purchase-orders/
  ├── admin/
  │   └── src/
  │       └── components/
  ├── server/
  │   ├── content-types/
  │   │   ├── purchase-order/
  │   │   └── purchase-order-line/
  │   ├── controllers/
  │   ├── services/
  │   └── routes/
  └── strapi-admin.js
```

**Content types:**
- purchase-order (collection)
- purchase-order-line (collection, relation to purchase-order)
- Custom lifecycle hooks for status changes

#### If Target: Storefront Feature

**Next.js structure:**
```
beauty-shop-storefront/src/
  ├── app/(admin)/purchase-orders/
  │   ├── page.tsx (list)
  │   ├── [id]/page.tsx (detail)
  │   └── new/page.tsx (create)
  ├── modules/purchase-orders/
  │   ├── components/
  │   ├── actions/ (server actions)
  │   └── types/
  └── lib/data/purchase-orders/ (API calls)
```

**Authentication:**
- Requires admin/staff role
- Use existing Clerk integration

### Phase 4: Generate Feature Blueprint

Create structured markdown document:

## Feature Blueprint Output

```markdown
# Feature Blueprint: {{feature_name}}

**Generated from:** {{url}}
**Target system:** {{target}}
**Date:** {{date}}

---

## 1. Executive Summary

**What:** Brief description of feature
**Why:** Problem it solves, value it provides
**Who:** User roles who interact with it
**Where:** {{target}} (Medusa/Strapi/Storefront)

---

## 2. Problem & Value Proposition

### Problem
[What manual process or pain point does this solve?]

### Value
- Benefit 1
- Benefit 2
- Benefit 3

### Success Metrics
- Metric 1 (e.g., "reduce time spent on X by 50%")
- Metric 2

---

## 3. User Roles & Permissions

| Role | Can View | Can Create | Can Edit | Can Delete | Can Approve |
|------|----------|------------|----------|------------|-------------|
| Admin | ✅ All | ✅ | ✅ | ✅ | ✅ |
| Staff | ✅ Own | ✅ | ✅ Own | ❌ | ❌ |
| Viewer | ✅ All | ❌ | ❌ | ❌ | ❌ |

---

## 4. Domain Model

### Entities

#### PurchaseOrder
- **id**: UUID (PK)
- **orderNumber**: string (unique, auto-generated: PO-YYYY-####)
- **supplierId**: UUID (FK → suppliers)
- **status**: enum (draft, submitted, approved, receiving, received, cancelled)
- **expectedDate**: date
- **totalAmount**: decimal (calculated)
- **notes**: text (optional)
- **createdBy**: UUID (FK → users)
- **approvedBy**: UUID (FK → users, nullable)
- **approvedAt**: timestamp (nullable)
- **createdAt**: timestamp
- **updatedAt**: timestamp

#### PurchaseOrderLine
- **id**: UUID (PK)
- **purchaseOrderId**: UUID (FK → purchase_orders)
- **productId**: UUID (FK → products)
- **quantity**: integer (> 0)
- **unitPrice**: decimal
- **receivedQuantity**: integer (default 0, <= quantity)
- **lineTotal**: decimal (calculated: quantity × unitPrice)

#### Supplier (may exist or needs creation)
- **id**: UUID (PK)
- **name**: string
- **email**: string
- **phone**: string (optional)
- **address**: text (optional)

### Entity Relationships

```
PurchaseOrder 1:N PurchaseOrderLine
PurchaseOrder N:1 Supplier
PurchaseOrder N:1 User (creator)
PurchaseOrder N:1 User (approver)
PurchaseOrderLine N:1 Product
```

---

## 5. User Flows

### Flow 1: Create Purchase Order

**Actor:** Staff or Admin

**Steps:**
1. Navigate to Purchase Orders list
2. Click "Create Purchase Order"
3. Select supplier from dropdown
4. Set expected delivery date
5. Add order lines:
   a. Search/select product
   b. Enter quantity
   c. Unit price auto-fills from product or manual override
   d. Repeat for each product
6. Optionally add notes
7. Click "Save Draft" → Status: draft
8. Review in detail view
9. Click "Submit for Approval" → Status: submitted

**Validations:**
- Supplier required
- Expected date must be in future
- At least 1 order line required
- Quantity > 0
- Unit price > 0

**Edge cases:**
- Cancel during creation → discard
- Save draft → can edit later
- Auto-calculate totals as lines added

---

### Flow 2: Approve Purchase Order

**Actor:** Admin

**Precondition:** Status = submitted

**Steps:**
1. Admin receives notification (optional)
2. Navigate to PO detail
3. Review supplier, lines, total
4. Click "Approve" → Status: approved
5. Email sent to supplier (optional)

**Alternative:** Reject
- Click "Reject"
- Add rejection reason
- Status → draft
- Creator notified

---

### Flow 3: Receive Stock

**Actor:** Staff or Admin

**Precondition:** Status = approved

**Steps:**
1. Open PO detail
2. Click "Receive Stock"
3. For each line:
   - Enter received quantity (can be partial)
4. Click "Confirm Receipt"
5. If all lines fully received → Status: received
6. If partial → Status: receiving (can receive more later)
7. Inventory updated: stock_quantity += receivedQuantity

**Edge cases:**
- Received quantity > ordered → warning, allow override
- Multiple partial receives allowed
- Can mark line as "won't receive" if supplier short

---

## 6. UX/UI Specifications

### List View (Purchase Orders)

**Layout:** Table

**Columns:**
- Order # (link to detail)
- Supplier
- Status (badge with color)
- Expected Date
- Total Amount (DKK)
- Actions (dropdown: View, Edit, Cancel)

**Filters:**
- Status (multi-select)
- Date range (created, expected)
- Supplier (dropdown)

**Search:** By order number or supplier name

**Actions:**
- Primary: "Create Purchase Order" button
- Bulk: Export to CSV, Delete drafts

**Empty state:** "No purchase orders yet. Create your first one."

---

### Detail View

**Header:**
- Order number (large)
- Status badge
- Actions: [Edit] [Submit] [Approve] [Receive] [Cancel]
  - Conditional visibility based on status + role

**Sections:**

1. **Order Information**
   - Supplier (name, contact)
   - Expected delivery date
   - Created by (user name, date)
   - Approved by (if approved)
   - Notes

2. **Order Lines** (table)
   - Columns: Product, Quantity, Unit Price, Received, Line Total
   - Footer: Total Amount

3. **History/Timeline** (optional)
   - Created → Submitted → Approved → Received
   - Timestamps and actors

---

### Create/Edit Form

**Layout:** 2-column (desktop), stacked (mobile)

**Fields:**
- Supplier* (searchable dropdown)
- Expected Date* (date picker, min: tomorrow)
- Notes (textarea, optional)
- **Order Lines** (repeatable):
  - Product* (searchable dropdown)
  - Quantity* (number input, min: 1)
  - Unit Price* (number input, min: 0.01)
  - [Remove line button]
- [Add line button]

**Actions:**
- Primary: "Save Draft" or "Submit for Approval"
- Secondary: "Cancel"

**Validation:** Real-time, inline errors

---

## 7. Business Logic & Rules

### Status State Machine

```
draft → submitted → approved → receiving → received
  ↓                    ↓
cancelled          cancelled
```

**State transitions:**
- draft → submitted: Creator action, requires validation
- submitted → approved: Admin action
- submitted → draft: Admin reject
- approved → receiving: First partial receive
- receiving → received: All lines fully received
- Any → cancelled: Admin action (except received)

**Edit permissions:**
- draft: Can edit all fields
- submitted: Read-only (until rejected)
- approved+: Read-only

**Delete permissions:**
- draft: Can delete
- Other statuses: Cannot delete (must cancel)

### Calculations

```typescript
lineTotal = quantity × unitPrice
totalAmount = sum(all lineTotals)
```

### Inventory Integration (if target: Medusa)

On "Receive Stock":
```typescript
for each line:
  product.stock_quantity += line.receivedQuantity
```

### Notifications (optional, future)
- Creator: PO approved, PO rejected
- Admin: New PO submitted
- Supplier (external): PO approved (email)

---

## 8. Implementation in Beauty Shop

### Target: {{target}}

[Specific guidance based on target system]

#### Medusa Backend Module

**Files to create:**
```
src/modules/purchase-orders/
  ├── models/
  │   ├── purchase-order.ts
  │   └── purchase-order-line.ts
  ├── migrations/
  │   └── YYYYMMDDHHMMSS-create-purchase-orders.ts
  ├── services/
  │   └── purchase-order.ts
  ├── repositories/
  │   └── purchase-order.ts
  ├── workflows/
  │   ├── create-purchase-order.ts
  │   ├── approve-purchase-order.ts
  │   └── receive-stock.ts
  └── api/
      └── admin/
          └── purchase-orders/
              └── route.ts
```

**Database migrations:**
- Create `purchase_orders` table
- Create `purchase_order_lines` table
- Add indexes (supplier_id, status, created_at)

**API endpoints:**
- `GET /admin/purchase-orders` (list, with filters)
- `GET /admin/purchase-orders/:id` (detail)
- `POST /admin/purchase-orders` (create)
- `PUT /admin/purchase-orders/:id` (update, draft only)
- `POST /admin/purchase-orders/:id/submit` (submit for approval)
- `POST /admin/purchase-orders/:id/approve` (approve, admin only)
- `POST /admin/purchase-orders/:id/receive` (receive stock)
- `DELETE /admin/purchase-orders/:id` (delete draft)
- `POST /admin/purchase-orders/:id/cancel` (cancel)

**Integration points:**
- `ProductService`: Lookup products for lines
- `InventoryService`: Update stock on receive
- `UserService`: Track creator, approver

---

## 9. Data Validation Rules

### PurchaseOrder
- orderNumber: Auto-generated, format PO-YYYY-####
- supplierId: Required, must exist
- status: Enum validation
- expectedDate: Required, must be future date
- totalAmount: Auto-calculated, read-only
- notes: Max 1000 characters

### PurchaseOrderLine
- purchaseOrderId: Required, must exist
- productId: Required, must exist in products table
- quantity: Required, integer, min 1
- unitPrice: Required, decimal, min 0.01
- receivedQuantity: Integer, min 0, max quantity

---

## 10. Risks & Considerations

### Technical Risks
- **Inventory sync:** If receiving fails mid-way, need transaction rollback
- **Concurrent edits:** Two admins approving simultaneously
- **Performance:** Large POs with 100+ lines

**Mitigations:**
- Use database transactions for stock updates
- Optimistic locking or status check before state change
- Pagination for line items in UI

### Business Risks
- **Supplier management:** Need supplier database first?
  - Solution: Start simple, just store name/email in PO
- **Multi-warehouse:** Not handled in v1
  - Solution: Single warehouse assumption, extend later
- **Currency:** Assuming DKK
  - Solution: Add currency field if multi-currency needed

### Security
- **Permissions:** Admin-only approval, staff can create/view own
- **Data privacy:** Supplier info, order amounts (internal only)
- **Audit log:** Track who did what when (use Medusa's built-in)

---

## 11. Open Questions

- [ ] Do we need supplier management, or just store supplier info in PO?
- [ ] Should we notify suppliers via email when PO approved?
- [ ] Do we need PDF export of PO for sending to suppliers?
- [ ] Should inventory update be automatic, or require manual confirmation?
- [ ] Do we need multi-warehouse support? (probably not v1)
- [ ] Are partial receives common, or always full receive?

---

## 12. Out of Scope (v1)

- ❌ Supplier management module (complex address book)
- ❌ Email integration (notify suppliers)
- ❌ PDF generation for PO
- ❌ Multi-warehouse / locations
- ❌ Returns/refunds of received stock
- ❌ Budget tracking / approval limits
- ❌ Recurring/auto POs

---

## 13. Next Steps

### Immediate Actions

1. **Validate assumptions**
   - Review this blueprint with team
   - Answer open questions
   - Decide on MVP scope

2. **Research internal patterns**
   ```
   /research-feature-patterns purchase order system
   ```
   - Look for similar CRUD patterns in codebase
   - Identify reusable components (tables, forms, status badges)
   - Check existing Medusa modules for conventions

3. **Create implementation plan**
   ```
   /create-implementation-plan
   ```
   - Break down into phases
   - Estimate effort
   - Identify dependencies (supplier system?)

4. **Create Linear issue**
   ```
   /create-linear-issue
   ```
   - Use this blueprint as context
   - Add to appropriate project/sprint
   - Assign and prioritize

### Implementation Order (suggested)

**Phase 1: Data Foundation**
- Database schema + migrations
- Basic models + repositories
- API endpoints (CRUD)

**Phase 2: Core Flows**
- Create PO (draft)
- Submit for approval
- Approve PO

**Phase 3: Inventory Integration**
- Receive stock workflow
- Update inventory
- Handle partial receives

**Phase 4: UI/UX**
- Admin list view
- Detail view
- Create/edit forms

**Phase 5: Polish**
- Permissions + roles
- Validation improvements
- Empty states, loading states
- Tests

---

## 14. Screenshots Reference

See captured screenshots for visual reference:
- `.design/screenshots/feature-inspiration/{{feature_name}}/`

**Files:**
- `list-view.png` - Overview of all POs
- `detail-view.png` - Single PO full details
- `create-form.png` - New PO creation form
- `receive-stock.png` - Receiving stock interface
- `flow-1-create.png` - Create flow screenshot
- `flow-2-approve.png` - Approval flow screenshot

---

## 15. Acceptance Criteria (for future Linear issue)

### Must Have
- [ ] Create purchase order (draft status)
- [ ] Add/remove/edit order lines
- [ ] Submit for approval
- [ ] Admin can approve/reject
- [ ] Receive stock (full or partial)
- [ ] Update inventory on receive
- [ ] List view with filters (status, supplier)
- [ ] Detail view with all info
- [ ] Permissions (staff vs admin)

### Should Have
- [ ] Order number auto-generation
- [ ] Search by order # or supplier
- [ ] Cancel PO
- [ ] Timeline/history of status changes
- [ ] Validation (quantities, dates)

### Nice to Have
- [ ] Export to CSV
- [ ] Bulk actions
- [ ] Email notifications
- [ ] Mobile-responsive UI

### Won't Have (v1)
- Supplier management module
- PDF export
- Multi-warehouse
- Recurring POs

---

**End of Feature Blueprint**
```

---

## Output Format

After running command, provide:

### 1. Summary

```
🎯 Feature Analyzed: {{feature_name}}
📸 Screenshots: X views captured
🏗️ Target: {{target}}
⏱️ Time taken: ~Y minutes
```

### 2. Key Findings

**What we learned:**
- Main entities: [list]
- Core flows: [list]
- Complexity: [low/medium/high]
- Similar to: [existing Beauty Shop feature, if any]

**Implementation estimate:**
- Backend work: [X days]
- Frontend work: [X days]
- Total: [X-Y days]

### 3. Generated Artifact

```
✅ Feature Blueprint created:
   📄 .design/feature-blueprints/{{feature_name}}.md

📸 Screenshots saved:
   📁 .design/screenshots/feature-inspiration/{{feature_name}}/
```

### 4. Recommended Next Commands

```bash
# 1. Research similar patterns in codebase
/research-feature-patterns {{feature_name}}

# 2. Create detailed implementation plan
/create-implementation-plan
# Use feature blueprint as input

# 3. Create Linear issue
/create-linear-issue
# Title: Implement {{feature_name}}
# Attach feature blueprint
```

---

## Example Session

```
You: /feature-adapt-inspiration

URL: https://www.shopify.com/admin-demo/purchase-orders
Feature: Purchase Order System
Why interesting: Great flow for managing inventory purchases from suppliers
Target: medusa-backend
Flows: Create PO, Approve, Receive stock

---

Cursor:

🎯 EXPLORING FEATURE: Purchase Order System

📸 Phase 1: Capturing with Playwright...

Navigating to: https://www.shopify.com/admin-demo/purchase-orders
✅ Screenshot: list-view.png (Purchase Orders table)
✅ Screenshot: detail-view.png (PO #1234 details)

Clicking "Create Purchase Order"...
✅ Screenshot: create-form.png (New PO form)

Following flow: Create → Submit → Approve...
✅ Screenshot: flow-1-create.png
✅ Screenshot: flow-2-submit.png
✅ Screenshot: flow-3-approve.png

Exploring "Receive Stock" feature...
✅ Screenshot: receive-stock.png

Total screenshots: 7 views captured
Saved to: .design/screenshots/feature-inspiration/purchase-order-system/

---

🔍 Phase 2: Reverse Engineering...

Analyzing UI structure and extracting patterns...

Entities identified:
- PurchaseOrder (main entity)
- PurchaseOrderLine (order lines)
- Supplier (referenced)
- Product (referenced)

Status flow detected:
draft → submitted → approved → receiving → received
        ↓                ↓
    cancelled      cancelled

Core fields extracted from UI:
- orderNumber (auto: PO-2025-0001)
- supplier (dropdown: 15 suppliers visible)
- expectedDate (date picker)
- lines: product, quantity, unitPrice, receivedQuantity
- totalAmount (calculated)
- status (badge with 6 states)
- notes (optional textarea)

User flows mapped:
1. Create PO (7 steps)
2. Submit for approval (2 steps)
3. Approve (admin, 3 steps)
4. Receive stock (partial/full, 5 steps)

UX patterns:
- Table with 7 columns + actions
- Filters: Status, Date, Supplier
- Detail view: 3 sections (info, lines, timeline)
- Form: 2-column layout, repeatable lines
- Conditional actions based on status

---

🏗️ Phase 3: Mapping to Beauty Shop (Medusa Backend)...

Recommended structure:
- Custom Medusa module: /src/modules/purchase-orders/
- 2 database tables (purchase_orders, purchase_order_lines)
- 8 API endpoints (CRUD + workflows)
- Integration with existing ProductService, InventoryService

Complexity assessment: Medium
- Database: 2 tables, straightforward schema
- API: Standard CRUD + 3 workflows (submit, approve, receive)
- Business logic: State machine + inventory update
- Frontend: Admin UI with table + forms

Estimated effort:
- Backend (models, API, workflows): 3-4 days
- Frontend (admin UI): 2-3 days
- Testing + polish: 1-2 days
- Total: 6-9 days (1 developer)

---

✅ Phase 4: Feature Blueprint Generated

📄 Created: .design/feature-blueprints/purchase-order-system.md

Blueprint includes:
✅ Executive summary (problem, value, users)
✅ Domain model (2 main entities, 1 related)
✅ Data model (all fields + types + validations)
✅ 3 detailed user flows (create, approve, receive)
✅ UX specifications (list, detail, forms)
✅ Business logic (state machine, permissions, calculations)
✅ Medusa implementation guide (files, migrations, API)
✅ Risks & open questions
✅ Out of scope (v1)
✅ Next steps & acceptance criteria

📸 Screenshots: 7 reference images attached

---

📊 KEY FINDINGS

What we learned:
- Main entities: PurchaseOrder, PurchaseOrderLine, Supplier, Product
- Core flows: Create → Submit → Approve → Receive (4 major flows)
- Complexity: Medium (standard CRUD + workflows + inventory integration)
- Similar to: Order management (but for purchasing, not selling)

Implementation estimate:
- Backend: 3-4 days (Medusa module + API + migrations)
- Frontend: 2-3 days (Admin UI in Next.js)
- Total: 6-9 days

Risks identified:
- Need to decide: build supplier management or keep simple?
- Inventory sync must be transactional
- Permissions: admin vs staff capabilities

---

🎯 RECOMMENDED NEXT STEPS

1. Review blueprint with team
   - Answer open questions (supplier management? email notify?)
   - Validate MVP scope

2. Research internal patterns:
   /research-feature-patterns purchase order system
   - Find reusable components (tables, forms)
   - Check Medusa module conventions

3. Create implementation plan:
   /create-implementation-plan
   - Use blueprint as input
   - Break into phases

4. Create Linear issue:
   /create-linear-issue
   - Attach feature blueprint
   - Add to backlog/sprint

---

Ready to proceed with next command? [yes/no]
```

---

## Tips for Best Results

### Choose Good Inspiration Sources

**Best:**
- Live demos (Shopify, Stripe dashboards)
- Well-documented systems
- Similar domain (e-commerce, admin panels)
- Modern UI (easier to extract patterns)

**Avoid:**
- Very complex enterprise systems (too much to extract)
- Legacy UIs (outdated patterns)
- Custom/niche tools (hard to translate)

### Be Specific About Flows

Instead of:
- ❌ "Explore the whole system"

Try:
- ✅ "Focus on Create PO → Approve → Receive flow"
- ✅ "Pay attention to how they handle partial receives"

### Know Your Target

Be clear where it should live:
- **medusa-backend**: Server-side logic, database, API
- **strapi-plugin**: CMS content management feature
- **storefront-feature**: Customer-facing or admin UI

### Review & Refine

Blueprint is starting point, not final spec:
- Review with team
- Answer open questions
- Adjust scope for MVP
- Use as input for `/create-implementation-plan`

---

## Checklist

- [ ] Inspiration URL accessible
- [ ] Feature name clear
- [ ] Target system chosen (Medusa/Strapi/Storefront)
- [ ] Playwright MCP enabled
- [ ] Ready to spend 5-10 minutes on exploration
- [ ] Will review blueprint with team before implementing

---

## Related Commands

**Before this command:**
- Research if similar feature exists internally first

**After this command:**
- `/research-feature-patterns` - Find internal patterns to reuse
- `/create-implementation-plan` - Break down into phases
- `/create-linear-issue` - Create ticket with blueprint attached
- `/validate-plan` - Validate implementation plan

**Alternative workflows:**
- If inspiration is external API, not UI: research their API docs instead
- If you already have detailed spec: skip to `/create-implementation-plan`

