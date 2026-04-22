# GharKharcha — Complete Backend Architecture v2
# ═══════════════════════════════════════════════
# Everything stored in AWS. Nothing critical in localStorage.
# localStorage = only UI preferences (theme, last selected group).

---

## 📐 Data Model

### Who owns what
- User     → owns their own profile + preferences
- Group    → owned by creator, shared with members
- Expense  → belongs to a group
- CashFlow → belongs to a group
- Member   → belongs to a group
- Settings (payment types, budgets) → belong to a group

---

## 🗄️ DynamoDB Tables (5 total)

### Table 1: GK-Users
Stores every user who has ever logged in via Google.

| Key | Type | Description |
|---|---|---|
| `userId` (PK) | String | Google email address |
| `name` | String | Full name from Google |
| `picture` | String | Google profile photo URL |
| `verifiedAt` | String | ISO timestamp of first login |
| `lastLoginAt` | String | ISO timestamp of last login |
| `defaultGroupId` | String | Last selected group |
| `theme` | String | light / dark |
| `currency` | String | ₹ / $ / € |

```
Partition key: userId (String)   ← Google email
No sort key needed
```

---

### Table 2: GK-Groups
One record per group. Stores all group metadata.

| Key | Type | Description |
|---|---|---|
| `groupId` (PK) | String | Unique group ID |
| `name` | String | Group name e.g. "Patil Home" |
| `description` | String | Optional description |
| `type` | String | home / trip / office / other |
| `icon` | String | Emoji icon |
| `createdBy` | String | Email of creator |
| `createdAt` | String | ISO timestamp |
| `paymentTypes` | List | ["UPI","Cash","Credit Card",...] |
| `budgets` | Map | {Groceries: 15000, Utilities: 8000} |
| `currency` | String | Default currency for group |

```
Partition key: groupId (String)
No sort key needed
```

---

### Table 3: GK-Members
Maps users to groups. One record per user per group.

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
| `invitedBy` | String | Email of who invited |

```
Partition key: groupId (String)
Sort key:      userId  (String)
```

GSI — for finding all groups a user belongs to:
```
GSI name:  userId-index
PK:        userId
```

---

### Table 4: GK-Expenses
All expenses across all groups.

| Key | Type | Description |
|---|---|---|
| `groupId` (PK) | String | Which group this belongs to |
| `expenseId` (SK) | String | Unique expense ID (timestamp) |
| `desc` | String | Description |
| `amount` | Number | Amount |
| `currency` | String | ₹ / $ / € |
| `date` | String | YYYY-MM-DD |
| `time` | String | HH:MM (optional) |
| `category` | String | Groceries / Utilities etc. |
| `paymentType` | String | UPI / Cash etc. |
| `paidBy` | String | Member name who paid |
| `paidByUserId` | String | Email of who paid |
| `shared` | String | null / member name / "group" |
| `recurring` | String | null / daily / weekly / monthly / yearly |
| `notes` | String | Optional notes |
| `receiptUrl` | String | Google Photos URL (Phase 2) |
| `createdBy` | String | Email of who created this record |
| `createdAt` | String | ISO timestamp |
| `updatedAt` | String | ISO timestamp |

```
Partition key: groupId   (String)
Sort key:      expenseId (String)
```

---

### Table 5: GK-CashFlow
Cash in / cash out entries per group.

| Key | Type | Description |
|---|---|---|
| `groupId` (PK) | String | Which group |
| `entryId` (SK) | String | Unique entry ID |
| `cfType` | String | in / out |
| `amount` | Number | Amount |
| `currency` | String | ₹ / $ / € |
| `desc` | String | Source / purpose |
| `date` | String | YYYY-MM-DD |
| `time` | String | HH:MM (optional) |
| `createdBy` | String | Email |
| `createdAt` | String | ISO timestamp |

```
Partition key: groupId (String)
Sort key:      entryId (String)
```

---

## 🛣️ API Routes (12 total)

| Method | Path | Lambda | Description |
|---|---|---|---|
| POST | `/user` | GK-SaveUser | Create/update user on login |
| GET | `/user` | GK-GetUser | Get user profile + groups |
| POST | `/group` | GK-SaveGroup | Create new group |
| GET | `/group` | GK-GetGroup | Get group details + settings |
| PUT | `/group` | GK-UpdateGroup | Update payment types, budgets |
| DELETE | `/group` | GK-DeleteGroup | Delete group |
| POST | `/member` | GK-SaveMember | Add member to group |
| GET | `/members` | GK-GetMembers | Get all members of a group |
| DELETE | `/member` | GK-DeleteMember | Remove member from group |
| POST | `/expense` | GK-SaveExpense | Add expense |
| GET | `/expenses` | GK-GetExpenses | Get expenses (with month filter) |
| PUT | `/expense` | GK-UpdateExpense | Edit expense |
| DELETE | `/expense` | GK-DeleteExpense | Delete expense |
| POST | `/cashflow` | GK-SaveCashFlow | Add cash in/out |
| GET | `/cashflow` | GK-GetCashFlow | Get cash flow entries |

---

## ⚡ Lambda Functions

### Runtime: Node.js 20.x
### Role: GharKharcha-Lambda-Role
### Tables needed: GK-Users, GK-Groups, GK-Members, GK-Expenses, GK-CashFlow

---

### 1. GK-SaveUser
POST /user — called on every Google login

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const now = new Date().toISOString();

    // Get existing user to preserve defaultGroupId
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

    // Also fetch user's groups via GSI
    return { statusCode: 200, headers: H, body: JSON.stringify({ success: true, user: item }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### 2. GK-GetUser
GET /user?userId=email@gmail.com — get profile + all groups user belongs to

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId;
    if (!userId) return { statusCode: 400, headers: H, body: JSON.stringify({ error: "userId required" }) };

    // Get user profile
    const userResult = await db.send(new GetCommand({ TableName: "GK-Users", Key: { userId } }));

    // Get all groups this user is a member of (via GSI)
    const memberResult = await db.send(new QueryCommand({
      TableName: "GK-Members",
      IndexName: "userId-index",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId }
    }));

    // Fetch each group's details
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

### 3. GK-SaveGroup
POST /group — create new group

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
    const now  = new Date().toISOString();
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

### 4. GK-GetGroup
GET /group?groupId=xxx — get group with settings

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const groupId = event.queryStringParameters?.groupId;
    const result  = await db.send(new GetCommand({ TableName: "GK-Groups", Key: { groupId } }));
    return { statusCode: 200, headers: H, body: JSON.stringify({ group: result.Item || null }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### 5. GK-UpdateGroup
PUT /group — update payment types, budgets, name etc.

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

### 6. GK-SaveMember
POST /member — add member to group

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

### 7. GK-GetMembers
GET /members?groupId=xxx

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const groupId = event.queryStringParameters?.groupId;
    const result  = await db.send(new QueryCommand({
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

### 8. GK-SaveExpense
POST /expense

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const now  = new Date().toISOString();
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

### 9. GK-GetExpenses
GET /expenses?groupId=xxx&month=2026-04

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
    if (month) items = items.filter(e => e.date && e.date.startsWith(month));

    return { statusCode: 200, headers: H, body: JSON.stringify({ expenses: items }) };
  } catch (err) {
    return { statusCode: 500, headers: H, body: JSON.stringify({ error: err.message }) };
  }
};
```

---

### 10. GK-UpdateExpense
PUT /expense

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

### 11. GK-DeleteExpense
DELETE /expense

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

### 12. GK-SaveCashFlow
POST /cashflow

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const H = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Content-Type": "application/json" };

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const now  = new Date().toISOString();
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

### 13. GK-GetCashFlow
GET /cashflow?groupId=xxx&month=2026-04

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

## ✅ Setup Checklist

### DynamoDB Tables to create
- [ ] GK-Users       (PK: userId)
- [ ] GK-Groups      (PK: groupId)
- [ ] GK-Members     (PK: groupId, SK: userId) + GSI: userId-index
- [ ] GK-Expenses    (PK: groupId, SK: expenseId)
- [ ] GK-CashFlow    (PK: groupId, SK: entryId)

### Lambda Functions to create (all Node.js 20.x)
- [ ] GK-SaveUser
- [ ] GK-GetUser
- [ ] GK-SaveGroup
- [ ] GK-GetGroup
- [ ] GK-UpdateGroup
- [ ] GK-SaveMember
- [ ] GK-GetMembers
- [ ] GK-SaveExpense
- [ ] GK-GetExpenses
- [ ] GK-UpdateExpense
- [ ] GK-DeleteExpense
- [ ] GK-SaveCashFlow
- [ ] GK-GetCashFlow

### API Gateway Routes
- [ ] POST   /user
- [ ] GET    /user
- [ ] POST   /group
- [ ] GET    /group
- [ ] PUT    /group
- [ ] POST   /member
- [ ] GET    /members
- [ ] POST   /expense
- [ ] GET    /expenses
- [ ] PUT    /expense
- [ ] DELETE /expense
- [ ] POST   /cashflow
- [ ] GET    /cashflow

### IAM Role (GharKharcha-Lambda-Role) needs access to
- [ ] GK-Users
- [ ] GK-Groups
- [ ] GK-Members (including GSI)
- [ ] GK-Expenses
- [ ] GK-CashFlow

---

## 📱 What localStorage stores (UI only — safe to lose)
- `gk_user`         — cached login session (re-fetched from DB on next login)
- `gk_last_group`   — last selected groupId (just UX convenience)
- `gk_theme`        — dark/light (synced to DB on change)

## ☁️ What DynamoDB stores (everything important)
- User profiles + preferences
- Groups (name, type, payment types, budgets, currency)
- Group members + roles
- All expenses
- All cash flow entries