/**
 * Combell API v2 types
 *
 * Based on the public OpenAPI description of https://api.combell.com/v2
 * (snake_case JSON, ISO-8601 dates, skip/take pagination).
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface CombellAuthConfig {
  /** API key from My Combell > API. */
  apiKey: string;
  /** API secret from My Combell > API. Never logged, never sent on the wire. */
  apiSecret: string;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PageParams {
  /** Number of items to skip. */
  skip?: number;
  /** Number of items to return; the API may return fewer. */
  take?: number;
}

/** Parsed from the X-Paging-* response headers on collection endpoints. */
export interface PagingMeta {
  skipped: number;
  take: number;
  total: number;
}

/** Parsed from the X-RateLimit-* response headers (present on every response). */
export interface RateLimitMeta {
  limit?: number;
  usage?: number;
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

export interface ListResult<T> {
  items: T[];
  paging?: PagingMeta;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export interface ValidationErrorMessage {
  error_code: string;
  error_text: string;
}

export interface BadRequestResponse {
  validation_errors?: ValidationErrorMessage[];
}

// ─── Accounts & servicepacks ─────────────────────────────────────────────────

export type AssetType = "domain" | "linux_hosting" | "mysql" | "dns" | "mailbox" | "windows_hosting";

export interface Servicepack {
  id: number;
  name: string;
}

export interface Addon {
  id: number;
  name: string;
}

export interface Account {
  id: number;
  identifier: string;
  servicepack_id: number;
}

export interface AccountDetail {
  id: number;
  identifier: string;
  servicepack: Servicepack;
  addons: Addon[];
}

export interface CreateAccount {
  identifier: string;
  servicepack_id: number;
  ftp_password?: string;
}

// ─── Provisioning jobs ───────────────────────────────────────────────────────

export type ProvisioningJobStatus = "ongoing" | "cancelled" | "failed" | "finished";

export interface ProvisioningJobInfo {
  id: string;
  status: ProvisioningJobStatus;
  completion?: { estimate?: string };
}

export interface ProvisioningJobCompletion {
  id: string;
  resource_links: string[];
}

// ─── Domains ─────────────────────────────────────────────────────────────────

export interface Domain {
  domain_name: string;
  expiration_date?: string;
  will_renew?: boolean | null;
}

export interface NameServer {
  name: string;
  ip?: string;
}

export interface Registrant {
  first_name?: string;
  last_name?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country_code?: string;
  email?: string;
  fax?: string;
  phone?: string;
  language_code?: string;
  company_name?: string;
  enterprise_number?: string;
}

export interface ExtraField {
  name: string;
  value: string;
}

export interface RegistrantInput extends Registrant {
  extra_fields?: ExtraField[];
}

export interface DomainDetail extends Domain {
  name_servers?: NameServer[];
  registrant?: Registrant;
  can_toggle_renew?: boolean;
}

export interface RegisterDomain {
  domain_name: string;
  name_servers?: string[];
  registrant: RegistrantInput;
}

export interface TransferDomain extends RegisterDomain {
  auth_code: string;
}

// ─── DNS ─────────────────────────────────────────────────────────────────────

export type DnsRecordType = "A" | "AAAA" | "CAA" | "CNAME" | "MX" | "TXT" | "SRV" | "ALIAS" | "TLSA";

export interface DnsRecord {
  id?: string;
  type: string;
  record_name?: string;
  ttl?: number;
  content?: string;
  priority?: number;
  service?: string;
  weight?: number;
  target?: string;
  protocol?: string;
  port?: number;
}

// ─── Linux hosting ───────────────────────────────────────────────────────────

export interface HostHeader {
  name: string;
  enabled: boolean;
}

export interface LinuxSite {
  name: string;
  path: string;
  host_headers?: HostHeader[];
  ssl_enabled?: boolean;
  https_redirect_enabled?: boolean;
  http2_enabled?: boolean;
}

export interface LinuxHosting {
  domain_name: string;
  servicepack_id: number;
}

export interface LinuxHostingDetail extends LinuxHosting {
  max_size?: number;
  actual_size?: number;
  ip?: string;
  ip_type?: "dedicated" | "shared";
  ftp_enabled?: boolean;
  ftp_username?: string;
  ssh_host?: string;
  ssh_username?: string;
  php_version?: string;
  sites?: LinuxSite[];
  mysql_database_names?: string[];
}

export interface PhpVersion {
  version: string;
}

export interface ScheduledTask {
  id?: string;
  enabled: boolean;
  cron_expression: string;
  script_location: string;
}

export interface SshKey {
  fingerprint: string;
  public_key: string;
}

export interface SshKeyDetail extends SshKey {
  linux_hostings?: string[];
}

// ─── Windows hosting ─────────────────────────────────────────────────────────

export interface WindowsHosting {
  domain_name: string;
  servicepack_id: number;
}

export interface SiteBinding {
  protocol?: string;
  host_name?: string;
  ip_address?: string;
  port?: number;
  cert_thumbprint?: string;
  ssl_enabled?: boolean;
}

export interface WindowsSite {
  name: string;
  path: string;
  bindings?: SiteBinding[];
}

export interface WindowsHostingDetail extends WindowsHosting {
  max_size?: number;
  actual_size?: number;
  ip?: string;
  ip_type?: "dedicated" | "shared";
  ftp_username?: string;
  application_pool?: {
    runtime?: string;
    pipeline_mode?: string;
    installed_net_core_runtimes?: string[];
  };
  sites?: WindowsSite[];
  mssql_database_names?: string[];
}

// ─── Mail ────────────────────────────────────────────────────────────────────

export interface AutoReply {
  enabled: boolean;
  subject?: string;
  message?: string;
}

export interface AutoForward {
  enabled: boolean;
  email_addresses?: string[];
  copy_to_myself?: boolean;
}

export interface Mailbox {
  name: string;
  max_size?: number;
  actual_size?: number;
}

export interface MailboxDetail extends Mailbox {
  login?: string;
  auto_reply?: AutoReply;
  auto_forward?: AutoForward;
}

export type AntiSpamType = "none" | "basic" | "advanced";

export interface Alias {
  email_address: string;
  destinations: string[];
}

export interface SmtpDomain {
  hostname: string;
  enabled: boolean;
}

export interface MailZone {
  name: string;
  enabled?: boolean;
  available_accounts?: { account_id: number; size: number }[];
  aliases?: Alias[];
  anti_spam?: { type: AntiSpamType; allowed_types?: AntiSpamType[] };
  catch_all?: { email_addresses?: string[] };
  smtp_domains?: SmtpDomain[];
}

// ─── MySQL ───────────────────────────────────────────────────────────────────

export interface MySqlDatabase {
  name: string;
  hostname?: string;
  user_count?: number;
  max_size?: number;
  actual_size?: number;
  account_id?: number;
}

export interface MySqlUser {
  name: string;
  rights?: "read_and_write" | "read_only";
  enabled?: boolean;
}

// ─── SSL ─────────────────────────────────────────────────────────────────────

export type SslCertificateType = "standard" | "multi_domain" | "wildcard";
export type SslCertificateValidationLevel = "domain_validated" | "organization_validated" | "extended_validated";

export interface SslSubjectAltName {
  type: "dns" | "ip";
  value: string;
}

export interface SslCertificate {
  sha1_fingerprint: string;
  common_name: string;
  expires_after?: string;
  validation_level?: SslCertificateValidationLevel;
  type?: SslCertificateType;
}

export interface SslCertificateDetail extends SslCertificate {
  subject_alt_names?: SslSubjectAltName[];
}

export interface SslCertificateRequest {
  id: number;
  certificate_type?: SslCertificateType;
  validation_level?: SslCertificateValidationLevel;
  vendor?: string;
  common_name?: string;
  order_code?: string;
}

export interface SslCertificateRequestValidation {
  dns_name: string;
  type: "dns" | "file" | "email";
  auto_validated?: boolean;
  email_addresses?: string[];
  cname_validation_name?: string;
  cname_validation_content?: string;
  file_validation_url_http?: string;
  file_validation_url_https?: string;
  file_validation_content?: string[];
}

export interface SslCertificateRequestDetail extends SslCertificateRequest {
  subject_alt_names?: SslSubjectAltName[];
  validations?: SslCertificateRequestValidation[];
  provider_portal_url?: string;
}
