# Svelte 5 Core Architecture Guide

This guide outlines key Svelte 5 features and their implementation in our component framework. It's designed for efficient LLM ingestion and accurate component creation.

## 0. JSDoc for Components

Every Svelte component MUST have a JSDoc comment that follows this exact structure:

```javascript
/**
 * @component ComponentName
 * @description A clear, concise description of what this component does
 *
 * @type {{
 *   propName: string,                     // Required prop with description
 *   optionalProp?: number,               // Optional prop with description
 *   onEvent?: (data: object) => void,    // Event handler with param type
 *   class?: string                      // Optional CSS classes
 * }}
 */
```

### 0.1 JSDoc Rules

1. The comment MUST start with `/**` and end with `*/`
2. The first line MUST be `@component` followed by the component name
3. The second line MUST be `@description` with a clear purpose statement
4. There MUST be a blank line after the description
5. The `@type` block MUST:
   - Use TypeScript syntax
   - Mark optional props with `?`
   - Include ALL props used by the component
   - Align comments with two spaces after the longest type
   - Use consistent comment style with `//` and a space
   - List props in this order:
     1. Required props first
     2. Optional props second
     3. Event handlers third (prefixed with 'on')
     4. Snippet props last
     5. `class` prop (if used) always last

### 0.2 JSDoc Examples

✅ CORRECT:
```javascript
/**
 * @component Button
 * @description A customizable button component with various styles
 *
 * @type {{
 *   label: string,                     // Text to display in the button
 *   variant: string,                   // Visual style variant (primary|secondary)
 *   disabled: boolean,                 // Whether the button is disabled
 *   onclick: () => void,              // Click event handler
 *   class: string                     // Additional CSS classes
 * }}
 */
```

❌ INCORRECT:
```javascript
/**
 * @component Button
 * @description Button component
 * @type {{
 *   label: string,
 *   variant?: string, // Should specify literal types
 *   disabled?: boolean,//Bad comment spacing
 *   onclick?: Function, // Should specify exact function type
 * }}
 */
```

### 0.3 Common Type Patterns

Event Handlers:
```javascript
onclick?: (event) => void               // Click handler
onchange?: (value) => void              // Value change handler
onsubmit?: (data) => void              // Form submission handler
```

Literal Types:
```javascript
variant?: 'primary'|'secondary'|'ghost'  // Use literal unions
size?: 'sm'|'md'|'lg'                   // Use literal unions
align?: 'left'|'center'|'right'         // Use literal unions
```

Complex Types:
```javascript
data?: {                                // Use object shape definition
  id: string,
  title: string,
  items: []
}
```

This standardized JSDoc format ensures consistent documentation across all components and enables better tooling support.

## 1. Reactivity

1.1. State Management:
- Use `$state()` for component-internal reactive variables:
  ```javascript
  let count = $state(0);
  ```

1.2. Derived Values and Effects:
- IMPORTANT: `$derived` and `$derived.by()` can ONLY be used in the root context of a component's JavaScript section. They CANNOT be used directly in the template/DOM or inside functions/blocks.

- Use `$derived` for simple computed values that directly reference reactive variables:
  ```javascript
  // ✅ CORRECT - In root context
  let doubleCount = $derived(count * 2);

  // ❌ WRONG - Inside template
  <div>{$derived(count * 2)}</div>

  // ❌ WRONG - Inside function
  function calculate() {
    return $derived(count * 2);
  }
  ```
  A variable is defined and set to the result of the `$derived()` rune. The rune automatically tracks dependencies and updates the value when dependencies change. You CANNOT pass a function to the $derived base rune.

- Use `$derived.by()` for complex derived values that need to return a value:
  ```javascript
  // ✅ CORRECT - In root context with dependency checking
  let complexValue = $derived.by(() => { 
    // Must return a value to be assigned to complexValue
    // IMPORTANT: Check that this doesn't create an infinite loop
    // by modifying dependencies within the calculation
    if (!x || !y || !z) return 0; // Guard against undefined
    return x + calculation(y + z); 
  });

  // ❌ WRONG - Inside template
  <div>{$derived.by(() => calculation())}</div>

  // ❌ WRONG - Creates infinite loop
  let badValue = $derived.by(() => {
    x++; // Never modify dependencies inside derived calculations
    return x * 2;
  });
  ```
  IMPORTANT: Both `$derived` and `$derived.by()` MUST be used to assign a value to a variable in the root context. They cannot be used for side effects or inside functions/blocks. For side effects, use `$effect()`.

1.2.1 Preventing Infinite Loops:
- NEVER modify reactive dependencies inside $derived.by() or $effect callbacks
- Always add guard clauses to prevent undefined/null calculations
- Use separate effects for state updates:
  ```javascript
  // ❌ WRONG - Creates infinite loop
  $effect(() => {
    count = count + 1; // Modifies its own dependency
  });

  // ✅ CORRECT - Separate effect with clear trigger
  $effect(() => {
    if (someOtherValue) { // Clear trigger condition
      count = newValue; // Update based on external change
    }
  });
  ```

1.2.2 Best Practices for Effects:
- Always have a clear trigger condition
- Never modify a value that the effect depends on
- Use separate effects for different concerns
- Add cleanup logic if needed:
  ```javascript
  $effect(() => {
    const interval = setInterval(() => {
      // Effect logic
    }, 1000);
    
    return () => clearInterval(interval); // Cleanup
  });
  ```

- For side effects based on reactive values, use `$effect()`:
  ```javascript
  $effect(() => {
    // Use for side effects like:
    // - Updating DOM
    // - Making API calls
    // - Setting other state
    if (someValue) {
      doSomething();
    }
  });
  ```

1.2.1 Derived Values Best Practices:
- IMPORTANT: Avoid using `$derived` for object lookups or map operations. Instead, define the lookup map as a static object and derive just the result:
  ```javascript
  // ❌ WRONG - Don't derive the entire object lookup
  const classes = $derived({
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }[size]);

  // ✅ CORRECT - Define map statically, derive only the lookup
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  const className = $derived(sizeClasses[size] || sizeClasses.md);
  ```

- IMPORTANT: For conditional class generation, separate the static mappings from the derived values:
  ```javascript
  // ❌ WRONG - Don't compute mappings inside derived values
  const buttonClass = $derived.by(() => ({
    primary: 'bg-blue-500',
    secondary: 'bg-gray-500'
  }[variant]));

  // ✅ CORRECT - Define mappings separately
  const variantClasses = {
    primary: 'bg-blue-500',
    secondary: 'bg-gray-500'
  };
  const buttonClass = $derived(variantClasses[variant] || variantClasses.primary);
  ```

1.2.2 Common Derived Value Patterns:
- For class name generation:
  ```javascript
  // Define static mappings
  const variants = {
    primary: 'bg-blue-500 text-white',
    secondary: 'bg-gray-500 text-white'
  };
  const sizes = {
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-2 px-4'
  };

  // Derive individual classes
  const variantClass = $derived(variants[variant] || variants.primary);
  const sizeClass = $derived(sizes[size] || sizes.md);
  
  // Combine classes
  const className = $derived(`${variantClass} ${sizeClass} ${customClass}`);
  ```

1.3. Side Effects:
- Use `$effect()` sparingly for side effects and lifecycle management:
  ```javascript
  $effect(() => {
    console.log(`Count changed to ${count}`);
  });
  ```
- Be cautious when using `$effect()`. Overuse can lead to complex reactivity chains and potential infinite loops.
- Only use `$effect()` when you need to perform cleanup or when the reactive logic involves side effects that can't be handled by `$derived`.

## 2. Props, Events, and Bindable Properties

2.1. Prop Definitions:
- Define all props using a single `$props()` rune:
  ```javascript
  let { 
    value = '',           // Regular prop with default
    onchange = () => {}, // Event handler with default empty function
    disabled = false     // Regular prop with boolean default
  } = $props();
  ```

2.2. Props Best Practices:
- Use a single `$props()` rune per component
- Provide sensible defaults for optional props
- Document all props with JSDoc
- For event handlers, always provide an empty function as default

2.3. State Properties:
- Use `$state()` for internal component state that doesn't need to be bound:
  ```javascript
  let internalCount = $state(0);
  ```

2.3. Prop Passing:
- When passing props to a component, use the following syntax:
  ```svelte
  <MyComponent
    prop1={value1}
    bind:prop2={value2}
    onevent={(data) => handleEvent(data)}
  />
  ```

2.3. Naming Conventions:
- Use camelCase for prop variables or lowercase fore events.
- Prefix booleans with 'is', 'has', or 'should' (e.g., isDisabled)
- Common prop names: value, onchange, onsubmit, disabled, variant

2.4. Event Handling:
- IMPORTANT: Do not use `createEventDispatcher`. It is deprecated in Svelte 5.
- Use callback props for all component communication, including child-to-parent:
  ```javascript
  let { onchange } = $props();

  function handleChange(newValue) {
    onchange?.(newValue);
  }
  ```
- Use inline event handlers with the new syntax for DOM events:
  ```svelte
  <button onclick={() => count++}>
    Increment
  </button>
  ```
- For component events, always pass callback props:
  ```svelte
  <!-- Parent component -->
  <ChildComponent oncustomevent={(data) => handleCustomEvent(data)} />

  <!-- Child component -->
  <script>
    let { oncustomevent } = $props();
    
    function triggerCustomEvent() {
      oncustomevent?.({ someData: 'value' });
    }
  </script>
  ```
- When defining props for a component that emits events, include the event callbacks in the props definition:
  ```javascript
  let { oncustomevent = () => {} } = $props();
  ```
- Use lowercase for HTML event attributes (like "onclick")
- Use descriptive names for event callbacks, prefixed with 'on', e.g., 'onsubmit', 'onchange', 'ondelete'

2.5. Two-way Binding:
- For properties marked with `$bindable()`, parents can use `bind:` directive:
  ```svelte
  <MyComponent bind:value={parentValue} />
  ```

## 3. Snippets

3.1. Defining and Using Snippets:
- IMPORTANT: Slots are deprecated in Svelte 5. Always use snippets instead of slots.
- Snippets are the new way to create reusable chunks of markup in Svelte 5.
- Define snippets using the `{#snippet ...}` syntax:
  ```svelte
  {#snippet mySnippet(param1, param2)}
    <!-- Snippet content here -->
  {/snippet}
  ```
- Render snippets using the `{@render ...}` syntax:
  ```svelte
  {@render mySnippet(arg1, arg2)}
  ```

3.2. Snippet Parameters:
- Snippets can have parameters, similar to function arguments:
  ```svelte
  {#snippet figure({ src, caption, width, height })}
    <figure>
      <img alt={caption} {src} {width} {height} />
      <figcaption>{caption}</figcaption>
    </figure>
  {/snippet}
  ```
- Use destructuring for clearer parameter definitions.

3.3. Snippet Scope:
- Snippets have access to the outer scope where they are defined.
- They are visible to siblings and their children in the same lexical scope.
- Avoid referencing variables from outside the snippet if possible, to maintain clarity.

3.4. Passing Snippets to Components:
- Pass snippets as props to components:
  ```svelte
  <MyComponent {mySnippet} />
  ```
- Snippets defined inside a component tag automatically become props. This is the preferred pattern to keep consistency with how slots were used.
  ```svelte
  <MyComponent>
    {#snippet header()}
      <h1>Header Content</h1>
    {/snippet}
  </MyComponent>
  ```

3.5. Default Content and the `children` Snippet:
- Non-snippet content inside a component becomes the `children` snippet:
  ```svelte
  <MyComponent>
    <p>This becomes the children snippet</p>
  </MyComponent>
  ```
- In the component, render it using:
  ```svelte
  {@render children()}
  ```

3.6. Snippet vs Slot Syntax:
- NEVER use slot syntax in Svelte 5 components:
  ```svelte
  <!-- DO NOT USE THIS -->
  <slot name="header"></slot>
  ```
- Always use snippet syntax instead:
  ```svelte
  <!-- Use this -->
  {@render header()}
  ```

3.7. Creating Snippets Programmatically:
- For advanced use cases, use `createRawSnippet`:
  ```javascript
  import { createRawSnippet } from 'svelte';
  const dynamicSnippet = createRawSnippet((param) => ({
    render: () => `<p>${param()}</p>`,
    setup: (node) => {
      $effect(() => {
        node.textContent = param();
      });
    }
  }));
  ```

Remember: Always use snippets for content projection in Svelte 5. Slots are deprecated and should not be used in new code or when updating components.
## 4. Component Communication

4.1. Parent to Child:
- Pass data and callbacks as props
- Use stores for shared state across components:
  ```javascript
  import { writable } from 'svelte/store';
  const sharedState = writable(initialValue);
  ```

4.2. Child to Parent:
- Use callback props for specific actions
- Use two-way binding when appropriate:
  ```svelte
  <input bind:value={inputValue} />
  ```

## 5. Styling

5.1. Tailwind CSS:
- Use Tailwind classes for consistent styling

5.2. Custom Styling:
- Provide a `class` prop for parent customization:
  ```svelte
  <div class={`base-class ${class}`}>
    <!-- Component content -->
  </div>
  ```

5.3. Theming:
- Use CSS custom properties for easy customization:
  ```css
  :root {
    --primary-color: #3490dc;
  }
  ```

## 6. Lifecycle and State Setup

6.1. onMount:
- Use `onMount` for initialization and setting up component state after the component is first rendered:
  ```javascript
  import { onMount } from 'svelte';

  let someState = $state(null);

  onMount(() => {
    // Initialize component state
    someState = new SomeStateManager();

    // Optional: Return a cleanup function
    return () => {
      // Cleanup code here
    };
  });
  ```
- `onMount` is the preferred method for one-time setup operations, such as initializing collections, setting up subscriptions, or fetching initial data.

6.2. onDestroy:
- Use `onDestroy` for cleanup when the component is removed:
  ```javascript
  import { onDestroy } from 'svelte';

  onDestroy(() => {
    // Cleanup code here, e.g., unsubscribing from events or stopping listeners
  });
  ```

6.3. $effect vs onMount:
- Use `$effect` for reactive computations that depend on state changes:
  ```javascript
  $effect(() => {
    // This runs whenever dependencies change
    console.log(`The count is now ${count}`);
  });
  ```
- Prefer `onMount` over `$effect` for initial setup that doesn't need to react to state changes:
  ```javascript
  // Incorrect usage of $effect for initialization
  $effect(() => {
    if (!someState) {
      someState = new SomeStateManager();
    }
  });

  // Correct usage with onMount
  onMount(() => {
    someState = new SomeStateManager();
  });
  ```

## 7. Imports and Module Organization

7.1. Component Imports:
- Always import Svelte components directly from their .svelte files:
  ```javascript
  // Correct
  import Button from '$lib/core/Button.svelte';
  import Input from '$lib/core/Input.svelte';
  
  // Incorrect - Do not use barrel imports
  import { Button, Input } from '$lib/core';
  ```
- Avoid using barrel imports (index.js) for Svelte components as it can cause issues with bundling and tree-shaking

7.2. Non-Component Imports:
- Use barrel imports (index.js) only for utility functions, constants, and other non-component exports:
  ```javascript
  // Correct for utilities
  import { formatDate, calculateTotal } from '$lib/utils';
  ```

7.3. Import Organization:
- Group imports by type:
  ```javascript
  // Framework imports
  import { onMount } from 'svelte';
  
  // Component imports
  import Button from '$lib/core/Button.svelte';
  import Input from '$lib/core/Input.svelte';
  
  // Utility imports
  import { formatDate } from '$lib/utils';
  ```

## 8. Best Practices

8.1. Composition:
- Favor composition over inheritance
- Create small, focused components

8.2. Performance:
- Use `{#key}` blocks for efficient updates:
  ```svelte
  {#key uniqueId}
    <ExpensiveComponent />
  {/key}
  ```

Remember: 
- Always use Svelte 5 syntax. Avoid Svelte 4 patterns like `export let prop;` or `$:` reactive statements. 
- Never use `createEventDispatcher`. It is deprecated in Svelte 5 and should not be used for component communication.
- Ensure you are not using React syntax or patterns, for example TSX or JSX - snippets are defined in the template.
- Use $bindable() for props that need to be reactive and can be bound by parent components.
- Use $state() for internal component state that doesn't need to be bound.
- For props that are functions (like event handlers), provide a default empty function.
- Slots are deprecated in Svelte 5, use snippets to pass template information into child components.
- Always use callback props for component events and communication.

8.7. Error Handling:
- Use try-catch blocks for async operations:
  ```javascript
  async function handleOperation() {
    try {
      await collection.createDocument(data);
    } catch (error) {
      console.error('Error creating document:', error);
      // Handle error (e.g., show user feedback)
    }
  }
  ```


# Async Operations in Svelte 5 Effects

## Important Rules

1. $effect rune functions CANNOT be async. This will break reactivity:
```javascript
// ❌ WRONG - async effect function
$effect(async () => {
  const data = await fetchData();
  result = data; // Reactivity broken
});
```

2. Variables referenced in async callbacks are not tracked for reactivity:
```javascript
// ❌ WRONG - changes to someValue won't trigger effect
$effect(() => {
  fetchData().then(() => {
    console.log(someValue); // Not reactive
  });
});
```

## Correct Patterns

### 1. State-Triggered Async Operations

Use a state variable to trigger the async operation, keeping the effect synchronous:

```javascript
let triggerFetch = $state(0);
let data = $state(null);
let error = $state(null);
let isLoading = $state(false);

// ✅ CORRECT - Synchronous effect that triggers async operation
$effect(() => {
  if (triggerFetch === 0) return;
  
  isLoading = true;
  error = null;
  
  fetchData()
    .then(result => {
      data = result;
      error = null;
    })
    .catch(err => {
      error = err.message;
      data = null;
    })
    .finally(() => {
      isLoading = false;
    });
});

// Trigger fetch by incrementing
function refresh() {
  triggerFetch++;
}
```

### 2. Dependency-Tracked Async Operations

When the async operation depends on reactive values:

```javascript
let query = $state('');
let results = $state([]);
let debouncedQuery = $state('');

// Track query changes
$effect(() => {
  const timeoutId = setTimeout(() => {
    debouncedQuery = query;
  }, 300);
  return () => clearTimeout(timeoutId);
});

// Perform search with tracked dependency
$effect(() => {
  if (!debouncedQuery) return;
  
  results = []; // Clear previous results
  
  searchApi(debouncedQuery)
    .then(newResults => {
      // Only update if query hasn't changed
      if (debouncedQuery === query) {
        results = newResults;
      }
    });
});
```

### 3. Async Initialization Pattern

For components that need async initialization:

```javascript
let isInitialized = $state(false);
let initError = $state(null);
let data = $state(null);

// Component initialization
onMount(() => {
  initializeAsync()
    .then(result => {
      data = result;
      isInitialized = true;
    })
    .catch(err => {
      initError = err.message;
    });
});

// Reactive effect depends on initialization
$effect(() => {
  if (!isInitialized) return;
  // Safe to use initialized data
  processData(data);
});
```

### 4. Async Queue Pattern

For handling sequences of async operations:

```javascript
class AsyncQueue {
  queue = $state([]);
  isProcessing = $state(false);
  
  add(operation) {
    this.queue = [...this.queue, operation];
  }
}

// In component:
let asyncQueue = $state(new AsyncQueue());

$effect(() => {
  if (asyncQueue.isProcessing || asyncQueue.queue.length === 0) return;
  
  asyncQueue.isProcessing = true;
  
  const operation = asyncQueue.queue[0];
  operation()
    .then(result => {
      // Handle success
      asyncQueue.queue = asyncQueue.queue.slice(1);
    })
    .catch(error => {
      // Handle error
    })
    .finally(() => {
      asyncQueue.isProcessing = false;
    });
});
```

### 5. Cleanup Pattern for Async Operations

Ensure proper cleanup of async operations:

```javascript
let isMounted = $state(true);

$effect(() => {
  if (!someCondition) return;
  
  // Set flag for component lifecycle
  const isCurrentOperation = { current: true };
  
  performAsync()
    .then(result => {
      // Only update state if component still mounted and operation is current
      if (isMounted && isCurrentOperation.current) {
        data = result;
      }
    });
    
  // Cleanup function
  return () => {
    isCurrentOperation.current = false;
  };
});

onDestroy(() => {
  isMounted = false;
});
```

## Best Practices

1. Always keep $effect functions synchronous
2. Use state variables to trigger and track async operations
3. Implement proper cleanup for async operations
4. Handle race conditions with flags or tokens
5. Consider using state machines for complex async flows
6. Use debouncing/throttling for frequent async operations
7. Handle component lifecycle with mounted/unmounted flags

## Common Pitfalls

1. Making effect functions async
2. Referencing reactive variables in async callbacks
3. Not handling component unmount during async operations
4. Missing cleanup for ongoing async operations
5. Not handling race conditions
6. Infinite loops from state updates in async callbacks

Remember: The key is to keep the $effect function itself synchronous while managing async operations through state changes and careful lifecycle handling.

