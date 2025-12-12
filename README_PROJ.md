# Inventory Management App - Project Documentation

## Overview
A touch-friendly, offline-capable inventory management app for Android tablets that uses camera-based AI to identify items and quantities, with human confirmation before committing changes.

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (Lovable Cloud)
- **Offline Storage**: IndexedDB with sync to Supabase
- **Authentication**: Supabase Auth with email/password

## Core Features

### ✅ Completed Features

#### Authentication & Authorization
- [x] Email/password authentication with Supabase Auth
- [x] Role-based access control (Admin vs Default User)
- [x] Admin role stored in separate `user_roles` table
- [x] Protected routes for admin-only pages
- [x] Auto-confirm email signups enabled
- [x] Auth event logging (sign-up, sign-in, sign-out)

#### Inventory Management
- [x] Create, read, update, delete inventory items
- [x] Multi-condition stock tracking (new, good, damaged, broken)
- [x] Stock movements with condition breakdown
- [x] Category management with hierarchical structure
- [x] Item image upload to Supabase Storage
- [x] Low stock alerts with configurable thresholds
- [x] Broken stock alerts

#### User Interface
- [x] Touch-friendly design with large buttons (48px+ touch targets)
- [x] Dark mode support
- [x] Responsive layout for tablets
- [x] Number pad for quantity input
- [x] Search and filter functionality

#### Data Export
- [x] Excel export with styled headers (.xlsx)
- [x] CSV export for Google Sheets
- [x] 30-column format matching requirements
- [x] Condition breakdown in Asset Description column
- [x] LastModifiedBy tracking from stock movements

#### Activity Logging
- [x] Stock additions and removals
- [x] Item creation
- [x] User authentication events
- [x] Activity log page with filters (admin-only)
- [x] Export activity log to CSV

#### Webhook Integration
- [x] Incoming stock webhook endpoint
- [x] Test panel for simulating webhooks
- [x] Confirmation popup for webhook data
- [x] Human verification before stock changes
- [x] Edit capability for webhook data before confirmation

#### Admin Features
- [x] Admin management page
- [x] Add/remove admin privileges
- [x] View all users
- [x] Delete user accounts
- [x] Activity log access

### 🔄 In Progress / Recently Fixed

#### Bug Fixes Applied
- [x] User deletion now works correctly with audit logging
- [x] Excel export LastModifiedBy now correctly tracks user names
- [x] Admin add/remove now logs to activity
- [x] Export action now logs to activity
- [x] Webhook confirmation popup allows editing name, SKU, condition, and amount

### 📋 TODO / Future Enhancements

#### High Priority
- [ ] Camera AI integration for item recognition
- [ ] Barcode/QR code scanning
- [ ] Offline-first PWA with service worker
- [ ] Real-time sync status indicator

#### Medium Priority
- [ ] Reports & analytics dashboard
- [ ] Stock movement history per item
- [ ] Bulk import from CSV/Excel
- [ ] Print labels with QR codes
- [ ] Voice commands for hands-free operation

#### Low Priority
- [ ] Multi-language support
- [ ] Custom themes
- [ ] Email notifications for low stock
- [ ] Integration with accounting software

## Database Schema

### Tables
- `inventory_items` - Main inventory items
- `stock_movements` - Track all stock changes with conditions
- `categories` - Hierarchical item categories
- `profiles` - User profiles
- `user_roles` - Role assignments (admin/user)
- `audit_logs` - Comprehensive activity logging
- `device_users` - Legacy device user tracking
- `sync_queue` - Offline sync queue

### Key RLS Policies
- Items: Authenticated users can view/add/update; only admins can delete
- Categories: All can view; only admins can modify
- Stock movements: Authenticated can view/add; only admins can delete
- Audit logs: Only admins can view; authenticated can insert
- User roles: Admins manage; users see own roles

## File Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── categories/     # Category management
│   ├── inventory/      # Inventory UI components
│   ├── layout/         # App layout
│   ├── stock/          # Stock condition components
│   ├── ui/             # shadcn/ui components
│   └── webhook/        # Webhook handling
├── contexts/
│   └── AuthContext.tsx # Authentication state
├── hooks/
│   ├── useInventory.ts # Inventory data management
│   ├── useCategories.ts
│   ├── useAuditLogs.ts
│   ├── useUsers.ts
│   └── useWebhookListener.ts
├── pages/
│   ├── Dashboard.tsx   # Main dashboard
│   ├── InventoryList.tsx
│   ├── ManualEntry.tsx
│   ├── ActivityLog.tsx
│   ├── AdminManagement.tsx
│   └── Settings.tsx
└── lib/
    ├── indexedDb.ts    # Offline storage
    └── syncService.ts  # Cloud sync
```

## Security Considerations

1. **RLS Policies**: All tables have Row Level Security enabled
2. **Admin Separation**: Admin role in separate table (prevents privilege escalation)
3. **Audit Trail**: All significant actions logged
4. **Image Upload**: Authenticated uploads only, public reads
5. **No Client-Side Auth**: Admin checks via Supabase, not localStorage

## Known Issues & Limitations

1. Stock movements use IndexedDB which may not sync if browser clears data
2. AI image recognition not yet implemented (camera capture exists but no ML)
3. PWA service worker not fully configured for offline mode
4. Large inventory lists may be slow due to condition breakdown calculations

## Configuration

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Project ID

### Secrets (Supabase)
- `WEBHOOK_SECRET` - For authenticating webhook calls
- `ADMIN_PIN` - Legacy PIN auth (deprecated)

## Development Notes

- Use `npm run dev` for local development
- Supabase types auto-generated - don't edit `types.ts`
- Never edit `index.css` or `tailwind.config.ts` unless specifically requested
- All colors must use design system tokens (no direct colors like text-white)

## Primary Admin Account
- Email: calolategan@gmail.com
- Has admin role in `user_roles` table
