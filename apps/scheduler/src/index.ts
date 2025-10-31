import cron from 'node-cron';
import { executeDcaStrategies } from './executor';
import {config} from "dotenv";

config()

const dcaCronJob = cron.schedule('* * * * *', async () => {
  await executeDcaStrategies();
});

console.log(`[DCA Executor] 🚀 DCA execution cron job started`);
console.log(`[DCA Executor] Schedule: Every minute (* * * * *)`);
console.log(`[DCA Executor] Monitoring for executable strategies...\n`);

process.on('SIGTERM', () => {
  console.log(`[DCA Executor] 🛑 Stopping DCA cron job...`);
  dcaCronJob.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[DCA Executor] 🛑 Stopping DCA cron job...`);
  dcaCronJob.stop();
  process.exit(0);
});

export default dcaCronJob;
