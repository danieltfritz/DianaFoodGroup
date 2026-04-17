resource "azurerm_mssql_server" "main" {
  name                         = "sql-${var.project_name}-${var.environment}"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = var.sql_admin_login
  administrator_login_password = var.sql_admin_password

  # Disable public network access and use private endpoint in a hardened setup.
  # For simplicity this leaves public access on and restricts by firewall rules.
  public_network_access_enabled = true

  tags = local.tags
}

resource "azurerm_mssql_database" "main" {
  name         = "CCFP"
  server_id    = azurerm_mssql_server.main.id
  collation    = "SQL_Latin1_General_CP1_CI_AS"
  license_type = "LicenseIncluded"
  sku_name     = var.sql_database_sku
  max_size_gb  = 10

  tags = local.tags
}

# Allow all Azure-internal IPs to reach the SQL server (covers App Service outbound)
resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_mssql_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Optional: allow your office/dev IP to run migrations from local machine.
# Add more rules as needed.
# resource "azurerm_mssql_firewall_rule" "dev_office" {
#   name             = "DevOffice"
#   server_id        = azurerm_mssql_server.main.id
#   start_ip_address = "PLACEHOLDER_OFFICE_IP"
#   end_ip_address   = "PLACEHOLDER_OFFICE_IP"
# }
