```markdown
# Xarid Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the Xarid TypeScript codebase. You'll learn about file naming, import/export styles, commit message standards, and how to write and run tests. The repository does not use a specific framework, focusing on idiomatic TypeScript practices.

## Coding Conventions

### File Naming
- All files use **kebab-case**.
  - Example:  
    ```
    user-service.ts
    order-handler.test.ts
    ```

### Imports
- Use **absolute imports** for all modules.
  - Example:
    ```typescript
    import { UserService } from 'services/user-service';
    ```

### Exports
- Use **named exports** exclusively.
  - Example:
    ```typescript
    // user-service.ts
    export function createUser() { ... }
    export function deleteUser() { ... }
    ```

### Commit Messages
- Follow **Conventional Commits** with the `feat` prefix for features.
- Average commit message length: ~73 characters.
  - Example:
    ```
    feat: add user authentication middleware for login endpoint
    ```

## Workflows

### Feature Development
**Trigger:** When adding a new feature  
**Command:** `/feature`

1. Create a new file in kebab-case for the feature.
2. Use absolute imports for dependencies.
3. Export all functions or classes as named exports.
4. Write or update tests in a corresponding `*.test.ts` file.
5. Commit changes using the `feat:` prefix and a descriptive message.

### Testing
**Trigger:** When verifying code correctness  
**Command:** `/test`

1. Locate or create a test file matching `*.test.ts`.
2. Write tests for your code (testing framework is unspecified).
3. Run the test suite using the project's test runner (see project docs or scripts).
4. Ensure all tests pass before committing.

## Testing Patterns

- Test files follow the `*.test.ts` pattern.
- Place tests alongside the code they cover or in a dedicated test directory.
- Testing framework is not specified; follow project-specific instructions.
- Example test file:
  ```typescript
  // user-service.test.ts
  import { createUser } from 'services/user-service';

  describe('createUser', () => {
    it('should create a user with valid data', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command    | Purpose                                      |
|------------|----------------------------------------------|
| /feature   | Start a new feature development workflow     |
| /test      | Run or write tests for the codebase          |
```
