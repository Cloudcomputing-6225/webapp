packer {
  required_version = ">= 1.7.0"

  required_plugins {
    amazon = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/amazon"
    }

    googlecompute = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/googlecompute"
    }
  }
}

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
  default = "dev"
}

variable "gcp_project_id" {
  default = "webapp-dev-452001"
}

variable "gcp_zone" {
  default = "us-central1-a"
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
  source_ami    = "ami-0fe67b8200454bad4"
  instance_type = var.instance_type
  ssh_username  = "ubuntu"
  ami_name      = "custom-ubuntu-24.04-{{timestamp}}"

  ami_groups = []

  tags = {
    Name  = "CustomUbuntuAMI"
    Owner = "sneha"
  }
}

source "googlecompute" "ubuntu" {
  project_id   = var.gcp_project_id
  zone         = var.gcp_zone
  source_image = "ubuntu-2404-noble-amd64-v20250214"
  machine_type = "e2-medium"
  ssh_username = "ubuntu"
  image_name   = "custom-ubuntu-24-04-{{timestamp}}"
  image_family = "custom-ubuntu"
  image_labels = { owner = "sneha" }
  network      = "default"
}


build {
  sources = ["source.amazon-ebs.ubuntu", "source.googlecompute.ubuntu"]

  provisioner "file" {
    source      = var.app_archive
    destination = "/tmp/webapp.zip"
  }

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
      "sudo systemctl start mysql",
      "sudo systemctl enable mysql",
      "sudo mysql -e \"CREATE DATABASE IF NOT EXISTS ${var.db_name};\"",
      "sudo mysql -e \"CREATE USER '${var.db_user}'@'localhost' IDENTIFIED BY '${var.db_password}';\"",
      "sudo mysql -e \"GRANT ALL PRIVILEGES ON ${var.db_name}.* TO '${var.db_user}'@'localhost';\"",
      "sudo mysql -e \"FLUSH PRIVILEGES;\"",
      "sudo groupadd -f csye6225",
      "sudo useradd -r -s /usr/sbin/nologin -g csye6225 csye6225",
      "sudo mkdir -p /home/ubuntu/app/build",
      "sudo unzip /tmp/webapp.zip -d /home/ubuntu/app",
      "ls -l /home/ubuntu/app/build",
      "echo 'DB_HOST=${var.db_host}' | sudo tee /home/ubuntu/app/.env",
      "echo 'DB_USER=${var.db_user}' | sudo tee -a /home/ubuntu/app/.env",
      "echo 'DB_PASSWORD=${var.db_password}' | sudo tee -a /home/ubuntu/app/.env",
      "echo 'DB_NAME=${var.db_name}' | sudo tee -a /home/ubuntu/app/.env",
      "sudo chown csye6225:csye6225 /home/ubuntu/app/.env",
      "sudo chmod 600 /home/ubuntu/app/.env",
      "cd /home/ubuntu/app/build && sudo npm install --omit=dev",
      "ls -lh /home/ubuntu/app/build/node_modules",
      "sudo chown -R csye6225:csye6225 /home/ubuntu/app",
      "sudo chmod -R 750 /home/ubuntu/app"
    ]
  }
  provisioner "file" {
    source      = "./myapp.service"
    destination = "/tmp/myapp.service"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/myapp.service /etc/systemd/system/myapp.service",
      "sudo chmod 664 /etc/systemd/system/myapp.service",
      "sudo systemctl daemon-reload",
      "sudo touch /var/log/myapp.log /var/log/myapp-error.log",
      "sudo chmod 666 /var/log/myapp.log /var/log/myapp-error.log",
      "if ! sudo systemctl is-active --quiet myapp; then sudo systemctl restart myapp; fi",
      "if ! sudo systemctl is-active --quiet myapp; then sudo cat /var/log/myapp-error.log; fi"
    ]
  }
}
