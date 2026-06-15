import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseUsageRange } from "@/lib/usage-range";

export const Route = createFileRoute("/usage")({
  validateSearch: (search: Record<string, unknown>) => ({
    range: parseUsageRange(search.range),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/overview",
      search: { range: search.range },
      hash: "usage",
    });
  },
  component: () => null,
});
