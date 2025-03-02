#!/bin/bash

# Load environment variables safely
if [ -f .env ]; then
  export "$(grep -v '^#' .env | xargs)"
fi

echo "Updating packages"
sudo apt update && sudo apt upgrade -y

echo "Installing MySQL"
sudo apt install -y mysql-server unzip nodejs npm

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
# sudo groupadd -f "${APP_GROUP}"
# sudo useradd -m -g "${APP_GROUP}" "${APP_USER}" || true

# Safely create application directory and extract files
# sudo mkdir -p "${APP_DIR}"
# sudo unzip -o "${APP_ARCHIVE}" -d "${APP_DIR}"

# Secure permissions for application directory
# sudo chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"
# sudo chmod -R 750 "${APP_DIR}"

echo "Configuring Application User and Group..."
sudo groupadd -f csye6225 || echo "Group csye6225 already exists."
id -u csye6225 &>/dev/null || sudo useradd -r -s /usr/sbin/nologin -g csye6225 csye6225

echo "Creating and Configuring Application Directory..."
sudo mkdir -p /opt/app
sudo unzip -o /tmp/webapp.zip -d /opt/app
sudo chown -R csye6225:csye6225 /opt/app
sudo chmod -R 750 /opt/app

echo "Creating Environment File..."
echo "DB_HOST=${DB_HOST}" | sudo tee /opt/app/.env
echo "DB_USER=${DB_USER}" | sudo tee -a /opt/app/.env
echo "DB_PASSWORD=${DB_PASSWORD}" | sudo tee -a /opt/app/.env
echo "DB_NAME=${DB_NAME}" | sudo tee -a /opt/app/.env
sudo chown csye6225:csye6225 /opt/app/.env
sudo chmod 600 /opt/app/.env

echo "Installing Application Dependencies..."
cd /opt/app && sudo npm install --omit=dev
sudo chown -R csye6225:csye6225 /opt/app/node_modules
sudo chmod -R 750 /opt/app

echo "========== SETUP COMPLETED SUCCESSFULLY =========="