# packer {
#   required_version = ">= 1.7.0"

#   required_plugins {
#     amazon = {
#       version = ">= 1.0.0"
#       source  = "github.com/hashicorp/amazon"
#     }
#   }
# }

# variable "aws_region" {
#   default = "us-east-1"
# }

# variable "aws_profile" {
#   default = "dev" # ✅ Use your AWS profile name
# }

# variable "artifact_path" {
#   default = "/tmp/artifacts/webapp-main.zip"
# }

# source "amazon-ebs" "ubuntu" {
#   profile       = var.aws_profile
#   region        = var.aws_region
#   source_ami    = "ami-0fe67b8200454bad4"
#   instance_type = "t2.micro"
#   ssh_username  = "ubuntu"
#   ami_name      = "custom-ubuntu-24.04-{{timestamp}}"

#   ami_groups = []

#   tags = {
#     Name  = "CustomUbuntuAMI"
#     Owner = "YourName"
#   }
# }

# build {
#   sources = ["source.amazon-ebs.ubuntu"]

#   provisioner "shell" {
#     inline = [
#       "export DEBIAN_FRONTEND=noninteractive",

#       # ✅ Fix: Ensure full package update and upgrade
#       "sudo apt update -y && sudo apt upgrade -y",
#       "sudo apt-get install -f",          # Fix broken dependencies
#       "sudo apt --fix-broken install -y", # Another method to resolve broken deps

#       # ✅ Install missing dependencies explicitly
#       "sudo apt-get install -y --allow-downgrades --allow-change-held-packages libssl3t64=3.0.13-0ubuntu3.5",
#       "sudo apt-get install -y --allow-downgrades --allow-change-held-packages libssl-dev",
#       # ✅ Continue with installation
#       "sudo apt install -y software-properties-common unzip",
#       "sudo add-apt-repository universe",
#       "sudo apt-get update --fix-missing",
#       "sudo apt install -y mysql-server nodejs npm",

#       # ✅ Create a local user `csye6225` with no login shell
#       "sudo groupadd csye6225",
#       "sudo useradd -m -s /usr/sbin/nologin -g csye6225 csye6225",

#       # ✅ Prepare Application Directory
#       "sudo mkdir -p /opt/app",
#       "sudo chown -R csye6225:csye6225 /opt/app",
#       "sudo chmod -R 750 /opt/app",

#       # ✅ Copy and extract application artifact
#       "sudo mkdir -p /tmp/artifacts",
#       "sudo cp ${var.artifact_path} /tmp/artifacts/",
#       "sudo unzip /tmp/artifacts/webapp-main.zip -d /opt/app/",
#       "sudo chown -R csye6225:csye6225 /opt/app",
#       "sudo chmod -R 750 /opt/app",

#       # ✅ Create systemd service for the app
#       "echo '[Unit]' | sudo tee /etc/systemd/system/webapp.service",
#       "echo 'Description=Web Application Service' | sudo tee -a /etc/systemd/system/webapp.service",
#       "echo 'After=network.target' | sudo tee -a /etc/systemd/system/webapp.service",
#       "echo '[Service]' | sudo tee -a /etc/systemd/system/webapp.service",
#       "echo 'User=csye6225' | sudo tee -a /etc/systemd/system/webapp.service",
#       "echo 'Group=csye6225' | sudo tee -a /etc/systemd/system/webapp.service",
#       "echo 'ExecStart=/usr/bin/node /opt/app/app.js' | sudo tee -a /etc/systemd/system/webapp.service",
#       "echo 'Restart=always' | sudo tee -a /etc/systemd/system/webapp.service",
#       "echo '[Install]' | sudo tee -a /etc/systemd/system/webapp.service",
#       "echo 'WantedBy=multi-user.target' | sudo tee -a /etc/systemd/system/webapp.service",

#       # ✅ Reload systemd and start app
#       "sudo systemctl daemon-reload",
#       "sudo systemctl enable webapp",
#       "sudo systemctl start webapp",

#       # ✅ Verify installations
#       "node -v",
#       "npm -v"
#     ]
#   }
# }


packer {
  required_version = ">= 1.7.0"

  required_plugins {
    amazon = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

# ✅ Define Database Variables
variable "db_host" {
  default = "127.0.0.1"
}

variable "db_user" {
  default = "sneha"
}

variable "db_password" {
  default = "user3939"
}

variable "db_name" {
  default = "healthchecksdb"
}

variable "aws_region" {
  default = "us-east-1"
}

variable "aws_profile" {
  default = "dev" # ✅ AWS profile name used in CLI
}

variable "ami_name" {
  default = "custom-node-mysql"
}

variable "instance_type" {
  default = "t2.micro"
}

variable "app_archive" {
  default = "webapp.zip"
}

source "amazon-ebs" "ubuntu" {
  profile       = var.aws_profile
  region        = var.aws_region
  source_ami    = "ami-0fe67b8200454bad4" # ✅ Static Ubuntu 24.04 AMI ID
  instance_type = var.instance_type
  ssh_username  = "ubuntu"
  ami_name      = "custom-ubuntu-24.04-{{timestamp}}"

  ami_groups = []

  tags = {
    Name  = "CustomUbuntuAMI"
    Owner = "YourName"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]

  # ✅ Upload pre-built application artifact from GitHub Actions
  provisioner "file" {
    source      = var.app_archive
    destination = "/tmp/webapp.zip"
  }

  # ✅ Install MySQL, Node.js, and Extract Application
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
      "sudo apt-get install -y nodejs npm mysql-server unzip",

      # ✅ Start and enable MySQL service
      "sudo systemctl start mysql",
      "sudo systemctl enable mysql",

      # ✅ Configure MySQL database
      "sudo mysql -e \"CREATE DATABASE IF NOT EXISTS ${var.db_name};\"",
      "sudo mysql -e \"CREATE USER '${var.db_user}'@'localhost' IDENTIFIED BY '${var.db_password}';\"",
      "sudo mysql -e \"GRANT ALL PRIVILEGES ON ${var.db_name}.* TO '${var.db_user}'@'localhost';\"",
      "sudo mysql -e \"FLUSH PRIVILEGES;\"",

      # ✅ Create system user for application
      "sudo groupadd -f csye6225",
      "sudo useradd -r -s /usr/sbin/nologin -g csye6225 csye6225",

      # ✅ Extract application & set correct permissions
      "sudo mkdir -p /home/ubuntu/app/build",
      "sudo unzip /tmp/webapp.zip -d /home/ubuntu/app",
      "ls -l /home/ubuntu/app/build",

      # ✅ Create .env file using variables
      "echo 'DB_HOST=${var.db_host}' | sudo tee /home/ubuntu/app/.env",
      "echo 'DB_USER=${var.db_user}' | sudo tee -a /home/ubuntu/app/.env",
      "echo 'DB_PASSWORD=${var.db_password}' | sudo tee -a /home/ubuntu/app/.env",
      "echo 'DB_NAME=${var.db_name}' | sudo tee -a /home/ubuntu/app/.env",

      # ✅ Secure .env file
      "sudo chown csye6225:csye6225 /home/ubuntu/app/.env",
      "sudo chmod 600 /home/ubuntu/app/.env",

      # ✅ Change to the correct directory before running `npm install`
      "cd /home/ubuntu/app/build && sudo npm install --omit=dev",

      # ✅ Verify `node_modules` exists
      "ls -lh /home/ubuntu/app/build/node_modules",

      # ✅ Ensure correct ownership & permissions
      "sudo chown -R csye6225:csye6225 /home/ubuntu/app",
      "sudo chmod -R 750 /home/ubuntu/app"
    ]
  }

  # ✅ Add systemd service for the application
  provisioner "file" {
    source      = "./myapp.service"
    destination = "/tmp/myapp.service"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/myapp.service /etc/systemd/system/myapp.service",
      "sudo chmod 664 /etc/systemd/system/myapp.service",
      "sudo systemctl daemon-reload",

      # ✅ Ensure logs directory exists
      "sudo touch /var/log/myapp.log /var/log/myapp-error.log",
      "sudo chmod 666 /var/log/myapp.log /var/log/myapp-error.log",

      # ✅ Restart service only if it's not active
      "if ! sudo systemctl is-active --quiet myapp; then sudo systemctl restart myapp; fi",

      # ✅ Print logs if service fails
      "if ! sudo systemctl is-active --quiet myapp; then sudo cat /var/log/myapp-error.log; fi"
    ]
  }
}
