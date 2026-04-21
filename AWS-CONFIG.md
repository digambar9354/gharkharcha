# GharKharcha — AWS Configuration & Lambda Functions
# ════════════════════════════════════════════════════
# All Lambda code + API Gateway routes + DynamoDB tables in one place.
# Keep this file safe — it is your complete backend reference.

---

## 🔑 Keys & Endpoints

| Key | Value |
|---|---|
| API Gateway URL | `https://15c3jq5fc2.execute-api.ap-south-1.amazonaws.com` |
| Google OAuth Client ID | `56285835763-s5mk752qj0smuc01hr10k5nu7ii46n1c.apps.googleusercontent.com` |
| AWS Region | `ap-south-1` (Mumbai) |
| DynamoDB Table — Expenses | `GharKharcha-Expenses` |
| DynamoDB Table — Members | `GharKharcha-Members` |
| IAM Role | `GharKharcha-Lambda-Role` |

---

## 📦 DynamoDB Tables

### Table 1: GharKharcha-Expenses
| Setting | Value |
|---|---|
| Partition key | `familyId` (String) |
| Sort key | `expenseId` (String) |
| Billing mode | On-demand (free tier) |

### Table 2: GharKharcha-Members
| Setting | Value |
|---|---|
| Partition key | `familyId` (String) |
| Sort key | `email` (String) |
| Billing mode | On-demand (free tier) |

---

## 🛣️ API Gateway Routes

| Method | Path | Lambda Function | Status |
|---|---|---|---|
| POST | `/expense` | `GharKharcha-SaveExpense` | ✅ Created |
| GET | `/expenses` | `GharKharcha-GetExpenses` | ✅ Created |
| DELETE | `/expense` | `GharKharcha-DeleteExpense` | ✅ Created |
| PUT | `/expense` | `GharKharcha-UpdateExpense` | ✅ Created |
| POST | `/member` | `GharKharcha-SaveMember` | ⏳ Needed |
| GET | `/members` | `GharKharcha-GetMembers` | ⏳ Needed |

CORS Settings:
- Allow origins: `*`
- Allow methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allow headers: `Content-Type`

---

## ⚡ Lambda Functions

### Runtime: Node.js 20.x
### Execution Role: GharKharcha-Lambda-Role
### Policies on role: AmazonDynamoDBFullAccess, CloudWatchLogsFullAccess

---

### 1. GharKharcha-SaveExpense
**Route:** POST /expense

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  try {
    const body = JSON.parse(event.body);
    const item = {
      familyId:   body.familyId || "family",
      expenseId:  Date.now().toString(),
      desc:       body.desc,
      amount:     body.amount,
      date:       body.date,
      category:   body.category,
      paidBy:     body.paidBy,
      shared:     body.shared || null,
      notes:      body.notes || "",
      receiptUrl: body.receiptUrl || null,
      createdAt:  new Date().toISOString(),
      createdBy:  body.createdBy || "unknown"
    };
    await client.send(new PutCommand({ TableName: "GharKharcha-Expenses", Item: item }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, item }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### 2. GharKharcha-GetExpenses
**Route:** GET /expenses?familyId=xxx&month=2026-04

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  try {
    const familyId = event.queryStringParameters?.familyId || "family";
    const month    = event.queryStringParameters?.month;
    const result = await client.send(new QueryCommand({
      TableName: "GharKharcha-Expenses",
      KeyConditionExpression: "familyId = :fid",
      ExpressionAttributeValues: { ":fid": familyId },
      ScanIndexForward: false
    }));
    let items = result.Items || [];
    if (month) items = items.filter(e => e.date && e.date.startsWith(month));
    return { statusCode: 200, headers, body: JSON.stringify({ expenses: items }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### 3. GharKharcha-DeleteExpense
**Route:** DELETE /expense

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  try {
    const body = JSON.parse(event.body);
    await client.send(new DeleteCommand({
      TableName: "GharKharcha-Expenses",
      Key: { familyId: body.familyId || "family", expenseId: body.expenseId }
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### 4. GharKharcha-UpdateExpense
**Route:** PUT /expense

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  try {
    const body = JSON.parse(event.body);
    await client.send(new UpdateCommand({
      TableName: "GharKharcha-Expenses",
      Key: { familyId: body.familyId || "family", expenseId: body.expenseId },
      UpdateExpression: "SET #d=:d, amount=:a, #dt=:dt, category=:c, paidBy=:p, shared=:s, notes=:n",
      ExpressionAttributeNames: { "#d":"desc", "#dt":"date" },
      ExpressionAttributeValues: {
        ":d":body.desc, ":a":body.amount, ":dt":body.date,
        ":c":body.category, ":p":body.paidBy,
        ":s":body.shared||null, ":n":body.notes||""
      }
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### 5. GharKharcha-SaveMember  ← NEW
**Route:** POST /member

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  try {
    const body = JSON.parse(event.body);
    const item = {
      familyId:  body.familyId || "family",
      email:     body.email,
      name:      body.name,
      initials:  body.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(),
      role:      body.role || "member",
      color:     body.color || "#dbeafe",
      textColor: body.textColor || "#1d4ed8",
      joinedAt:  new Date().toISOString(),
    };
    await client.send(new PutCommand({ TableName: "GharKharcha-Members", Item: item }));
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, item }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### 6. GharKharcha-GetMembers  ← NEW
**Route:** GET /members?familyId=xxx

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  try {
    const familyId = event.queryStringParameters?.familyId || "family";
    const result = await client.send(new QueryCommand({
      TableName: "GharKharcha-Members",
      KeyConditionExpression: "familyId = :fid",
      ExpressionAttributeValues: { ":fid": familyId }
    }));
    return { statusCode: 200, headers, body: JSON.stringify({ members: result.Items || [] }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

## ✅ Setup Checklist

### DynamoDB
- [x] GharKharcha-Expenses table created
- [x] GharKharcha-Members table created

### IAM
- [x] GharKharcha-Lambda-Role created
- [x] AmazonDynamoDBFullAccess attached
- [x] CloudWatchLogsFullAccess attached

### Lambda Functions
- [x] GharKharcha-SaveExpense — deployed
- [x] GharKharcha-GetExpenses — deployed
- [x] GharKharcha-DeleteExpense — deployed
- [x] GharKharcha-UpdateExpense — deployed
- [ ] GharKharcha-SaveMember — **TODO**
- [ ] GharKharcha-GetMembers — **TODO**

### API Gateway
- [x] POST /expense → SaveExpense
- [x] GET /expenses → GetExpenses
- [x] DELETE /expense → DeleteExpense
- [x] PUT /expense → UpdateExpense
- [ ] POST /member → SaveMember — **TODO**
- [ ] GET /members → GetMembers — **TODO**
- [x] CORS configured

### Frontend
- [x] Google OAuth login
- [x] Onboarding — family setup on first login
- [x] Dashboard with charts
- [x] Add expense form
- [x] Receipt scan (OCR simulated)
- [x] Members page (dynamic from DB)
- [x] Reports page
- [x] Mobile responsive
- [x] Favicon

### Phase 2 (coming next)
- [ ] Real Google Cloud Vision OCR
- [ ] Google Photos receipt storage
- [ ] Google Sheets auto-backup
- [ ] WhatsApp chat import (Marathi/English)
- [ ] Push notifications

---

## 💰 Cost Summary

| Service | Free Tier | Your Usage | Cost |
|---|---|---|---|
| DynamoDB | 25GB forever | < 1MB | ₹0 |
| Lambda | 1M req/month | ~500/month | ₹0 |
| API Gateway | 1M req/12mo | ~500/month | ₹0 |
| Amplify | 1000 builds/mo | ~5/month | ₹0 |
| Google OAuth | Free | Free | ₹0 |
| Google Vision OCR | 1000/month | ~50/month | ₹0 |
| **Total** | | | **₹0/month** |
