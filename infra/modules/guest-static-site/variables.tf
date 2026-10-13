variable "name" {
  description = "Azure Static Web Apps resource name."
  type        = string
}

variable "resource_group_name" {
  description = "Platform-created resource group for this environment."
  type        = string
}

variable "location" {
  description = "Azure region used for the managed Static Web Apps API."
  type        = string
  default     = "eastus2"
}

variable "environment" {
  description = "Governed lifecycle name."
  type        = string

  validation {
    condition     = contains(["nonproduction", "production"], var.environment)
    error_message = "environment must be nonproduction or production."
  }
}

variable "custom_domains" {
  description = "Custom hostnames validated through external DNS TXT records."
  type        = set(string)
  default     = []
}
