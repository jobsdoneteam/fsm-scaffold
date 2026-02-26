// =============================================================================
// Brand Configuration
// This is the ONLY file you need to edit to white-label the platform
// for a new client. Change name, colors, trade, and feature flags here.
// =============================================================================

export const brand = {
  // Company identity
  name: "Your Company",
  tagline: "Field Service Management",
  logoPath: "/logo.png", // place in /public/logo.png

  // Theme — maps to CSS variables in globals.css
  // Use HSL values without the hsl() wrapper: "H S% L%"
  colors: {
    primary: "221 83% 53%",        // blue by default — change to brand color
    primaryForeground: "0 0% 100%",
    sidebar: "221 83% 20%",        // darker shade for sidebar bg
    sidebarForeground: "0 0% 100%",
    accent: "221 83% 40%",
  },

  // What kind of trade is this client in?
  // Controls which item type definitions get seeded by default.
  trade: "general" as "hvac" | "plumbing" | "electrical" | "landscaping" | "general",

  // Terminology overrides — swap out words to match client vocabulary
  terms: {
    job: "Job",                   // or "Work Order", "Service Call", "Ticket"
    jobs: "Jobs",
    property: "Property",         // or "Site", "Location", "Job Site"
    properties: "Properties",
    technician: "Technician",     // or "Tech", "Field Rep", "Crew Member"
    technicians: "Technicians",
    customer: "Customer",         // or "Client", "Account"
    customers: "Customers",
    invoice: "Invoice",           // or "Bill", "Statement"
    pricebook: "Pricebook",       // or "Catalog", "Rate Sheet"
    timecard: "Timecard",         // or "Time Entry", "Hours Log"
  },

  // Feature flags — disable modules you don't need for a specific client
  features: {
    dispatch: true,       // Calendar / dispatch board
    inventory: true,      // Parts & materials inventory
    tools: true,          // Tool tracking
    timecards: true,      // Technician timecards
    invoicing: true,      // Invoice generation & delivery
    pricebook: true,      // Pricebook management
    customerPortal: false, // Phase 2
    reporting: false,     // Phase 2
  },

  // Contact info shown in invoice PDFs and emails
  contact: {
    email: "",
    phone: "",
    address: "",
    website: "",
  },

  // Invoice settings
  invoice: {
    defaultTerms: "Due on receipt",
    defaultTaxRate: 0, // percentage, e.g. 6 for 6%
    prefix: "INV",     // invoice number prefix: INV-2024-0001
    jobPrefix: "JOB",  // job number prefix: JOB-2024-0001
  },
} as const;

export type Brand = typeof brand;
