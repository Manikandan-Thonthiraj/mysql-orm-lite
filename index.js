'use strict';

const connectionManager = require('./lib/connectionManager');
const crud = require('./lib/crud');
const TransactionCRUD = require('./lib/TransactionCRUD');
const transactionManager = require('./lib/transactionManager');

module.exports = {
    // Connection Management
    connectionManager,

    // CRUD Operations (Non-transactional)
    find: crud.find,
    findCount: crud.findCount,
    insert: crud.insert,
    update: crud.update,
    delete: crud.delete,

    // Query Builder - Full names
    buildAndExecuteSelectQuery: crud.buildAndExecuteSelectQuery,
    buildAndExecuteUpdateQuery: crud.buildAndExecuteUpdateQuery,
    buildAndExecuteDeleteQuery: crud.buildAndExecuteDeleteQuery,

    // Query Builder - Alternative shorter names
    select: crud.select,
    findWhere: crud.findWhere,
    query: crud.query,
    updateWhere: crud.updateWhere,
    updateQuery: crud.updateQuery,
    deleteWhere: crud.deleteWhere,
    remove: crud.remove,

    // Transaction Support
    TransactionCRUD,
    transactionManager,

    // Utility exports
    utils: crud.utils,

    // Convenience method to create transaction
    createTransaction: () => new TransactionCRUD()
};
