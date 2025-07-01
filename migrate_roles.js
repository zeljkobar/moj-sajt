const mysql = require("mysql2/promise");
require("dotenv").config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "summasum_local",
};

async function migrateRoles() {
  let connection;
  
  try {
    console.log("🔄 Connecting to database...");
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to database");

    console.log("🔄 Starting role migration...");

    // Check if role column exists
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM users LIKE 'role'"
    );

    if (columns.length === 0) {
      console.log("❌ Role column does not exist. Please run the initial migration first.");
      return;
    }

    console.log("📊 Current users and roles:");
    const [currentUsers] = await connection.execute(
      "SELECT id, username, role FROM users"
    );
    console.table(currentUsers);

    // Step 1: Add temporary column with new roles
    console.log("🔄 Step 1: Adding temporary column with new roles...");
    await connection.execute(
      "ALTER TABLE users ADD COLUMN new_role ENUM('pdv', 'ugovori', 'full', 'admin') DEFAULT 'pdv'"
    );

    // Step 2: Migrate existing roles to new ones
    console.log("🔄 Step 2: Migrating existing roles...");
    
    // Migrate pdv0 and pdv to pdv
    const [pdvUsers] = await connection.execute(
      "UPDATE users SET new_role = 'pdv' WHERE role IN ('pdv0', 'pdv')"
    );
    console.log(`✅ Migrated ${pdvUsers.affectedRows} users to 'pdv' role`);

    // Migrate full to full
    const [fullUsers] = await connection.execute(
      "UPDATE users SET new_role = 'full' WHERE role = 'full'"
    );
    console.log(`✅ Migrated ${fullUsers.affectedRows} users to 'full' role`);

    // Migrate admin to admin
    const [adminUsers] = await connection.execute(
      "UPDATE users SET new_role = 'admin' WHERE role = 'admin'"
    );
    console.log(`✅ Migrated ${adminUsers.affectedRows} users to 'admin' role`);

    // Step 3: Drop old role column
    console.log("🔄 Step 3: Dropping old role column...");
    await connection.execute("ALTER TABLE users DROP COLUMN role");

    // Step 4: Rename new column to role
    console.log("🔄 Step 4: Renaming new column to 'role'...");
    await connection.execute(
      "ALTER TABLE users CHANGE COLUMN new_role role ENUM('pdv', 'ugovori', 'full', 'admin') DEFAULT 'pdv'"
    );

    console.log("📊 Final users and roles:");
    const [finalUsers] = await connection.execute(
      "SELECT id, username, role FROM users"
    );
    console.table(finalUsers);

    console.log("✅ Role migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    
    // Try to rollback if new_role column exists
    try {
      await connection.execute("ALTER TABLE users DROP COLUMN new_role");
      console.log("🔄 Rollback: Dropped temporary column");
    } catch (rollbackError) {
      // Ignore rollback errors
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run migration
migrateRoles();
