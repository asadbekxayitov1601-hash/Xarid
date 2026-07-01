```markdown
# Xarid Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the Xarid TypeScript codebase. It covers file naming, import/export styles, commit message conventions, and testing patterns. While no frameworks or automated workflows were detected, this guide provides best practices and suggested commands to streamline development.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userService.ts`, `orderProcessor.test.ts`

### Import Style
- Use **alias imports** for modules.
  - Example:
    ```typescript
    import utils from '@/utils';
    ```

### Export Style
- Use **default exports** for modules.
  - Example:
    ```typescript
    const userService = { /* ... */ };
    export default userService;
    ```

### Commit Messages
- Follow **conventional commit** format.
- Prefixes: `feat` (features), `fix` (bug fixes).
- Example:
  ```
  feat: add user authentication module
  fix: correct order total calculation
  ```

## Workflows

### Commit Changes
**Trigger:** When you have completed a feature or bug fix  
**Command:** `/commit`

1. Stage your changes:
   ```
   git add .
   ```
2. Write a conventional commit message:
   ```
   git commit -m "feat: implement payment gateway integration"
   ```
3. Push your changes:
   ```
   git push
   ```

### Write and Run Tests
**Trigger:** When adding or modifying code  
**Command:** `/test`

1. Create a test file matching the pattern `*.test.ts`.
2. Write your tests using the project's preferred (unknown) testing framework.
3. Run tests (replace `<test-runner>` with the actual command):
   ```
   <test-runner> *.test.ts
   ```

## Testing Patterns

- Test files are named using the pattern: `*.test.ts`
- Place test files alongside the modules they test or in a dedicated `tests` directory.
- Example test file name: `orderProcessor.test.ts`
- Testing framework is not specified; ensure to follow any project-specific guidelines once identified.

## Commands
| Command   | Purpose                                   |
|-----------|-------------------------------------------|
| /commit   | Commit changes using conventional commits  |
| /test     | Run all test files matching `*.test.ts`    |
```
