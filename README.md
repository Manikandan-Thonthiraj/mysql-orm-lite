# MySQL ORM Lite

A lightweight ORM for MySQL with connection pooling, CRUD operations, query builder, and transaction support for Node.js applications.

[![npm version](https://badge.fury.io/js/mysql-orm-lite.svg)](https://www.npmjs.com/package/mysql-orm-lite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why MySQL ORM Lite?

- 🪶 **Lightweight** - Minimal overhead, maximum performance
- 🎯 **Simple API** - Intuitive methods for common operations
- 🔄 **Connection Pooling** - Efficient MySQL connection management
- 🏗️ **Query Builder** - Build complex queries with MongoDB-style operators
- 💾 **Transaction Support** - Full ACID transaction capabilities
- 🔒 **SQL Injection Safe** - Parameterized queries by default
- 📊 **Performance Monitoring** - Automatic slow query logging (>1s)
- 🌐 **Multiple Databases** - Connect to multiple MySQL databases simultaneously
- 📝 **Custom Logger** - Integrate with Winston, Bunyan, or any custom logger

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Connection Management](#connection-management)
  - [CRUD Operations](#crud-operations)
  - [Query Builder](#query-builder)
  - [WHERE Operators](#where-operators)
  - [JOIN Operations](#join-operations)
  - [Transactions](#transactions)
  - [Transaction Manager](#transaction-manager)
- [Advanced Usage](#advanced-usage)
  - [Multiple Database Connections](#multiple-database-connections)
  - [Raw SQL Expressions](#raw-sql-expressions)
  - [Custom Logger Integration](#custom-logger-integration)
- [Error Handling](#error-handling)
- [Performance Tips](#performance-tips)
- [Complete Examples](#complete-examples)
- [API Quick Reference](#api-quick-reference)
- [License](#license)

---

## Installation

```bash
npm install mysql-orm-lite mysql2
```

> **Note:** `mysql2` is a peer dependency and must be installed separately.

---

## Quick Start

```javascript
const db = require('mysql-orm-lite');

// Initialize with your database configuration
db.connectionManager.init({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'your_database',
  port: 3306,
  connectionLimit: 10
});

// Basic CRUD operations
async function example() {
  // Insert a record
  const userId = await db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  });

  // Find using query builder
  const users = await db.select({
    table: 'users',
    where: { id: userId }
  });

  // Update a record
  await db.updateWhere({
    table: 'users',
    data: { name: 'Jane Doe' },
    where: { id: userId }
  });

  // Delete a record
  await db.deleteWhere({
    table: 'users',
    where: { id: userId }
  });

  // Close connections on app shutdown
  await db.connectionManager.closeAllPools();
}

example();
```

---

## API Reference

### Connection Management

#### `connectionManager.init(config, logger?)`

Initialize the connection manager with database configuration.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config` | Object | Yes | Database configuration object |
| `logger` | Object | No | Custom logger instance |

**Config Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | string | - | Database host |
| `user` | string | - | Database user |
| `password` | string | - | Database password |
| `database` | string | - | Database name |
| `port` | number | 3306 | Database port |
| `connectionLimit` | number | 10 | Max pool connections |

```javascript
db.connectionManager.init({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb',
  port: 3306,
  connectionLimit: 10
});
```

#### `connectionManager.setLogger(customLogger)`

Set a custom logger with `info`, `error`, and `warn` methods.

```javascript
db.connectionManager.setLogger({
  info: (...args) => console.log('[DB INFO]', ...args),
  error: (...args) => console.error('[DB ERROR]', ...args),
  warn: (...args) => console.warn('[DB WARN]', ...args)
});
```

#### `connectionManager.getPool(dbConfig?)`

Get or create a connection pool. Returns a Promise.

```javascript
const pool = await db.connectionManager.getPool();
```

#### `connectionManager.closePool(config)`

Close a specific connection pool.

```javascript
await db.connectionManager.closePool({
  host: 'localhost',
  user: 'root',
  database: 'mydb'
});
```

#### `connectionManager.closeAllPools()`

Close all connection pools. **Call this on application shutdown.**

```javascript
process.on('SIGINT', async () => {
  await db.connectionManager.closeAllPools();
  process.exit(0);
});
```

#### `connectionManager.getLogger()`

Get the current logger instance.

```javascript
const logger = db.connectionManager.getLogger();
logger.info('Custom log message');
```

---

### CRUD Operations

#### `insert(table, data, dbConfig?, debug?, isIgnore?)`

Insert a record into a table. Returns the `insertId`.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `table` | string | Yes | Table name |
| `data` | Object | Yes | Key-value pairs to insert |
| `dbConfig` | Object | No | Database config (uses default if not provided) |
| `debug` | boolean | No | Log insert details |
| `isIgnore` | boolean | No | Use INSERT IGNORE |

```javascript
// Basic insert
const id = await db.insert('users', {
  name: 'John',
  email: 'john@example.com',
  created_at: new Date()
});

// Insert with debug logging
const id = await db.insert('users', { name: 'John' }, null, true);

// INSERT IGNORE (skip duplicates)
const id = await db.insert('users', { email: 'john@example.com' }, null, false, true);
```

#### `update(table, data, whereClause, dbConfig?, debug?)`

Update records in a table. Returns `affectedRows`.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `table` | string | Yes | Table name |
| `data` | Object | Yes | Key-value pairs to update |
| `whereClause` | string | Yes | WHERE clause (must include 'WHERE') |
| `dbConfig` | Object | No | Database config |
| `debug` | boolean | No | Log update details |

```javascript
const affectedRows = await db.update(
  'users',
  { name: 'Jane', updated_at: new Date() },
  'WHERE id = 1'
);

// With debug
const affectedRows = await db.update(
  'users',
  { status: 'active' },
  'WHERE created_at < NOW()',
  null,
  true
);
```

#### `delete(whereClause, table, dbConfig?)`

Delete records from a table. Returns `affectedRows`.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `whereClause` | string | Yes | WHERE clause (must include 'WHERE') |
| `table` | string | Yes | Table name |
| `dbConfig` | Object | No | Database config |

```javascript
const affectedRows = await db.delete('WHERE id = 1', 'users');

// Delete with complex condition
const affectedRows = await db.delete(
  'WHERE status = "deleted" AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)',
  'users'
);
```

#### `find(query, params?, dbConfig?)`

Execute a raw SELECT query. Returns an array of results.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | SQL query string |
| `params` | Array | No | Query parameters (for ? placeholders) |
| `dbConfig` | Object | No | Database config |

```javascript
// Simple query
const users = await db.find('SELECT * FROM users');

// Parameterized query
const users = await db.find(
  'SELECT * FROM users WHERE age > ? AND status = ?',
  [18, 'active']
);

// Complex query with joins
const orders = await db.find(`
  SELECT o.*, u.name as user_name
  FROM orders o
  INNER JOIN users u ON o.user_id = u.id
  WHERE o.total > ?
  ORDER BY o.created_at DESC
  LIMIT 10
`, [100]);
```

#### `findCount(query, params?, dbConfig?)`

Execute a COUNT query. Returns the count value.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | COUNT query (must return `count` alias) |
| `params` | Array | No | Query parameters |
| `dbConfig` | Object | No | Database config |

```javascript
const count = await db.findCount(
  'SELECT COUNT(*) as count FROM users WHERE age > ?',
  [18]
);
console.log(`Found ${count} users`);
```

---

### Query Builder

The query builder provides a fluent API to construct SQL queries programmatically. All methods support both verbose and concise naming.

#### Method Aliases

| Verbose Name | Short Aliases |
|--------------|---------------|
| `buildAndExecuteSelectQuery` | `select`, `findWhere`, `query` |
| `buildAndExecuteUpdateQuery` | `updateWhere`, `updateQuery` |
| `buildAndExecuteDeleteQuery` | `deleteWhere`, `remove` |

#### `select(options, dbConfig?)` / `buildAndExecuteSelectQuery()`

Build and execute a SELECT query.

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `table` | string | Table name (required) |
| `alias` | string | Table alias |
| `fields` | Array/string | Fields to select (default: '*') |
| `where` | Object | WHERE conditions |
| `joins` | Array | JOIN clauses |
| `orderBy` | string | ORDER BY clause |
| `groupBy` | string | GROUP BY clause |
| `having` | string | HAVING clause |
| `limit` | number | LIMIT value |
| `offset` | number | OFFSET value |
| `forUpdate` | boolean | Append FOR UPDATE for row-level locking (default: false) |

```javascript
// Simple select
const users = await db.select({
  table: 'users',
  where: { status: 'active' }
});

// Select with all options
const users = await db.select({
  table: 'users',
  alias: 'u',
  fields: ['id', 'name', 'email', 'created_at'],
  where: {
    age: { $gte: 18, $lte: 65 },
    status: 'active'
  },
  orderBy: 'created_at DESC',
  groupBy: 'department_id',
  having: 'COUNT(*) > 5',
  limit: 10,
  offset: 0
});

// Using aliases
const result1 = await db.findWhere({ table: 'users', where: { id: 1 } });
const result2 = await db.query({ table: 'products', limit: 100 });
```

#### `updateWhere(options, dbConfig?)` / `buildAndExecuteUpdateQuery()`

Build and execute an UPDATE query. Returns `affectedRows`.

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `table` | string | Table name (required) |
| `data` | Object | Data to update (required) |
| `where` | Object | WHERE conditions |

```javascript
// Update with query builder
const affectedRows = await db.updateWhere({
  table: 'users',
  data: { 
    status: 'inactive',
    updated_at: new Date()
  },
  where: { 
    last_login: { $lt: '2023-01-01' } 
  }
});

// Update multiple conditions
await db.updateQuery({
  table: 'products',
  data: { stock: 0 },
  where: {
    $or: [
      { discontinued: true },
      { expiry_date: { $lt: new Date() } }
    ]
  }
});
```

#### `deleteWhere(options, dbConfig?)` / `buildAndExecuteDeleteQuery()`

Build and execute a DELETE query. Returns `affectedRows`. **Requires a WHERE clause for safety.**

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `table` | string | Table name (required) |
| `where` | Object | WHERE conditions (required) |

```javascript
// Delete with conditions
const affectedRows = await db.deleteWhere({
  table: 'sessions',
  where: { 
    expired_at: { $lt: new Date() } 
  }
});

// Using 'remove' alias
await db.remove({
  table: 'logs',
  where: { 
    created_at: { $lt: '2024-01-01' },
    level: { $in: ['debug', 'trace'] }
  }
});
```

---

### WHERE Operators

The query builder supports MongoDB-style operators for building WHERE clauses.

#### Comparison Operators

| Operator | SQL Equivalent | Example |
|----------|----------------|---------|
| `$eq` | `=` | `{ status: { $eq: 'active' } }` |
| `$ne` | `!=` | `{ status: { $ne: 'deleted' } }` |
| `$gt` | `>` | `{ age: { $gt: 18 } }` |
| `$gte` | `>=` | `{ age: { $gte: 21 } }` |
| `$lt` | `<` | `{ price: { $lt: 100 } }` |
| `$lte` | `<=` | `{ quantity: { $lte: 10 } }` |

#### Array Operators

| Operator | SQL Equivalent | Example |
|----------|----------------|---------|
| `$in` | `IN (...)` | `{ status: { $in: ['active', 'pending'] } }` |
| `$nin` / `$notIn` | `NOT IN (...)` | `{ role: { $nin: ['admin', 'moderator'] } }` |

#### Pattern Matching

| Operator | SQL Equivalent | Example |
|----------|----------------|---------|
| `$like` | `LIKE` | `{ name: { $like: '%John%' } }` |
| `$between` | `BETWEEN` | `{ age: { $between: [18, 65] } }` |

#### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$and` | Logical AND | `{ $and: [{ age: { $gte: 18 } }, { status: 'active' }] }` |
| `$or` | Logical OR | `{ $or: [{ city: 'NYC' }, { city: 'LA' }] }` |
| `$not` | Logical NOT | `{ $not: { status: 'deleted' } }` |

#### NULL Handling

```javascript
// Check for NULL
{ deleted_at: null }  // WHERE deleted_at IS NULL
```

#### Complete WHERE Examples

```javascript
// Multiple operators on same field
await db.select({
  table: 'users',
  where: {
    age: { $gte: 18, $lte: 65 }  // age >= 18 AND age <= 65
  }
});

// OR conditions
await db.select({
  table: 'users',
  where: {
    $or: [
      { city: 'New York' },
      { city: 'Los Angeles' },
      { city: 'Chicago' }
    ]
  }
});

// Complex nested conditions
await db.select({
  table: 'orders',
  where: {
    status: 'pending',
    $or: [
      { total: { $gte: 1000 } },
      { 
        $and: [
          { priority: 'high' },
          { customer_type: 'vip' }
        ]
      }
    ]
  }
});

// BETWEEN operator
await db.select({
  table: 'products',
  where: {
    price: { $between: [10, 100] },
    created_at: { $between: ['2024-01-01', '2024-12-31'] }
  }
});

// LIKE patterns
await db.select({
  table: 'users',
  where: {
    email: { $like: '%@gmail.com' },
    name: { $like: 'John%' }
  }
});

// IN and NOT IN
await db.select({
  table: 'products',
  where: {
    category_id: { $in: [1, 2, 3, 4, 5] },
    status: { $nin: ['discontinued', 'out_of_stock'] }
  }
});
```

---

### JOIN Operations

The query builder supports all standard SQL JOIN types.

#### JOIN Syntax

```javascript
await db.select({
  table: 'orders',
  alias: 'o',
  fields: ['o.id', 'o.total', 'u.name as user_name', 'p.name as product_name'],
  joins: [
    {
      type: 'INNER',      // JOIN type: INNER, LEFT, RIGHT, FULL
      table: 'users',     // Table to join
      alias: 'u',         // Table alias (optional)
      on: 'o.user_id = u.id'  // JOIN condition
    },
    {
      type: 'LEFT',
      table: 'products',
      alias: 'p',
      on: 'o.product_id = p.id'
    }
  ],
  where: { 'o.status': 'completed' },
  orderBy: 'o.created_at DESC'
});
```

#### Multiple ON Conditions

```javascript
await db.select({
  table: 'order_items',
  alias: 'oi',
  joins: [
    {
      type: 'INNER',
      table: 'products',
      alias: 'p',
      on: ['oi.product_id = p.id', 'p.active = 1']  // Array for multiple conditions
    }
  ]
});
```

---

### Transactions

Transactions ensure that multiple database operations succeed or fail together (ACID compliance).

#### Creating a Transaction

```javascript
// Method 1: Using createTransaction()
const transaction = db.createTransaction();

// Method 2: Using TransactionCRUD class directly
const transaction = new db.TransactionCRUD();
```

#### Basic Transaction Flow

```javascript
const transaction = db.createTransaction();

try {
  // Initialize transaction
  await transaction.init();
  
  // Perform multiple operations
  const userId = await transaction.insert('users', {
    name: 'John',
    email: 'john@example.com'
  });
  
  await transaction.insert('user_profiles', {
    user_id: userId,
    bio: 'Software Developer'
  });
  
  await transaction.insert('user_settings', {
    user_id: userId,
    theme: 'dark',
    notifications: true
  });
  
  // Commit all changes
  await transaction.commit();
  console.log('Transaction successful');
  
} catch (error) {
  // Rollback on any error
  await transaction.rollback();
  console.error('Transaction failed:', error);
  throw error;
}
```

#### TransactionCRUD Methods

The `TransactionCRUD` class provides all CRUD methods available in the main API:

**Basic Methods:**
| Method | Description |
|--------|-------------|
| `init(dbConfig?)` | Initialize transaction |
| `commit()` | Commit transaction |
| `rollback()` | Rollback transaction |
| `executeQuery(query, params?)` | Execute raw query |

**CRUD Methods:**
| Method | Description |
|--------|-------------|
| `find(query, params?)` | Execute SELECT query |
| `findForUpdate(options)` | Execute locked SELECT (FOR UPDATE) |
| `insert(table, data)` | Insert record |
| `update(table, data, whereClause)` | Update records |
| `delete(whereClause, table)` | Delete records |

**Query Builder Methods (Verbose):**
| Method | Description |
|--------|-------------|
| `buildAndExecuteSelectQuery(options)` | Build & execute SELECT |
| `buildAndExecuteUpdateQuery(options)` | Build & execute UPDATE |
| `buildAndExecuteDeleteQuery(options)` | Build & execute DELETE |

**Query Builder Methods (Short Aliases):**
| Alias | Maps To |
|-------|---------|
| `select(options)` | `buildAndExecuteSelectQuery` |
| `findWhere(options)` | `buildAndExecuteSelectQuery` |
| `query(options)` | `buildAndExecuteSelectQuery` |
| `updateWhere(options)` | `buildAndExecuteUpdateQuery` |
| `updateQuery(options)` | `buildAndExecuteUpdateQuery` |
| `deleteWhere(options)` | `buildAndExecuteDeleteQuery` |
| `remove(options)` | `buildAndExecuteDeleteQuery` |
| `findForUpdate(options)` | `buildAndExecuteSelectQuery` (with forUpdate: true) |

#### Complete Transaction Example

```javascript
const transaction = db.createTransaction();

try {
  await transaction.init();
  
  // Insert using basic method
  const orderId = await transaction.insert('orders', {
    user_id: 123,
    total: 299.99,
    status: 'pending'
  });
  
  // Insert using transaction
  await transaction.insert('order_items', {
    order_id: orderId,
    product_id: 456,
    quantity: 2,
    price: 149.99
  });
  
  // Update using query builder (short alias)
  await transaction.updateWhere({
    table: 'products',
    data: { stock: { __raw: true, value: 'stock - 2' } },
    where: { id: 456 }
  });
  
  // Select within transaction
  const inventory = await transaction.select({
    table: 'products',
    fields: ['id', 'stock'],
    where: { id: 456 }
  });
  
  // Check stock
  if (inventory[0].stock < 0) {
    throw new Error('Insufficient stock');
  }
  
  // Find using raw query
  const user = await transaction.find(
    'SELECT email FROM users WHERE id = ?',
    [123]
  );
  
  // Commit all changes
  await transaction.commit();
  
  return { orderId, userEmail: user[0].email };
  
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

### Transaction Manager

The Transaction Manager allows you to share a transaction instance across different modules or files in your application.

#### API

| Method | Description |
|--------|-------------|
| `setInstance(transaction)` | Store transaction instance |
| `getInstance()` | Retrieve stored instance |
| `clearInstance()` | Clear stored instance |
| `hasActiveTransaction()` | Check if active transaction exists |

#### Usage Pattern

```javascript
// ========== Main file (e.g., orderController.js) ==========
const db = require('mysql-orm-lite');
const { processPayment } = require('./paymentService');
const { updateInventory } = require('./inventoryService');

async function createOrder(orderData) {
  const transaction = db.createTransaction();
  
  try {
    await transaction.init();
    
    // Store transaction for other modules
    db.transactionManager.setInstance(transaction);
    
    // Insert order
    const orderId = await transaction.insert('orders', orderData);
    
    // These functions will use the shared transaction
    await processPayment(orderId, orderData.total);
    await updateInventory(orderData.items);
    
    await transaction.commit();
    return orderId;
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    // Always clear the instance
    db.transactionManager.clearInstance();
  }
}

// ========== paymentService.js ==========
const db = require('mysql-orm-lite');

async function processPayment(orderId, amount) {
  const transaction = db.transactionManager.getInstance();
  
  if (!transaction) {
    throw new Error('No active transaction');
  }
  
  await transaction.insert('payments', {
    order_id: orderId,
    amount: amount,
    status: 'completed'
  });
}

module.exports = { processPayment };

// ========== inventoryService.js ==========
const db = require('mysql-orm-lite');

async function updateInventory(items) {
  const transaction = db.transactionManager.getInstance();
  
  if (!transaction) {
    throw new Error('No active transaction');
  }
  
  for (const item of items) {
    await transaction.updateWhere({
      table: 'products',
      data: { stock: { __raw: true, value: `stock - ${item.quantity}` } },
      where: { id: item.product_id }
    });
  }
}

module.exports = { updateInventory };
```

#### Checking Transaction State

```javascript
if (db.transactionManager.hasActiveTransaction()) {
  const transaction = db.transactionManager.getInstance();
  await transaction.insert('logs', { message: 'Within transaction' });
} else {
  await db.insert('logs', { message: 'No transaction' });
}
```

---

## Advanced Usage

### Multiple Database Connections

Connect to multiple MySQL databases simultaneously:

```javascript
// Define database configurations
const primaryDB = {
  host: 'primary-server.com',
  user: 'admin',
  password: 'secret',
  database: 'main_app',
  connectionLimit: 20
};

const analyticsDB = {
  host: 'analytics-server.com',
  user: 'reader',
  password: 'readonly',
  database: 'analytics',
  connectionLimit: 5
};

const replicaDB = {
  host: 'replica-server.com',
  user: 'reader',
  password: 'secret',
  database: 'main_app',
  connectionLimit: 10
};

// Initialize with default database
db.connectionManager.init(primaryDB);

// Use default connection
const users = await db.find('SELECT * FROM users');

// Use analytics database
const events = await db.find(
  'SELECT * FROM events WHERE date > ?',
  ['2024-01-01'],
  analyticsDB
);

// Use replica for read-heavy operations
const reports = await db.select({
  table: 'orders',
  where: { status: 'completed' },
  orderBy: 'created_at DESC',
  limit: 1000
}, replicaDB);

// Write to primary, read from replica
await db.insert('orders', orderData, primaryDB);
const order = await db.find('SELECT * FROM orders WHERE id = ?', [orderId], replicaDB);
```

### Raw SQL Expressions

Use raw SQL expressions in updates:

```javascript
// Increment a value
await db.updateWhere({
  table: 'products',
  data: {
    stock: { __raw: true, value: 'stock - 1' },
    view_count: { __raw: true, value: 'view_count + 1' },
    updated_at: new Date()
  },
  where: { id: productId }
});

// Use MySQL functions
await db.updateWhere({
  table: 'users',
  data: {
    last_login: { __raw: true, value: 'NOW()' },
    login_count: { __raw: true, value: 'login_count + 1' }
  },
  where: { id: userId }
});
```

### Custom Logger Integration

#### Winston Logger

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'database.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

db.connectionManager.init(dbConfig, logger);
// or
db.connectionManager.setLogger(logger);
```

#### Bunyan Logger

```javascript
const bunyan = require('bunyan');

const logger = bunyan.createLogger({
  name: 'mysql-orm',
  level: 'info'
});

db.connectionManager.setLogger(logger);
```

#### Pino Logger

```javascript
const pino = require('pino');

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty'
  }
});

db.connectionManager.setLogger(logger);
```

---

## Error Handling

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `ER_DUP_ENTRY` | Duplicate key violation |
| `ER_NO_REFERENCED_ROW` | Foreign key constraint fails |
| `ER_ROW_IS_REFERENCED` | Cannot delete parent row |
| `ER_BAD_FIELD_ERROR` | Unknown column |
| `ER_NO_SUCH_TABLE` | Table doesn't exist |
| `PROTOCOL_CONNECTION_LOST` | Connection lost |
| `ECONNREFUSED` | Connection refused |
| `ER_CON_COUNT_ERROR` | Too many connections |

### Error Handling Examples

```javascript
try {
  await db.insert('users', { email: 'existing@example.com' });
} catch (error) {
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      console.error('Email already exists');
      break;
    case 'ER_NO_SUCH_TABLE':
      console.error('Table does not exist');
      break;
    case 'ECONNREFUSED':
      console.error('Cannot connect to database');
      break;
    default:
      console.error('Database error:', error.message);
  }
}
```

### Transaction Error Handling

```javascript
const transaction = db.createTransaction();

try {
  await transaction.init();
  
  await transaction.insert('orders', orderData);
  await transaction.insert('order_items', itemsData);
  
  await transaction.commit();
} catch (error) {
  // Rollback is safe to call multiple times
  await transaction.rollback();
  
  if (error.code === 'ER_DUP_ENTRY') {
    throw new Error('Order already exists');
  }
  
  throw error;
}
```

---

## Performance Tips

1. **Use Connection Pooling** (Built-in)
   - Connections are reused automatically
   - Set `connectionLimit` based on your needs

2. **Monitor Slow Queries**
   - Queries taking >1 second are automatically logged
   - Review and optimize slow queries regularly

3. **Use Transactions Wisely**
   - Group related operations in transactions
   - Keep transactions short to avoid lock contention

4. **Use Parameterized Queries**
   - Always use `?` placeholders
   - Never concatenate user input into queries

5. **Select Only Needed Fields**
   ```javascript
   // Good - select specific fields
   await db.select({
     table: 'users',
     fields: ['id', 'name', 'email']
   });
   
   // Avoid - selecting all fields
   await db.select({ table: 'users' });  // SELECT *
   ```

6. **Use Indexes**
   - Add indexes on frequently queried columns
   - Use EXPLAIN to analyze query performance

7. **Pagination**
   ```javascript
   // Always use limit and offset for large datasets
   await db.select({
     table: 'logs',
     orderBy: 'created_at DESC',
     limit: 50,
     offset: page * 50
   });
   ```

8. **Close Pools on Shutdown**
   ```javascript
   process.on('SIGINT', async () => {
     await db.connectionManager.closeAllPools();
     process.exit(0);
   });
   
   process.on('SIGTERM', async () => {
     await db.connectionManager.closeAllPools();
     process.exit(0);
   });
   ```

---

## Complete Examples

### User Service Class

```javascript
const db = require('mysql-orm-lite');

class UserService {
  constructor() {
    db.connectionManager.init({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 10
    });
  }

  async createUser(userData) {
    const transaction = db.createTransaction();
    
    try {
      await transaction.init();
      
      const userId = await transaction.insert('users', {
        email: userData.email,
        password: userData.hashedPassword,
        created_at: new Date()
      });
      
      await transaction.insert('profiles', {
        user_id: userId,
        first_name: userData.firstName,
        last_name: userData.lastName,
        avatar: userData.avatar || null
      });
      
      await transaction.insert('user_settings', {
        user_id: userId,
        theme: 'system',
        notifications: true,
        language: 'en'
      });
      
      await transaction.commit();
      return userId;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getUser(userId) {
    const users = await db.select({
      table: 'users',
      alias: 'u',
      fields: ['u.id', 'u.email', 'p.first_name', 'p.last_name', 'p.avatar'],
      joins: [{
        type: 'LEFT',
        table: 'profiles',
        alias: 'p',
        on: 'u.id = p.user_id'
      }],
      where: { 'u.id': userId }
    });
    
    return users[0] || null;
  }

  async getUsers(filters = {}, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const where = { deleted_at: null };
    if (filters.status) where.status = filters.status;
    if (filters.search) where.email = { $like: `%${filters.search}%` };
    
    const users = await db.select({
      table: 'users',
      fields: ['id', 'email', 'status', 'created_at'],
      where,
      orderBy: 'created_at DESC',
      limit,
      offset
    });
    
    const total = await db.findCount(
      'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL'
    );
    
    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async updateUser(userId, updates) {
    return await db.updateWhere({
      table: 'users',
      data: {
        ...updates,
        updated_at: new Date()
      },
      where: { id: userId }
    });
  }

  async deleteUser(userId) {
    // Soft delete
    return await db.updateWhere({
      table: 'users',
      data: {
        deleted_at: new Date(),
        status: 'deleted'
      },
      where: { id: userId }
    });
  }
}

module.exports = new UserService();
```

### Express.js Integration

```javascript
const express = require('express');
const db = require('mysql-orm-lite');

const app = express();
app.use(express.json());

// Initialize database
db.connectionManager.init({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Routes
app.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    const where = {};
    if (status) where.status = status;
    
    const users = await db.select({
      table: 'users',
      fields: ['id', 'name', 'email', 'status'],
      where,
      orderBy: 'created_at DESC',
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/users', async (req, res) => {
  try {
    const id = await db.insert('users', req.body);
    res.status(201).json({ success: true, id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'User already exists' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Graceful shutdown
const server = app.listen(3000);

process.on('SIGTERM', async () => {
  server.close();
  await db.connectionManager.closeAllPools();
  process.exit(0);
});
```

---

## API Quick Reference

### Main Exports

```javascript
const db = require('mysql-orm-lite');

// Connection
db.connectionManager.init(config, logger?)
db.connectionManager.setLogger(logger)
db.connectionManager.getPool(config?)
db.connectionManager.closePool(config)
db.connectionManager.closeAllPools()
db.connectionManager.getLogger()

// CRUD
db.insert(table, data, dbConfig?, debug?, isIgnore?)
db.update(table, data, whereClause, dbConfig?, debug?)
db.delete(whereClause, table, dbConfig?)
db.find(query, params?, dbConfig?)
db.findCount(query, params?, dbConfig?)

// Query Builder
db.select(options, dbConfig?)                    // alias: findWhere, query
db.buildAndExecuteSelectQuery(options, dbConfig?)
db.updateWhere(options, dbConfig?)               // alias: updateQuery
db.buildAndExecuteUpdateQuery(options, dbConfig?)
db.deleteWhere(options, dbConfig?)               // alias: remove
db.buildAndExecuteDeleteQuery(options, dbConfig?)

// Transactions
db.createTransaction()
db.TransactionCRUD
db.transactionManager.setInstance(transaction)
db.transactionManager.getInstance()
db.transactionManager.clearInstance()
db.transactionManager.hasActiveTransaction()

// Utilities
db.utils
```

### TransactionCRUD Methods

```javascript
const transaction = db.createTransaction();

// Lifecycle
await transaction.init(dbConfig?)
await transaction.commit()
await transaction.rollback()

// Raw query
await transaction.executeQuery(query, params?)
await transaction.find(query, params?)

// CRUD
await transaction.insert(table, data)
await transaction.update(table, data, whereClause)
await transaction.delete(whereClause, table)

// Query Builder (verbose)
await transaction.buildAndExecuteSelectQuery(options)
await transaction.buildAndExecuteUpdateQuery(options)
await transaction.buildAndExecuteDeleteQuery(options)

// Query Builder (aliases)
await transaction.select(options)
await transaction.findWhere(options)
await transaction.query(options)
await transaction.updateWhere(options)
await transaction.updateQuery(options)
await transaction.deleteWhere(options)
await transaction.remove(options)
```

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support

For issues and questions: [GitHub Issues](https://github.com/Manikandan-Thonthiraj/mysql-orm-lite/issues)

---

Made with ❤️ for the Node.js community
