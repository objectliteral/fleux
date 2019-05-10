import completeAssign from './completeAssign';

const createStore = function (initialValues = {}) {

    const values = {};
    const callbacks = {};
    const store = {};

    const subscribe = function (name, callback) {
        if (typeof callbacks[name] === 'undefined') {
            create(name, this[name]);
        }
        callbacks[name].push(callback)
    };

    const unsubscribe = function (name, callback) {
        if (typeof callbacks[name] === 'undefined') {
            callbacks[name] = [];
        }
        callbacks[name].splice(callbacks[name].indexOf(callback), 1);
    };

    const create = function (name, initialValue) {
        values[name] = initialValue;
        callbacks[name] = [];
        completeAssign(store, {
            get [name] () {
                return values[name];
            },
            set [name] (value) {
                values[name] = value;
                callbacks[name].forEach((callback) => callback({[name]: value}));
            }
        });
    };

    Object.defineProperties(store, {
        subscribe: {
            enumerable: false,
            value: subscribe
        },
        unsubscribe: {
            enumerable: false,
            value: unsubscribe
        },
        create: {
            enumerable: false,
            value: create
        }
    });

    Object.entries(initialValues).forEach(([name, value]) => create(name, value));

    return store;

};

const isStore = function (obj) {
    return typeof obj.subscribe === 'function'
        && typeof obj.unsubscribe === 'function'
        && typeof obj.create === 'function';
}

export { createStore, isStore };
