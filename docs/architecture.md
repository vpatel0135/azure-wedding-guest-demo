# Architecture decisions

## Separate personal and portfolio repositories

The personal application contains real event information and remains private. The portfolio repository starts with a new Git history and contains only synthetic fixtures. This prevents removed files from remaining available through earlier public commits.

## Passwordless deployment

GitHub Actions exchanges its repository and environment identity for a short-lived Azure token through OpenID Connect. No Azure client secret or Static Web Apps deployment token is stored as a long-lived GitHub secret.

## Public/private build boundary

The browser receives only the files under `site/`: a small HTML shell, same-origin CSS and JavaScript assets, and the Static Web Apps configuration. The build combines an explicit synthetic dataset with the guest application and runs a privacy check against every deployable content artifact. Keeping executable code in a same-origin file allows the Content Security Policy to reject inline script and style execution.

## Observability without visitor tracking

Azure Monitor platform metrics provide site hits, errors, and bandwidth at the hosting layer. This supplies operational evidence without browser cookies, user identifiers, or a third-party analytics script. Platform metrics are the default; richer client analytics require a separate privacy and cost decision.

## Threat model

- DNS names and Azure routing endpoints are public by design.
- HTTPS protects traffic in transit; Azure manages certificate renewal.
- OIDC removes stored Azure credentials from CI/CD.
- Security headers restrict framing, browser sensors, and outbound connections.
- Synthetic data prevents the portfolio deployment from exposing personal event information.
