# StockCount

Offline-first inventory counting app. Warehouse workers, small-shop owners, and
event/logistics staff can count physical items fast, on a warehouse floor with
no signal, and trust that nothing is lost — everything syncs to the cloud the
moment connectivity comes back.

Final Practical Project — BIT4.6A Advanced Mobile Development (SS 26).

## Tech stack

| Layer | Choice |
|---|---|
| App framework | Expo (SDK 54) + React Native 0.81 + TypeScript (strict mode) |
| Navigation | React Navigation v7 — native-stack + bottom-tabs |
| State management | React hooks: `useState`, `useReducer`, `useContext` |
| Data fetching / cache | TanStack Query v5 |
| Backend | Supabase — Postgres (Auth + DB), Row Level Security, Storage |
| Offline | AsyncStorage cache + a custom operation sync queue |
| Device hardware | `expo-camera` (barcode scanning + photos), `expo-location` (GPS) |
| Forms | `react-hook-form` + `zod` |
| Testing | Jest + `@testing-library/react-native` |
| Delivery | EAS Build |

## Setup

1. **Install dependencies.**

   ```bash
   npm install
   ```

   If you hit a peer-dependency resolution error on a fresh clone, let Expo pick the
   exact SDK-compatible versions instead:

   ```bash
   npx expo install react-native-screens react-native-safe-area-context \
     @react-native-async-storage/async-storage expo-camera expo-location \
     @react-native-community/netinfo react-native-url-polyfill react-native-get-random-values
   ```

2. **Configure Supabase.** Copy `.env.example` to `.env` and fill in your project's
   URL and anon key (Supabase dashboard → Project Settings → API). A working
   project (schema + RLS + storage bucket already provisioned) is pre-filled in
   `.env.example` for grading convenience — for your own copy of the project,
   run the SQL in `supabase/migrations/` against a fresh Supabase project.

3. **Run the app.**

   ```bash
   npx expo start
   ```

   Scan the QR code with Expo Go on a physical device. **Camera and GPS
   features require a physical device or a real Android emulator** — they
   cannot be tested on the Expo web preview.

4. **Run tests.**

   ```bash
   npm test
   ```

5. **Build an installable binary (optional / stretch goal).**

   ```bash
   npx eas build --platform android --profile preview
   ```

   Produces a shareable APK. Expo Go is sufficient for the in-class demo.

## Requirements checklist

Where to find each course requirement demonstrated in this codebase:

| # | Requirement | Where |
|---|---|---|
| 1 | Navigation across multiple screens | `src/navigation/` — `RootNavigator.tsx` switches between `AuthNavigator` (stack) and `MainTabs` (bottom tabs); `InventoryStack.tsx` is a native-stack with 4 screens |
| 2 | State management | `useReducer` in `src/state/countReducer.ts` + `ItemDetailScreen.tsx`; `useContext` in `AuthContext.tsx` and `ThemeContext.tsx`; `useState` throughout forms and screens |
| 3 | TypeScript used properly | `tsconfig.json` has `"strict": true`; typed props/state everywhere, typed navigation (`src/navigation/types.ts`), typed Supabase rows (`src/types/database.ts`) |
| 4 | External API / backend integration | Supabase: `src/lib/supabase.ts` (client), `src/hooks/useItems.ts` + `useItemCounts.ts` (queries/mutations against Postgres), `src/lib/uploadPhoto.ts` (Storage) |
| 5 | Local data persistence | `src/offline/localCache.ts` (AsyncStorage item cache), `src/context/ThemeContext.tsx` (persisted theme preference) |
| 6 | Device hardware feature | `expo-camera`: `src/screens/inventory/BarcodeScannerScreen.tsx` (barcode) and `CreateEditItemScreen.tsx` (photo capture). `expo-location`: `src/hooks/useItemCounts.ts` (`tryGetLocation`, tags every count with GPS) |
| 7 | Clean, responsive UI | `src/components/ItemRow.tsx` uses `useWindowDimensions` for a compact layout on small screens; Flexbox throughout; Dark/Light theme via `ThemeContext.tsx` |
| 8 | Error handling & loading states | `LoadingView.tsx` / `ErrorView.tsx` components; TanStack Query `isLoading`/`isError` states in every screen; try/catch + user-facing error text in auth and form screens; offline banner in `InventoryListScreen.tsx` |
| — | Offline-first sync | `src/offline/syncQueue.ts` (queue) + `src/hooks/useNetworkStatus.ts` (`useSyncOnReconnect` flushes the queue the moment the network returns) |
| — | Unit tests | `__tests__/countReducer.test.ts` (pure counting logic), `__tests__/ItemRow.test.tsx` (component test) |

## Architecture notes

- **Offline strategy:** every mutation (create/update/delete item, adjust
  count) applies an optimistic update to the local cache and the TanStack
  Query cache immediately. If the device is offline (checked via
  `@react-native-community/netinfo`), the write is queued in AsyncStorage
  instead of calling Supabase. `useSyncOnReconnect` watches connectivity and
  flushes the queue in order the moment the device reconnects, then
  invalidates the `items` query so every screen reconciles with the server.
  Conflict resolution is intentionally simple (last write wins) — that's a
  reasonable trade-off for a single-user-per-account counting app, and is
  called out as a known limitation below.
- **GPS tagging:** location is fetched lazily per count (`Location.Accuracy.Balanced`,
  not continuous tracking) to save battery, and fails silently to `null` if
  permission was denied — the app never blocks counting on a location
  failure.
- **RLS:** every table has Row Level Security scoped to `auth.uid() = user_id`,
  so even though the client uses the public anon key, one user can never read
  or write another user's inventory.

## Known limitations / what I'd improve with more time

- Sync conflict resolution is last-write-wins, not a CRDT/vector-clock
  approach — fine at this scale, would need revisiting for multi-device
  concurrent editing.
- No pagination on the inventory list (`FlatList` alone handles the
  virtualization; fine for hundreds of items, would need a paged query for
  tens of thousands).
- No push notifications for low-stock alerts (out of scope for this version).
- Barcode scanning matches products only within the current user's inventory,
  not a global product database.

## Project structure

```
App.tsx                    Root providers (Query, Theme, Auth, Navigation)
src/
  lib/                      Supabase client, photo upload
  types/                    Row types mirroring the Postgres schema
  state/                    Pure, unit-testable logic (countReducer)
  context/                  AuthContext, ThemeContext
  offline/                  Local cache + sync queue
  hooks/                    TanStack Query hooks, network status
  navigation/                Stack/tab navigators + typed param lists
  screens/                  Auth, Inventory, Settings screens
  components/               ItemRow, CountButton, Loading/Error views
supabase/migrations/         SQL schema + RLS policies (source of truth for the DB)
__tests__/                  Jest unit + component tests
```
