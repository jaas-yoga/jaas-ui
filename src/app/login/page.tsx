import { GitBranch, Share2, ShieldCheck, Sparkles } from "lucide-react";
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

const FEATURES = [
  {
    icon: Sparkles,
    title: "Discover & publish",
    description: "Browse a growing registry of AI-agent skill packages, or publish your own in minutes.",
  },
  {
    icon: GitBranch,
    title: "GitOps-driven",
    description: "Stateless and version-controlled — every release traces back to your own Git history.",
  },
  {
    icon: ShieldCheck,
    title: "Built-in guardrails",
    description: "Every publish is scanned against content-safety guardrails before it goes live.",
  },
  {
    icon: Share2,
    title: "Fine-grained sharing",
    description: "Keep a skill private, share it with a tenant, or publish it for everyone — you decide.",
  },
];

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
      className="relative flex min-h-dvh overflow-hidden bg-background"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.09) 1px, transparent 0), " +
          "radial-gradient(circle at 50% 50%, hsl(var(--brand) / 0.14), transparent 60%)",
        backgroundSize: "36px 36px, 100% 100%",
      }}
    >
      {/* Starfield background spans the full page (set on the outer div
          above). The solar system is centered on the true page center —
          verified by measurement to clear the text block (300px+ margin)
          on every side; it does pass behind the sign-in card, which is
          harmless since the card has its own opaque background. Hidden
          below lg along with the panel, since there's nothing there to
          center it against. */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <SolarSystem />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <ThemeSwitch />
      </div>

      {/* Product panel — hidden below lg, where the card's own header
          carries the branding instead. pointer-events-none for the same
          reason as the sign-in form wrapper: it has no interactive
          content of its own, so it shouldn't be able to block hover on
          the solar system underneath. Composed as three zones (logo top,
          pitch centered in the remaining space, stat footer at the very
          bottom) so the column uses the full page height on tall
          viewports instead of one small block floating in the middle. */}
      <div className="pointer-events-none relative z-10 hidden w-[42%] shrink-0 flex-col px-12 py-12 lg:flex xl:w-[38%]">
        <div className="flex items-center gap-3.5">
          <Image src="/brand/jaas-mark-inline.png" alt="" width={48} height={54} />
          <span className="text-3xl font-bold tracking-tight">JaaS Skills</span>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-10">
          <div className="max-w-sm space-y-3">
            <p className="text-4xl font-semibold leading-[1.15] tracking-tight">
              The skill registry for AI agents.
            </p>
            <p className="text-base leading-relaxed text-muted-foreground">
              Publish, share, and govern the skills your agents run on — versioned in Git, certified before they ship.
            </p>
          </div>
          <ul className="max-w-sm space-y-6">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <feature.icon className="size-5 text-brand" />
                </span>
                <div className="pt-1">
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="max-w-sm text-xs text-muted-foreground">
          19 guardrail rules across 4 safety levels — every publish is certified before it ships.
        </p>
      </div>

      {/* Sign-in form. This wrapper is pointer-events-none — being a
          flex-1 item in a full-height row, it stretches across the whole
          right portion of the screen (not just where the visible card
          is), and without this it silently ate hover/click events over
          that entire area, blocking the solar system's planets
          underneath from ever receiving a hover. Only the Card itself
          (the only thing actually visible here) opts back in. */}
      <div className="pointer-events-none relative z-10 flex flex-1 items-center justify-center p-4 lg:justify-end lg:pr-16 xl:pr-24">
        <Card className="pointer-events-auto w-full max-w-md border-border/60 [--card-spacing:--spacing(6)] shadow-xl shadow-brand/5">
          <CardHeader className="items-center text-center">
            <Image
              src="/brand/jaas-mark-inline.png"
              alt="JaaS Skills"
              width={56}
              height={64}
              className="mb-1 lg:hidden"
              priority
            />
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Access your AI-agent skill registry.</CardDescription>
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
