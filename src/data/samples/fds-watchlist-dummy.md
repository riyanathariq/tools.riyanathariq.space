# FDS Watchlist — Dummy JSON (FE)

Shape mengikuti BE asli di `https://backoffice.vocapaywall.dev/api`  
Endpoints: `/v1/fds-watchlist*`

---

## Enum `escalation_status` (snake_case)

| Value | Label UI (contoh) |
| --- | --- |
| `pending_review` | Pending Review |
| `under_investigation` | Under Investigation |
| `partially_investigated` | Partially Investigated |
| `investigated` | Investigated |
| `no_action_48h` | No Action 48 H |
| `rejected` | Rejected |
| `closed` | Closed |

---

## 1) List open watchlist

`GET /v1/fds-watchlist`  
Default filter: open cases (`closed=false`).

```json
{
  "event": "listFDSWatchlistCases",
  "code": 200,
  "message": "fds watchlist cases fetched successfully",
  "data": [
    {
      "case_id": "019fd600-aaaa-7000-8000-000000000001",
      "merchant_id": "1bff3cc8-a776-47b4-b3b9-d71829bbff23",
      "merchant_name": "TESTING XYZ",
      "first_triggered_at": "2026-08-04T09:12:00+07:00",
      "last_triggered_at": "2026-08-06T11:40:00+07:00",
      "rules_triggered_count": 3,
      "rule_names": [
        "Transaction Velocity",
        "Amount Deviation",
        "Static QR Reuse"
      ],
      "investigated_count": 1,
      "escalation_status": "partially_investigated"
    },
    {
      "case_id": "019fd600-aaaa-7000-8000-000000000002",
      "merchant_id": "54b2e55d-5e3a-4143-952f-d676c6e0ece5",
      "merchant_name": "woii",
      "first_triggered_at": "2026-08-05T22:05:00+07:00",
      "last_triggered_at": "2026-08-06T08:15:00+07:00",
      "rules_triggered_count": 1,
      "rule_names": ["Time of Day Anomaly"],
      "investigated_count": 0,
      "escalation_status": "pending_review"
    },
    {
      "case_id": "019fd600-aaaa-7000-8000-000000000003",
      "merchant_id": "0d992576-66d2-4299-a3e3-85f24a587473",
      "merchant_name": "testing lagi lagi",
      "first_triggered_at": "2026-08-03T14:00:00+07:00",
      "last_triggered_at": "2026-08-05T16:30:00+07:00",
      "rules_triggered_count": 2,
      "rule_names": ["New Account Risk", "Unusual Channel Mix"],
      "investigated_count": 2,
      "escalation_status": "investigated"
    },
    {
      "case_id": "019fd600-aaaa-7000-8000-000000000004",
      "merchant_id": "0f021a5d-51f9-44ef-b98f-621cd0a088a9",
      "merchant_name": "testing",
      "first_triggered_at": "2026-08-01T10:00:00+07:00",
      "last_triggered_at": "2026-08-03T10:00:00+07:00",
      "rules_triggered_count": 1,
      "rule_names": ["Transaction Velocity"],
      "investigated_count": 0,
      "escalation_status": "no_action_48h"
    },
    {
      "case_id": "019fd600-aaaa-7000-8000-000000000005",
      "merchant_id": "2b70b2f0-8b01-4ab5-a5cb-e003de8d1659",
      "merchant_name": "testing aja",
      "first_triggered_at": "2026-08-06T07:00:00+07:00",
      "last_triggered_at": "2026-08-06T12:00:00+07:00",
      "rules_triggered_count": 2,
      "rule_names": ["Amount Deviation", "Static QR Reuse"],
      "investigated_count": 0,
      "escalation_status": "under_investigation"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total_page": 1,
    "total_count": 5,
    "filter": { "closed": "false" },
    "order": { "order_by": "last_triggered_at", "order": "desc" }
  }
}
```

---

## 2) Fraud history (closed)

`GET /v1/fds-watchlist?filter={"closed":"true"}`

```json
{
  "event": "listFDSWatchlistCases",
  "code": 200,
  "message": "fds watchlist cases fetched successfully",
  "data": [
    {
      "case_id": "019fd600-bbbb-7000-8000-000000000011",
      "merchant_id": "1bff3cc8-a776-47b4-b3b9-d71829bbff23",
      "merchant_name": "TESTING XYZ",
      "first_triggered_at": "2026-07-20T09:00:00+07:00",
      "last_triggered_at": "2026-07-28T18:00:00+07:00",
      "rules_triggered_count": 2,
      "rule_names": ["Transaction Velocity", "Amount Deviation"],
      "investigated_count": 2,
      "escalation_status": "closed",
      "closed_at": "2026-07-29T10:00:00+07:00"
    },
    {
      "case_id": "019fd600-bbbb-7000-8000-000000000012",
      "merchant_id": "b35132d7-5e86-4273-bf30-b9f62c29e0ea",
      "merchant_name": "Testing Liza",
      "first_triggered_at": "2026-07-10T11:00:00+07:00",
      "last_triggered_at": "2026-07-12T11:00:00+07:00",
      "rules_triggered_count": 1,
      "rule_names": ["Static QR Reuse"],
      "investigated_count": 0,
      "escalation_status": "rejected",
      "closed_at": "2026-07-13T09:30:00+07:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total_page": 1,
    "total_count": 2,
    "filter": { "closed": "true" },
    "order": { "order_by": "last_triggered_at", "order": "desc" }
  }
}
```

---

## 3) Case detail

`GET /v1/fds-watchlist/{case_id}`

```json
{
  "event": "getFDSWatchlistCaseDetail",
  "code": 200,
  "message": "fds watchlist case detail fetched successfully",
  "data": {
    "case_id": "019fd600-aaaa-7000-8000-000000000001",
    "merchant_id": "1bff3cc8-a776-47b4-b3b9-d71829bbff23",
    "merchant_name": "TESTING XYZ",
    "escalation_status": "partially_investigated",
    "rules_triggered_count": 3,
    "investigated_count": 1,
    "first_triggered_at": "2026-08-04T09:12:00+07:00",
    "last_triggered_at": "2026-08-06T11:40:00+07:00",
    "rule_hits": [
      {
        "id": "019fd600-cccc-7000-8000-000000000101",
        "rule_code": "transaction_velocity",
        "rule_name": "Transaction Velocity",
        "source_level": "merchant",
        "hit_count": 4,
        "evidence_summary": "52 transactions in 1 hour (threshold 50)",
        "escalation_status": "investigated",
        "threshold_snapshot": { "max_count": 50, "window": "hour" },
        "first_triggered_at": "2026-08-04T09:12:00+07:00",
        "last_triggered_at": "2026-08-06T10:05:00+07:00"
      },
      {
        "id": "019fd600-cccc-7000-8000-000000000102",
        "rule_code": "amount_deviation",
        "rule_name": "Amount Deviation",
        "source_level": "group",
        "hit_count": 2,
        "evidence_summary": "QR payment amount 3.1x above 7-day baseline",
        "escalation_status": "pending_review",
        "threshold_snapshot": {
          "channels": [
            { "channel": "qr_payment", "multiplier": 2, "baseline_days": 7 }
          ]
        },
        "first_triggered_at": "2026-08-05T13:20:00+07:00",
        "last_triggered_at": "2026-08-06T11:40:00+07:00"
      },
      {
        "id": "019fd600-cccc-7000-8000-000000000103",
        "rule_code": "static_qr_reuse",
        "rule_name": "Static QR Reuse",
        "source_level": "merchant",
        "hit_count": 1,
        "evidence_summary": "Same static QR used 3 times in 24 hours",
        "escalation_status": "under_investigation",
        "threshold_snapshot": { "max_trx": 2, "window_hours": 24 },
        "first_triggered_at": "2026-08-06T08:00:00+07:00",
        "last_triggered_at": "2026-08-06T08:00:00+07:00"
      }
    ]
  }
}
```

---

## 4) Evidence

`GET /v1/fds-watchlist/{case_id}/rule-hits/{hit_id}/evidence`

```json
{
  "event": "getFDSWatchlistHitEvidence",
  "code": 200,
  "message": "fds watchlist hit evidence fetched successfully",
  "data": {
    "case_id": "019fd600-aaaa-7000-8000-000000000001",
    "case_rule_hit_id": "019fd600-cccc-7000-8000-000000000101",
    "rule_code": "transaction_velocity",
    "rule_name": "Transaction Velocity",
    "evidence_summary": "52 transactions in 1 hour (threshold 50)",
    "escalation_status": "investigated",
    "instances": [
      {
        "id": "019fd600-dddd-7000-8000-000000000201",
        "occurred_at": "2026-08-06T10:05:00+07:00",
        "window_start": "2026-08-06T09:05:00+07:00",
        "window_end": "2026-08-06T10:05:00+07:00",
        "evidence": {
          "count": 52,
          "threshold": 50,
          "window": "hour",
          "channel": "qr_payment"
        },
        "transactions": [
          {
            "id": "019fd600-eeee-7000-8000-000000000301",
            "transaction_id": "TRX-DEV-000901",
            "merchant_order_id": "ORD-901",
            "channel": "qr_payment",
            "source_type": "trigger",
            "amount": 150000,
            "fee_amount": 1500,
            "created_at": "2026-08-06T10:04:50+07:00"
          },
          {
            "id": "019fd600-eeee-7000-8000-000000000302",
            "transaction_id": "TRX-DEV-000902",
            "merchant_order_id": "ORD-902",
            "channel": "qr_payment",
            "source_type": "related",
            "amount": 175000,
            "fee_amount": 1750,
            "created_at": "2026-08-06T10:03:10+07:00"
          }
        ]
      }
    ]
  }
}
```

---

## 5) Apply action

`POST /v1/fds-watchlist/{case_id}/actions`

`action`: `investigate` | `reject` | `close` | `reopen`

```json
{
  "action": "investigate",
  "reason": "Reviewing velocity spike on QR channel",
  "case_rule_hit_id": "019fd600-cccc-7000-8000-000000000101"
}
```

Contoh response sukses:

```json
{
  "event": "applyFDSWatchlistCaseAction",
  "code": 200,
  "message": "fds watchlist case action applied successfully",
  "data": null
}
```

---

## Catatan FE

- List open vs history dibedakan lewat `filter.closed` (`false` / `true` / `all`).
- `rule_names` di list = display name; detail pakai `rule_hits[].rule_code` + `rule_name`.
- `closed_at` hanya muncul kalau case sudah closed/rejected.
- Ini **dummy lokal** — belum ada di DB/API watchlist real (create case hanya dari worker FDS eval).
