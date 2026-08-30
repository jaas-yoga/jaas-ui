import { AuthError } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { SolarSystem } from "@/components/login/solar-system";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

/** ui-design.md §10 sitemap /login, §4.2 sign-in sequence. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) {
    redirect("/skills");
  }
  const { error } = await searchParams;

  return (
    <div
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-4"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.09) 1px, transparent 0), " +
          "radial-gradient(circle at 50% 50%, hsl(var(--brand) / 0.18), transparent 55%)",
        backgroundSize: "36px 36px, 100% 100%",
      }}
    >
      <SolarSystem />

      <div className="absolute right-4 top-4">
        <ThemeSwitch />
      </div>

      <Card className="relative w-full max-w-sm border-border/60 shadow-xl shadow-brand/5">
        <CardHeader className="items-center text-center">
          <Image src="/brand/jaas-mark.png" alt="" width={64} height={64} className="mb-1" priority />

          <CardTitle className="text-xl">JaaS Skills</CardTitle>
          <CardDescription>Discover, share, and publish AI-agent skill packages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error === "CredentialsSignin"
                ? "Invalid email or password."
                : "Sign-in failed. Please try again."}
            </p>
          ) : null}

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/skills" });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              <GoogleIcon className="size-4" />
              Sign in with Google
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          {/* Local-dev-only alternative to Google — seeded owner@jaas.local /
              admin@jaas.local accounts behind one shared password (see
              auth.ts's "dev-login" Credentials provider). The backend
              rejects this entirely unless JAAS_DEV_LOGIN_PASSWORD is set,
              so this form is harmless to leave visible when it isn't. */}
          <form
            action={async (formData: FormData) => {
              "use server";
              try {
                await signIn("dev-login", {
                  email: formData.get("email"),
                  password: formData.get("password"),
                  redirectTo: "/skills",
                });
              } catch (err) {
                if (err instanceof AuthError) {
                  redirect(`/login?error=${err.type}`);
                }
                throw err;
              }
            }}
            className="space-y-2"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="login-email">
                Email
              </label>
              <Input id="login-email" name="email" type="email" placeholder="owner@jaas.local" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="login-password">
                Password
              </label>
              <Input id="login-password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" variant="outline" className="w-full">
              Sign in with email
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Local development accounts — not for production use.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3a7.4 7.4 0 0 1-11-3.9H1.06v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.05 14.2a7.2 7.2 0 0 1 0-4.4V6.71H1.06a12 12 0 0 0 0 10.58z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.06 6.71l3.99 3.09A7.16 7.16 0 0 1 12 4.75z"
      />
    </svg>
  );
}
