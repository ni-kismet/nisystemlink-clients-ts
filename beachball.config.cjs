/** @type {import('beachball').BeachballConfig} */
module.exports = {
  access: 'public',
  branch: 'origin/main',
  registry: 'https://registry.npmjs.org',
  changelog: {
    groups: [
      {
        masterPackageName: '@ni/systemlink-clients-ts',
        changelogPath: '.',
        include: ['*'],
      },
    ],
  },
  ignorePatterns: [
    'test-app/**',
    'scripts/**',
    '.github/**',
    '*.test.ts',
    '.env*',
  ],
};
