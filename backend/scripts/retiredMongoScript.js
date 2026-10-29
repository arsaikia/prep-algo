throw new Error(
    'This MongoDB maintenance script is retired after the PostgreSQL cutover. '
    + 'Use db:migrate and db:import-mongo; see docs/POSTGRES_MIGRATION.md. '
    + 'No database changes were made.',
);
