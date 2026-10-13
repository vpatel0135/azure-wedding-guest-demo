# Production deployment evidence

Verified on October 13, 2026.

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
- `https://sidvivah26.com/`: redirected to the canonical `www` hostname and served the synthetic demo over HTTPS.
- Azure Monitor platform metrics returned `SiteHits` and `BytesSent`; no `SiteErrors` were observed during verification.

The public deployment contains fictional people, dates, venues, schedules, addresses, and guest information. The original personal application and its Git history remain in a separate private repository.
