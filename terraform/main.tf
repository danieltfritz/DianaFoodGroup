terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment after creating the storage account for remote state
  # backend "azurerm" {
  #   resource_group_name  = "PLACEHOLDER_TFSTATE_RG"
  #   storage_account_name = "PLACEHOLDER_TFSTATE_SA"
  #   container_name       = "tfstate"
  #   key                  = "ccfp.terraform.tfstate"
  # }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location

  tags = local.tags
}

locals {
  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}
