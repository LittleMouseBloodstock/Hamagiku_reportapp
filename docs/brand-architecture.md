# Shinba Brand Architecture

## Purpose

This document defines the naming, domain, and information architecture rules for the Shinba brand.
It exists to keep future LP, website, and app implementation aligned across the team and AI tools.

The goal is not to design every future system in advance.
The goal is to prevent a recurring mistake: treating `Shinba` or `shinba.app` as a single-product application instead of a parent brand and brand entry point.

## Fixed Principles

### Brand Principles

- `Shinba` is the parent brand.
- `Shinba` is not the name of a single standalone app.
- `Shinba` is the umbrella concept for multiple products around racehorses, training, veterinary operations, and bloodstock-related workflows.

### Domain Principles

- `shinba.app` is the parent domain.
- `shinba.app` is the brand site, not the full product application for one service.
- Individual products should be separated by subdomain when needed.
- Brand should be unified, while implementation can remain independent.
- API, auth, and database should not be fully centralized from the beginning.

## Brand Role

### `Shinba`

`Shinba` is the top-level brand used to group related software products.
It should be presented as the shared identity across products, not as a synonym for one specific application.

What `Shinba` should mean:

- the brand users remember
- the umbrella identity across multiple products
- the consistent visual and trust layer across products
- the place where future products can be added without renaming the whole system

What `Shinba` should not mean:

- one product only
- one codebase only
- one database only
- one unified backend decided too early

## Parent Site Role

### `shinba.app`

`shinba.app` is the public entry point for the Shinba brand.
It should explain what Shinba is, what products exist, and how users can navigate into those products.

The parent site is responsible for:

- introducing the Shinba brand
- listing and positioning products
- explaining the company or team behind the products
- providing trust and contact entry points
- offering common legal and brand-level guidance

The parent site is not responsible for:

- containing every product workflow itself
- acting as the only application runtime for all future products
- forcing all product features into `/product-a`, `/product-b`, `/product-c`

## Product Role

Each child product should have its own clear role, scope, and URL boundary.
Products may share brand language, design tone, and trust elements, but they do not need to share implementation from day one.

Initial product structure:

- `Shinba Report`
  - reporting product
  - expected domain: `report.shinba.app`
- `Shinba STT`
  - speech-to-text, voice charting, and instruction workflow product
  - expected domain: `stt.shinba.app`
- demo environment
  - expected domain: `demo.shinba.app`

## Naming Matrix

| Display Name | Type | Purpose | URL | Notes |
| --- | --- | --- | --- | --- |
| Shinba | Brand | Umbrella brand across multiple equine tech products | https://shinba.app | Not a single app name |
| shinba.app | Parent site | Brand entry point, product overview, trust and contact hub | https://shinba.app | Public-facing parent domain |
| Shinba Report | Child product | Reporting product for owner/client-facing report workflows | https://report.shinba.app | Product name under the Shinba brand |
| report.shinba.app | Subdomain | Main product site/app for Shinba Report | https://report.shinba.app | Product runtime should live here |
| Shinba STT | Child product | STT, voice charting, and instruction management product | https://stt.shinba.app | Product naming may later evolve into a more specific proper name |
| stt.shinba.app | Subdomain | Main product site/app for the STT product | https://stt.shinba.app | Product runtime should live here |
| demo.shinba.app | Subdomain | Demo or preview environment across Shinba products | https://demo.shinba.app | Keep demo concerns separate from production brand site |

## Subdomain Rules

### Core Rule

Use subdomains for product applications and product-specific runtime boundaries.
Use paths on `shinba.app` for parent-brand information architecture.

### Use `/path` on `shinba.app` when

- the page is about the Shinba brand itself
- the page helps users understand the product lineup
- the page is primarily informational, editorial, legal, or contact-oriented
- the page should remain part of the parent site's shared navigation and SEO structure

Examples:

- `/`
- `/products`
- `/about`
- `/contact`
- `/blog`
- `/case-studies`
- `/docs`

### Use a subdomain when

- the product has its own app-like workflow
- the product may need different auth, release cadence, or infrastructure
- the product may later have its own team, backend, database, or billing logic
- the product needs to evolve independently without making the parent site the operational bottleneck

Examples:

- `report.shinba.app`
- `stt.shinba.app`
- `demo.shinba.app`
- future candidates such as `docs.shinba.app`, `auth.shinba.app`, `app.shinba.app`

### Decision Heuristic

Choose `/path` if the content explains the brand.
Choose a subdomain if the experience behaves like a product.

## Parent Site Information Architecture

### `/`

- Purpose: explain Shinba as a parent brand and present the overall value proposition
- Main content:
  - parent-brand positioning
  - short overview of available products
  - category focus such as reporting, STT, veterinary workflow, bloodstock operations
  - trust signals and contact entry
- CTA:
  - view products
  - contact
  - request demo

### `/products`

- Purpose: list and compare current Shinba products
- Main content:
  - product summaries
  - problem each product solves
  - target user or operation type
  - links to each product site
- CTA:
  - open product site
  - request demo
  - contact sales

### `/about`

- Purpose: explain the brand background and why Shinba exists
- Main content:
  - mission
  - domain focus
  - operating philosophy
  - why multiple equine workflows are grouped under one brand
- CTA:
  - contact
  - explore products

### `/contact`

- Purpose: provide a stable inquiry route at the brand level
- Main content:
  - inquiry methods
  - expected inquiry categories
  - sales and partnership guidance
- CTA:
  - send inquiry
  - request demo

### Future expansion pages

#### `/blog`

- Purpose: brand-level updates and thought pieces
- Main content:
  - product updates
  - market observations
  - implementation notes
- CTA:
  - read more
  - view products

#### `/case-studies`

- Purpose: show real usage and proof
- Main content:
  - operational outcomes
  - workflow improvements
  - customer narratives
- CTA:
  - request demo
  - contact

#### `/docs`

- Purpose: provide brand-level or cross-product documentation entry points
- Main content:
  - links to public docs
  - onboarding references
  - shared terminology or usage guidance
- CTA:
  - open docs
  - go to product

## Operating Rules

### Responsibility split

- The parent brand site and each product must have separate responsibilities.
- The parent site explains the brand and product lineup.
- Each product site explains and runs that specific product.

### Product hosting rule

- Product applications should live on subdomains by default.
- Do not assume that every future product should be implemented as a path under `shinba.app`.

### Shared infrastructure rule

- Delay API, auth, and database unification until there is a concrete need.
- Independent products may start with separate implementations.
- Standardize only where repetition becomes operationally expensive or user-visible.

### Brand consistency rule

- User-visible brand experience should feel consistent across products.
- Logo system, baseline tone, legal links, and trust framing should align under the Shinba brand.
- Product naming should follow `Shinba + Product Name` unless a later explicit naming decision replaces it.

### Legal and trust rule

- Parent-brand legal and contact guidance should be easy to find.
- Product sites may have product-specific legal pages, but they should remain aligned with parent-brand identity and contact channels.

## Future Expansion Policy

Future additions should fit one of two categories:

- brand-level informational additions under `shinba.app`
- product or operational surfaces on dedicated subdomains

Likely future cases:

- `docs.shinba.app`
  - if documentation becomes large enough to require its own navigation and publishing workflow
- `auth.shinba.app`
  - if authentication becomes shared across multiple products and needs an explicit identity boundary
- `app.shinba.app`
  - if a multi-product launcher or workspace is later required

These are placeholders for future architecture decisions.
They are not implementation commitments in the current phase.

## Non-Goals

The following are explicitly out of scope for the current phase:

- fully shared API architecture from the beginning
- fully shared database architecture from the beginning
- turning `shinba.app` into a single-product dedicated site
- deciding now that all future products must share one auth stack
- beginning implementation of `auth.shinba.app` or `api` centralization in this document

## Implementation Guidance For Team And AI

When writing product copy, metadata, IA, or routing decisions:

- treat `Shinba` as the umbrella brand
- treat `shinba.app` as the parent-brand entrance
- treat product apps as separate destinations when they have app-like behavior
- avoid wording that implies `shinba.app` equals only `Shinba Report`
- avoid collapsing every product into one monolithic web app too early

## Change Proposal For Current Site

Current observation:

- the existing public-facing implementation inside `frontend` is still strongly centered on `Shinba Report`
- metadata and landing content currently position `https://shinba.app` as if it were the report product site itself

Suggested future changes, without implementing them in this step:

### Content changes

- change the top-level homepage narrative from single-product messaging to parent-brand messaging
- present `Shinba Report` as the first product in a broader product lineup
- add a dedicated products section with clear product cards and links
- move report-specific deep selling points so they can later live under `report.shinba.app`

### Page additions

- add `/products`
- add `/about`
- add `/contact`
- later consider `/case-studies` and `/docs`

### Component additions or refactors

- brand-level header navigation for Home, Products, About, Contact
- product-card section for multiple Shinba products
- brand-level footer with legal and contact links shared across the parent site
- clearer CTA separation between "learn about Shinba" and "open a product"

### Areas that should become less single-product-specific

- homepage title and metadata
- hero copy that currently describes only `Shinba Report`
- footer wording that treats the parent domain as one product site
- screenshots and CTA structure that imply the parent domain is the report app itself

## Summary Rule

If a future contributor must decide between "brand page" and "product app", use this rule:

- brand, overview, trust, and navigation belong on `shinba.app`
- product workflows belong on product subdomains
