import TransactionCRUD from './TransactionCRUD';

let transactionInstance: TransactionCRUD | null = null;

const transactionManager = {
    setInstance: (instance: TransactionCRUD) => {
        transactionInstance = instance;
    },

    getInstance: (): TransactionCRUD | null => {
        return transactionInstance || null;
    },

    clearInstance: () => {
        transactionInstance = null;
    },

    hasActiveTransaction: (): boolean => {
        // Accessing private property via any cast since it's an internal check
        return transactionInstance !== null && (transactionInstance as any).transactionActive;
    }
};

export default transactionManager;
export { transactionManager };
