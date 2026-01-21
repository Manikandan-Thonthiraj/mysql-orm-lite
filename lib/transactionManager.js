'use strict';

let transactionInstance = null;

module.exports = {
    setInstance: (instance) => {
        transactionInstance = instance;
    },

    getInstance: () => {
        return transactionInstance || null;
    },

    clearInstance: () => {
        transactionInstance = null;
    },

    hasActiveTransaction: () => {
        return transactionInstance !== null && transactionInstance.transactionActive;
    }
};
