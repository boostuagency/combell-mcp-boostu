# Combell API v2 endpoint manifest

Mapping of the public Combell API v2 (from its OpenAPI description) to the tools in this server.
Base URL: `https://api.combell.com`; every path below is prefixed with `/v2`.

Status legend: **mapped** = a tool calls it and unit tests assert the exact request; **not exposed** = deliberately left out.

| Method | Path | Tool | Status |
|--------|------|------|--------|
| GET | `/accounts` | `combell_accounts_list` | mapped |
| POST | `/accounts` | `combell_accounts_create` | mapped (202, provisioning job) |
| GET | `/accounts/{accountId}` | `combell_accounts_get` | mapped |
| GET | `/servicepacks` | `combell_servicepacks_list` | mapped |
| GET | `/provisioningjobs/{jobId}` | `combell_provisioning_jobs_get` | mapped (200 ongoing / 201 finished) |
| GET | `/domains` | `combell_domains_list` | mapped |
| GET | `/domains/{domainName}` | `combell_domains_get` | mapped |
| POST | `/domains/registrations` | `combell_domains_register` | mapped (202) |
| POST | `/domains/transfers` | `combell_domains_transfer` | mapped (202) |
| PUT | `/domains/{domainName}/nameservers` | `combell_domains_set_nameservers` | mapped |
| PUT | `/domains/{domainName}/renew` | `combell_domains_set_renew` | mapped |
| GET | `/dns/{domainName}/records` | `combell_dns_records_list` | mapped |
| POST | `/dns/{domainName}/records` | `combell_dns_records_create` | mapped (201) |
| GET | `/dns/{domainName}/records/{recordId}` | `combell_dns_records_get` | mapped |
| PUT | `/dns/{domainName}/records/{recordId}` | `combell_dns_records_update` | mapped (GET, merge, PUT) |
| DELETE | `/dns/{domainName}/records/{recordId}` | `combell_dns_records_delete` | mapped |
| GET | `/linuxhostings` | `combell_linux_hostings_list` | mapped |
| GET | `/linuxhostings/{domainName}` | `combell_linux_hostings_get` | mapped |
| GET | `/linuxhostings/{domainName}/phpsettings/availableversions` | `combell_linux_hostings_php_versions` | mapped |
| PUT | `/linuxhostings/{domainName}/phpsettings/version` | `combell_linux_hostings_set_php_version` | mapped |
| PUT | `/linuxhostings/{domainName}/phpsettings/memorylimit` | `combell_linux_hostings_set_php_memory_limit` | mapped |
| PUT | `/linuxhostings/{domainName}/phpsettings/apcu` | `combell_linux_hostings_set_php_apcu` | mapped |
| PUT | `/linuxhostings/{domainName}/settings/gzipcompression` | `combell_linux_hostings_set_gzip` | mapped |
| PUT | `/linuxhostings/{domainName}/ftp/configuration` | `combell_linux_hostings_set_ftp` | mapped |
| POST | `/linuxhostings/{domainName}/subsites` | `combell_linux_hostings_subsites_create` | mapped (201) |
| DELETE | `/linuxhostings/{domainName}/subsites/{siteName}` | `combell_linux_hostings_subsites_delete` | mapped |
| POST | `/linuxhostings/{domainName}/sites/{siteName}/hostheaders` | `combell_linux_hostings_host_headers_create` | mapped (201) |
| PUT | `/linuxhostings/{domainName}/sites/{siteName}/http2/configuration` | `combell_linux_hostings_set_http2` | mapped |
| PUT | `/linuxhostings/{domainName}/sslsettings/{hostname}/letsencrypt` | `combell_linux_hostings_set_letsencrypt` | mapped |
| PUT | `/linuxhostings/{domainName}/sslsettings/{hostname}/autoredirect` | `combell_linux_hostings_set_https_redirect` | mapped |
| GET | `/linuxhostings/{domainName}/scheduledtasks` | `combell_scheduled_tasks_list` | mapped |
| POST | `/linuxhostings/{domainName}/scheduledtasks` | `combell_scheduled_tasks_create` | mapped (201) |
| GET | `/linuxhostings/{domainName}/scheduledtasks/{scheduledTaskId}` | `combell_scheduled_tasks_get` | mapped |
| PUT | `/linuxhostings/{domainName}/scheduledtasks/{scheduledTaskId}` | `combell_scheduled_tasks_update` | mapped (GET, merge, PUT) |
| DELETE | `/linuxhostings/{domainName}/scheduledtasks/{scheduledTaskId}` | `combell_scheduled_tasks_delete` | mapped |
| GET | `/ssh` | `combell_ssh_keys_list_all` | mapped |
| PUT | `/linuxhostings/{domainName}/ssh/configuration` | `combell_ssh_set_enabled` | mapped |
| GET | `/linuxhostings/{domainName}/ssh/keys` | `combell_ssh_keys_list` | mapped |
| POST | `/linuxhostings/{domainName}/ssh/keys` | `combell_ssh_keys_add` | mapped (201) |
| DELETE | `/linuxhostings/{domainName}/ssh/keys/{fingerprint}` | `combell_ssh_keys_delete` | mapped |
| GET | `/windowshostings` | `combell_windows_hostings_list` | mapped |
| GET | `/windowshostings/{domainName}` | `combell_windows_hostings_get` | mapped |
| GET | `/mailboxes?domain_name=` | `combell_mailboxes_list` | mapped |
| POST | `/mailboxes` | `combell_mailboxes_create` | mapped (201) |
| GET | `/mailboxes/{mailboxName}` | `combell_mailboxes_get` | mapped |
| DELETE | `/mailboxes/{mailboxName}` | `combell_mailboxes_delete` | mapped |
| PUT | `/mailboxes/{mailboxName}/password` | `combell_mailboxes_set_password` | mapped |
| PUT | `/mailboxes/{mailboxName}/autoreply` | `combell_mailboxes_set_auto_reply` | mapped |
| PUT | `/mailboxes/{mailboxName}/autoforward` | `combell_mailboxes_set_auto_forward` | mapped |
| GET | `/mailzones/{domainName}` | `combell_mail_zones_get` | mapped |
| POST | `/mailzones/{domainName}/catchall` | `combell_mail_zones_catch_all_create` | mapped (201) |
| DELETE | `/mailzones/{domainName}/catchall/{emailAddress}` | `combell_mail_zones_catch_all_delete` | mapped |
| PUT | `/mailzones/{domainName}/antispam` | `combell_mail_zones_set_anti_spam` | mapped |
| POST | `/mailzones/{domainName}/aliases` | `combell_mail_zones_aliases_create` | mapped (201) |
| PUT | `/mailzones/{domainName}/aliases/{emailAddress}` | `combell_mail_zones_aliases_update` | mapped (202) |
| DELETE | `/mailzones/{domainName}/aliases/{emailAddress}` | `combell_mail_zones_aliases_delete` | mapped |
| POST | `/mailzones/{domainName}/smtpdomains` | `combell_mail_zones_smtp_domains_create` | mapped (201) |
| PUT | `/mailzones/{domainName}/smtpdomains/{hostname}` | `combell_mail_zones_smtp_domains_update` | mapped (202) |
| DELETE | `/mailzones/{domainName}/smtpdomains/{hostname}` | `combell_mail_zones_smtp_domains_delete` | mapped |
| GET | `/mysqldatabases` | `combell_mysql_databases_list` | mapped |
| POST | `/mysqldatabases` | `combell_mysql_databases_create` | mapped (202) |
| GET | `/mysqldatabases/{databaseName}` | `combell_mysql_databases_get` | mapped |
| DELETE | `/mysqldatabases/{databaseName}` | `combell_mysql_databases_delete` | mapped |
| GET | `/mysqldatabases/{databaseName}/users` | `combell_mysql_users_list` | mapped |
| POST | `/mysqldatabases/{databaseName}/users` | `combell_mysql_users_create` | mapped (202) |
| PUT | `/mysqldatabases/{databaseName}/users/{userName}/status` | `combell_mysql_users_set_status` | mapped |
| PUT | `/mysqldatabases/{databaseName}/users/{userName}/password` | `combell_mysql_users_set_password` | mapped |
| DELETE | `/mysqldatabases/{databaseName}/users/{userName}` | `combell_mysql_users_delete` | mapped |
| GET | `/sslcertificates` | `combell_ssl_certificates_list` | mapped |
| GET | `/sslcertificates/{sha1Fingerprint}` | `combell_ssl_certificates_get` | mapped |
| GET | `/sslcertificates/{sha1Fingerprint}/download` | (none) | not exposed: returns a password-protected PFX binary |
| GET | `/sslcertificaterequests` | `combell_ssl_certificate_requests_list` | mapped |
| POST | `/sslcertificaterequests` | `combell_ssl_certificate_requests_create` | mapped (201) |
| GET | `/sslcertificaterequests/{id}` | `combell_ssl_certificate_requests_get` | mapped (200 / 303 / 410) |
| PUT | `/sslcertificaterequests/{id}` | `combell_ssl_certificate_requests_verify` | mapped (202 / 303 / 410) |

74 tools cover 74 of the 75 operations in the specification.

## Conventions used by every tool

- Collections return `{ items, paging: { skipped, take, total } }` from the `X-Paging-*` headers.
- `202 Accepted` returns `{ accepted: true, location, provisioning_job_id, next_step }` when the Location points at a provisioning job.
- `201 Created` returns `{ created: true, location, id }` with the trailing id of the Location header.
- `204 No Content` returns `{ success: true, action, ...echoed input }`.
- Errors return an `isError` text result with the HTTP status, the API `error_code`/`error_text` and any `validation_errors`, plus a hint for 401 (IP whitelist), 403, 404, 410 and 429.
