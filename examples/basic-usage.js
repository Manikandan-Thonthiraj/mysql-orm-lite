const db = require('mysql-orm-lite');

// Initialize
db.connectionManager.init({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'test_db'
});

async function basicExample() {
    try {
        // Insert
        const userId = await db.insert('users', {
            name: 'Alice',
            email: 'alice@example.com',
            age: 28
        });
        console.log('Inserted user ID:', userId);

        // Find
        const users = await db.find(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        console.log('Found users:', users);

        // Update
        const updated = await db.update(
            'users',
            { age: 29 },
            'WHERE id = ?'
        );
        console.log('Updated rows:', updated);

        // Query Builder - using shorter aliases
        const activeUsers = await db.select({
            table: 'users',
            fields: ['id', 'name', 'email'],
            where: {
                age: { $gte: 18 },
                $or: [
                    { status: 'active' },
                    { status: 'pending' }
                ]
            },
            orderBy: 'created_at DESC',
            limit: 10
        });
        console.log('Active users:', activeUsers);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.connectionManager.closeAllPools();
    }
}

basicExample();
