import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { JWT } from "@auth/core/jwt";

import { decodeJwtExpMs } from "@/lib/jwt";
import type { AuthResponse, RefreshResponse } from "@/lib/jaas-api-types";

const JAAS_API_URL = process.env.JAAS_API_URL ?? "http://127.0.0.1:8027";

// Re-mint the access token this many ms before it actually expires
// (ui-design.md risk register item 1) — a proactive margin, not reactive
// only-on-401, so a long-idle tab doesn't hit a dead token mid-request.
const REFRESH_MARGIN_MS = 60_000;

// Applies a POST /api/v1/auth/{google,login} response to the encrypted
// JWT — shared by both providers below so there's one place that knows the
// AuthResponse -> token field mapping.
function applyAuthResponse(token: JWT, data: AuthResponse) {
  token.jaasAccessToken = data.accessToken;
  token.jaasRefreshToken = data.refreshToken;
  token.jaasUser = data.user;
  token.jaasTenants = data.tenants;
  token.jaasActiveTenantId = data.activeTenantId;
  token.jaasAccessTokenExpiresAtMs = decodeJwtExpMs(data.accessToken) ?? undefined;
  token.jaasError = undefined;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    // Auth.js's default convention: reads AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET
    // from web/.env.local. Deliberately NOT the shared GOOGLE_CLIENT_ID/
    // GOOGLE_CLIENT_SECRET used by other local apps in this environment —
    // that client is registered with a pile of unrelated redirect URIs and
    // Google rejected token exchange for it ("doesn't comply with Google's
    // OAuth 2.0 policy"). This app gets its own dedicated OAuth client.
    Google,
    // Local-dev-only alternative to Google (POST /api/v1/auth/login, see
    // authn/service.py's _DEV_LOGIN_USERS) — lets someone sign in as the
    // seeded owner@jaas.local / admin@jaas.local accounts with one shared
    // password instead of setting up a real Google OAuth client. The
    // backend fails closed (DEV_LOGIN_NOT_CONFIGURED) unless its operator
    // opted in via JAAS_DEV_LOGIN_PASSWORD, so this provider being listed
    // here doesn't by itself expose anything.
    Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }
        const res = await fetch(`${JAAS_API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          return null;
        }
        const data = (await res.json()) as AuthResponse;
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          image: data.user.pictureUrl ?? undefined,
          jaasAuthResponse: data,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, trigger, session, user }) {
      // ui-design.md §9 TenantSwitcher: useSession().update({ tenantId })
      // lands here with trigger === "update". Re-mint against the *current*
      // refresh token rather than trusting anything else in `session` —
      // that payload comes from the client and must be treated as
      // unvalidated input (see @auth/core's own warning on this param).
      if (trigger === "update" && session?.tenantId && token.jaasRefreshToken) {
        try {
          const res = await fetch(`${JAAS_API_URL}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              refreshToken: token.jaasRefreshToken,
              tenantId: session.tenantId,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as RefreshResponse;
            token.jaasAccessToken = data.accessToken;
            token.jaasTenants = data.tenants;
            token.jaasActiveTenantId = data.activeTenantId;
            token.jaasAccessTokenExpiresAtMs = decodeJwtExpMs(data.accessToken) ?? undefined;
            token.jaasError = undefined;
          }
        } catch {
          // Leave the token as-is on failure — switching tenants is a
          // best-effort UX action, not something that should sign anyone out.
        }
        return token;
      }

      // Dev-login Credentials provider already did the full exchange inside
      // authorize() (it has no id_token round trip to do here, unlike
      // Google) — `user` is only set on this first call, same as `account`.
      if (user?.jaasAuthResponse) {
        applyAuthResponse(token, user.jaasAuthResponse);
        return token;
      }

      // Initial sign-in: exchange the just-verified Google ID token for the
      // registry's own tokens (ui-design.md §4.2). `account` is only set on
      // this first call, never on subsequent session reads.
      if (account?.id_token) {
        try {
          const res = await fetch(`${JAAS_API_URL}/api/v1/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: account.id_token }),
          });
          if (!res.ok) {
            token.jaasError = "SignInFailed";
            return token;
          }
          const data = (await res.json()) as AuthResponse;
          applyAuthResponse(token, data);
        } catch {
          token.jaasError = "SignInFailed";
        }
        return token;
      }

      // Still comfortably valid — nothing to do.
      if (
        token.jaasAccessTokenExpiresAtMs &&
        Date.now() < token.jaasAccessTokenExpiresAtMs - REFRESH_MARGIN_MS
      ) {
        return token;
      }

      if (!token.jaasRefreshToken) {
        return token;
      }

      try {
        const res = await fetch(`${JAAS_API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: token.jaasRefreshToken }),
        });
        if (!res.ok) {
          token.jaasError = "RefreshFailed";
          return token;
        }
        const data = (await res.json()) as RefreshResponse;
        token.jaasAccessToken = data.accessToken;
        token.jaasTenants = data.tenants;
        token.jaasActiveTenantId = data.activeTenantId;
        token.jaasAccessTokenExpiresAtMs = decodeJwtExpMs(data.accessToken) ?? undefined;
        token.jaasError = undefined;
      } catch {
        token.jaasError = "RefreshFailed";
      }
      return token;
    },

    async session({ session, token }) {
      session.jaasAccessToken = token.jaasAccessToken;
      session.jaasUser = token.jaasUser;
      session.jaasTenants = token.jaasTenants;
      session.jaasActiveTenantId = token.jaasActiveTenantId;
      session.jaasError = token.jaasError;
      if (token.jaasUser) {
        session.user = {
          ...session.user,
          name: token.jaasUser.name,
          email: token.jaasUser.email,
          image: token.jaasUser.pictureUrl ?? session.user?.image,
        };
      }
      return session;
    },
  },
});
