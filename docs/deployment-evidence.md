# Production deployment evidence

Verified on October 13, 2026.

## Reverification note — October 14, 2026

- `https://www.sidvivah26.com/` returned HTTP 200 with the expected security headers.
- `https://sit.sidvivah26.com/` returned HTTP 200 with the expected security headers.
- `https://sidvivah26.com/` did not pass TLS hostname validation because the presented certificate did not cover the apex hostname. The custom-domain binding and certificate state must be repaired before the apex redirect can be considered verified again.

## Apex-domain remediation — October 21, 2026

- Azure reported `sidvivah26.com` in `Validating` state and requested its TXT ownership token at the DNS zone apex.
- The matching apex TXT record was added in Netlify DNS while preserving the existing ALIAS to `gray-dune-077d6ee0f.4.azurestaticapps.net`.
- Azure revalidation was requested. Certificate issuance remains pending during DNS propagation and must be reverified before this incident is closed.

## Delivery controls

- GitHub Actions authenticates to Azure with OpenID Connect; no long-lived Azure client secret is stored in GitHub.
- Production deployments use the `wedding-production` GitHub environment and are restricted to the `main` branch.
- The Azure federated credential trusts GitHub's immutable owner and repository identifiers.
- The privacy check runs before infrastructure planning or deployment.

## Verified results

- Terraform plan: **No changes. Infrastructure matches the configuration.**
- Production workflow: **Succeeded**.
- Azure default hostname: served the synthetic Avery & Jordan demo.
- `https://www.sidvivah26.com/`: served the synthetic demo over HTTPS.
- `https://sidvivah26.com/`: redirected to the canonical `www` hostname and served the synthetic demo over HTTPS at the time of the original October 13 verification; see the October 14 reverification note above.
- Azure Monitor platform metrics returned `SiteHits` and `BytesSent`; no `SiteErrors` were observed during verification.

The public deployment contains fictional people, dates, venues, schedules, addresses, and guest information. The original personal application and its Git history remain in a separate private repository.
