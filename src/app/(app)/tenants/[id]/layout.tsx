import { TenantNavTabs } from "@/components/tenants/tenant-nav-tabs";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex w-full gap-8">
      <TenantNavTabs tenantId={id} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
