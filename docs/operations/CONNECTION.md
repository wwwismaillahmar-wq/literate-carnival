# Secure Contabo operations channel — activation guide
State (2026-10-21): merged into main; first GitHub Actions ASLAN Contabo Health Monitor #1 completed successfully (user-supplied run details: 13 seconds, check passed). Dedicated VPS account and health script were installed by operator. A subsequent workflow revision requires explicit `RESULT: PASS` from the server; that revision's result must be verified separately. This is a restricted READ-ONLY monitoring channel, not a general deployment shell. SSH private key was exposed in prior screenshots and requires rotation before long-term production trust.

Architecture: scheduled GitHub Actions -> pinned-host-key SSH -> dedicated non-root aslan-ops account -> sudo allowlisted read-only health script -> Actions run summary and failure status.

## One-time activation prerequisites
1. Administrator reviews and installs the audited scripts from this development branch on Contabo, using an authenticated console. Bootstrap needs a newly generated dedicated SSH public key in ASLAN_OPS_PUBLIC_KEY. Never put a private key in the repository.
2. Restrict SSH ingress to trusted source IPs if feasible; GitHub-hosted runner egress IPs vary. For stronger security prefer a self-hosted runner or outbound tunnel with narrowly scoped service identity.
3. In GitHub Actions secrets, configure ASLAN_OPS_HOST, ASLAN_OPS_USER=aslan-ops, ASLAN_OPS_SSH_KEY (matching private key), ASLAN_OPS_HOST_KEY (verified pinned known_hosts entry from an independent trusted source). Do not use ssh-keyscan output without verifying the fingerprint.
4. Enable scheduled workflow only after validating the non-root account, sudo allowlist, and test run. GitHub Actions schedules are best-effort, not continuous monitoring or guaranteed precise-time execution.
5. Add independent uptime alerting and backup restore drills before declaring 24/7 operations.

## Boundaries
No database writes, migrations, deployments, restart, root shell or production changes are authorized by this channel. No passwords in reports. The script currently verifies only container running state, PostgreSQL readiness and root disk utilization; object storage read/write and application endpoint checks remain separate acceptance tests.
No notification integration has been configured; failed workflow status and Actions summary are the only reports until alert delivery is connected.
