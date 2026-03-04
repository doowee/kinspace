

# Plan: Public Features Page (`/features`)

## Overview
Create a marketing-style `/features` page targeting prospective studio owners. It will showcase all built features with polished visuals and highlight upcoming enhancements. The page reuses the existing design system from `Index.tsx` (GlassCard, animations, DotGrid, AmbientGlow, BrandName, SignupCTA).

## Route
- Add `/features` route in `App.tsx` pointing to a new `src/pages/Features.tsx`
- Add a "Features" link in the landing page nav header

## Page Structure

### 1. Hero Section
- Headline: "Everything you need to run a modern studio"
- Subline emphasizing the all-in-one platform
- CTA button linking to `/auth`

### 2. Built Features Grid (categorized sections with icons and descriptions)

**Scheduling & Classes**
- Visual calendar with day/week view
- Class creation with instructor assignment
- Capacity management and fill-rate tracking
- Waitlist with auto-promotion
- Manual booking by staff
- Edit/cancel classes

**Client Management**
- Student roster with search
- Client profiles and booking history
- Credit/wallet balance tracking
- Package purchases and management

**Instructor Management**
- Instructor roster scoped by organization
- Phone and email contact info
- Direct messaging from admin
- Instructor provisioning (invite via email)
- Instructor portal (separate login)

**Finance & Payments**
- Revenue dashboard with charts
- Record manual payments
- Payment history and tracking
- Stripe Connect payouts
- Package/credit-based billing

**SMS Commerce (Pro)**
- Smart Waitlist auto-text
- 1-Tap SMS class pack refills
- Flash Deals for empty spots
- Two-way SMS communication
- Communication log

**AI Agent Suite (Pro)**
- AI Marketing Hub — auto-draft promo emails
- BI Insights — plain-English analytics queries
- Revenue Agent — automated monetization
- Support Agent (coming soon)

**Multi-Studio & Organization**
- Multi-location management under one org
- Studio switcher in admin
- Org-level revenue dashboard
- Role-based access (Owner / Front Desk)

**Branding & White-Label**
- Custom logo, colors, and theme
- White-labeled booking page per studio
- Dynamic favicon
- Custom studio slug URLs

**Kiosk Mode**
- PIN-based kiosk login
- Live class roster display

**Client Booking App**
- Public booking page per studio
- Public packages page
- Student auth gate (login/signup)
- Student dashboard, wallet, profile

**Billing & Subscription**
- SaaS subscription tiers (Standard/Pro)
- Stripe integration for billing
- Plan comparison and upgrade flow

### 3. Roadmap / Coming Soon Section
- Support Agent (AI concierge)
- Automated class reminders (built but can highlight)
- Advanced retention analytics
- Mobile app wrapper
- Marketplace integrations
- Multi-language support

### 4. Footer CTA
- Reuse the existing SignupCTA pattern from Index.tsx

## Technical Details

**Files to create:**
- `src/pages/Features.tsx` — main features page using existing animation utilities, GlassCard, etc. Extract shared components from Index.tsx into a shared file or duplicate the small helpers.

**Files to modify:**
- `src/App.tsx` — add `/features` route
- `src/pages/Index.tsx` — add "Features" link to the nav bar, and export shared UI components (BrandName, SignupCTA, GlassCard, DotGrid, AmbientGlow) so Features.tsx can reuse them

**Design approach:**
- Each category rendered as an animated section with an icon, title, and a grid of feature cards
- Each feature card has a checkmark icon (built) or a "Coming Soon" badge
- Framer Motion fade-in animations matching the landing page style
- Responsive: 1 column mobile, 2-3 columns desktop

