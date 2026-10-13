output "default_hostname" {
  description = "Azure-generated public hostname for the Guest site."
  value       = azurerm_static_web_app.guest.default_host_name
}

output "resource_id" {
  description = "Azure resource ID of the Static Web App."
  value       = azurerm_static_web_app.guest.id
}

output "custom_domains" {
  description = "Custom hostnames associated with the Guest site."
  value       = sort(tolist(var.custom_domains))
}
