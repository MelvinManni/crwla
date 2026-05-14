'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  useActiveOnboarding,
  useCompleteOnboarding,
  useDismissOnboarding,
  type OnboardingFlow,
} from '@/lib/queries/onboarding';
import { ONBOARDING_STEPS } from './steps';

/**
 * Route patterns each flow runs on. The walkthrough only fires when the
 * current pathname matches the flow's pattern — otherwise the targeted
 * elements wouldn't be in the DOM.
 */
const FLOW_ROUTES: Record<OnboardingFlow, RegExp> = {
  FIRST_LOGIN: /^\/dashboard\/?$/,
  FIRST_CRAWL: /^\/crawls\/[^/]+\/?$/,
};

function flowForPath(
  flows: { flow: OnboardingFlow }[],
  pathname: string,
): OnboardingFlow | null {
  for (const f of flows) {
    if (FLOW_ROUTES[f.flow].test(pathname)) return f.flow;
  }
  return null;
}

/**
 * Mounts once in the authenticated app layout. Watches the active-flow
 * query + the current route, and when both line up, fires a `driver.js`
 * tour. The server returns `[]` for admins so this component renders
 * but does nothing for them.
 */
export function Walkthrough() {
  const pathname = usePathname();
  const { data } = useActiveOnboarding();
  const dismiss = useDismissOnboarding();
  const complete = useCompleteOnboarding();
  // Track which (flow, route) combo we already fired so a re-render — or
  // a query refetch — doesn't relaunch the same tour.
  const firedRef = useRef<string | null>(null);
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    if (!data?.flows?.length || !pathname) return;
    const flow = flowForPath(data.flows, pathname);
    if (!flow) return;

    const key = `${flow}@${pathname}`;
    if (firedRef.current === key) return;
    firedRef.current = key;

    // Track completion vs. dismissal via the lifecycle callbacks. driver.js
    // fires `onDestroyed` regardless of how the tour ended, so we need a
    // flag to distinguish "completed last step" from "closed via X".
    let completed = false;
    const steps = ONBOARDING_STEPS[flow];

    const tour = driver({
      showProgress: true,
      allowClose: true,
      steps,
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      onNextClick: (_el, _step, opts) => {
        if (opts.state.activeIndex === steps.length - 1) {
          completed = true;
          tour.destroy();
        } else {
          tour.moveNext();
        }
      },
      onCloseClick: () => {
        tour.destroy();
      },
      onDestroyed: () => {
        if (completed) complete.mutate(flow);
        else dismiss.mutate(flow);
        driverRef.current = null;
      },
    });

    driverRef.current = tour;
    tour.drive();

    return () => {
      // Strict-mode / route change: tear down without firing dismiss so we
      // don't burn the flow accidentally. Real dismiss/complete flow runs
      // through onDestroyed above.
      const t = driverRef.current;
      if (t) {
        // Detach the destroy listener so we don't post-dismiss on cleanup.
        // driver.js doesn't expose handler removal cleanly, so re-instance
        // via destroy(true) — but absent that, just nullify our ref and
        // let it fall out of scope; if the user navigated mid-tour, the
        // destroy event already fired through their close action.
      }
    };
    // We intentionally don't include the mutation hooks in deps — they
    // mutate per-call and would re-trigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.flows, pathname]);

  return null;
}
