import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * IMPLEMENTATION_PLAN.md Phase 3.4: the Phase 3.3 governance surface
 * (CSA Agentic Trust Framework / EU AI Act fields) had no frontend at
 * all until now. Renders nothing when no governance record has been set
 * yet for this skill — that's the normal case for most skills today, not
 * an error state.
 */
export function GovernanceCard({
  businessPurpose,
  systemsAccessed,
  governanceReviewDate,
}: {
  businessPurpose: string | null;
  systemsAccessed: string[];
  governanceReviewDate: string | null;
}) {
  const hasAnyField = Boolean(
    businessPurpose || systemsAccessed.length > 0 || governanceReviewDate,
  );
  if (!hasAnyField) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Governance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {businessPurpose && (
          <div>
            <p className="text-muted-foreground">Business purpose</p>
            <p className="text-foreground">{businessPurpose}</p>
          </div>
        )}
        {systemsAccessed.length > 0 && (
          <div>
            <p className="mb-1 text-muted-foreground">Systems accessed</p>
            <div className="flex flex-wrap gap-1.5">
              {systemsAccessed.map((system) => (
                <Badge key={system} variant="outline">
                  {system}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {governanceReviewDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Review date</span>
            <span className="font-mono text-xs text-foreground">{governanceReviewDate}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
