# Frontend Developer Guide

This document describes the structure and coding patterns of the Next.js frontend application.

---

## 1. Project Directory Structure
The frontend application uses the Next.js App Router format, located under `/frontend`.

```
frontend/
├── app/                  # Next.js App Router files
│   ├── admin/            # Admin pages (Dashboard, Verification Settings)
│   ├── buyer/            # Buyer module (RFQs, Orders, Subscriptions, Messages)
│   ├── supplier/         # Supplier module (Listings, Bids, Orders, Analytics)
│   ├── vendor/           # Unified sub-pages for products and analytics
│   ├── login/            # Authentication login page
│   ├── register/         # Multi-role registration form
│   ├── globals.css       # Core Tailwind CSS styles
│   └── layout.tsx        # Base root layout wrapper
├── components/           # Shared reusable layout & interactive UI components
│   ├── ui/               # Generic primitive widgets (Buttons, Inputs, Dialogs)
│   └── layout/           # Sidebar navigation, User profile menus
├── services/             # Core network/API client logic
│   └── utils/
│       └── apiConfig.ts  # API URL orchestrator
├── types/                # Core TypeScript interfaces
└── next.config.ts        # Next.js configuration settings
```

---

## 2. API Configurations & Integrations

The file `services/utils/apiConfig.ts` controls all API connections:
*   It looks for `process.env.NEXT_PUBLIC_API_BASE_URL` or can be overridden via `MANUAL_API_BASE_URL`.
*   It standardizes backend URLs (trimming trailing slashes) and sets sub-paths:
    *   `API_URLS.BASE`: Root backend URL
    *   `API_URLS.VENDOR`: Vendor API namespace (`/api/vendor`)
    *   `API_URLS.AUTH`: Auth path (`/api/vendor/auth`)

---

## 3. Role-Based Routing & Authorization

Redirects are based on the user's role:
*   **Admin Dashboard** (`/app/admin/*`): Restructured page to monitor system users and verify/approve newly registered accounts.
*   **Buyer Dashboard** (`/app/buyer/*`): Restricted to accounts with `role: "buyer"`. Houses procurement workflows.
*   **Supplier Dashboard** (`/app/supplier/*`): Restricted to accounts with `role: "supplier"`. Handles bidding and inventory.

A global middleware or Layout check validates the user state via the `/api/vendor/auth/me/` endpoint. If a user is not logged in or attempts to access a path that does not match their `role`, they are redirected to `/login`.

---

## 4. UI Components & Styling

*   **Tailwind CSS**: The visual grid and components leverage Tailwind CSS properties defined in `globals.css` and `tailwind.config.js`.
*   **Forms**: Profile updates and registration use modular forms with state validators. Document attachments (e.g. GST documents, medical licenses) are uploaded to the backend and stored securely in Cloudinary.
*   **Sidebar Layouts**: Separate, specialized navigation sidebars are rendered for Buyers and Suppliers, ensuring clean, role-tailored workspace actions.
