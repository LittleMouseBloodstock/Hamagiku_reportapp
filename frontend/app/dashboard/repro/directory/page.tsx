"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildRestHeaders, restGet } from "@/lib/restClient";
import { labelMaps, shortLabel, uterusShort } from "@/lib/reproLabels";
import { formatShortDate, toAmPmLabel } from "@/lib/reproDate";

type Mare = {
  id: string;
  name: string;
  name_en: string;
};

type SnapshotRow = {
  horse_id: string;
  date: string;
  latest_performed_at: string;
  max_follicle_mm_r?: number | null;
  max_follicle_mm_l?: number | null;
  cervix_state?: string | null;
  uterus_flags?: { edema?: boolean; fluid?: boolean } | null;
  uterus_tone?: string | null;
  interventions?: string[] | null;
};

export default function ReproDirectoryPage() {
  const { language, t } = useLanguage();
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [mares, setMares] = useState<Mare[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);

  useEffect(() => {
    let mounted = true;
    const getRestHeaders = () => {
      if (!session?.access_token) throw new Error("Missing access token for REST");
      return buildRestHeaders({ bearerToken: session.access_token });
    };
    const fetchMares = async () => {
      if (!session?.access_token) return;
      const orFilter = encodeURIComponent('(sex.eq.Mare,and(sex.eq.Filly,broodmare_flag.eq.true))');
      const data = await restGet(`horses?select=id,name,name_en,broodmare_flag&or=${orFilter}&order=name`, getRestHeaders());
      if (mounted) setMares(data || []);
    };
    fetchMares().catch(() => setMares([]));
    return () => {
      mounted = false;
    };
  }, [session?.access_token]);

  useEffect(() => {
    let mounted = true;
    const getRestHeaders = () => {
      if (!session?.access_token) throw new Error("Missing access token for REST");
      return buildRestHeaders({ bearerToken: session.access_token });
    };
    const fetchSnapshots = async () => {
      if (!session?.access_token || mares.length === 0) return;
      const ids = mares.map((m) => m.id).join(",");
      const data = await restGet(
        `repro_daily_snapshots?select=horse_id,date,latest_performed_at,max_follicle_mm_r,max_follicle_mm_l,cervix_state,uterus_flags,uterus_tone,interventions&horse_id=in.(${ids})&order=date.desc,latest_performed_at.desc`,
        getRestHeaders()
      );
      if (mounted) setSnapshots(data || []);
    };
    fetchSnapshots().catch(() => setSnapshots([]));
    return () => {
      mounted = false;
    };
  }, [mares, session?.access_token]);

  const filtered = useMemo(() => {
    if (!query.trim()) return mares;
    const q = query.toLowerCase();
    return mares.filter((mare) => mare.name.toLowerCase().includes(q) || mare.id.toLowerCase().includes(q));
  }, [query, mares]);

  const latestMap = useMemo(() => {
    const map: Record<string, SnapshotRow | null> = {};
    snapshots.forEach((row) => {
      if (!map[row.horse_id]) map[row.horse_id] = row;
    });
    return map;
  }, [snapshots]);

  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    snapshots.forEach((row) => {
      map[row.horse_id] = (map[row.horse_id] || 0) + 1;
    });
    return map;
  }, [snapshots]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative font-serif">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-[#FDFCF8] border-b border-stone-200 gap-3 sm:gap-0">
        <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
          <span className="material-symbols-outlined">list</span>
          {t("reproDirectory")}
        </div>
        <div className="flex items-center gap-4 self-end sm:self-auto">
          <Link
            href="/dashboard/repro"
            className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white text-stone-600 rounded-lg shadow-sm hover:text-stone-800 transition-all ring-1 ring-stone-200"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="text-sm font-medium">{t("reproBack")}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 bg-[#FDFCF8]">
        <div className="mb-4">
          <input
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${t("reproSearch")}...`}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-10 text-center text-stone-500">
            {t("reproNoData")}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((mare) => {
              const latest = latestMap[mare.id];
              const summary = latest
                ? `R${latest.max_follicle_mm_r ?? "-"} / L${latest.max_follicle_mm_l ?? "-"} | ${shortLabel(
                    labelMaps.cervix,
                    language,
                    latest.cervix_state
                  )} ${uterusShort(language, latest.uterus_flags || {}, latest.uterus_tone)}`
                : t("reproNoData");

              const latestLabel = latest
                ? `${formatShortDate(latest.date)} ${toAmPmLabel(latest.latest_performed_at)}`
                : t("reproNoData");

              return (
                <div key={mare.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-stone-800">
                        {language === "ja" ? mare.name : mare.name_en || mare.name}
                      </h3>
                      <div className="text-xs text-stone-400 font-mono">{mare.id}</div>
                    </div>
                    <div className="text-xs text-stone-500">
                      {countMap[mare.id] ?? 0} {t("reproChecks")}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-stone-600">{summary}</div>
                  <div className="mt-2 text-xs text-stone-500">
                    {t("reproLastCheck")}: {latestLabel}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/dashboard/repro/mares/${mare.id}`}
                      className="px-3 py-2 text-sm rounded-lg border border-stone-200 text-stone-600 hover:text-stone-800"
                    >
                      {t("reproTimeline")}
                    </Link>
                    <Link
                      href={`/dashboard/repro/checks/new?horse_id=${mare.id}`}
                      className="px-3 py-2 text-sm rounded-lg bg-[#1a3c34] text-white hover:bg-[#122b25]"
                    >
                      {t("reproNewCheck")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
