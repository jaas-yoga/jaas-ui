import Image from "next/image";

type Orbit = {
  radius: number;
  size: number;
  durationSec: number;
  highlight: string;
  base: string;
  shadow: string;
  ring?: string;
  banded?: boolean;
  label: string;
};

// Stylized, not scientifically to-scale — radius/speed both grow outward
// so the whole thing still reads as "a solar system" at a glance. All
// eight planets, in order outward from the sun. Each is shaded with a
// radial gradient (highlight/base/shadow) rather than a flat color so it
// reads as a lit sphere; colors are literal (not theme tokens) since the
// point is recognizably depicting the real planets. Centered on the true
// page center (see page.tsx). Max radius (~400px) is now bounded by
// viewport HEIGHT rather than the text block — at a common 900px-tall
// viewport, half-height is 450px, so 400px is close to that ceiling too;
// the outer page div's overflow-hidden clips gracefully on shorter
// screens. It swings past the text block horizontally during rotation
// (small, faintly-colored dots, not a static collision — reads as depth)
// and past the sign-in card's left edge, which is fine since the card
// has its own opaque background.
//
// The four outer (bigger, more hoverable) planets are labeled with real
// skill packages from the registry backend's own seed data
// (jaas_registry/index/demo_seed.py's _SEED_PACKAGES — the same four
// every fresh install ships with), not invented names, so hovering one
// is actually informative. The four inner rocky planets keep their
// astronomical names.
const ORBITS: Orbit[] = [
  { radius: 166, size: 9, durationSec: 8, highlight: "#D8D2CC", base: "#B8B0A8", shadow: "#7A736C", label: "Mercury" },
  { radius: 193, size: 11, durationSec: 13, highlight: "#F5E4B8", base: "#E6C989", shadow: "#A88A4F", label: "Venus" },
  { radius: 221, size: 14, durationSec: 19, highlight: "#8AB4FF", base: "#4C8BF5", shadow: "#2954A8", label: "Earth" },
  { radius: 249, size: 10, durationSec: 26, highlight: "#E06A35", base: "#C1440E", shadow: "#7A2A08", label: "Mars" },
  {
    radius: 286,
    size: 20,
    durationSec: 34,
    highlight: "#E8CBA0",
    base: "#C9A26D",
    shadow: "#8F6C42",
    banded: true,
    label: "git-fundamentals",
  },
  {
    radius: 328,
    size: 18,
    durationSec: 44,
    highlight: "#F5E5B0",
    base: "#E3C77E",
    shadow: "#A88B48",
    ring: "#C9A768",
    label: "github-workflow-assistant",
  },
  {
    radius: 366,
    size: 14,
    durationSec: 56,
    highlight: "#C0EEF2",
    base: "#8FD9E0",
    shadow: "#4FA8B0",
    label: "personal-notes",
  },
  {
    radius: 400,
    size: 14,
    durationSec: 70,
    highlight: "#6E8BE0",
    base: "#3B5FCB",
    shadow: "#223A8A",
    label: "team-runbook",
  },
];

/** Decorative backdrop for /login — purely CSS-animated (no JS state),
 * centered on the full page (both columns share it, no seam between
 * them). Respects prefers-reduced-motion via the .orbit-spin rule in
 * globals.css. Each planet reveals its label on hover (a real skill name
 * for the four outer ones); still aria-hidden overall since it's a
 * decorative flourish, not a path to content that exists nowhere else. */
export function SolarSystem() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      {/* Sun — the logo mark itself, glowing at the center */}
      <div
        className="absolute left-1/2 top-1/2 drop-shadow-[0_0_48px_hsl(var(--brand)/0.55)]"
        style={{ width: 72, height: 81, marginLeft: -36, marginTop: -41 }}
      >
        <Image src="/brand/jaas-mark-inline.png" alt="" width={72} height={81} />
      </div>

      {ORBITS.map((orbit) => (
        <div key={orbit.radius}>
          {/* Orbit path */}
          <div
            className="absolute left-1/2 top-1/2 rounded-full border border-foreground/10"
            style={{
              width: orbit.radius * 2,
              height: orbit.radius * 2,
              marginLeft: -orbit.radius,
              marginTop: -orbit.radius,
            }}
          />
          {/* Rotating pivot — the planet dot rides its top edge around */}
          <div
            className="orbit-spin absolute left-1/2 top-1/2"
            style={{
              width: orbit.radius * 2,
              height: orbit.radius * 2,
              marginLeft: -orbit.radius,
              marginTop: -orbit.radius,
              animationDuration: `${orbit.durationSec}s`,
            }}
          >
            {/* Hover hit-area is padded out beyond the visual sphere size
                (down to 9px for Mercury) so small planets stay easy to
                hover; pointer-events-auto opts this one element back in
                despite the whole decoration being pointer-events-none. */}
            <div
              className="group pointer-events-auto absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ width: Math.max(orbit.size, 26), height: Math.max(orbit.size, 26) }}
            >
              <div className="relative" style={{ width: orbit.size, height: orbit.size }}>
                {orbit.ring ? (
                  <span
                    className="absolute left-1/2 top-1/2 rounded-full border"
                    style={{
                      width: orbit.size * 2.1,
                      height: orbit.size * 0.85,
                      borderColor: `${orbit.ring}99`,
                      transform: "translate(-50%, -50%) rotate(-20deg)",
                    }}
                  />
                ) : null}
                {/* Sphere: radial-gradient shading (light source upper-left)
                    gives it a lit-ball look instead of a flat dot. */}
                <span
                  className="absolute inset-0 overflow-hidden rounded-full"
                  style={{
                    background: `radial-gradient(circle at 32% 28%, ${orbit.highlight}, ${orbit.base} 55%, ${orbit.shadow} 100%)`,
                  }}
                >
                  {orbit.banded ? (
                    <span
                      className="absolute inset-0 opacity-30 mix-blend-multiply"
                      style={{
                        background:
                          "repeating-linear-gradient(0deg, transparent 0, transparent 12%, rgba(0,0,0,0.35) 12%, rgba(0,0,0,0.35) 20%)",
                      }}
                    />
                  ) : null}
                </span>
              </div>

              <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {orbit.label}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
