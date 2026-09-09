# Workspace Linting, Styling & Architecture Conventions

This document outlines the linting rules, architectural boundaries, and coding standards enforced across the **Zen** monorepo (**Angular 22** frontend, **NestJS 11** backend, and **Nx 23** monorepo).

---

## 1. Architectural Boundaries (`@nx/enforce-module-boundaries`)

Every application and library in the workspace is assigned two types of tags in its `project.json`:
1. **`scope:*`** (`scope:frontend`, `scope:backend`, `scope:shared`)
2. **`type:*`** (`type:app`, `type:api`, `type:feature`, `type:ui`, `type:data-access`, `type:util`, `type:e2e`)

### Isolation Rules
* **Frontend vs. Backend Isolation**:
  * `scope:frontend` can only import from `scope:frontend` and `scope:shared`.
  * `scope:backend` can only import from `scope:backend` and `scope:shared`.
  * `scope:shared` cannot import from `scope:frontend` or `scope:backend`.
* **Layering Constraints**:
  * `type:app` / `type:api` $\rightarrow$ `feature`, `ui`, `data-access`, `util`
  * `type:feature` $\rightarrow$ `feature`, `ui`, `data-access`, `util`
  * `type:ui` $\rightarrow$ `ui`, `util`
  * `type:data-access` $\rightarrow$ `data-access`, `util`
  * `type:util` $\rightarrow$ `util`
  * `type:e2e` $\rightarrow$ `app`, `api`, `feature`, `ui`, `data-access`, `util`

---

## 2. Active ESLint Rules

### A. Frontend: Angular 22 & HTML Templates

#### Component & Directive Selectors
* `@angular-eslint/component-selector`: Element selector with `prefix: 'zen'`, `style: 'kebab-case'` (e.g. `<zen-login>`).
* `@angular-eslint/directive-selector`: Attribute selector with `prefix: 'zen'`, `style: 'camelCase'` (e.g. `[zenTooltip]`).
* `@angular-eslint/component-class-suffix`: Component classes must end in `Component`.
* `@angular-eslint/directive-class-suffix`: Directive classes must end in `Directive`.
* `@angular-eslint/pipe-prefix`: Pipe names must start with `zen`.
* `@angular-eslint/use-pipe-transform-interface`: Pipes must implement `PipeTransform`.

#### Lifecycle & Class Structure
* `@angular-eslint/no-empty-lifecycle-method`: Disallows empty lifecycle hooks (`ngOnInit`, `ngOnDestroy`).
* `@angular-eslint/use-lifecycle-interface`: Requires classes using lifecycle methods to declare `implements OnInit`, `implements OnDestroy`, etc.
* `@angular-eslint/contextual-lifecycle`: Lifecycle hooks must only be defined within components/directives.
* `@angular-eslint/no-async-lifecycle-method`: Lifecycle hooks should not be `async`.
* `@angular-eslint/no-lifecycle-call`: Disallows calling lifecycle methods manually.
* `@angular-eslint/no-duplicates-in-metadata-arrays`: Disallows duplicate entries in `@Component({ imports: [...] })`.

#### Inputs & Outputs
* `@angular-eslint/no-input-rename`: Disallows renaming inputs unless matching directive attribute selector.
* `@angular-eslint/no-output-rename`: Disallows renaming output event emitters.
* `@angular-eslint/no-output-on-prefix`: Disallows naming outputs with `on*` (e.g. use `change` instead of `onChange`).
* `@angular-eslint/no-output-native`: Disallows naming outputs after native DOM events (`click`, `blur`).
* `@angular-eslint/prefer-output-readonly`: Requires outputs to be declared `readonly` (`readonly changed = output<string>();`).
* `@angular-eslint/prefer-standalone`: Encourages standalone components across the codebase.

#### HTML Template Quality & Accessibility (A11y)
* `@angular-eslint/template/no-duplicate-attributes`: Disallows duplicate attributes on HTML tags.
* `@angular-eslint/template/no-negated-async`: Disallows `!async` syntax traps.
* `@angular-eslint/template/no-distracting-elements`: Disallows `<marquee>` and `<blink>`.
* `@angular-eslint/template/button-has-type`: Requires `<button>` tags to specify `type="button"`, `type="submit"`, or `type="reset"`.
* `@angular-eslint/template/alt-text`: Requires images and area elements to provide `alt` text.
* `@angular-eslint/template/click-events-have-key-events`: Click handlers on non-interactive elements must provide keyboard event bindings.
* `@angular-eslint/template/interactive-supports-focus`: Interactive elements must be focusable.
* `@angular-eslint/template/label-has-associated-control`: `<label>` elements must associate with an input control.
* `@angular-eslint/template/table-scope`: `<th>` elements must provide `scope="col"` or `scope="row"`.
* `@angular-eslint/template/elements-content`: Buttons and anchor links must provide descriptive text or aria-labels.
* `@angular-eslint/template/prefer-control-flow`: Encourages built-in `@if`, `@for`, and `@switch` syntax.
* `@angular-eslint/template/prefer-self-closing-tags`: Encourages `<zen-component />` self-closing syntax.

---

## 3. Backend Conventions & Non-Lintable Best Practices

Some architectural best practices cannot be fully verified via standard static linting and require team conventions or typed CI checks:

### A. NestJS Dependency Injection & Decorator Metadata
> **Critical Rule**: In NestJS, runtime dependency injection relies on TypeScript's `emitDecoratorMetadata`.
> **Do NOT use `import type` for injected services** in constructor parameters (e.g., `constructor(private authService: AuthService)`). Using `import type` will strip the runtime reference and cause NestJS to throw an `UnknownDependenciesException` at runtime.

### B. Asynchronous Operations & Database Safety
* **Avoid Floating Promises**: Always `await` or `return` promises in controllers, resolvers, and service methods to ensure unhandled Prisma rejections or Fastify network timeouts are caught.
* **Prisma Query Execution**: Database queries in resolvers/services should always be wrapped in proper try/catch blocks or allowed to bubble into NestJS exception filters.

### C. File & Class Suffix Naming Conventions
Follow the NestJS standard file suffix conventions:
* Controllers: `*.controller.ts` $\rightarrow$ `export class [Name]Controller`
* GraphQL Resolvers: `*.resolver.ts` $\rightarrow$ `export class [Name]Resolver`
* Services: `*.service.ts` $\rightarrow$ `export class [Name]Service`
* Modules: `*.module.ts` $\rightarrow$ `export class [Name]Module`
* Guards: `*.guard.ts` $\rightarrow$ `export class [Name]Guard`
* Strategies: `*.strategy.ts` $\rightarrow$ `export class [Name]Strategy`
* DTOs / Inputs: `*.dto.ts` / `*.input.ts` $\rightarrow$ `export class [Name]Dto` / `export class [Name]Input`

### D. Input Validation & Exception Handling
* **DTO Validation**: Decorate all incoming request fields with `class-validator` decorators (`@IsString()`, `@IsOptional()`, `@IsEmail()`, etc.).
* **Exception Hierarchy**: Use standard NestJS HTTP exceptions (`BadRequestException`, `NotFoundException`, `UnauthorizedException`, `ForbiddenException`) instead of generic `throw new Error()`.
