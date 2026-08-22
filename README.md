# Big Wicks Fireworks

Marketing website for Big Wicks Fireworks LLC in La Porte, Indiana.

## Development

```bash
npm run dev
```

The first rebrand pass includes the homepage, store information, category-ready frontend structure, responsive navigation, and SEO metadata. Product catalog, inventory, checkout, and live promotion data are intentionally out of scope.

Set `NEXT_PUBLIC_SITE_URL` to the production origin at deployment so social sharing image URLs resolve to the live domain.

## Contact form email delivery

The `/contact` form sends messages server-side through the Resend Email API. Copy `.env.example` to `.env.local` and configure:

- `RESEND_API_KEY`: server-only Resend API key.
- `CONTACT_FROM_EMAIL`: sender using a domain verified in Resend, optionally with a display name.
- `CONTACT_TO_EMAIL`: the Big Wicks inbox that should receive website inquiries.

The recipient is intentionally not hard-coded. If any delivery variable is missing, the form returns a visible error and directs the visitor to call the store; it never reports success while discarding the submission.
