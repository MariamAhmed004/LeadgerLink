# LedgerLink

Senior year project — LedgerLink web app  
_A web-based operational reporting and inventory tracking system for multi-branch SMEs_

---

## 1. Project Title and Description

**LedgerLink** is an integrated web application designed to streamline operational reporting and inventory tracking for small and medium-sized enterprises (SMEs) with multiple branch locations. The system simplifies data communication between store branches and central accounting teams, facilitating structured, accurate, and efficient information management.

---

## 2. Problem Statement

Traditional branch-based industries such as restaurants and cafés rely heavily on manual or spreadsheet-driven reporting processes between operational branches and central accounting. This approach results in frequent data inaccuracies, limited transparency, and a lack of accountability, ultimately leading to operational inefficiencies across the organization.

---

## 3. Project Objectives

LedgerLink aims to:

- Centralize operational reporting and inventory data across all business branches.
- Enhance data accuracy, transparency, and accountability in day-to-day activities.
- Bridge the communication and reporting gap between store-level operations and the accounting team.
- Support scalable and auditable branch management for SMEs.

---

## 4. Key Features

- **Centralized Inventory Management:** Track real-time inventory levels, recipe-based consumption, and usage per branch.
- **Sales and Operational Reporting:** Log and review daily activity, sales, and inventory transactions.
- **Inter-Branch Inventory Transfers:** Monitor and approve inventory movement between branches.
- **Role-Based Dashboards:** Feature sets and reporting tailored to user roles.
- **Audit Logging:** Automatic tracking of key actions for accountability and error review.
- **Secure User Authentication:** Protect access and data integrity using industry-standard security protocols.

---

## 5. User Roles

LedgerLink implements role-based access control to assign responsibilities and permissions as follows:

- **Application Admin:** System-wide administration and access.
- **Organization Admin:** Manages the organization’s users, branches, and configurations.
- **Organization Accountant:** Oversees financial data, verifies operational reports, and reviews audit logs.
- **Store Manager:** Supervises store operations, inventory, and staff reporting.
- **Store Employee:** Executes basic reporting functions, such as inventory usage and daily sales entry.

---

## 6. System Architecture Overview

LedgerLink adopts a web-based, client–server architecture. The frontend interacts with the backend through secure RESTful APIs, enabling seamless communication between users, branch locations, and the central database. Data is centrally stored and managed, ensuring consistency and real-time availability for authorized users. Security and auditability are reinforced through authentication protocols and logging mechanisms.

---

## 7. Technology Stack

**Backend:**
- ASP.NET Core
- Entity Framework Core
- SQL Server
- RESTful APIs
- JWT / ASP.NET Identity

**Frontend:**
- React.js
- Vite
- JavaScript / JSX

**Other Tools:**
- GitHub (version control)
- NuGet (backend package management)
- npm (frontend dependencies)

---

## 8. Project Structure Overview

The repository contains the following major components:

- `/backend` — Core ASP.NET Web API application, business logic, data access, and authentication.
- `/frontend` — React.js application including UI components, state management, and API integration.
- `/docs` — Project documentation and planning materials.

---

## 9. Setup and Installation

**Prerequisites:**
- Node.js (for frontend development)
- .NET 6 or higher (for backend development)
- SQL Server instance (for database)
- Git (for code management)

**General Steps:**
1. Clone the repository.
2. Set up the backend — configure environment variables and database connection.
3. Install backend dependencies via NuGet.
4. Set up the frontend — configure environment, update API connection endpoints.
5. Install frontend dependencies via npm.

---

## 10. Running the Application

1. Start the backend server (ASP.NET Core API).
2. Initialize the database schema and seed data if required.
3. Start the frontend server using Vite.
4. Access the LedgerLink web application in your browser.

*Complete environment setup instructions are provided in the project’s `/docs` directory.*

---

## 11. Future Enhancements

- Advanced analytics and data visualization
- Mobile-friendly responsive design
- Integration with POS or external accounting systems
- Enhanced alerting and notification features
- Multi-language support

---

## 12. License or Academic Disclaimer

This project was developed as a senior-year academic project for demonstration and educational purposes. The repository and its contents are not intended for commercial deployment without further review, security assessment, and professional development.

---