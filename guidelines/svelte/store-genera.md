# Svelte 5 Store Architecture Guide

This guide outlines best practices for creating and using stores in Svelte 5 applications. It's designed to ensure a consistent methodology using best practices in software design and architecture.

## IMPORTANT: File Naming Convention
Stores using Svelte features (like $state, $derived, etc.) MUST use the `.svelte.js` extension.
Regular JavaScript stores without Svelte features should use the `.js` extension.

## 0. JSDoc for Stores

Use the following JSDoc template for stores:

```javascript
/**
 * @store StoreName
 * @description Brief description of the store's purpose and functionality.
 *
 * @property {PropertyType} propertyName - Description of the property.
 * @property {PropertyType} derivedProperty - Description of a derived property.
 *
 * @method methodName
 * @description Description of the method's purpose.
 * @param {ParamType} paramName - Description of the parameter.
 * @returns {ReturnType} Description of the return value.
 *
 * @example
 * import { storeName } from './path-to-store';
 * 
 * // Usage example
 * storeName.methodName(param);
 * console.log(storeName.propertyName);
 */
```

This JSDoc template provides essential information for an LLM to understand and use the store without needing to read the store's code.

## 1. Store Creation

1.1. Basic Store:
- Use a class with `$state` for reactive properties:
  ```javascript
  class SimpleStore {
    count = $state(0);
    
    increment() {
      this.count++;
    }
  }
  
  export const simpleStore = new SimpleStore();
  ```

### IMPORTANT
- Some Svelte 5 runes must only be initialised in the root context of a class. E.g. do not initialise a $state rune inside of a constructor. 
    - The exception to this is using the $effect.root rune, however extreme care must be exercised with this rune as it will not clean itself when all references to it are removed.

1.2. Complex Store:
- Use classes for stores with multiple properties and methods:
  ```javascript
  class UserStore {
    currentUser = $state(null);
    isLoading = $state(false);
    
    async login(credentials) {
      this.isLoading = true;
      try {
        this.currentUser = await api.login(credentials);
      } finally {
        this.isLoading = false;
      }
    }
    
    logout() {
      this.currentUser = null;
    }
  }
  
  export const userStore = new UserStore();
  ```

## 2. Derived State

2.1. Simple Derived State:
- Use `$derived` for computed properties:
  ```javascript
  class CartStore {
    items = $state([]);
    totalPrice = $derived(this.items.reduce((sum, item) => sum + item.price, 0));
  }
  ```

2.2. Complex Derived State:
- Use `$derived.by()` for complex computations:
  ```javascript
  class AnalyticsStore {
    data = $state([]);
    complexMetric = $derived.by(() => {
      // Complex calculation using this.data
      return result;
    });
  }
  ```

## 3. Async Operations and Server-Side Considerations

3.1. Async Initialization:
- Use constructor or separate init method for async setup
- Ensure server-side safety by checking for browser environment:
  ```javascript
  import { browser } from '$app/environment';

  class ConfigStore {
    config = $state(null);
    
    constructor() {
      if (browser) {
        this.loadConfig();
      }
    }
    
    async loadConfig() {
      this.config = await api.fetchConfig();
    }
  }
  ```

3.2. Server-Side Execution:
- Avoid running client-side logic when executed on the server:
  ```javascript
  import { browser } from '$app/environment';

  class FirestoreStore {
    constructor() {
      if (browser) {
        this.initializeFirestore();
      }
    }

    initializeFirestore() {
      // Firestore initialization logic
    }
  }
  ```

3.3. Error Handling:
- Include error state and handling in stores:
  ```javascript
  class DataStore {
    data = $state(null);
    error = $state(null);
    
    async fetchData() {
      try {
        this.data = await api.getData();
        this.error = null;
      } catch (err) {
        this.error = err.message;
      }
    }
  }
  ```

### IMPORTANT
- The api.getData() function in this example must not nest async requests beyond the root level, otherwise this try-catch will no longer function. As a general principle async functions that are made available to other parts of the app must never nest more than 1 level deep.

## 4. Interoperability

4.1. Composing Stores:
- Use composition to combine multiple stores:
  ```javascript
  class AppStore {
    constructor(userStore, cartStore) {
      this.user = userStore;
      this.cart = cartStore;
    }
  }
  
  export const appStore = new AppStore(userStore, cartStore);
  ```

4.2. Store Dependencies:
- Inject dependencies to make stores more testable:
  ```javascript
  class ProductStore {
    constructor(api) {
      this.api = api;
    }
    
    products = $state([]);
    
    async fetchProducts() {
      this.products = await this.api.getProducts();
    }
  }
  
  export const productStore = new ProductStore(api);
  ```

## 5. Best Practices

5.1. Immutability:
- Prefer immutable updates for arrays and objects:
  ```javascript
  class TodoStore {
    todos = $state([]);
    
    addTodo(todo) {
      this.todos = [...this.todos, todo];
    }
    
    updateTodo(id, updates) {
      this.todos = this.todos.map(todo => 
        todo.id === id ? {...todo, ...updates} : todo
      );
    }
  }
  ```

5.2. Modular Design:
- Keep stores focused and modular
- Use composition for complex state management

5.3. Effects in .svelte.js Files:
- $effect runes in .svelte.js files must be nested inside $effect.root:
  ```javascript
  class MyStore {
    constructor() {
      this.cleanup = $effect.root(() => {
        $effect(() => {
          // Effect logic here
        });
        
        // Return a cleanup function if needed
        return () => {
          // Cleanup logic here
        };
      });
    }

    destroy() {
      // Call the cleanup function when the store is no longer needed
      if (this.cleanup) {
        this.cleanup();
      }
    }
  }
  ```
- The $effect.root returns a function that can be executed to clean up the effect when no longer needed
- Effects in .svelte.js files will not clean themselves up automatically

5.4. Consistent Naming:
- Use consistent naming conventions across all stores and their methods
- Avoid singular/plural inconsistencies (e.g., 'component' vs 'components')
- Use clear, descriptive names for properties and methods
- Maintain consistency between store property names and their usage in components and other parts of the application

Remember: Always use Svelte 5 syntax. Avoid Svelte 4 patterns like `writable` from `svelte/store`.
Consistent naming is crucial to prevent bugs and improve code readability and maintainability.
