import connectionManager from './lib/connectionManager';
import * as crud from './lib/crud';
import TransactionCRUD from './lib/TransactionCRUD';
import transactionManager from './lib/transactionManager';

export {
    connectionManager,
    transactionManager,
    TransactionCRUD
};

// CRUD Operations (Non-transactional)
export const find = crud.find;
export const findCount = crud.findCount;
export const insert = crud.insert;
export const update = crud.update;
export const _delete = crud.delete;
export { _delete as delete };

// Query Builder - Full names
export const buildAndExecuteSelectQuery = crud.buildAndExecuteSelectQuery;
export const buildAndExecuteUpdateQuery = crud.buildAndExecuteUpdateQuery;
export const buildAndExecuteDeleteQuery = crud.buildAndExecuteDeleteQuery;

// Query Builder - Alternative shorter names
export const select = crud.select;
export const findWhere = crud.findWhere;
export const query = crud.query;
export const updateWhere = crud.updateWhere;
export const updateQuery = crud.updateQuery;
export const deleteWhere = crud.deleteWhere;
export const remove = crud.remove;

// Utility exports
export const utils = crud.utils;

// Convenience method to create transaction
export const createTransaction = () => new TransactionCRUD();

// Default export for CJS compatibility and convenience
export default {
    connectionManager,
    transactionManager,
    TransactionCRUD,
    find,
    findCount,
    insert,
    update,
    delete: _delete,
    buildAndExecuteSelectQuery,
    buildAndExecuteUpdateQuery,
    buildAndExecuteDeleteQuery,
    select,
    findWhere,
    query,
    updateWhere,
    updateQuery,
    deleteWhere,
    remove,
    utils,
    createTransaction
};
