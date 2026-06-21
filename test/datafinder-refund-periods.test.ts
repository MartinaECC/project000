import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('DataFinder refund script computes midnight periods as yesterday full day', async () => {
  const code = String.raw`
import importlib.util
import json
import os
import sys
import types

sys.modules["rangersdk"] = types.SimpleNamespace(RangersClient=object)
os.environ["REFUND_REPORT_NOW_ISO"] = "2026-06-20T16:02:27.000Z"
spec = importlib.util.spec_from_file_location("datafinder_refund_report", "scripts/datafinder_refund_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
periods = module.report_periods("Asia/Shanghai")
print(json.dumps({name: {key: value.isoformat() for key, value in period.items()} for name, period in periods.items()}))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });

  assert.deepEqual(JSON.parse(stdout), {
    current: {
      start: '2026-06-20T00:00:00+08:00',
      end: '2026-06-21T00:00:00+08:00'
    },
    baseline: {
      start: '2026-06-19T00:00:00+08:00',
      end: '2026-06-20T00:00:00+08:00'
    }
  });
});

test('DataFinder refund script computes non-midnight periods as yesterday same-hour window', async () => {
  const code = String.raw`
import importlib.util
import json
import os
import sys
import types

sys.modules["rangersdk"] = types.SimpleNamespace(RangersClient=object)
os.environ["REFUND_REPORT_NOW_ISO"] = "2026-06-21T01:07:00.000Z"
spec = importlib.util.spec_from_file_location("datafinder_refund_report", "scripts/datafinder_refund_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
periods = module.report_periods("Asia/Shanghai")
print(json.dumps({name: {key: value.isoformat() for key, value in period.items()} for name, period in periods.items()}))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });

  assert.deepEqual(JSON.parse(stdout), {
    current: {
      start: '2026-06-21T00:00:00+08:00',
      end: '2026-06-21T09:00:00+08:00'
    },
    baseline: {
      start: '2026-06-20T00:00:00+08:00',
      end: '2026-06-20T09:00:00+08:00'
    }
  });
});

test('DataFinder refund script uses hour granularity for same-hour windows and day granularity for full-day windows', async () => {
  const code = String.raw`
import importlib.util
import json
import sys
import types
from datetime import datetime
from zoneinfo import ZoneInfo

sys.modules["rangersdk"] = types.SimpleNamespace(RangersClient=object)
spec = importlib.util.spec_from_file_location("datafinder_refund_report", "scripts/datafinder_refund_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Response:
    def json(self):
        return {"data": []}

class Client:
    def __init__(self):
        self.bodies = []
    def data_finder(self, path, method, body):
        self.bodies.append(json.loads(body))
        return Response()

tz = ZoneInfo("Asia/Shanghai")
client = Client()
module.query_amount_groups(
    client,
    "123",
    module.INCOME_EVENT,
    datetime(2026, 6, 20, 0, 0, 0, tzinfo=tz),
    datetime(2026, 6, 20, 9, 0, 0, tzinfo=tz),
    "Asia/Shanghai",
)
module.query_amount_groups(
    client,
    "123",
    module.INCOME_EVENT,
    datetime(2026, 6, 20, 0, 0, 0, tzinfo=tz),
    datetime(2026, 6, 21, 0, 0, 0, tzinfo=tz),
    "Asia/Shanghai",
)
print(json.dumps([body["periods"][0]["granularity"] for body in client.bodies]))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });

  assert.deepEqual(JSON.parse(stdout), ['hour', 'day']);
});

test('DataFinder refund script sums hourly bucket counts from response data arrays', async () => {
  const code = String.raw`
import importlib.util
import json
import sys
import types

sys.modules["rangersdk"] = types.SimpleNamespace(RangersClient=object)
spec = importlib.util.spec_from_file_location("datafinder_refund_report", "scripts/datafinder_refund_report.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(json.dumps({
    "hourly": module.extract_count({"data": [1, "2", 3.5, None]}),
    "empty": module.extract_count({"data": [None]})
}))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });

  assert.deepEqual(JSON.parse(stdout), { hourly: 6.5, empty: null });
});
