# Validation

- TypeScript: passed (`tsc --noEmit`)
- Production build: passed (Vite)
- Automated tests: 4 suites passed: booking/security/persistence; VAT and Thai amount wording; current-week events in Bangkok timezone; mocked Email/LINE outbox, payment review and webhook signatures.
- Browser checked: storefront, admin login, invoice creation and A4 document layout.
- External SMTP/LINE delivery is not tested against real accounts: configure credentials and use the test buttons.
- Source archive contains no test accounts, bookings, slips or issued invoices.
