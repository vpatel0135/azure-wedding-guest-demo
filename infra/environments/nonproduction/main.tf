module "guest_site" {
  source = "../../modules/guest-static-site"

  name                = "stapp-eus2n-wed-01"
  resource_group_name = "rg-eus2n-wed-01"
  environment         = "nonproduction"
  custom_domains      = ["sit.sidvivah26.com"]
}
