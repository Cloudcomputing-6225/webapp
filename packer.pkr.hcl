packer {
  required_version = ">= 1.7.0"

  required_plugins {
    amazon = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

# Define Database Variables
variable "DB_HOST" {
  default = "127.0.0.1"
}

variable "DB_USER" {
  default = "sneha"
}

variable "DB_PASS" {
  default = "user3939"
}

variable "DB_NAME" {
  default = "healthchecksdb"
}

variable "AWS_REGION" {
  default = "us-east-1"
}

variable "AWS_PROFILE" {
  default = "dev"
}

variable "S3_BUCKET_NAME" {
  default = "snehacsye6225"
}

variable "ami_name" {
  default = "custom-node-mysql"
}

variable "instance_type" {
  default = "t2.micro"
}

source "amazon-ebs" "ubuntu" {
  profile       = var.AWS_PROFILE
  region        = var.AWS_REGION
  source_ami    = "ami-0fc5d935ebf8bc3bc"
  instance_type = var.instance_type
  ssh_username  = "ubuntu"
  ami_name      = "custom-ubuntu-24.04-{{timestamp}}"

  ami_users = ["445567104090", "148761659722"]

  ami_groups = []

  tags = {
    Name  = "CustomUbuntuAMI"
    Owner = "sneha"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]

  # Upload pre-built application artifact from GitHub Actions
  provisioner "file" {
    source      = "webapp.zip"
    destination = "/tmp/webapp.zip"
  }

  # Install MySQL, Node.js, and Extract Application
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
      "sudo apt-get install -y libssl3",
      "sudo apt-get install -y libssl-dev",
      "sudo apt-get install -y unzip nodejs npm",

      # Create application user
      "sudo groupadd -f csye6225",
      "sudo useradd -r -s /usr/sbin/nologin -g csye6225 csye6225",

      # Create application directory
      "sudo mkdir -p /home/csye6225/webapp",
      "sudo unzip /tmp/webapp.zip -d /home/csye6225/webapp",

      # Move files from build folder to main folder
      "sudo mv /home/csye6225/webapp/build/* /home/csye6225/webapp/",
      "sudo rm -rf /home/csye6225/webapp/build",

      # Create .env file with proper permissions
      "echo 'DB_HOST=${var.DB_HOST}' | sudo tee /home/csye6225/webapp/.env",
      "echo 'DB_USER=${var.DB_USER}' | sudo tee -a /home/csye6225/webapp/.env",
      "echo 'DB_PASS=${var.DB_PASS}' | sudo tee -a /home/csye6225/webapp/.env",
      "echo 'DB_NAME=${var.DB_NAME}' | sudo tee -a /home/csye6225/webapp/.env",
      "echo 'AWS_REGION=${var.AWS_REGION}' | sudo tee -a /home/csye6225/webapp/.env",
      "echo 'S3_BUCKET_NAME=${var.S3_BUCKET_NAME}' | sudo tee -a /home/csye6225/webapp/.env",
      "sudo chown csye6225:csye6225 /home/csye6225/webapp/.env",
      "sudo chmod 600 /home/csye6225/webapp/.env",

      # Install dependencies
      "cd /home/csye6225/webapp && sudo npm install --omit=dev",
      "ls -lh /home/csye6225/webapp/node_modules",

      # Set correct permissions
      "sudo chown -R csye6225:csye6225 /home/csye6225/webapp",
      "sudo chmod -R 750 /home/csye6225/webapp"
    ]
  }

  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb",
      "sudo dpkg -i amazon-cloudwatch-agent.deb"
    ]
  }

  #  Add systemd service for the application
  provisioner "file" {
    source      = "./myapp.service"
    destination = "/tmp/myapp.service"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/myapp.service /etc/systemd/system/myapp.service",
      "sudo chmod 664 /etc/systemd/system/myapp.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable myapp",

      # Ensure logs directory exists
      "sudo touch /var/log/myapp.log /var/log/myapp-error.log",
      "sudo chmod 666 /var/log/myapp.log /var/log/myapp-error.log",

      # Start service
      "sudo systemctl restart myapp",

      # Print logs if service fails
      "if ! sudo systemctl is-active --quiet myapp; then sudo cat /var/log/myapp-error.log; fi"
    ]
  }

  post-processor "manifest" {
    output     = "manifest.json"
    strip_path = true
    custom_data = {
      my_custom_data = "example"
    }
  }
}