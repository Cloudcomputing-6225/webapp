# webapp

# Health Check API

This provides a health check endpoint (`/healthz`).  This ensures that only "valid GET requests" are allowed and performs a basic database connectivity check.

---

  Only allows `GET /healthz`
  Rejects requests with a payload (Content-Length > 0)
  Rejects any query parameters 
  Returns `405 Method Not Allowed` for non-GET methods
  Returns `400 Bad Request` for any payload
  Stores a timestamped health check record in the database**
  Secure response headers for all requests

---

Technologies Used
  Node.js(Express)
  Sequelize(ORM for MySQL)
  MySQL Database
  dotenv(Environment variable management)

---
To start:
npm install
npm start

wrote tests for the existing file
and shellscript for the application to run itself


packer init packer.pkr.hcl
packer fmt packer.pkr.hcl
packer validate packer.pkr.hcl

added logs and metrics
installed cloudwatch to check metrics and logs

