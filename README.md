# Whim!

Whim! : Spontaneous activities others can join at the moment

### Run it

First time only, after cloning:

1. Install the packages:

   ```bash
   npm install
   ```

2. Create your `.env` file from the template:

   ```bash
   cp .env.example .env
   ```

3. Open `.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   Ask a teammate for the values, or copy them from Supabase → Project Settings → API.
   `.env` is not in git on purpose, so every teammate needs their own copy.

Then start the app (`-c` clears the cache, which you need after creating or editing `.env`):

```bash
npx expo start -c
```
Scan the QR code with Expo Go. Sign up, post an activity with the + button, and check that it shows up on the Home tab.

**Note** Supabase Auth requires email confirmation by default, so after signing up you'll
get an email before you can sign in. For development you can turn this off under
Authentication → Providers → Email.

**Stack:** Expo (React Native) + TypeScript + Expo Router, with Supabase for auth and the database.

The skeleton covers the core loop: **sign up / sign in → post an event → see open events → join one → see your profile and counts.**
Everything else (map, radius, places, reviews, notifications, badges, verification) is left to build on top.

---

## Project structure

```text
whim/
├── client/                    # the Expo app (runs on the phone)
│   ├── app/                   # Expo Router screens (set as the router root in app.json)
│   │   ├── _layout.tsx        # root: fonts, splash, logged-in / logged-out routing
│   │   ├── sign-in.tsx        # email + password sign in and sign up
│   │   ├── edit-profile.tsx   # edit username, name, interests, bio
│   │   └── (tabs)/            # only reachable when logged in; shows the tab bar
│   │       ├── _layout.tsx    # bottom tabs (custom NavBar)
│   │       ├── index.tsx      # Home: open, unexpired events + Join
│   │       ├── map.tsx        # Map (placeholder)
│   │       ├── create-activity.tsx # the orange +: create an activity with an expiry timer
│   │       ├── inbox.tsx      # Inbox (placeholder)
│   │       └── profile.tsx    # You: profile card, hosted/attended counts
│   ├── components/            # NavBar (tab bar), Splash
│   ├── context/
│   │   └── AuthContext.tsx    # holds the Supabase session for the whole app
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client
│   │   └── theme.ts           # colors, fonts, spacing
│   └── assets/                # icons, logo, splash and design images
├── shared/
│   └── types.ts               # TypeScript types for each table (app + future server code)
├── server/
│   └── supabase/
│       └── setup.sql          # profile trigger, profile_stats view, RLS policies, interests column
└── .env.example
```

### Database
Run `server/supabase/setup.sql` in the Supabase SQL editor. It does four things:

1. **Auto-creates a `profiles` row** whenever someone signs up. Without this, inserts into
   `events` fail, because `events.profile_id` points at a profile that doesn't exist yet.
   For it to work, `profiles.id` must reference `auth.users.id`, and every other column on
   `profiles` (username, name, etc.) must be nullable or have a default.
2. **Creates the `profile_stats` view** for hosted/attended counts.
3. **Turns on RLS and adds policies.**
4. **Adds the `interests` column** to `profiles`, shown as the "Into" chips on the profile page.

Before running it, check that the names in the SQL match tables. It assumes
`profiles`, `places`, `events`, `event_buddies`, `reviews`, with every person column named
`profile_id`. If your reviews table is still called `review`, rename it or edit the SQL.

---



### Splitting the work

Four areas that can mostly run in parallel once the skeleton is up:

- **Auth and profiles**: sign-up flow, profile editing, avatars, viewing other people's profiles.
- **Events**: feed, create form, event detail, join/leave, status changes.
- **Location and map**: device location, radius filter, map screen, places.
- **Database and backend**: schema changes, RLS policies, views, triggers, notifications.

Keep `lib/types.ts` in sync with the database. Whoever changes a table updates the type in the same commit.

---

## Sources

- Supabase, Build a User Management App with Expo React Native: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Expo, Create your first app (default template, reset-project): https://docs.expo.dev/tutorial/create-your-first-app
- Expo Router, Protected routes: https://docs.expo.dev/router/advanced/protected/
- Expo Router, Authentication: https://docs.expo.dev/router/advanced/authentication/
- Supabase linter, RLS enabled with no policy: https://supabase.github.io/splinter/0008_rls_enabled_no_policy
