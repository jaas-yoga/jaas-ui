import { PackageSearch, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { VisibilityBadge, type BadgeKind } from "@/components/skills/visibility-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JaasApiRequestError } from "@/lib/jaas-api";
import type { ReceivedShareResponse, SearchResultItem } from "@/lib/jaas-api-types";
import { listReceivedShares, searchSkills } from "@/lib/skills-api";
import { cn } from "@/lib/utils";
import {
  matchesVisibilityFilter,
  VISIBILITY_FILTERS,
  type VisibilityFilter,
} from "@/lib/visibility-filter";

function toBadgeKind(
  item: SearchResultItem,
  caller: { userId?: string; tenantId?: string },
): BadgeKind {
  if (item.visibility === "public") return "public";
  if (item.ownerUser === caller.userId) return "private";
  if (item.ownerTenant === caller.tenantId) return "shared-tenant";
  return "shared-user";
}

function isValidFilter(value: string | undefined): value is VisibilityFilter {
  return VISIBILITY_FILTERS.some((f) => f.value === value);
}

export default async function SkillsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawVisibility = Array.isArray(params.visibility) ? params.visibility[0] : params.visibility;
  const activeFilter: VisibilityFilter = isValidFilter(rawVisibility) ? rawVisibility : "all";
  const query = Array.isArray(params.query) ? params.query[0] : params.query;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const rawTags = Array.isArray(params.tags) ? params.tags[0] : params.tags;
  const selectedTags = rawTags ? rawTags.split(",").filter(Boolean) : [];

  const session = await auth();
  const caller = { userId: session?.jaasUser?.id, tenantId: session?.jaasActiveTenantId };

  let items: SearchResultItem[] = [];
  let availableTags: string[] = [];
  let categoryCounts: { name: string; count: number }[] = [];
  let allCategoriesCount = 0;
  let receivedShares: ReceivedShareResponse[] = [];
  let loadError: string | null = null;
  try {
    if (activeFilter === "shared-with-me") {
      // IMPLEMENTATION_PLAN.md Phase 3.4: a real fetch against
      // GET /shares/received, not a client-side inference over search
      // results — this is the only path that can show grant metadata
      // (who shared it, when, what permission), since SearchResultItem
      // carries none of that.
      receivedShares = await listReceivedShares();
    } else {
      // Only `query` is sent server-side — category/tags are applied here
      // instead, so the sidebar's category counts and the tag chip list
      // can both be derived from the same one full result set rather than
      // needing a second round trip per facet.
      const result = await searchSkills({ query });
      const visibilityFiltered = result.items.filter((item) =>
        matchesVisibilityFilter(item, activeFilter, caller),
      );
      allCategoriesCount = visibilityFiltered.length;

      const counts = new Map<string, number>();
      for (const item of visibilityFiltered) {
        counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
      }
      categoryCounts = Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const categoryFiltered = category
        ? visibilityFiltered.filter((item) => item.category === category)
        : visibilityFiltered;
      // Built from the category-filtered set, before tags narrow it
      // further, so the chip row doesn't lose options as you select them.
      availableTags = Array.from(new Set(categoryFiltered.flatMap((item) => item.tags))).sort();
      items =
        selectedTags.length > 0
          ? categoryFiltered.filter((item) => selectedTags.every((tag) => item.tags.includes(tag)))
          : categoryFiltered;
    }
  } catch (err) {
    loadError =
      err instanceof JaasApiRequestError
        ? `${err.code}: ${err.message}`
        : "Could not reach the registry API.";
  }
  const hasResults = activeFilter === "shared-with-me" ? receivedShares.length > 0 : items.length > 0;

  function categoryHref(nextCategory: string | null): string {
    const qs = new URLSearchParams();
    if (query) qs.set("query", query);
    if (activeFilter !== "all") qs.set("visibility", activeFilter);
    if (nextCategory) qs.set("category", nextCategory);
    // Tags don't carry across a category switch — a different category has
    // a different tag vocabulary, so a stale selection would just filter
    // everything out with no visible explanation.
    return qs.size > 0 ? `/skills?${qs.toString()}` : "/skills";
  }

  function tagHref(tag: string): string {
    const qs = new URLSearchParams();
    if (query) qs.set("query", query);
    if (category) qs.set("category", category);
    if (activeFilter !== "all") qs.set("visibility", activeFilter);
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    if (nextTags.length > 0) qs.set("tags", nextTags.join(","));
    return qs.size > 0 ? `/skills?${qs.toString()}` : "/skills";
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Skills</h1>
        <p className="text-sm text-muted-foreground">
          Discover published skill packages across your tenants.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-wrap gap-2">
            {VISIBILITY_FILTERS.map((filter) => {
              const qs = new URLSearchParams();
              if (query) qs.set("query", query);
              if (category) qs.set("category", category);
              if (filter.value !== "all") qs.set("visibility", filter.value);
              const href = qs.size > 0 ? `/skills?${qs.toString()}` : "/skills";
              return (
                <Link key={filter.value} href={href}>
                  <Badge
                    variant={filter.value === activeFilter ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1 text-sm font-normal"
                  >
                    {filter.label}
                  </Badge>
                </Link>
              );
            })}
          </div>

          {loadError ? (
            <EmptyState
              icon={TriangleAlert}
              title="Couldn't load skills"
              description={loadError}
              action={
                <Button asChild variant="outline">
                  <Link href="/skills">Retry</Link>
                </Button>
              }
            />
          ) : hasResults && activeFilter === "shared-with-me" ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Permission</TableHead>
                    <TableHead>Shared by</TableHead>
                    <TableHead className="text-right">Shared at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedShares.map((share) => (
                    <TableRow key={share.id} className="cursor-pointer">
                      <TableCell className="font-medium text-foreground">
                        <Link
                          href={`/skills/${share.skillId}/versions/stable`}
                          className="hover:underline"
                        >
                          {share.skillName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{share.skillCategory}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {share.permission === "read_write" ? "Read & write" : "Read"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{share.grantedBy}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {new Date(share.grantedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : hasResults ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer">
                      <TableCell className="font-medium text-foreground">
                        <Link
                          href={`/skills/${item.id}/versions/${item.version}`}
                          className="hover:underline"
                        >
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <VisibilityBadge kind={toBadgeKind(item, caller)} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.category}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs font-normal">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {item.version}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={PackageSearch}
              title="No skills match"
              description="Try a different filter, or create your first skill."
              action={
                <Button asChild>
                  <Link href="/drafts">Create Your First Skill</Link>
                </Button>
              }
            />
          )}
        </div>

        {activeFilter === "shared-with-me" || loadError ? null : (
          <aside className="w-full shrink-0 space-y-4 lg:w-64">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">Category</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-0.5">
                <Link href={categoryHref(null)}>
                  <span
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                      !category
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    <span>All categories</span>
                    <span className="text-xs tabular-nums">{allCategoriesCount}</span>
                  </span>
                </Link>
                {categoryCounts.map(({ name, count }) => (
                  <Link key={name} href={categoryHref(name)}>
                    <span
                      className={cn(
                        "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                        category === name
                          ? "bg-accent font-medium text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <span>{name}</span>
                      <span className="text-xs tabular-nums">{count}</span>
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {availableTags.length > 0 ? (
              <Card size="sm">
                <CardHeader>
                  <CardTitle className="text-sm">Tags</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => (
                    <Link key={tag} href={tagHref(tag)}>
                      <Badge
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer px-2 py-0.5 text-xs font-normal"
                      >
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </aside>
        )}
      </div>
    </div>
  );
}
