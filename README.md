# Jobbage

A Kanban-style job application tracker. Sign up, then move applications
between Wish List, Applied, Interviewing, Offer and Rejected by drag and drop.

Built with Next.js (App Router, Cache Components), React, Tailwind CSS,
shadcn/base-ui, [better-auth](https://www.better-auth.com), MongoDB (Mongoose)
and [dnd-kit](https://dndkit.com). Based on the
[job-application-tracker tutorial](https://github.com/machadop1407/job-application-tracker).

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with:

   ```bash
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
   BETTER_AUTH_SECRET=<random secret>
   BETTER_AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
   ```

   If you use MongoDB Atlas, your current IP address must be on the cluster's
   Network Access list.

3. Start the dev server and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` / `npm run build` / `npm start`: run, build and serve the app.
- `npm run lint`: run ESLint.
- `SEED_USER_ID=<user id> npm run seed:jobs`: replace that user's job
  applications with sample data. Existing applications for that user are
  deleted first.
