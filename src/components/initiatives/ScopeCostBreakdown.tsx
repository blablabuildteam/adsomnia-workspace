import {
  estimateMemberCost,
  formatEuro,
  getRoleById,
  resolveHourlyRate,
  summarizeTeamCost,
} from "@/data/role-rates";
import type { ScopingTeamMember } from "@/lib/validation-data";
import { PARTIES } from "@/data/workflow";

type ScopeCostBreakdownProps = {
  team: ScopingTeamMember[];
};

export function ScopeCostBreakdown({ team }: ScopeCostBreakdownProps) {
  const priced = team.filter((t) => t.role.trim() && t.totalHours > 0);
  const summary = summarizeTeamCost(team);

  if (priced.length === 0) {
    return (
      <p className="text-xs text-muted">
        Add roles and hours above to estimate scope cost.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {priced.map((member) => {
          const rate = resolveHourlyRate(member);
          const cost = estimateMemberCost(member);
          const catalogRole = getRoleById(member.roleId);
          const party =
            PARTIES.find((p) => p.id === member.party) ??
            PARTIES.find((p) => p.id === catalogRole?.party);
          const partyLabel = party?.label ?? "—";
          const partyColor = party?.color;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs text-foreground">{member.role}</p>
                <p className="mt-0.5 font-display text-[9px] font-bold uppercase tracking-wider">
                  <span style={partyColor ? { color: partyColor } : undefined}>
                    {partyLabel}
                  </span>
                  {member.name.trim() ? (
                    <span className="text-muted/50"> · {member.name}</span>
                  ) : null}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs tabular-nums text-foreground">
                  {cost != null ? formatEuro(cost) : "€—"}
                </p>
                <p className="mt-0.5 text-[10px] tabular-nums text-muted/60">
                  {member.totalHours}h
                  <span className="text-muted/30"> × </span>
                  {rate != null ? `${formatEuro(rate)}/h` : "€—/h"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-foreground/[0.04] px-3 py-2">
        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Estimated total (excl. VAT)
        </span>
        <span className="font-display text-sm font-bold tabular-nums text-foreground">
          {summary.total != null ? formatEuro(summary.total) : "€—"}
        </span>
      </div>

      {summary.unpricedCount > 0 && (
        <p className="text-[11px] text-muted/60">
          {summary.unpricedCount} role
          {summary.unpricedCount === 1 ? "" : "s"} still need a catalog rate.
        </p>
      )}

      {summary.usesAssumedRates && (
        <p className="text-[11px] leading-relaxed text-muted/50">
          Adsomnia, Bending The Rules, and Harlem Next currently use a
          stand-in rate of {formatEuro(100)}/h until official lists arrive.
          blablabuild Hybrid is confirmed at {formatEuro(175)}/h.
        </p>
      )}
    </div>
  );
}
