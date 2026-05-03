# Admin Dashboard Login Details

Below are the credentials for the newly created manager roles. You can use these to test the role-based access control inside the Admin Dashboard.

| Role | Email | Password | Allowed Sections |
|---|---|---|---|
| Admin | admin@shop.com | Password123! | *All Sections* |
| Product Manager | product@shop.com | Password123! | Dashboard, Catalog (Products, Categories) |
| Order Manager | order@shop.com | Password123! | Dashboard, Commerce (Orders, Payments) |
| Loyalty Manager | loyalty@shop.com | Password123! | Dashboard, Commerce (Coupons), Marketing (Loyalty) |
| User Manager | user@shop.com | Password123! | Dashboard, CRM (Users, Staff, Roles) |
| Review Manager | review@shop.com | Password123! | Dashboard, Commerce (Returns), Marketing (Reviews) |
| Supplier Manager | supplier@shop.com | Password123! | Dashboard, Catalog (Suppliers) |

> **Note:** Please run the seed script `node seedRoles.js` in the backend base directory to create these accounts if they do not exist yet.
