# Kutumb (कुटुम्ब) — Family Tree Builder

A cross-platform family tree application that helps families map, visualize, and grow their family connections. Built with Next.js, Supabase, and Capacitor.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Mobile | Capacitor 8 (Android & iOS) |
| Tree Viz | React Flow (@xyflow/react) |
| i18n | next-intl (English, Spanish) |
| Export | jsPDF, html2canvas, xlsx |

## Features

- **Interactive Family Tree** — Drag, zoom, and explore your family graph powered by React Flow
- **14 Relationship Types** — Parent, child, spouse, sibling, step/adopted variants, godparent/godchild, close friend
- **Smart Auto-Linking** — Adding a parent auto-links existing siblings; adding a child auto-links spouse
- **Family Variant System** — Global (Father, Mother, Uncle) or Indian (Papa, Mummy, Chacha) terminology with gender-aware labels
- **Relationship Chains** — Automatically computes labels like "Paternal Uncle" or "Bua" based on graph traversal
- **Invite System** — Email-based invitations with 30-day expiry and token verification
- **Placeholder Profiles** — Add family members who haven't joined yet; they merge when they sign up
- **Secondary Relations** — Request additional relationships with accept/decline flow
- **Alias / Nickname** — Set personal display names for members visible only to you
- **Privacy Controls** — Family-only or private visibility per member
- **Notifications** — Real-time alerts for invitations, tree links, member joins, and relation requests
- **Push Notifications** — Native push via Capacitor on Android/iOS
- **Profile** — Avatar upload, bio, social links (Instagram, Facebook, Twitter, LinkedIn, YouTube, Snapchat)
- **Birthday Calendar** — Mini calendar with upcoming birthday indicators
- **Path Finder** — Discover the relationship path between any two members
- **Search** — Find members by name, email, or phone within the tree
- **Export** — PDF/image export of the tree, Excel export of family data
- **Mobile App** — Android APK via Capacitor pointing to Vercel deployment

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Installation

```bash
npm install
```

### Database Setup

Run migrations 001 through 009 in order in the Supabase SQL Editor (`supabase/migrations/`):

| Migration | Purpose |
|-----------|---------|
| 001 | Core schema — profiles, relationships, invitations, notifications, RLS |
| 002 | Tree traversal RPC, declined invite status, is_primary |
| 003 | Social links JSONB, is_primary column |
| 004 | Device tokens for push notifications |
| 005 | Placeholder profiles, phone-based invites |
| 006 | Gender and family_variant fields |
| 007 | Identity merging for OAuth users |
| 008 | Capture gender/variant from signup metadata |
| 009 | Display alias column on relationships |

Also create a **public** storage bucket named `avatars` in Supabase Storage.

### Supabase Dashboard Config

- **Authentication > URL Configuration > Site URL** — Set to your production URL
- **Authentication > Providers** — Enable Email (+ any OAuth providers you want)

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

### Android APK

Requires Java 25+ and Android SDK.

```bash
cd android
./gradlew assembleDebug
```

The APK outputs to `android/app/build/outputs/apk/debug/app-debug.apk`.

The Capacitor config points the WebView to the Vercel deployment URL, so the APK is a thin native shell around the web app. Code updates deploy instantly without rebuilding the APK.

## Project Structure

```
src/
├── app/[locale]/          # Next.js pages (dashboard, tree, profile, invite, etc.)
├── components/
│   ├── tree/              # FamilyTreeView, MemberNode, modals (Add/Edit/Profile/PathFinder)
│   ├── auth/              # LoginForm, SignupForm
│   ├── layout/            # AppShell, Navbar
│   ├── pages/             # Dashboard, Landing, Notifications, Invite, Profile content
│   ├── mobile/            # Push notifications, app lifecycle
│   └── ui/                # Button, Input, Select, Card, Avatar
├── lib/
│   ├── actions/           # Server actions (tree.ts, invitation.ts)
│   ├── supabase/          # Server/client/admin clients, helpers
│   ├── variants/          # Global & Indian relationship label systems
│   ├── types.ts           # All TypeScript interfaces and types
│   └── relationships.ts   # Validation and auto-linking logic
├── i18n/                  # Internationalization config
├── messages/              # en.json, es.json translation files
└── middleware.ts           # i18n routing + Supabase session refresh

supabase/migrations/       # 9 progressive SQL migrations
android/                   # Capacitor Android project
```

## Data Model

**profiles** — User and placeholder member profiles with personal info, avatar, social links, and privacy settings.

**relationships** — Bidirectional edges between profiles. Each relationship is stored as two rows (A->B and B->A) with type, confirmation status, primary flag, and optional display alias.

**invitations** — Email-based invites with token verification, 30-day expiry, and status tracking.

**notifications** — In-app alerts for invites, tree connections, member joins, and relation requests.

## Deployment

The app is deployed on **Vercel**. Push to `main` triggers automatic deployment.

The Android APK uses Capacitor with `server.url` pointing to the Vercel deployment, so web code updates are reflected immediately without rebuilding the APK.
