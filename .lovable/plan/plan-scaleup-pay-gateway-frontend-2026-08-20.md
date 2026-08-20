# Plan: ScaleUp Pay Gateway Frontend

Transform the application into a complete payment gateway (ScaleUp Pay) with a professional fintech look, dedicated customer dashboard, and public checkout pages.

## User Experience
- **Public Area**: Custom login/signup and conversion-optimized checkout pages for Pix and Credit Card.
- **Merchant Panel**: Professional dashboard with financial KPIs, transaction management, payment link generation, and API configuration.
- **Fintech Aesthetic**: Dark theme with vibrant purple/electric blue accents, modern typography, and trust-building security elements.

## Proposed Changes

### 1. Project Infrastructure & Theming
- Update `src/styles.css` with dedicated fintech design tokens (shades of dark, vibrant purple accents).
- Configure `src/routes/__root.tsx` for new public/private route splits.

### 2. Authentication & Public Pages
- **Login/Signup**: Create `src/routes/login.tsx` and `src/routes/cadastro.tsx` with modern fintech styling.
- **Checkout**:
  - `src/routes/checkout.$linkId.tsx`: Public checkout page with Pix QR code and Credit Card form.
  - `src/routes/pagamento.sucesso.tsx`, `src/routes/pagamento.pendente.tsx`, `src/routes/pagamento.erro.tsx`: Status pages.

### 3. Merchant Dashboard (ScaleUp Pay)
- **New Sidebar**: `src/components/scaleup-pay/Sidebar.tsx` with links to Dashboard, Vendas, Links, Saques, API Keys.
- **KPI Cards**: `src/components/scaleup-pay/KpiCard.tsx` with real-time financial metrics.
- **Route /dashboard**: Financial overview, revenue charts, and recent transactions.
- **Route /vendas**: Complete transaction table with status badges and filters.
- **Route /links-pagamento**: Management of payment links (create, copy, deactivate).
- **Route /saques**: Withdrawal requests and status history.
- **Route /api-keys**: API keys management and Webhook configuration.

### 4. Components & UI
- **TransactionTable**: Reusable table with pagination and status badges.
- **PixQrCode**: Component for displaying Pix payment info.
- **CreditCardForm**: Interactive form with validation.

## Technical Details
- **Architecture**: TanStack Router for navigation, TanStack Query for state management.
- **Styling**: Tailwind CSS v4 with semantic tokens.
- **Backend Sync**: All components will use mock data initially but are architected to connect to the existing Supabase backend via hooks/server functions.
- **Multi-tenancy**: Designed to handle different merchants/users while maintaining data isolation.
