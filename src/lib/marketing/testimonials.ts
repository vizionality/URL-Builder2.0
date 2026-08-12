export type Testimonial = {
  /** The exact words of a real customer — do not invent these. */
  quote: string;
  /** Person's name. */
  name: string;
  /** Role and/or company, e.g. "Growth Lead, Acme". */
  title: string;
};

// Add REAL testimonials here once you have them (from customers, reviews,
// or beta users who agreed to be quoted). The testimonials section on the
// landing page renders only when this array has entries, so it stays hidden
// until you have genuine social proof to show. Never fill this with invented
// quotes — fake reviews mislead visitors and can violate ad-platform policy.
export const TESTIMONIALS: Testimonial[] = [];
