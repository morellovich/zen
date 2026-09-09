import nx from '@nx/eslint-plugin';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Architectural dependency constraints.
 *
 * Layering (a project may only import projects tagged with the listed types):
 *   type:app / type:api  → feature, ui, data-access, util
 *   type:feature         → feature, ui, data-access, util
 *   type:ui              → ui, util
 *   type:data-access     → data-access, util
 *   type:util            → util
 *   type:e2e             → app, api, feature, ui, data-access, util
 *
 * Scope isolation:
 *   scope:frontend ↔ scope:backend are mutually exclusive; scope:shared is open to both.
 */
const depConstraints = [
  {
    sourceTag: 'scope:frontend',
    onlyDependOnLibsWithTags: ['scope:frontend', 'scope:shared'],
  },
  {
    sourceTag: 'scope:backend',
    onlyDependOnLibsWithTags: ['scope:backend', 'scope:shared'],
  },
  {
    sourceTag: 'scope:shared',
    onlyDependOnLibsWithTags: ['scope:shared'],
  },
  {
    sourceTag: 'type:app',
    onlyDependOnLibsWithTags: [
      'type:feature',
      'type:ui',
      'type:data-access',
      'type:util',
    ],
  },
  {
    sourceTag: 'type:api',
    onlyDependOnLibsWithTags: ['type:feature', 'type:data-access', 'type:util'],
  },
  {
    sourceTag: 'type:feature',
    onlyDependOnLibsWithTags: [
      'type:feature',
      'type:ui',
      'type:data-access',
      'type:util',
    ],
  },
  {
    sourceTag: 'type:ui',
    onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
  },
  {
    sourceTag: 'type:data-access',
    onlyDependOnLibsWithTags: ['type:data-access', 'type:util'],
  },
  {
    sourceTag: 'type:util',
    onlyDependOnLibsWithTags: ['type:util'],
  },
  {
    sourceTag: 'type:e2e',
    onlyDependOnLibsWithTags: [
      'type:app',
      'type:api',
      'type:feature',
      'type:ui',
      'type:data-access',
      'type:util',
    ],
  },
];

export default [
  // Global ignore list for generated, build, and internal tooling paths
  {
    ignores: [
      '**/dist',
      '**/coverage',
      '**/.nx',
      '**/.angular',
      '**/node_modules',
      '**/build',
      '**/generated',
      'apps/api/src/app/prisma/generated',
      'apps/api/src/app/graphql/resolversTypes.ts',
      'libs/graphql/src/lib/apollo-angular.ts',
      '**/.zenstack',
      '**/zenstack/migrations',
    ],
  },

  // JSON files
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
    rules: {},
  },

  // Base Nx flat configs
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],

  // Workspace-wide architectural module boundaries
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints,
        },
      ],
    },
  },

  // Global TypeScript / JavaScript rules & Best Practices
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
      ],
    },
  },

  // Angular TypeScript rules (Web app + Angular libs)
  ...angular.configs.tsRecommended.map((config) => ({
    ...config,
    files: [
      'apps/portal/**/*.ts',
      'libs/auth/**/*.ts',
      'libs/components/**/*.ts',
      'libs/main/**/*.ts',
      'libs/graphql/**/*.ts',
    ],
  })),
  {
    files: [
      'apps/portal/**/*.ts',
      'libs/auth/**/*.ts',
      'libs/components/**/*.ts',
      'libs/main/**/*.ts',
      'libs/graphql/**/*.ts',
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'zen',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'zen',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/directive-class-suffix': 'error',
      '@angular-eslint/pipe-prefix': [
        'error',
        {
          prefixes: ['zen'],
        },
      ],
      '@angular-eslint/use-pipe-transform-interface': 'error',
      '@angular-eslint/contextual-lifecycle': 'error',
      '@angular-eslint/no-async-lifecycle-method': 'error',
      '@angular-eslint/no-lifecycle-call': 'error',
      '@angular-eslint/no-duplicates-in-metadata-arrays': 'error',
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/use-lifecycle-interface': 'warn',
      '@angular-eslint/no-input-rename': 'warn',
      '@angular-eslint/no-output-rename': 'warn',
      '@angular-eslint/no-output-on-prefix': 'warn',
      '@angular-eslint/no-output-native': 'warn',
      '@angular-eslint/prefer-output-readonly': 'warn',
      '@angular-eslint/prefer-standalone': 'warn',
    },
  },

  // Angular HTML template rules & Accessibility (A11y)
  ...angular.configs.templateRecommended.map((config) => ({
    ...config,
    files: [
      'apps/portal/**/*.html',
      'libs/auth/**/*.html',
      'libs/components/**/*.html',
      'libs/main/**/*.html',
    ],
  })),
  ...angular.configs.templateAccessibility.map((config) => ({
    ...config,
    files: [
      'apps/portal/**/*.html',
      'libs/auth/**/*.html',
      'libs/components/**/*.html',
      'libs/main/**/*.html',
    ],
  })),
  {
    files: [
      'apps/portal/**/*.html',
      'libs/auth/**/*.html',
      'libs/components/**/*.html',
      'libs/main/**/*.html',
    ],
    rules: {
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/no-distracting-elements': 'error',
      '@angular-eslint/template/button-has-type': 'warn',
      '@angular-eslint/template/alt-text': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/table-scope': 'warn',
      '@angular-eslint/template/elements-content': 'warn',
      '@angular-eslint/template/eqeqeq': 'warn',
      '@angular-eslint/template/prefer-control-flow': 'warn',
      '@angular-eslint/template/prefer-self-closing-tags': 'warn',
    },
  },

  // Backend / NestJS rules
  {
    files: ['apps/api/**/*.ts', 'libs/nest-auth/**/*.ts'],
    rules: {
      // NestJS DI relies on runtime class types in decorators & constructors
    },
  },

  // Prettier integration (must be last to turn off conflicting styling rules)
  prettier,
];
