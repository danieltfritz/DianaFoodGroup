output "app_url" {
  description = "Public URL of the deployed app"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "app_service_name" {
  description = "App Service name (used for 'az webapp deploy' commands)"
  value       = azurerm_linux_web_app.main.name
}

output "resource_group_name" {
  description = "Resource group containing all resources"
  value       = azurerm_resource_group.main.name
}

output "sql_server_fqdn" {
  description = "SQL Server fully qualified domain name"
  value       = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "sql_database_name" {
  description = "SQL Database name"
  value       = azurerm_mssql_database.main.name
}

output "database_url" {
  description = "DATABASE_URL connection string (sensitive)"
  value       = local.database_url
  sensitive   = true
}
