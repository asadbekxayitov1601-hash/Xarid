```markdown
# Xarid Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the Xarid repository, a TypeScript codebase built with Next.js. You'll learn how to structure files, write and organize code, follow commit message conventions, and understand the testing approach. This guide helps maintain consistency and efficiency when contributing to Xarid.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `orderService.tsx`

### Import Style
- Use **alias imports** for modules.
  - Example:
    ```typescript
    import { getUser } from '@/services/userService';
    ```

### Export Style
- Both **named** and **default** exports are used.
  - Named export:
    ```typescript
    export function calculateTotal() { ... }
    ```
  - Default export:
    ```typescript
    export default CheckoutPage;
    ```

### Commit Messages
- Follow the **Conventional Commits** format.
- Use the `feat` prefix for new features.
- Keep messages concise (average: 79 characters).
  - Example:
    ```
    feat: add user authentication flow
    ```

## Workflows

### Creating a New Feature
**Trigger:** When adding a new feature to the codebase  
**Command:** `/new-feature`

1. Create a new file using camelCase naming.
2. Implement the feature using TypeScript and Next.js conventions.
3. Import dependencies using alias imports.
4. Export your component or function as needed (named or default).
5. Write a test file named `featureName.test.ts`.
6. Commit your changes using the `feat` prefix and a concise message.

### Refactoring Code
**Trigger:** When improving or restructuring existing code  
**Command:** `/refactor`

1. Identify the code to refactor.
2. Update file and variable names to follow camelCase if needed.
3. Adjust imports to use aliases.
4. Ensure exports are consistent (named/default as appropriate).
5. Update or add tests if necessary.
6. Commit with a clear message, e.g., `refactor: improve order calculation logic`.

## Testing Patterns

- Test files follow the pattern: `*.test.*` (e.g., `cart.test.ts`).
- The specific testing framework is not detected, but standard TypeScript/Next.js testing practices are assumed.
- Place test files alongside the modules they test or in a dedicated `__tests__` directory.
- Example test file:
  ```typescript
  // cart.test.ts
  import { calculateTotal } from '@/services/cartService';

  test('calculates total correctly', () => {
    expect(calculateTotal([10, 20])).toBe(30);
  });
  ```

## Commands
| Command         | Purpose                                  |
|-----------------|------------------------------------------|
| /new-feature    | Scaffold and commit a new feature        |
| /refactor       | Guide for refactoring existing code      |
```
