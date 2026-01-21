const db = require('mysql-orm-lite');

db.connectionManager.init({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'test_db'
});

async function transactionExample() {
    const transaction = db.createTransaction();

    try {
        await transaction.init();
        console.log('Transaction started');

        // Insert user
        const userId = await transaction.insert('users', {
            name: 'Bob',
            email: 'bob@example.com'
        });

        // Insert profile
        await transaction.insert('profiles', {
            user_id: userId,
            bio: 'Developer',
            website: 'https://example.com'
        });

        // Insert preferences
        await transaction.insert('preferences', {
            user_id: userId,
            theme: 'dark',
            notifications: true
        });

        await transaction.commit();
        console.log('Transaction committed successfully');

    } catch (error) {
        console.error('Error, rolling back:', error);
        await transaction.rollback();
    } finally {
        await db.connectionManager.closeAllPools();
    }
}

transactionExample();
