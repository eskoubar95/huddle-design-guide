# Onboard New Developer

Comprehensive onboarding checklist for new developers joining Beauty Shop team.

## Objective
Get new developer productive quickly with clear setup instructions, codebase tour, and first tasks.

## Welcome to Beauty Shop! 👋

Beauty Shop er et moderne hudplejeunivers der kuraterer K-beauty produkter til mænd. Vi bygger en e-commerce platform med fokus på enkelhed, kvalitet og nordisk design.

## Prerequisites

Before starting, ensure you have:
- [ ] macOS, Linux, or Windows with WSL2
- [ ] Node.js 20+ installed
- [ ] Git configured with your GitHub account
- [ ] VS Code or preferred IDE
- [ ] Terminal/shell access

## Step 1: Access & Accounts

### GitHub Access
- [ ] GitHub account added to `beauty-shop` organization
- [ ] Repository access: `github.com/beauty-shop/beauty-shop`
- [ ] Read CONTRIBUTING.md

### Tool Accounts
- [ ] **Linear:** Project management - [linear.app](https://linear.app)
- [ ] **Vercel:** Deployments - [vercel.com](https://vercel.com)
- [ ] **Supabase:** Database - [supabase.com](https://supabase.com)
- [ ] **Sentry:** Error tracking - [sentry.io](https://sentry.io)
- [ ] **Slack:** Team communication (if applicable)

### Credentials
Request access from team lead:
- [ ] Development environment variables
- [ ] Staging database access
- [ ] Sentry projects
- [ ] Vercel team

## Step 2: Local Setup

### Clone Repository
```bash
# Clone repo
git clone git@github.com:beauty-shop/beauty-shop.git
cd beauty-shop

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
```

### Environment Variables

Fill in `.env.local` with provided credentials:

```bash
# ===== Backend =====
NEXT_PUBLIC_MEDUSA_URL=http://localhost:9000

# ===== Database =====
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# ===== Authentication =====
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# ===== Payment =====
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ===== Monitoring =====
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# ===== Feature Flags =====
NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID=...

# ===== Email =====
RESEND_API_KEY=re_...
```

### Verify Setup
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Tests
npm run test

# Start development server
npm run dev
```

Open http://localhost:3000 - you should see the Beauty Shop homepage!

## Step 3: Codebase Tour

### Project Structure
```
beauty-shop/
├── .cursor/              # Cursor IDE config
│   ├── commands/         # Reusable AI prompts
│   └── rules/           # Project coding standards
├── .github/             # GitHub Actions CI/CD
├── .project/            # Project documentation
│   ├── 01-Project_Brief.md
│   ├── 02-Product_Requirements_Document.md
│   ├── 03-Tech_Stack.md
│   └── ...
├── app/                 # Next.js 15 App Router
│   ├── (shop)/          # Shop routes
│   ├── api/             # API routes
│   └── layout.tsx       # Root layout
├── components/          # React components
│   ├── ui/              # Reusable UI components
│   ├── products/        # Product components
│   └── checkout/        # Checkout flow
├── lib/                 # Business logic
│   ├── domain/          # Domain models & types
│   ├── services/        # Business services
│   ├── medusa/          # MedusaJS integration
│   ├── utils/           # Utility functions
│   └── stores/          # Zustand stores
├── public/              # Static assets
└── tests/               # Test files
```

### Key Technologies

**Frontend:**
- **Next.js 15:** React framework with App Router
- **React 19:** UI library
- **TypeScript:** Type safety
- **Tailwind CSS:** Styling
- **Shadcn/ui:** Component library
- **Zustand:** State management

**Backend:**
- **MedusaJS v2:** Headless e-commerce engine
- **PostgreSQL:** Database (via Supabase)
- **Supabase:** Database hosting + RLS
- **Clerk:** Authentication
- **Stripe:** Payment processing

**Tooling:**
- **Vitest:** Testing framework
- **ESLint + Prettier:** Code quality
- **Sentry:** Error tracking
- **LaunchDarkly:** Feature flags
- **Vercel:** Hosting & deployment

### Important Files

**Read these first:**
- [ ] `.project/README.md` - Project overview
- [ ] `.project/02-Product_Requirements_Document.md` - Full requirements
- [ ] `.project/03-Tech_Stack.md` - Detailed tech stack
- [ ] `.cursor/rules/00-foundations.mdc` - Coding standards
- [ ] `CONTRIBUTING.md` - How to contribute

**Configuration:**
- [ ] `package.json` - Dependencies and scripts
- [ ] `next.config.mjs` - Next.js configuration
- [ ] `tsconfig.json` - TypeScript configuration
- [ ] `tailwind.config.ts` - Tailwind styling config
- [ ] `.eslintrc.json` - Linting rules

## Step 4: Coding Standards

### Code Style
- **File naming:** kebab-case (`product-card.tsx`)
- **Components:** PascalCase (`ProductCard`)
- **Functions/variables:** camelCase (`calculateTotal`)
- **Small files:** < 500 LOC
- **Small functions:** < 50 lines
- **Tests:** Co-located or in `__tests__/`

### Git Workflow
- **Branch naming:** `feature/BS-123-description`
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`)
- **PR size:** < 400 LOC, < 20 files
- **PR template:** Fill all sections (WHAT/WHY/HOW/TESTS)

### Before Committing
```bash
# Always run before pushing
npm run check

# This runs:
# - TypeScript type checking
# - ESLint linting
# - Prettier formatting
# - Tests
# - Build verification
```

### Key Principles

From `.cursor/rules/00-foundations.mdc`:

1. **Single Responsibility:** One clear purpose per file/function
2. **Composition over inheritance:** Prefer composition
3. **Determinism:** Pure functions preferred
4. **No PII in logs:** Never log personal data
5. **Fail fast:** Errors caught near source
6. **Test critical paths:** Happy, failure, edge cases

## Step 5: Development Workflow

### Daily Workflow
1. Pull latest changes: `git pull origin main`
2. Check Linear for assigned tasks
3. Create feature branch: `git checkout -b feature/BS-XXX-description`
4. Make changes
5. Run tests: `npm run test`
6. Commit: Follow Conventional Commits
7. Push and open PR
8. Request review

### Using Cursor Commands
Type `/` in Cursor AI chat to access commands:
- `/setup-nextjs-feature` - Scaffold new Next.js feature
- `/write-unit-tests` - Generate tests
- `/debug-issue` - Help debug problems
- `/code-review` - Review your changes
- `/generate-commit-message` - Generate commit message
- `/generate-pr-description` - Generate PR description

See `.cursor/commands/README.md` for all commands.

### Running the App

```bash
# Development
npm run dev              # Start frontend (localhost:3000)
npm run dev:backend      # Start MedusaJS backend (localhost:9000)

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Type checking & linting
npm run type-check       # TypeScript
npm run lint             # ESLint
npm run lint:fix         # Auto-fix
npm run format           # Prettier

# Building
npm run build            # Production build
npm run start            # Start production server
```

### Debugging

**VS Code:**
- Set breakpoints in code
- Use Debug panel (F5)
- Or add `debugger` statements

**Browser DevTools:**
- React DevTools for components
- Network tab for API calls
- Console for errors

**Sentry:**
- Real errors logged to Sentry
- Check dashboard for stack traces

## Step 6: First Tasks

### Starter Issues

Perfect first issues (labeled `good-first-issue` in Linear):

1. **UI Fix:** Update button styling on product page
   - **Skills:** React, Tailwind CSS
   - **Estimated:** 1-2 hours
   - **Files:** `components/products/product-card.tsx`

2. **Test Addition:** Add unit tests for price formatting
   - **Skills:** Vitest, TypeScript
   - **Estimated:** 2-3 hours
   - **Files:** `lib/utils/format.test.ts`

3. **Documentation:** Update API endpoint documentation
   - **Skills:** Markdown, TypeScript
   - **Estimated:** 1-2 hours
   - **Files:** `app/api/v1/products/README.md`

### Your First PR

1. Pick an issue from Linear
2. Ask questions in team chat
3. Create branch
4. Make small, focused change
5. Write/update tests
6. Run `npm run check`
7. Open PR with complete description
8. Request review from mentor

**PR Checklist:**
- [ ] Tests added/updated
- [ ] `npm run check` passes
- [ ] PR description filled out
- [ ] Screenshots if UI change
- [ ] No console.logs left
- [ ] No TODOs without issue links

## Step 7: Resources

### Documentation
- [ ] **Product Requirements:** `.project/02-Product_Requirements_Document.md`
- [ ] **API Design:** `.project/05-API_Design.md`
- [ ] **Database Schema:** `.project/04-Database_Schema.md`
- [ ] **Frontend Guide:** `.project/07-Frontend_Guide.md`
- [ ] **Backend Guide:** `.project/06-Backend_Guide.md`

### External Docs
- [ ] [Next.js 15 Docs](https://nextjs.org/docs)
- [ ] [React 19 Docs](https://react.dev)
- [ ] [MedusaJS Docs](https://docs.medusajs.com)
- [ ] [Tailwind CSS](https://tailwindcss.com/docs)
- [ ] [Shadcn/ui](https://ui.shadcn.com)
- [ ] [Stripe Docs](https://stripe.com/docs)

### Team Communication
- **Slack:** General chat, questions
- **Linear:** Task tracking, bugs
- **GitHub:** Code reviews, discussions
- **Notion:** Product documentation (if used)

### Getting Help

**Stuck? Here's how to get help:**

1. **Check docs first:** `.project/` and `.cursor/rules/`
2. **Search Linear:** Similar issues might exist
3. **Ask AI:** Use Cursor commands like `/debug-issue`
4. **Ask mentor:** Don't spend > 30 min stuck
5. **Team chat:** Someone might have hit same issue

**When asking for help:**
- Share what you've tried
- Include error messages
- Link to relevant code
- Describe expected vs actual behavior

## Step 8: Success Metrics

### Week 1 Goals
- [ ] Local environment working
- [ ] Read core documentation
- [ ] Completed first PR
- [ ] Understand git workflow
- [ ] Know where to find help

### Month 1 Goals
- [ ] Completed 5+ PRs
- [ ] Comfortable with tech stack
- [ ] Can debug common issues independently
- [ ] Understand architecture
- [ ] Contributing to code reviews

### Quarter 1 Goals
- [ ] Shipping features independently
- [ ] Mentoring new team members
- [ ] Contributing to architecture decisions
- [ ] Improving team processes

## Checklist Summary

### Setup Complete ✅
- [ ] GitHub access granted
- [ ] All tool accounts created
- [ ] Local environment running
- [ ] Tests passing
- [ ] Read core documentation

### First Week ✅
- [ ] Completed codebase tour
- [ ] Understand coding standards
- [ ] Know development workflow
- [ ] Opened first PR
- [ ] Met the team

### Ready to Ship ✅
- [ ] Comfortable with tech stack
- [ ] Know where docs live
- [ ] Can ask for help effectively
- [ ] Excited to contribute!

---

**Welcome to the team! 🎉**

Any questions? Don't hesitate to ask in team chat or reach out to your mentor.

