# GharKharcha — AWS Backend Reference
# ═════════════════════════════════════
# Single source of truth for infrastructure, Lambda code, and deployment status.
# v1 (familyId-based) is documented at the bottom under Legacy.

---

## 🔑 Keys & Endpoints

| Key | Value |
|---|---|
| API Gateway URL (v2 — active) | `https://p7olak2xy4.execute-api.us-east-1.amazonaws.com/GK-Stage` |
| API Gateway URL (v1 — legacy) | `https://15c3jq5fc2.execute-api.ap-south-1.amazonaws.com` |
| Google OAuth Client ID | `56285835763-s5mk752qj0smuc01hr10k5nu7ii46n1c.apps.googleusercontent.com` |
| AWS Region (v2) | `us-east-1` (N. Virginia) |
| AWS Region (v1) | `ap-south-1` (Mumbai) |
| IAM Role (v2) | `GharKharcha-Lambda-Role` |

---

## 📐 Data Model (v2)

### Ownership
- **User** → profile + preferences (theme, currency)
- **Group** → owned by creator, shared with members; holds payment types, budgets
- **Expense** → belongs to a group
- **CashFlow** → belongs to a group
- **Member** → belongs to a group (user ↔ group join record)

---

## 🗄️ DynamoDB Tables (v2 — 5 tables)

### GK-Users
| Key | Type | Description |
|---|---|---|
| `userId` (PK) | String | Google email |
| `name` | String | Full name |
| `picture` | String | Google profile photo URL |
| `verifiedAt` | String | ISO — first login |
| `lastLoginAt` | String | ISO — most recent login |
| `defaultGroupId` | String | Last selected group |
| `theme` | String | light / dark |
| `currency` | String | ₹ / $ / € |

```
PK: userId (String)   ← Google email
No sort key
```

---

### GK-Groups
| Key | Type | Description |
|---|---|---|
| `groupId` (PK) | String | Unique group ID |
| `name` | String | e.g. "family Home" |
| `description` | String | Optional |
| `type` | String | home / trip / office / other |
| `icon` | String | Emoji |
| `createdBy` | String | Email of creator |
| `createdAt` | String | ISO timestamp |
| `paymentTypes` | List | ["UPI","Cash","Credit Card",...] |
| `budgets` | Map | {Groceries: 15000, Utilities: 8000, ...} |
| `currency` | String | Default currency for group |

```
PK: groupId (String)
No sort key
```

---

### GK-Members
| Key | Type | Description |
|---|---|---|
| `groupId` (PK) | String | Which group |
| `userId` (SK) | String | Google email |
| `name` | String | Display name |
| `role` | String | admin / member / view |
| `color` | String | Avatar background color |
| `textColor` | String | Avatar text color |
| `initials` | String | e.g. "RP" |
| `joinedAt` | String | ISO timestamp |
| `invitedBy` | String | Email of inviter |

```
PK: groupId (String)
SK: userId  (String)

GSI — userId-index (for finding all groups a user belongs to):
  PK: userId
```

---

### GK-Expenses
| Key | Type | Description |
|---|---|---|
| `groupId` (PK) | String | Which group |
| `expenseId` (SK) | String | Unique ID (ISO timestamp + random) |
| `desc` | String | Description |
| `amount` | Number | Amount |
| `currency` | String | ₹ / $ / € |
| `date` | String | YYYY-MM-DD |
| `time` | String | HH:MM (optional) |
| `category` | String | Groceries / Utilities / ... |
| `paymentType` | String | UPI / Cash / ... |
| `paidBy` | String | Member name |
| `paidByUserId` | String | Email of payer |
| `shared` | String | null / member name / "group" |
| `recurring` | String | null / daily / weekly / monthly / yearly |
| `notes` | String | Optional |
| `receiptUrl` | String | Photo URL (Phase 2) |
| `createdBy` | String | Email |
| `createdAt` | String | ISO timestamp |
| `updatedAt` | String | ISO timestamp |

```
PK: groupId   (String)
SK: expenseId (String)
```

---

### GK-CashFlow
| Key | Type | Description |
|---|---|---|
| `groupId` (PK) | String | Which group |
| `entryId` (SK) | String | Unique ID |
| `cfType` | String | in / out |
| `amount` | Number | Amount |
| `currency` | String | ₹ / $ / € |
| `desc` | String | Source / purpose |
| `date` | String | YYYY-MM-DD |
| `time` | String | HH:MM (optional) |
| `createdBy` | String | Email |
| `createdAt` | String | ISO timestamp |

```
PK: groupId (String)
SK: entryId (String)
```

---

## 🛣️ API Routes (v2 — 15 total)

| Method | Path | Lambda | Description |
|---|---|---|---|
| POST | `/user` | GK-SaveUser | Create / update user on login |
| GET | `/user` | GK-GetUser | Profile + all groups |
| POST | `/group` | GK-SaveGroup | Create group |
| GET | `/group` | GK-GetGroup | Group details + settings |
| PUT | `/group` | GK-UpdateGroup | Update payment types, budgets, name |
| DELETE | `/group` | GK-DeleteGroup | Delete group |
| POST | `/member` | GK-SaveMember | Add member |
| GET | `/members` | GK-GetMembers | All members of a group |
| DELETE | `/member` | GK-DeleteMember | Remove member |
| POST | `/expense` | GK-SaveExpense | Add expense |
| GET | `/expenses` | GK-GetExpenses | Expenses (optional month filter) |
| PUT | `/expense` | GK-UpdateExpense | Edit expense |
| DELETE | `/expense` | GK-DeleteExpense | Delete expense |
| POST | `/expenses/batch` | GK-BatchSaveExpenses | Bulk import (CSV) |
| POST | `/cashflow` | GK-SaveCashFlow | Add cash in/out |
| GET | `/cashflow` | GK-GetCashFlow | Cash flow entries |

CORS: Allow-Origin `*` · Allow-Methods `GET, POST, PUT, DELETE, OPTIONS` · Allow-Headers `Content-Type`

---

## ⚡ Lambda Functions (v2)

**Runtime:** Node.js 20.x  
**Role:** GharKharcha-Lambda-Role (AmazonDynamoDBFullAccess + CloudWatchLogsFullAccess)

---

### GK-SaveUser — POST /user

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const now = new Date().toISOString();

    const existing = await db.send(new GetCommand({ TableName: "GK-Users", Key: { userId: body.email } }));

    const item = {
      userId: body.email,
      name: body.name,
      picture: body.picture || null,
      verifiedAt: existing.Item?.verifiedAt || now,
      lastLoginAt: now,
      defaultGroupId: body.defaultGroupId || existing.Item?.defaultGroupId || null,
      theme: body.theme || existing.Item?.theme || "light",
      currency: body.currency || existing.Item?.currency || "₹",
    };

    await db.send(new PutCommand({ TableName: "GK-Users", Item: item }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true, user: item }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-GetUser — GET /user?userId=email@gmail.com

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId;
    if (!userId) return { statusCode: 400, headers: H, body: JSON.stringify({ error: "userId required" }) };

    const userResult = await db.send(new GetCommand({ TableName: "GK-Users", Key: { userId } }));

    const memberResult = await db.send(new QueryCommand({
      TableName: "GK-Members",
      IndexName: "userId-index",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId }
    }));

    const groups = [];
    for (const membership of (memberResult.Items || [])) {
      const groupResult = await db.send(new GetCommand({ TableName: "GK-Groups", Key: { groupId: membership.groupId } }));
      if (groupResult.Item) groups.push({ ...groupResult.Item, userRole: membership.role });
    }

    return { statusCode: 200, headers: H, body: JSON.stringify({ user: userResult.Item || null, groups }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-SaveGroup — POST /group

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

const ICONS = { home: "🏠", trip: "✈️", office: "🏢", other: "📦" };
const DEFAULT_PAYMENT_TYPES = ["UPI", "Cash", "Credit Card", "Debit Card", "Net Banking", "Cheque"];
const DEFAULT_BUDGETS = { Groceries: 15000, Utilities: 8000, Transport: 5000, Entertainment: 3000, Medical: 5000, Construction: 0, Other: 5000 };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const now = new Date().toISOString();
    const groupId = body.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString().slice(-6);

    const group = {
      groupId,
      name: body.name,
      description: body.description || "",
      type: body.type || "home",
      icon: ICONS[body.type] || "📦",
      createdBy: body.createdBy,
      createdAt: now,
      paymentTypes: DEFAULT_PAYMENT_TYPES,
      budgets: DEFAULT_BUDGETS,
      currency: body.currency || "₹",
    };

    await db.send(new PutCommand({ TableName: "GK-Groups", Item: group }));

    // Auto-add creator as admin member
    const member = {
      groupId,
      userId: body.createdBy,
      name: body.creatorName,
      role: "admin",
      color: "#dbeafe",
      textColor: "#1d4ed8",
      initials: body.creatorName?.slice(0, 2).toUpperCase() || "ME",
      joinedAt: now,
      invitedBy: body.createdBy,
    };
    await db.send(new PutCommand({ TableName: "GK-Members", Item: member }));

    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true, group, member }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-GetGroup — GET /group?groupId=xxx

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const groupId = event.queryStringParameters?.groupId;
    const result = await db.send(new GetCommand({ TableName: "GK-Groups", Key: { groupId } }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ group: result.Item || null }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-UpdateGroup — PUT /group

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    await db.send(new UpdateCommand({
      TableName: "GK-Groups",
      Key: { groupId: body.groupId },
      UpdateExpression: "SET #n=:n, description=:d, paymentTypes=:pt, budgets=:b, currency=:c, updatedAt=:ua",
      ExpressionAttributeNames: { "#n": "name" },
      ExpressionAttributeValues: {
        ":n": body.name,
        ":d": body.description || "",
        ":pt": body.paymentTypes,
        ":b": body.budgets,
        ":c": body.currency || "₹",
        ":ua": new Date().toISOString(),
      }
    }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-DeleteGroup — DELETE /group

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    await db.send(new DeleteCommand({ TableName: "GK-Groups", Key: { groupId: body.groupId } }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-SaveMember — POST /member

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const item = {
      groupId: body.groupId,
      userId: body.email,
      name: body.name,
      role: body.role || "member",
      color: body.color || "#dbeafe",
      textColor: body.textColor || "#1d4ed8",
      initials: body.name.slice(0, 2).toUpperCase(),
      joinedAt: new Date().toISOString(),
      invitedBy: body.invitedBy || null,
    };
    await db.send(new PutCommand({ TableName: "GK-Members", Item: item }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true, item }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-GetMembers — GET /members?groupId=xxx

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const groupId = event.queryStringParameters?.groupId;
    const result = await db.send(new QueryCommand({
      TableName: "GK-Members",
      KeyConditionExpression: "groupId = :gid",
      ExpressionAttributeValues: { ":gid": groupId }
    }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ members: result.Items || [] }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-DeleteMember — DELETE /member

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    await db.send(new DeleteCommand({ TableName: "GK-Members", Key: { groupId: body.groupId, userId: body.userId } }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-SaveExpense — POST /expense

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const now = new Date().toISOString();
    const item = {
      groupId: body.groupId,
      expenseId: now + "-" + Math.random().toString(36).slice(2, 7),
      desc: body.desc,
      amount: Number(body.amount),
      currency: body.currency || "₹",
      date: body.date,
      time: body.time || null,
      category: body.category,
      paymentType: body.paymentType || "Cash",
      paidBy: body.paidBy,
      paidByUserId: body.paidByUserId || body.createdBy,
      shared: body.shared || null,
      recurring: body.recurring || null,
      notes: body.notes || "",
      receiptUrl: body.receiptUrl || null,
      createdBy: body.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    await db.send(new PutCommand({ TableName: "GK-Expenses", Item: item }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true, item }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-GetExpenses — GET /expenses?groupId=xxx&month=2026-04

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const groupId = event.queryStringParameters?.groupId;
    const month   = event.queryStringParameters?.month;

    const result = await db.send(new QueryCommand({
      TableName: "GK-Expenses",
      KeyConditionExpression: "groupId = :gid",
      ExpressionAttributeValues: { ":gid": groupId },
      ScanIndexForward: false,
    }));

    let items = result.Items || [];
    if (month) items = items.filter(e => e.date?.startsWith(month));

    return { statusCode: 200, headers: H, body: JSON.stringify({ expenses: items }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-UpdateExpense — PUT /expense

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    await db.send(new UpdateCommand({
      TableName: "GK-Expenses",
      Key: { groupId: body.groupId, expenseId: body.expenseId },
      UpdateExpression: "SET #d=:d, amount=:a, currency=:cu, #dt=:dt, #t=:t, category=:cat, paymentType=:pt, paidBy=:pb, shared=:sh, recurring=:rec, notes=:n, updatedAt=:ua",
      ExpressionAttributeNames: { "#d": "desc", "#dt": "date", "#t": "time" },
      ExpressionAttributeValues: {
        ":d": body.desc, ":a": Number(body.amount), ":cu": body.currency || "₹",
        ":dt": body.date, ":t": body.time || null, ":cat": body.category,
        ":pt": body.paymentType, ":pb": body.paidBy,
        ":sh": body.shared || null, ":rec": body.recurring || null,
        ":n": body.notes || "", ":ua": new Date().toISOString(),
      }
    }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-DeleteExpense — DELETE /expense

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    await db.send(new DeleteCommand({ TableName: "GK-Expenses", Key: { groupId: body.groupId, expenseId: body.expenseId } }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-BatchSaveExpenses — POST /expenses/batch

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const { groupId, createdBy, currency, expenses } = JSON.parse(event.body);
    if (!groupId || !expenses?.length) return { statusCode: 400, headers: H, body: JSON.stringify({ error: "groupId and expenses required" }) };

    let saved = 0, failed = 0;
    for (const row of expenses) {
      try {
        const now = new Date().toISOString();
        await db.send(new PutCommand({
          TableName: "GK-Expenses",
          Item: {
            groupId,
            expenseId: now + "-" + Math.random().toString(36).slice(2, 7),
            desc: row.description || row.desc || "Imported",
            amount: Number(row.amount),
            currency: row.currency || currency || "₹",
            date: row.date,
            time: row.time || null,
            category: row.category || "Other",
            paymentType: row.paymenttype || row.paymentType || "Cash",
            paidBy: row.paidby || row.paidBy || "",
            shared: row.shared || null,
            notes: row.notes || "CSV import",
            createdBy: createdBy || "import",
            createdAt: now,
            updatedAt: now,
          }
        }));
        saved++;
      } catch { failed++; }
    }

    return { statusCode: 200, headers: H, body: JSON.stringify({ success: failed === 0, saved, failed, total: expenses.length }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-SaveCashFlow — POST /cashflow

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const now = new Date().toISOString();
    const item = {
      groupId: body.groupId,
      entryId: now + "-" + Math.random().toString(36).slice(2, 7),
      cfType: body.cfType,
      amount: Number(body.amount),
      currency: body.currency || "₹",
      desc: body.desc,
      date: body.date,
      time: body.time || null,
      createdBy: body.createdBy,
      createdAt: now,
    };
    await db.send(new PutCommand({ TableName: "GK-CashFlow", Item: item }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true, item }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### GK-GetCashFlow — GET /cashflow?groupId=xxx&month=2026-04

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const groupId = event.queryStringParameters?.groupId;
    const month   = event.queryStringParameters?.month;
    const result  = await db.send(new QueryCommand({
      TableName: "GK-CashFlow",
      KeyConditionExpression: "groupId = :gid",
      ExpressionAttributeValues: { ":gid": groupId },
      ScanIndexForward: false,
    }));
    let items = result.Items || [];
    if (month) items = items.filter(e => e.date?.startsWith(month));
    return { statusCode: 200, headers: H, body: JSON.stringify({ cashflow: items }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

## ✅ Deployment Checklist (v2)

### DynamoDB
- [ ] GK-Users       (PK: userId)
- [ ] GK-Groups      (PK: groupId)
- [ ] GK-Members     (PK: groupId, SK: userId) + GSI: userId-index (PK: userId)
- [ ] GK-Expenses    (PK: groupId, SK: expenseId)
- [ ] GK-CashFlow    (PK: groupId, SK: entryId)

### IAM — GharKharcha-Lambda-Role
- [ ] AmazonDynamoDBFullAccess
- [ ] CloudWatchLogsFullAccess

### Lambda Functions
- [ ] GK-SaveUser
- [ ] GK-GetUser
- [ ] GK-SaveGroup
- [ ] GK-GetGroup
- [ ] GK-UpdateGroup
- [ ] GK-DeleteGroup
- [ ] GK-SaveMember
- [ ] GK-GetMembers
- [ ] GK-DeleteMember
- [ ] GK-SaveExpense
- [ ] GK-GetExpenses
- [ ] GK-UpdateExpense
- [ ] GK-DeleteExpense
- [ ] GK-BatchSaveExpenses
- [ ] GK-SaveCashFlow
- [ ] GK-GetCashFlow

### API Gateway
- [ ] POST   /user
- [ ] GET    /user
- [ ] POST   /group
- [ ] GET    /group
- [ ] PUT    /group
- [ ] DELETE /group
- [ ] POST   /member
- [ ] GET    /members
- [ ] DELETE /member
- [ ] POST   /expense
- [ ] GET    /expenses
- [ ] PUT    /expense
- [ ] DELETE /expense
- [ ] POST   /expenses/batch
- [ ] POST   /cashflow
- [ ] GET    /cashflow

---

## 💰 Cost Summary

| Service | Free Tier | Estimated Usage | Cost |
|---|---|---|---|
| DynamoDB | 25 GB forever | < 1 MB | ₹0 |
| Lambda | 1M req/month | ~500/month | ₹0 |
| API Gateway | 1M req/12mo | ~500/month | ₹0 |
| Amplify | 1000 builds/mo | ~5/month | ₹0 |
| Google OAuth | Free | Free | ₹0 |
| **Total** | | | **₹0/month** |

---

## 📱 What localStorage stores (UI convenience only — safe to clear)

| Key | Value |
|---|---|
| `gk_session` | Cached login (email, name, picture) — re-fetched from DB on app load |

---

## 🚀 Phase 2 Roadmap

- [ ] Real Google Cloud Vision OCR for receipt scanning
- [ ] Google Photos receipt storage
- [ ] Google Sheets auto-backup export
- [ ] WhatsApp chat import (Marathi/English)
- [ ] Push notifications

---

## 📦 Legacy — v1 Architecture (ap-south-1, familyId-based)

> These resources exist in AWS Mumbai region under the old single-family design.
> **Do not use for new development.** Kept here for reference only.

- API Gateway: `https://15c3jq5fc2.execute-api.ap-south-1.amazonaws.com`
- Tables: `GharKharcha-Expenses` (PK: familyId, SK: expenseId), `GharKharcha-Members` (PK: familyId, SK: email)
- Lambdas deployed: GharKharcha-SaveExpense, GharKharcha-GetExpenses, GharKharcha-DeleteExpense, GharKharcha-UpdateExpense
- Lambdas pending: GharKharcha-SaveMember, GharKharcha-GetMembers
- Key difference: used `familyId` instead of `groupId`; no user/group/cashflow tables
