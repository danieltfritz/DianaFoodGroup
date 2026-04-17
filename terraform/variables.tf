variable "project_name" {
  description = "Short name used as a prefix for all resources (e.g. 'ccfp')"
  type        = string
  default     = "ccfp"
}

variable "environment" {
  description = "Deployment environment (e.g. 'prod', 'staging')"
  type        = string
  default     = "prod"
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus"
}

# ─── App Service ──────────────────────────────────────────────────────────────

variable "app_service_sku" {
  description = "App Service Plan SKU (B2 = Basic tier, suitable for small prod workloads; upgrade to P1v3 for autoscale)"
  type        = string
  default     = "B2"
}

variable "node_version" {
  description = "Node.js version for the App Service runtime"
  type        = string
  default     = "20-lts"
}

# ─── Database ─────────────────────────────────────────────────────────────────

variable "sql_admin_login" {
  description = "SQL Server administrator login name (cannot be 'admin', 'administrator', 'sa', 'root', 'guest')"
  type        = string
  default     = "PLACEHOLDER_SQL_ADMIN"
  sensitive   = true
}

variable "sql_admin_password" {
  description = "SQL Server administrator password (min 8 chars, must include uppercase, lowercase, digit, and special char)"
  type        = string
  default     = "PLACEHOLDER_SQL_PASSWORD_Change1!"
  sensitive   = true
}

variable "sql_database_sku" {
  description = "Azure SQL Database SKU (S0 = ~$15/mo, S1 = ~$30/mo, S2 = ~$75/mo)"
  type        = string
  default     = "S1"
}

# ─── App Settings ─────────────────────────────────────────────────────────────

variable "nextauth_secret" {
  description = "NextAuth NEXTAUTH_SECRET — generate with: openssl rand -base64 32"
  type        = string
  default     = "PLACEHOLDER_NEXTAUTH_SECRET_replace_with_openssl_rand_base64_32"
  sensitive   = true
}
