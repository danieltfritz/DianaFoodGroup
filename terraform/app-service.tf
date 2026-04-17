locals {
  # Prisma SQL Server connection string using SQL auth (no Windows integrated security on Azure)
  database_url = "sqlserver://${azurerm_mssql_server.main.fully_qualified_domain_name};database=${azurerm_mssql_database.main.name};user=${var.sql_admin_login};password=${var.sql_admin_password};encrypt=true;trustServerCertificate=false"

  # Public URL of the app — used for NEXTAUTH_URL
  app_url = "https://${azurerm_linux_web_app.main.default_hostname}"
}

resource "azurerm_service_plan" "main" {
  name                = "asp-${var.project_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku

  tags = local.tags
}

resource "azurerm_linux_web_app" "main" {
  name                = "app-${var.project_name}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  https_only = true

  site_config {
    always_on        = true
    http2_enabled    = true
    ftps_state       = "Disabled"
    app_command_line = "node server.js"

    application_stack {
      node_version = var.node_version
    }
  }

  app_settings = {
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL = local.database_url

    # ── NextAuth ──────────────────────────────────────────────────────────────
    NEXTAUTH_SECRET = var.nextauth_secret
    NEXTAUTH_URL    = local.app_url

    # ── Node / Next.js ────────────────────────────────────────────────────────
    NODE_ENV                    = "production"
    WEBSITE_NODE_DEFAULT_VERSION = "~20"

    # Disable Next.js telemetry
    NEXT_TELEMETRY_DISABLED = "1"

    # Required for Next.js standalone output on App Service
    PORT = "8080"
  }

  logs {
    http_logs {
      retention_in_days {
        retention_in_days = 7
      }
    }
    application_logs {
      file_system_level = "Warning"
    }
  }

  tags = local.tags
}

# Deployment slot for zero-downtime deploys (optional — requires Standard tier or higher)
# resource "azurerm_linux_web_app_slot" "staging" {
#   name           = "staging"
#   app_service_id = azurerm_linux_web_app.main.id
#
#   site_config {
#     always_on        = false
#     app_command_line = "node server.js"
#     application_stack {
#       node_version = var.node_version
#     }
#   }
#
#   app_settings = azurerm_linux_web_app.main.app_settings
# }
