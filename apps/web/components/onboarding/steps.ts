import type { DriveStep } from 'driver.js';
import type { OnboardingFlow } from '@/lib/queries/onboarding';

/**
 * Per-flow step config consumed by `driver.js`. Element selectors are
 * stable IDs added to the target components — see the plan for the
 * mapping. Centered steps (no `element`) are used for intro/outro copy.
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
      element: '#sidebar-nav',
      popover: {
        title: 'Navigation',
        description:
          'Crawls, alerts, billing, and your profile all live in the sidebar.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#new-crawl-btn',
      popover: {
        title: 'Start a crawl',
        description:
          "Click here whenever you want to track new keywords. We'll handle the fetching, dedup, and ranking.",
        side: 'bottom',
        align: 'end',
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
      element: '#crawl-header',
      popover: {
        title: 'Your first crawl',
        description:
          'This is the crawl detail page. Each crawl gets its own results stream.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#crawl-keywords',
      popover: {
        title: 'Keywords',
        description:
          'These are the terms we crawl for on this run. Edit them anytime from settings.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '#run-now-btn',
      popover: {
        title: 'Run on demand',
        description:
          'Crawls run on a schedule, but you can kick one off manually any time.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '#filter-prompt',
      popover: {
        title: 'Natural-language filter',
        description:
          'Type something like "only YC-funded startups" — we\'ll narrow the visible results without dropping data.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: '#results-pane',
      popover: {
        title: 'Results land here',
        description:
          'Once a run completes, articles + posts show up below with thumbnails, summaries, and timestamps.',
        side: 'top',
        align: 'center',
      },
    },
  ],
};
