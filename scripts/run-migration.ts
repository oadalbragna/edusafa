import { runMigration } from './migrate-to-school-classes.ts';

runMigration().then(() => {
  console.log('Migration finished');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});