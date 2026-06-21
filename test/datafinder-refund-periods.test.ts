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
    },
    previousFullDay: {
      start: '2026-06-19T00:00:00+08:00',
      end: '2026-06-20T00:00:00+08:00'
    },
    yesterdayFullDay: {
      start: '2026-06-20T00:00:00+08:00',
      end: '2026-06-21T00:00:00+08:00'
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
    },
    previousFullDay: {
      start: '2026-06-19T00:00:00+08:00',
      end: '2026-06-20T00:00:00+08:00'
    },
    yesterdayFullDay: {
      start: '2026-06-20T00:00:00+08:00',
      end: '2026-06-21T00:00:00+08:00'
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
module.query_amount_sum_groups(
    client,
    "123",
    module.INCOME_EVENT,
    datetime(2026, 6, 20, 0, 0, 0, tzinfo=tz),
    datetime(2026, 6, 20, 9, 0, 0, tzinfo=tz),
    "Asia/Shanghai",
)
module.query_amount_sum_groups(
    client,
    "123",
    module.INCOME_EVENT,
    datetime(2026, 6, 20, 0, 0, 0, tzinfo=tz),
    datetime(2026, 6, 21, 0, 0, 0, tzinfo=tz),
    "Asia/Shanghai",
)
print(json.dumps([
    {
        "granularity": body["periods"][0]["granularity"],
        "range": body["periods"][0]["range"],
    }
    for body in client.bodies
]))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });

  const periods = JSON.parse(stdout);

  assert.deepEqual(
    periods.map((period: { granularity: string }) => period.granularity),
    ['hour', 'day']
  );
  assert.equal(periods[1].range[0], periods[1].range[1]);
});

test('DataFinder refund script queries displayed full-day periods as a single DataFinder day', async () => {
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
module.load_period_data(
    client,
    "123",
    {
        "start": datetime(2026, 6, 19, 0, 0, 0, tzinfo=tz),
        "end": datetime(2026, 6, 20, 0, 0, 0, tzinfo=tz),
    },
    "Asia/Shanghai",
)
print(json.dumps([
    {
        "granularity": body["periods"][0]["granularity"],
        "range": body["periods"][0]["range"],
    }
    for body in client.bodies
]))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });
  const periods = JSON.parse(stdout);

  assert.equal(periods.length, 5);
  for (const period of periods) {
    assert.equal(period.granularity, 'day');
    assert.equal(period.range[0], period.range[1]);
  }
});

test('DataFinder refund script queries amount with measure sum grouped only by company', async () => {
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
module.query_amount_sum_groups(
    client,
    "123",
    module.INCOME_EVENT,
    datetime(2026, 6, 20, 0, 0, 0, tzinfo=tz),
    datetime(2026, 6, 20, 9, 0, 0, tzinfo=tz),
    "Asia/Shanghai",
)
query = client.bodies[0]["content"]["queries"][0][0]
print(json.dumps({
    "groups": query["groups_v2"],
    "eventIndicator": query["event_indicator"],
    "measureInfo": query["measure_info"],
}, ensure_ascii=False))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });
  const query = JSON.parse(stdout);

  assert.equal(query.groups.length, 1);
  assert.equal(query.groups[0].property_name, '$_vp_alis_name');
  assert.equal(query.eventIndicator, 'measure');
  assert.deepEqual(query.measureInfo, {
    measure_type: 'sum',
    property_name: 'amount',
    property_type: 'event_param'
  });
});

test('DataFinder refund script queries counts with events grouped by company', async () => {
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
module.query_count_groups(
    client,
    "123",
    module.INCOME_EVENT,
    datetime(2026, 6, 20, 0, 0, 0, tzinfo=tz),
    datetime(2026, 6, 20, 9, 0, 0, tzinfo=tz),
    "Asia/Shanghai",
)
query = client.bodies[0]["content"]["queries"][0][0]
print(json.dumps({
    "groups": query["groups_v2"],
    "eventIndicator": query["event_indicator"],
    "measureInfo": query["measure_info"],
}, ensure_ascii=False))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });
  const query = JSON.parse(stdout);

  assert.equal(query.groups.length, 1);
  assert.equal(query.groups[0].property_name, '$_vp_alis_name');
  assert.equal(query.eventIndicator, 'events');
  assert.deepEqual(query.measureInfo, {});
});

test('DataFinder refund script adds cycle=0 filter for c0 income queries', async () => {
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
module.load_period_data(
    client,
    "123",
    {
        "start": datetime(2026, 6, 20, 0, 0, 0, tzinfo=tz),
        "end": datetime(2026, 6, 20, 9, 0, 0, tzinfo=tz),
    },
    "Asia/Shanghai",
)
filters = [body["content"]["queries"][0][0]["filters"] for body in client.bodies]
print(json.dumps(filters))
`;

  const { stdout } = await execFileAsync('python', ['-c', code], { encoding: 'utf8' });
  const filters = JSON.parse(stdout);

  assert.equal(filters.length, 5);
  assert.deepEqual(filters[0], []);
  assert.equal(filters[1][0].expression.conditions[0].property_name, 'cycle');
  assert.equal(filters[1][0].expression.conditions[0].property_operation, 'eq');
  assert.deepEqual(filters[1][0].expression.conditions[0].property_values, [0]);
  assert.deepEqual(filters[2], []);
  assert.deepEqual(filters[3], []);
  assert.deepEqual(filters[4], []);
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
