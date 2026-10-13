resource "azurerm_static_web_app" "guest" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location

  sku_tier = "Free"
  sku_size = "Free"

  tags = {
    application         = "wedding-site"
    environment         = var.environment
    owner-group         = "sg-wed-operators"
    cost-center         = "portfolio-demo"
    managed-by          = "terraform"
    criticality         = var.environment == "production" ? "medium" : "low"
    data-classification = "public"
  }
}

resource "azurerm_static_web_app_custom_domain" "guest" {
  for_each = var.custom_domains

  static_web_app_id = azurerm_static_web_app.guest.id
  domain_name       = each.value
  validation_type   = "dns-txt-token"
}
