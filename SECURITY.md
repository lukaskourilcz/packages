# Security

These packages parse financial and registry data, so please report a security issue privately: use **Report a vulnerability** on the repository's Security tab (GitHub private vulnerability reporting) rather than a public issue.

None of the packages sends data anywhere on its own. Only `lookupAres` and `checkVies` in `@lukaskourilcz/czech-tax-registry` make network requests, and only to the public ARES and VIES endpoints you call them for.
