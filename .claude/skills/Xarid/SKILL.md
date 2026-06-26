```markdown
# Xarid Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development conventions and workflows used in the Xarid TypeScript codebase. You'll learn the repository's coding style, commit message patterns, file organization, and testing approaches, enabling you to contribute code that fits seamlessly with the project's standards.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userService.ts`, `orderManager.ts`

### Import Style
- Use **alias imports** for modules.
  - Example:
    ```typescript
    import { fetchData as getData } from './apiClient';
    ```

### Export Style
- Use **named exports**.
  - Example:
    ```typescript
    // In userService.ts
    export function createUser() { ... }
    export function deleteUser() { ... }
    ```

### Commit Messages
- Follow **conventional commits** with the `feat` prefix for new features.
  - Example:
    ```
    feat: add user authentication middleware
    ```
- Average commit message length is ~65 characters.

## Workflows

### Feature Development
**Trigger:** When adding a new feature  
**Command:** `/feature`

1. Create a new branch for your feature.
2. Implement the feature using camelCase file naming, alias imports, and named exports.
3. Write or update tests in files matching `*.test.*`.
4. Commit changes using the `feat` prefix and a descriptive message.
5. Open a pull request for review.

### Testing
**Trigger:** When writing or running tests  
**Command:** `/test`

1. Create or update test files using the `*.test.*` pattern.
2. Ensure tests cover new or changed code.
3. Run the test suite using the project's test runner (framework unknown; check project scripts).
4. Fix any failing tests before committing.

## Testing Patterns

- Test files use the `*.test.*` naming pattern (e.g., `userService.test.ts`).
- The testing framework is not specified; check project scripts or documentation for details.
- Place tests alongside the code they test or in a dedicated `tests` directory if present.

  Example:
  ```typescript
  // userService.test.ts
  import { createUser } from './userService';

  describe('createUser', () => {
    it('should create a user with valid data', () => {
      // test implementation
    });
  });
  ```

## Commands
| Command     | Purpose                                 |
|-------------|-----------------------------------------|
| /feature    | Start a new feature development workflow |
| /test       | Run or write tests                      |
```
