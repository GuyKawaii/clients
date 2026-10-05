/** Framework-independent styles shared by Angular and Lit popovers. */
export const popoverStyles = {
  surface: "tw-overflow-hidden tw-rounded-xl tw-shadow-md tw-border tw-border-border-base",
  body: "tw-relative tw-z-20 tw-max-w-[22.5rem] tw-break-words tw-bg-bg-primary tw-text-fg-body",
  padding: "tw-p-6",
  closePosition: "tw-absolute tw-top-3 tw-right-3",
  content: "tw-flex tw-flex-col tw-gap-6",
  headingAndBody: "tw-flex tw-flex-col tw-gap-3",
  title: "tw-text-fg-heading !tw-mb-0",
  description: "tw-text-fg-body",
} as const;
