type Orbit = {
  radius: number;
  size: number;
  durationSec: number;
  colorClass: string;
  ring?: boolean;
};

// Stylized, not scientifically to-scale — radius/speed both grow outward
// so the whole thing still reads as "a solar system" at a glance. Colors
// reuse the app's own semantic tokens (tokens.css) rather than one-off
// hex values, so this stays correct across every theme (light/dark/ocean/
// violet) for free. Radii start past the sign-in card's own half-width
// (~190px) — anything smaller would just orbit invisibly underneath it.
const ORBITS: Orbit[] = [
  { radius: 230, size: 8, durationSec: 10, colorClass: "bg-warning" },
  { radius: 285, size: 11, durationSec: 16, colorClass: "bg-danger" },
  { radius: 340, size: 12, durationSec: 23, colorClass: "bg-info" },
  { radius: 395, size: 9, durationSec: 31, colorClass: "bg-success" },
  { radius: 455, size: 16, durationSec: 42, colorClass: "bg-brand", ring: true },
];

/** Decorative, non-interactive backdrop for /login — purely CSS-animated
 * (no JS state), centered behind the sign-in card so the card reads as
 * "mission control" sitting at the sun. Respects prefers-reduced-motion
 * via the .orbit-spin rule in globals.css. */
export function SolarSystem() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      {/* Sun */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full bg-gradient-to-br from-brand to-brand/60 shadow-[0_0_70px_22px_hsl(var(--brand)/0.35)]"
        style={{ width: 22, height: 22, marginLeft: -11, marginTop: -11 }}
      />

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
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
              style={{ width: orbit.size, height: orbit.size }}
            >
              {orbit.ring ? (
                <span
                  className="absolute left-1/2 top-1/2 rounded-full border border-brand/40"
                  style={{
                    width: orbit.size * 2.1,
                    height: orbit.size * 0.85,
                    transform: "translate(-50%, -50%) rotate(-20deg)",
                  }}
                />
              ) : null}
              <span className={`absolute inset-0 rounded-full ${orbit.colorClass}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
