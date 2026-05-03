const { execFileSync } = require('child_process');

const sensitivePatterns = [
  /^\.env$/,
  /^\.env\.(?!example$)/,
  /(^|\/)database\.db$/,
  /(^|\/)cookies.*\.txt$/,
  /(^|\/)logs?\//,
];

const trackedFiles = execFileSync('git', ['ls-files'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const trackedSensitiveFiles = trackedFiles.filter(file =>
  sensitivePatterns.some(pattern => pattern.test(file))
);

if (trackedSensitiveFiles.length > 0) {
  console.error('Tracked sensitive/local files found:');
  for (const file of trackedSensitiveFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('No tracked sensitive/local files found.');
