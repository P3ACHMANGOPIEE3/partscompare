# PartsCompare

> **A Web-Based Bill of Materials Comparison System Using Curated Supplier Offers**  
> *Project Nexus • College of Engineering and Digital Technology (CEDT)*

PartsCompare is an auditable decision-support system designed to reconcile exact-part electronics BOMs against curated, dated supplier quotations.

## Features & Modules

- **Preparer (Maker) Workspace:** Create multi-line BOMs, review offer coverage, and lock frozen sourcing summaries.
- **Maintainer Workspace:** Manage curated catalog offers, inspect 14-day freshness thresholds, and track accredited supplier data.
- **Administrator Console:** Enforce role-based access control (RBAC), system evaluation currency, and global freshness limits.
- **Audit Traceability:** Preserves frozen snapshots that remain unchanged even when supplier records update later.
- **Interactive Help Center:** Live searchable drawer with FAQs, scope definitions, and support articles.

## Project Structure

```text
├── index.html        # Main app entry
├── css/
│   └── styles.css    # Responsive theme, dark mode, animations
└── js/
    ├── fixtures.js   # Seed parts and supplier dataset
    ├── adapter.js    # Client-side simulation and RBAC engine
    ├── art.js        # Dynamic SVG chip and circuit illustrations
    ├── landing.js    # Public landing page with Bedloft-style footer
    └── app.js        # Main routing, workspaces, and support widget