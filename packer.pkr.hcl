packer {
  required_version = ">= 1.7.0"

  required_plugins {
    amazon = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}


variable "aws_region" {
  default = "us-east-1"
}

variable "aws_profile" {
  default = "dev" # ✅ Use your AWS profile name
}

source "amazon-ebs" "ubuntu" {
  profile       = var.aws_profile
  region        = var.aws_region
  source_ami    = "ami-0fe67b8200454bad4"
  instance_type = "t2.micro"
  ssh_username  = "ubuntu"
  ami_name      = "custom-ubuntu-24.04-{{timestamp}}"

  ami_groups = [] # ✅ Keep this line

  tags = {
    Name  = "CustomUbuntuAMI"
    Owner = "YourName"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]

  provisioner "shell" {
    inline = [
      "export DEBIAN_FRONTEND=noninteractive",
      "sudo apt update -y",
      "sudo apt upgrade -y",
      "sudo apt install -y software-properties-common",
      "sudo add-apt-repository universe",
      "sudo apt-get update --fix-missing",
      "sudo apt-get remove -y --purge libssl-dev",
      "sudo apt-get autoremove -y",
      "sudo apt-get install -y --allow-downgrades --allow-change-held-packages libssl3t64=3.0.13-0ubuntu3.5",
      "sudo apt-get install -y --allow-downgrades --allow-change-held-packages libssl-dev",
      "sudo apt install -y mysql-server nodejs npm",
      "sudo systemctl daemon-reload", # ✅ Keep this line
      "sudo systemctl enable mysql",
      "sudo systemctl start mysql",
      "node -v",
      "npm -v"
    ]
  }
}
