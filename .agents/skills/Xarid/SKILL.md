```markdown
# Xarid Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the Xarid TypeScript codebase. You'll learn how to structure files, write imports and exports, follow commit message guidelines, and understand the project's testing approach. These patterns ensure consistency and maintainability across the project.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userService.ts`, `orderProcessor.test.ts`

### Import Style
- Use **alias imports** to reference modules.
  - Example:
    ```typescript
    import { fetchOrders } from 'services/orderService';
    ```

### Export Style
- Use **named exports** for all modules.
  - Example:
    ```typescript
    // In userService.ts
    export function getUser(id: string) { ... }
    export const USER_ROLE = 'admin';
    ```

### Commit Messages
- Follow the **conventional commit** style.
- Use the `feat` prefix for new features.
- Keep commit messages concise (average ~55 characters).
  - Example:
    ```
    feat: add order cancellation endpoint
    ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature or module  
**Command:** `/feature`

1. Create a new file using camelCase naming.
2. Write your code using named exports.
3. Import dependencies using alias imports.
4. Write corresponding tests in a `.test.ts` file.
5. Commit changes with a conventional commit message using the `feat` prefix.

### Writing Tests
**Trigger:** When adding or updating functionality  
**Command:** `/test`

1. Create a test file named with the pattern `*.test.ts` (e.g., `userService.test.ts`).
2. Write tests for each exported function or constant.
3. Use the project's preferred (unknown) testing framework.
4. Run tests to ensure correctness before committing.

### Committing Changes
**Trigger:** When ready to save your work  
**Command:** `/commit`

1. Stage your changes.
2. Write a commit message using the conventional format:
    - Prefix: `feat`
    - Short, descriptive message (max ~55 chars)
    - Example: `feat: implement user authentication`
3. Commit your changes.

## Testing Patterns

- Test files follow the `*.test.ts` pattern and are placed alongside or near the code they test.
- Each exported function or constant should have corresponding tests.
- The specific testing framework is not defined; follow standard TypeScript testing practices.

## Commands
| Command    | Purpose                                         |
|------------|-------------------------------------------------|
| /feature   | Start a new feature using Xarid conventions     |
| /test      | Create and run tests for your code              |
| /commit    | Commit changes using the conventional format    |
```
