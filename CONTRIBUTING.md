# Contributing to SkiPay

Thank you for your interest in contributing to SkiPay! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions. We aim to create a welcoming environment for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/skipay.git
   cd skipay
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Set up your development environment** following [QUICKSTART.md](./QUICKSTART.md)

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `feature/your-feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/description` - Documentation updates

Create a new branch for your work:
```bash
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Make your changes** in your feature branch
2. **Follow the code style** (see below)
3. **Write tests** for new functionality
4. **Update documentation** if needed
5. **Test thoroughly**:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

### Code Style

We use ESLint and Prettier to enforce code style:

```bash
# Lint code
pnpm lint

# Format code
pnpm format
```

**TypeScript Guidelines:**
- Use explicit types for function parameters and return values
- Prefer `interface` for object types, `type` for unions/intersections
- Use strict mode (already configured)
- Avoid `any` - use `unknown` or proper types

**Naming Conventions:**
- Files: PascalCase for classes/components, kebab-case for utilities
- Components: PascalCase (e.g., `GameEngine.tsx`)
- Variables/functions: camelCase (e.g., `handleInput`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_SPEED`)
- Database: snake_case (e.g., `user_id`)

**React Guidelines:**
- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components focused and small
- Use TypeScript for all props

**Server Guidelines:**
- Validate all inputs with Zod schemas
- Use Fastify's error handling patterns
- Log important events with Pino
- Keep routes simple, move logic to services/utilities

### Testing

We use Vitest for unit and integration tests.

**Write tests for:**
- All new features
- Bug fixes (write a failing test first)
- Complex logic (physics, PRNG, etc.)

**Running tests:**
```bash
# Run all tests
pnpm test

# Run with UI
pnpm --filter @skipay/server test:ui

# Run with coverage
pnpm --filter @skipay/server test:coverage
```

**Test guidelines:**
- Write clear test descriptions
- Test both success and error cases
- Mock external dependencies (database, WebSocket, etc.)
- Keep tests fast and isolated

### Committing Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add yeti chase mechanic"

# Bug fixes
git commit -m "fix: prevent collision detection false positives"

# Documentation
git commit -m "docs: update deployment guide for Railway"

# Refactoring
git commit -m "refactor: extract physics validation to separate function"

# Tests
git commit -m "test: add tests for map generator"

# Chores
git commit -m "chore: update dependencies"
```

**Commit message format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, missing semicolons, etc.)
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Submitting a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Reference any related issues (e.g., "Fixes #123")
   - Describe what changed and why
   - Include screenshots/videos for UI changes
   - List any breaking changes

3. **Wait for review**:
   - Address any feedback
   - Make requested changes
   - Push updates to your branch

4. **After approval**:
   - Squash commits if requested
   - Wait for maintainer to merge

## Types of Contributions

### Bug Reports

Found a bug? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment details (OS, browser, Node version)

### Feature Requests

Have an idea? Open an issue with:
- Clear description of the feature
- Use cases and motivation
- Possible implementation approach
- Any alternatives considered

### Documentation

Improvements to documentation are always welcome:
- Fix typos or unclear wording
- Add examples
- Improve setup instructions
- Translate to other languages

### Code Contributions

See the [Development Workflow](#development-workflow) section above.

## Project Structure

```
skipay/
├── packages/shared/    # Shared types and schemas
├── apps/server/        # Backend (Fastify + WebSocket)
├── apps/client/        # Frontend (React + Canvas)
├── .github/            # GitHub Actions workflows
└── docs/               # Documentation
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture.

## Areas Needing Help

Good places to start:
- [ ] Writing tests (coverage is low)
- [ ] Improving documentation
- [ ] Adding new obstacle types
- [ ] Creating new cosmetics
- [ ] Optimizing physics performance
- [ ] Mobile touch controls improvements
- [ ] Accessibility improvements
- [ ] Internationalization (i18n)

Check issues labeled `good first issue` or `help wanted`.

## Questions?

- Read the docs: README.md, ARCHITECTURE.md, PROTOCOL.md
- Check existing issues
- Ask in discussions (if enabled)
- Reach out to maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SkiPay! 🎿
