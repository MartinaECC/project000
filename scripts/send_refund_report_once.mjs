import { runRefundReportOnceFromEnv } from '../src/refund-report-runner.ts';

try {
  await runRefundReportOnceFromEnv({
    log(record) {
      console.log(JSON.stringify(record));
    }
  });
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      event: 'refund_report.once.failed',
      errorName: error instanceof Error ? error.name : 'Error',
      errorMessage: error instanceof Error ? error.message : String(error)
    })
  );
  throw error;
}
