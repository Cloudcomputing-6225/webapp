# packer {
#   required_plugins {
#     amazon = {
#       version = ">= 1.0.0"
#       source  = "github.com/hashicorp/amazon"
#     }
#   }
# }

# variable "region" {
#   default = "us-east-1"
# }

# variable "ami_name" {
#   default = "webapp-ubuntu-ami"
# }

# source "amazon-ebs" "webapp" {
#   region     = var.region
#   source_ami = "ami-0fe67b8200454bad4" # ✅ Correct Ubuntu 24.04 AMI ID

#   instance_type = "t2.micro"
#   ssh_username  = "ubuntu"
#   # ssh_timeout   = "10m" # ✅ Increased timeout to prevent failures
#   ami_name      = var.ami_name
#   # ami_users     = ["self"] # ✅ Corrected syntax (removed extra space)

# }

# build {
#   sources = ["source.amazon-ebs.webapp"]

#   provisioner "shell" {
#     script = "setup_application.sh"
#   }

#   post-processor "manifest" {
#     output = "ami_output.json"
#   }
# }
# source "amazon-ebs" "ubuntu" {
#   ami_name      = "custom-ubuntu-nodejs-mysql"
#   region        = "us-east-1"
#   instance_type = "t2.micro"
#   source_ami    = "ami-0fe67b8200454bad4"
#   ssh_username  = "ubuntu"
#   associate_public_ip_address = true
# }

# build {
#   sources = ["source.amazon-ebs.ubuntu"]

#   provisioner "file" {
#   source      = "/Users/snehaalluri/application.properties"
#   destination = "/tmp/application.properties"
# }

#   provisioner "file" {
#     source      = "/Users/snehaalluri/csye6225.service"
#     destination = "/tmp/csye6225.service"
#   }


#   provisioner "file" {
#     source      = "setup_application.sh"
#     destination = "/tmp/setup_application.sh"
#   }

#   provisioner "shell" {
#     inline = [
#       "chmod +x /tmp/setup_application.sh",
#       "sudo /tmp/setup_application.sh"
#     ]
#   }
# }


# Define required Packer version
packer {
  required_version = ">= 1.7.0"

  required_plugins {
    amazon = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

# Define AWS provider
variable "aws_region" {
  default = "us-east-1"
}

variable "aws_profile" {
  default = "dev" # ✅ Use your AWS profile name
}

source "amazon-ebs" "ubuntu" {
  profile       = var.aws_profile # ✅ Use AWS profile instead of access keys
  region        = var.aws_region
  source_ami    = "ami-0fe67b8200454bad4" # ✅ Use your custom AMI
  instance_type = "t2.micro"
  ssh_username  = "ubuntu"
  ami_name      = "custom-ubuntu-24.04-{{timestamp}}"

  ami_groups = []
  
  tags = {
    Name  = "CustomUbuntuAMI"
    Owner = "YourName"
  }
}

# Provisioning Script
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
      "sudo apt-get remove -y --purge libssl-dev",                                                            # ✅ Remove any broken version
      "sudo apt-get autoremove -y",                                                                           # ✅ Clean up old dependencies
      "sudo apt-get install -y --allow-downgrades --allow-change-held-packages libssl3t64=3.0.13-0ubuntu3.5", # ✅ Install correct version first
      "sudo apt-get install -y --allow-downgrades --allow-change-held-packages libssl-dev",                   # ✅ Then install libssl-dev
      "sudo apt install -y mysql-server nodejs npm",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable mysql",
      "sudo systemctl start mysql",
      "node -v",
      "npm -v"
    ]
  }
}

