import type { DriveStep } from 'driver.js';
import type { OnboardingFlow } from '@/lib/queries/onboarding';

/**
 * Find the first element matching `selector` that's actually rendered
 * (non-zero bounding box). Lets a single step target multiple candidate
 * elements — e.g. desktop `<Sidebar>` vs. the mobile `<SidebarTrigger>`
 * hamburger — and pick whichever the current viewport is showing.
 *
 * Returns `undefined` if nothing matches, which makes driver.js fall back
 * to a centered popover for that step.
 */
function resolveVisible(selector: string): Element | undefined {
  if (typeof document === 'undefined') return undefined;
  const nodes = document.querySelectorAll(selector);
  for (const node of Array.from(nodes)) {
    const el = node as HTMLElement;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return undefined;
}

/**
 * Per-flow step config consumed by `driver.js`. `element` is supplied as
 * a resolver function rather than a CSS string so we can pick whichever
 * candidate is currently in the layout — important on mobile where the
 * sidebar collapses to a hamburger and the "Start a crawl" CTA becomes a
 * floating action button.
 */
export const ONBOARDING_STEPS: Record<OnboardingFlow, DriveStep[]> = {
  FIRST_LOGIN: [
    {
      popover: {
        title: 'Welcome to CRWLA',
        description:
          "Let's take a 30-second tour so you know where everything lives.",
      },
    },
    {
      element: () => resolveVisible('[data-tour="nav"]') as Element,
      popover: {
        title: 'Navigation',
        description:
          'Crawls, alerts, billing, and your profile all live in the sidebar. On smaller screens the hamburger opens it.',
      },
    },
    {
      element: () => resolveVisible('[data-tour="new-crawl"]') as Element,
      popover: {
        title: 'Start a crawl',
        description:
          "Tap here whenever you want to track new keywords. We'll handle the fetching, dedup, and ranking.",
      },
    },
    {
      popover: {
        title: "You're set",
        description:
          "Try starting a crawl next — we'll walk you through the result view once you do.",
      },
    },
  ],
  FIRST_CRAWL: [
    {
      element: () => resolveVisible('#crawl-header') as Element,
      popover: {
        title: 'Your first crawl',
        description:
          'This is the crawl detail page. Each crawl gets its own results stream.',
      },
    },
    {
      element: () => resolveVisible('#crawl-keywords') as Element,
      popover: {
        title: 'Keywords',
        description:
          'These are the terms we crawl for on this run. Edit them anytime from settings.',
      },
    },
    {
      element: () => resolveVisible('#run-now-btn') as Element,
      popover: {
        title: 'Run on demand',
        description:
          'Crawls run on a schedule, but you can kick one off manually any time.',
      },
    },
    {
      element: () => resolveVisible('#filter-prompt') as Element,
      popover: {
        title: 'Natural-language filter',
        description:
          'Type something like "only YC-funded startups" — we\'ll narrow the visible results without dropping data.',
      },
    },
    {
      element: () => resolveVisible('#results-pane') as Element,
      popover: {
        title: 'Results land here',
        description:
          'Once a run completes, articles + posts show up below with thumbnails, summaries, and timestamps.',
      },
    },
  ],
};
