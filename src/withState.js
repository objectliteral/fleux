import * as React from 'react';
import pascalCase from 'just-pascal-case';
import typeOf from 'just-typeof';
import fromEntries from 'fromentries';

import { createStore } from './store';
import context from './context';
import * as SYMBOLS from './symbols';
import parseProps from './parseProps';

const defaultStore = createStore();

const withContext = function (Component) {

    class ContextWrapper extends React.Component {
        render() {
            const value = this.context || defaultStore;
            return (
                <Component context={value} {...this.props} />
            )
        }
    }

    ContextWrapper.contextType = context;

    return ContextWrapper;
}

const statefulComponentFactory = function (Component) {

    var currentlyRenderingComponent = undefined;

    const handler = {
        get: function (target, prop) {
            return target[SYMBOLS.STORE_GET](prop, currentlyRenderingComponent);
        }
    }

    const ComponentWithState = withContext(function ComponentWithContext ({context, ...props}) {

        const localProxy = new Proxy(context, handler);

        class ComponentWithStore extends React.Component {
            constructor(props) {
                super(props);
                currentlyRenderingComponent = this;
                this.state = {};
            }
            render() {
                return (
                    <Component store={localProxy} {...this.props} />
                );
            }
        }

        return (
            <ComponentWithStore {...props} />
        );

    });

    Object.entries(Component).forEach(([key, value]) => ComponentWithState[key] = value);

    return ComponentWithState;

};

const withState = function (...args) {

    if (args.length === 0) {

        return statefulComponentFactory;

    } else {

        const [ readablePropNames, writeablePropNames, actions ] = parseProps(args);

        return function (Component) {

            const ComponentWithState = function (props) {

                const conflictingNames = readablePropNames.filter(name => props.hasOwnProperty(name)).concat(writeablePropNames.filter(name => props.hasOwnProperty('set' + pascalCase(name))));

                if (conflictingNames.length > 0) {
                    throw Error(`Refusing to overwrite store props with parent-injected prop. The name(s) ${conflictingNames} exist in the store and are passed down from the parent component, resulting in a naming conflict.`);
                }

                const explicitlyBoundComponent = function ({store}) {

                    const readableProps = fromEntries(readablePropNames.map((propName) => [propName, store[propName]]));

                    const writeableProps = fromEntries(writeablePropNames.map((propName) => [ 'set' + pascalCase(propName), (value) => {
                        if (typeof value === 'function') {
                            store[propName] = value(store[propName]);
                        } else {
                            store[propName] = value;
                        }
                    } ] ));

                    const actionProps = actions(store, props);

                    return (
                        <Component {...props} {...readableProps} {...writeableProps} {...actionProps} store={store} dispatch={store.dispatch} />
                    );

                }

                const StatefulComponent = statefulComponentFactory(explicitlyBoundComponent);

                return (
                    <StatefulComponent {...props} />
                );

            };

            Object.entries(Component).forEach(([key, value]) => ComponentWithState[key] = value);

            return ComponentWithState;

        }

    }
}

export { withState };