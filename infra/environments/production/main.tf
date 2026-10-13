module "guest_site" {
  source = "../../modules/guest-static-site"

  name                = "stapp-eus2p-wed-01"
  resource_group_name = "rg-eus2p-wed-01"
  environment         = "production"
  custom_domains      = ["sidvivah26.com", "www.sidvivah26.com"]
}
