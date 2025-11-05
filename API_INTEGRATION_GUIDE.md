# 🚀 API Integration Guide for External Tools

This guide explains how external tools integrate with 1sub to consume credits and verify users.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Your API Key](#getting-your-api-key)
3. [User Purchase Flow](#user-purchase-flow)
4. [API Endpoints](#api-endpoints)
5. [Code Examples](#code-examples)
6. [Error Handling](#error-handling)
7. [Rate Limits](#rate-limits)
8. [Best Practices](#best-practices)

---

## Overview

### Integration Flow

```
1. User purchases tool on 1sub.io
2. User redirected to your tool with JWT token
3. Your tool verifies token with 1sub API
4. User uses your tool
5. Your tool consumes credits via API key
```

---

## Getting Your API Key

1. **Publish your tool** on 1sub.io vendor dashboard
2. **Receive API key** (shown once, save it securely!)
3. **Store API key** in your environment variables

```bash
# .env
ONESUB_API_KEY=sk-tool-xxxxxxxxxxxx
```

**Important:** API keys are shown ONLY ONCE. If lost, regenerate from vendor dashboard.

---

## User Purchase Flow

### 1. User Purchases Your Tool

User completes purchase on 1sub.io and is redirected to your tool:

```
https://your-tool.com?token=eyJhbGciOiJIUzI1NiIs...
```

### 2. Extract Token from URL

```javascript
// JavaScript/Node.js
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
```

```python
# Python/Flask
from flask import request
token = request.args.get('token')
```

### 3. Verify Token

Call `/api/v1/verify-user` to verify the token and get user info.

---

## API Endpoints

### Base URL
```
https://1sub.io
```

---

### 1. Verify User Token

**Endpoint:** `POST /api/v1/verify-user`

**Purpose:** Verify JWT token and get user information

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "tool_id": "660e8400-e29b-41d4-a716-446655440000",
  "checkout_id": "770e8400-e29b-41d4-a716-446655440000",
  "expires_at": "2025-11-05T15:30:00.000Z"
}
```

**Error Response (401):**
```json
{
  "error": "Token expired",
  "message": "The provided token has expired"
}
```

**Rate Limit:** 60 requests per minute per IP

---

### 2. Consume Credits

**Endpoint:** `POST /api/v1/credits/consume`

**Purpose:** Deduct credits from user for tool usage

**Headers:**
```
Authorization: Bearer sk-tool-xxxxxxxxxxxx
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 10,
  "reason": "Generated 1 image",
  "idempotency_key": "unique-request-id-12345"
}
```

**Field Requirements:**
- `user_id`: UUID format, from verify-user response
- `amount`: Positive number, max 1,000,000
- `reason`: String, 1-500 characters, description of usage
- `idempotency_key`: Unique string per request, prevents duplicates

**Success Response (200):**
```json
{
  "success": true,
  "new_balance": 90,
  "transaction_id": "880e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (400 - Insufficient Credits):**
```json
{
  "error": "Insufficient credits",
  "message": "User does not have sufficient credits",
  "current_balance": 5,
  "required": 10,
  "shortfall": 5
}
```

**Error Response (401 - Invalid API Key):**
```json
{
  "error": "Invalid API key",
  "message": "The provided API key is invalid or does not exist"
}
```

**Rate Limit:** 100 requests per minute per API key

---

## Code Examples

### Node.js / Express

```javascript
const express = require('express');
const axios = require('axios');

const app = express();
const ONESUB_API_KEY = process.env.ONESUB_API_KEY;

// Step 1: Handle redirect from 1sub
app.get('/auth/callback', async (req, res) => {
  const token = req.query.token;
  
  if (!token) {
    return res.status(400).send('Missing token');
  }

  try {
    // Step 2: Verify token
    const verifyResponse = await axios.post(
      'https://1sub.io/api/v1/verify-user',
      { token },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const { user_id, tool_id } = verifyResponse.data;

    // Step 3: Store user session
    req.session.userId = user_id;
    req.session.toolId = tool_id;

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Token verification failed:', error.response?.data);
    res.status(401).send('Authentication failed');
  }
});

// Step 4: Consume credits when user uses feature
app.post('/api/generate', async (req, res) => {
  const userId = req.session.userId;
  
  if (!userId) {
    return res.status(401).send('Not authenticated');
  }

  try {
    // Consume credits
    const consumeResponse = await axios.post(
      'https://1sub.io/api/v1/credits/consume',
      {
        user_id: userId,
        amount: 10,
        reason: 'Generated 1 image',
        idempotency_key: `${userId}-${Date.now()}`
      },
      {
        headers: {
          'Authorization': `Bearer ${ONESUB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { new_balance } = consumeResponse.data;

    // Perform your tool's action
    const result = await yourToolFunction();

    res.json({
      success: true,
      result,
      credits_remaining: new_balance
    });

  } catch (error) {
    if (error.response?.status === 400) {
      // Insufficient credits
      return res.status(400).json({
        error: 'insufficient_credits',
        message: error.response.data.message
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000);
```

---

### Python / Flask

```python
import os
import requests
from flask import Flask, request, session, jsonify
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your-secret-key'
ONESUB_API_KEY = os.environ['ONESUB_API_KEY']

# Step 1: Handle redirect from 1sub
@app.route('/auth/callback')
def auth_callback():
    token = request.args.get('token')
    
    if not token:
        return 'Missing token', 400
    
    try:
        # Step 2: Verify token
        response = requests.post(
            'https://1sub.io/api/v1/verify-user',
            json={'token': token},
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Step 3: Store user session
        session['user_id'] = data['user_id']
        session['tool_id'] = data['tool_id']
        
        return redirect('/dashboard')
        
    except requests.exceptions.HTTPError as e:
        print(f'Token verification failed: {e.response.text}')
        return 'Authentication failed', 401

# Step 4: Consume credits when user uses feature
@app.route('/api/generate', methods=['POST'])
def generate():
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        # Consume credits
        response = requests.post(
            'https://1sub.io/api/v1/credits/consume',
            json={
                'user_id': user_id,
                'amount': 10,
                'reason': 'Generated 1 image',
                'idempotency_key': f'{user_id}-{int(datetime.now().timestamp())}'
            },
            headers={
                'Authorization': f'Bearer {ONESUB_API_KEY}',
                'Content-Type': 'application/json'
            }
        )
        response.raise_for_status()
        
        data = response.json()
        new_balance = data['new_balance']
        
        # Perform your tool's action
        result = your_tool_function()
        
        return jsonify({
            'success': True,
            'result': result,
            'credits_remaining': new_balance
        })
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 400:
            # Insufficient credits
            return jsonify({
                'error': 'insufficient_credits',
                'message': e.response.json()['message']
            }), 400
        
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(port=3000)
```

---

## Error Handling

### Common Error Codes

| Code | Error | Cause | Solution |
|------|-------|-------|----------|
| 400 | Invalid request | Validation failed | Check request format |
| 401 | Unauthorized | Invalid API key or token | Verify credentials |
| 403 | Forbidden | Tool/API key inactive | Contact support |
| 409 | Duplicate request | Same idempotency_key | Use unique keys |
| 429 | Rate limit exceeded | Too many requests | Implement retry with backoff |
| 500 | Internal server error | Server issue | Retry with exponential backoff |

### Retry Strategy

```javascript
async function consumeCreditsWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.post(
        'https://1sub.io/api/v1/credits/consume',
        data,
        {
          headers: {
            'Authorization': `Bearer ${ONESUB_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
      
    } catch (error) {
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Retry on server errors (5xx) or network issues
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

---

## Rate Limits

### Current Limits

| Endpoint | Limit | Per | Identifier |
|----------|-------|-----|------------|
| /api/v1/verify-user | 60 | minute | IP address |
| /api/v1/credits/consume | 100 | minute | API key |
| Auth failures | 10 | 5 minutes | IP address |

### Rate Limit Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-11-05T15:30:00.000Z
Retry-After: 60
```

### Handling Rate Limits

```javascript
try {
  const response = await axios.post(/* ... */);
} catch (error) {
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    // Retry request
  }
}
```

---

## Best Practices

### 1. Security

✅ **DO:**
- Store API key in environment variables
- Use HTTPS for all API calls
- Validate user_id matches your session
- Implement CSRF protection
- Log security events

❌ **DON'T:**
- Hard-code API keys in source code
- Expose API keys in client-side code
- Store tokens in local storage
- Skip token validation

### 2. Idempotency

Always use unique idempotency keys to prevent duplicate charges:

```javascript
// Good: Unique per request
const idempotencyKey = `${userId}-${operationId}-${timestamp}`;

// Bad: Not unique
const idempotencyKey = userId; // Can cause duplicates
```

### 3. Credit Management

```javascript
// Check balance before expensive operations
async function safeGenerate(userId) {
  try {
    // Try to consume credits
    const result = await consumeCredits(userId, 10, 'Generate image');
    
    // Perform operation
    return await generateImage();
    
  } catch (error) {
    if (error.response?.status === 400) {
      // Show "insufficient credits" message to user
      return { error: 'insufficient_credits' };
    }
    throw error;
  }
}
```

### 4. Error Messages

Show user-friendly messages:

```javascript
const ERROR_MESSAGES = {
  'insufficient_credits': 'You don\'t have enough credits. Purchase more on 1sub.io',
  'token_expired': 'Session expired. Please purchase again.',
  'rate_limit': 'Too many requests. Please wait a moment.'
};

function getUserMessage(error) {
  return ERROR_MESSAGES[error.code] || 'Something went wrong. Please try again.';
}
```

### 5. Monitoring

Log important events:

```javascript
// Log credit consumption
console.log(`[CREDIT] User ${userId} consumed 10 credits. New balance: ${newBalance}`);

// Log errors
console.error(`[ERROR] Failed to consume credits: ${error.message}`, {
  userId,
  amount,
  error: error.response?.data
});
```

---

## Testing

### Test API Key

Request a test API key from 1sub support for development.

### Example Test

```bash
# Test token verification
curl -X POST https://1sub.io/api/v1/verify-user \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TEST_TOKEN"}'

# Test credit consumption
curl -X POST https://1sub.io/api/v1/credits/consume \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id":"550e8400-e29b-41d4-a716-446655440000",
    "amount":10,
    "reason":"Test",
    "idempotency_key":"test-123"
  }'
```

---

## Support

Need help? Contact:
- 📧 Email: support@1sub.io
- 📚 Documentation: https://1sub.io/docs
- 💬 Discord: https://discord.gg/1sub

---

**Happy Integrating! 🚀**

