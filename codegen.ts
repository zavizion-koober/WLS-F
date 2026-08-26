import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: 'src/**/*.graphql',
  generates: {
    './schema.graphql': {
      plugins: ['schema-ast'],
    },
    './src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-apollo-angular'],
      config: {
        scalars: {
          DateTime: 'string',
        },
      },
    },
  },
};

export default config;
