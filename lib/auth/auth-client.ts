import { createAuthClient } from "better-auth/react";

/*
  Similar to the auth variable exported by ./auth.ts, only intented for
  client components only, as auth is only for server-side interactions.
*/
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL!,
});

export const { signIn, signUp, signOut, useSession } = authClient;
