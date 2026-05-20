"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const PUBLIC_PATHS = new Set(["/", "/report"]);
const SCROLL_MILESTONES = [25, 50, 75, 90];

function classifyReferrer(referrer: string) {
  if (!referrer) return "direct";

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host === "t.co" || host === "x.com" || host === "twitter.com") return "x";
    if (host.includes("google.")) return "google";
    if (host.includes("bing.")) return "bing";
    if (host.includes("yahoo.")) return "yahoo";
    return host;
  } catch {
    return "unknown";
  }
}

function getSessionId() {
  const key = "shinba_lp_session_id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(key, generated);
  return generated;
}

function PublicAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [measurementId, setMeasurementId] = useState("");
  const shouldLoad = Boolean(measurementId) && PUBLIC_PATHS.has(pathname);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const enabled = shouldLoad && analyticsReady;
  const visitedSectionsRef = useRef<Set<string>>(new Set());
  const hitScrollDepthsRef = useRef<Set<number>>(new Set());
  const maxScrollDepthRef = useRef(0);
  const lastSectionRef = useRef<string>("top");
  const pageStartRef = useRef(Date.now());

  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    if (!PUBLIC_PATHS.has(pathname)) return;

    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await fetch("/api/analytics-config", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { gaMeasurementId?: string };
        if (!cancelled) setMeasurementId(data.gaMeasurementId || "");
      } catch {
        if (!cancelled) setMeasurementId("");
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const sendEvent = useCallback(
    (eventName: string, params: Record<string, string | number | boolean | undefined> = {}) => {
      if (!enabled || !window.gtag) return;

      window.gtag("event", eventName, {
        page_path: pathname,
        ...params,
      });
    },
    [enabled, pathname]
  );

  useEffect(() => {
    if (!enabled || !window.gtag) return;

    const params = new URLSearchParams(queryString);
    const referrer = document.referrer;
    const sessionId = getSessionId();
    pageStartRef.current = Date.now();
    visitedSectionsRef.current = new Set();
    hitScrollDepthsRef.current = new Set();
    maxScrollDepthRef.current = 0;
    lastSectionRef.current = "top";

    window.gtag("config", measurementId, {
      page_path: `${pathname}${queryString ? `?${queryString}` : ""}`,
      page_title: document.title,
    });

    sendEvent("lp_landing_attribution", {
      session_id: sessionId,
      referrer: referrer || "direct",
      source_guess: params.get("utm_source") || classifyReferrer(referrer),
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
      utm_term: params.get("utm_term") || undefined,
    });
  }, [enabled, pathname, queryString, sendEvent, measurementId]);

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const depth = scrollable > 0 ? Math.min(100, Math.round((scrollTop / scrollable) * 100)) : 100;
      maxScrollDepthRef.current = Math.max(maxScrollDepthRef.current, depth);

      for (const milestone of SCROLL_MILESTONES) {
        if (depth >= milestone && !hitScrollDepthsRef.current.has(milestone)) {
          hitScrollDepthsRef.current.add(milestone);
          sendEvent("lp_scroll_depth", {
            depth_percent: milestone,
            last_section: lastSectionRef.current,
          });
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [enabled, sendEvent]);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-analytics-section]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const section = entry.target.getAttribute("data-analytics-section");
          if (!section) continue;

          lastSectionRef.current = section;
          if (visitedSectionsRef.current.has(section)) continue;

          visitedSectionsRef.current.add(section);
          sendEvent("lp_section_view", {
            section,
          });
        }
      },
      { rootMargin: "-20% 0px -35% 0px", threshold: 0.2 }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [enabled, sendEvent, pathname]);

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-analytics-event]") : null;
      if (!target) return;

      sendEvent("lp_cta_click", {
        action: target.getAttribute("data-analytics-event") || "click",
        label: target.getAttribute("data-analytics-label") || target.innerText.trim().slice(0, 80),
        destination: target.getAttribute("href") || undefined,
        section: target.closest<HTMLElement>("[data-analytics-section]")?.getAttribute("data-analytics-section") || lastSectionRef.current,
      });
    };

    document.addEventListener("click", handleClick);

    return () => document.removeEventListener("click", handleClick);
  }, [enabled, sendEvent]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || !window.gtag) return;

      window.gtag("event", "lp_session_end", {
        page_path: pathname,
        engagement_seconds: Math.max(1, Math.round((Date.now() - pageStartRef.current) / 1000)),
        max_scroll_depth: maxScrollDepthRef.current,
        last_section: lastSectionRef.current,
        section_count: visitedSectionsRef.current.size,
        transport_type: "beacon",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, pathname]);

  if (!shouldLoad) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="shinba-ga4" strategy="afterInteractive" onReady={() => setAnalyticsReady(true)}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}

export default function PublicAnalytics() {
  return (
    <Suspense fallback={null}>
      <PublicAnalyticsInner />
    </Suspense>
  );
}
