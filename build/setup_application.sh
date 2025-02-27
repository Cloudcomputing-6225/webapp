#!/bin/bash

# Load environment variables safely
if [ -f .env ]; then
  export "$(grep -v '^#' .env | xargs)"
fi

echo "Updating packages"
sudo apt update && sudo apt upgrade -y

echo "Installing MySQL"
sudo apt install -y mysql-server

echo "Starting MySQL service"
sudo systemctl start mysql

echo "Enabling MySQL service"
sudo systemctl enable mysql

echo "Securing MySQL"
sudo mysql -e "ALTER USER '${DB_USER}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}'; FLUSH PRIVILEGES;"

echo "Creating Database and User"
sudo mysql -uroot -p"${DB_PASS}" -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
sudo mysql -uroot -p"${DB_PASS}" -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
sudo mysql -uroot -p"${DB_PASS}" -e "GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"

# Ensure safe usage of variables in group and user creation
sudo groupadd -f "${APP_GROUP}"
sudo useradd -m -g "${APP_GROUP}" "${APP_USER}" || true

# Safely create application directory and extract files
sudo mkdir -p "${APP_DIR}"
sudo unzip -o "${APP_ARCHIVE}" -d "${APP_DIR}"

# Secure permissions for application directory
sudo chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"
sudo chmod -R 750 "${APP_DIR}"