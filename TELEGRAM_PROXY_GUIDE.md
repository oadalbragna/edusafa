# Telegram Media Proxy System - Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Usage](#usage)
7. [API Reference](#api-reference)
8. [Security](#security)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Portability Guide](#portability-guide)

---

## 🎯 Overview

The **Telegram Media Proxy System** is a complete solution for:

- ✅ **Obfuscating Telegram file URLs** - Hides `api.telegram.org` completely
- ✅ **Solving expired link problems** - Stores only `file_id` (never expires)
- ✅ **Fixing localhost issues** - Works in development and production
- ✅ **Smart caching** - 5-10 minute cache with auto-refresh
- ✅ **Streaming** - Memory-efficient file streaming
- ✅ **Rate limiting** - Protection against abuse
- ✅ **Error recovery** - Automatic retry with exponential backoff

### The Problem It Solves

**Before the proxy:**
```
https://api.telegram.org/file/bot8300515932:AAFOj6.../documents/lecture.pdf
```
❌ Exposes bot token  
❌ Links expire  
❌ Doesn't work on localhost  
❌ Security risk  

**After the proxy:**
```
/api/media?f=f_abc123xyz
```
✅ No exposed tokens  
✅ Never expires (file_id based)  
✅ Works everywhere  
✅ Fully secure  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│                                                              │
│  <img src="/api/media?f=f_abc123" />                        │
│  <video src="/api/media?f=f_xyz789" />                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Request
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Proxy Layer (Vite/Express)                  │
│                                                              │
│  /api/media?f=f_abc123                                      │
│       ↓                                                      │
│  1. Validate file_id                                         │
│  2. Check rate limit                                         │
│  3. Check cache (TTL: 10 min)                                │
│  4. If cache miss → fetch from Telegram                      │
│  5. Stream file to client                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ fetch() with bot token
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Telegram Bot API                           │
│                                                              │
│  1. getFile(file_id) → file_path                            │
│  2. Download from:                                           │
│     api.telegram.org/file/botTOKEN/file_path                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
proxy/
├── src/
│   ├── services/
│   │   └── telegramService.ts      # Core Telegram API service
│   ├── middleware/
│   │   ├── mediaHandler.ts         # /api/media endpoint handler
│   │   └── security.ts             # CORS & security middleware
│   ├── utils/
│   │   ├── logger.ts               # Logging system
│   │   └── rateLimiter.ts          # Rate limiting
│   ├── types/
│   │   └── index.ts                # TypeScript definitions
│   ├── vitePlugin.ts               # Vite dev server integration
│   └── index.ts                    # Public exports
├── __tests__/                      # Test files
└── package.json                    # Module metadata

api/
└── server.ts                       # Production Express server
```

---

## ✨ Features

### 1. URL Obfuscation
All Telegram file URLs are hidden behind `/api/media` endpoint.

### 2. Smart Caching
- **TTL**: 10 minutes (configurable)
- **Auto-refresh**: Automatically renews expired URLs
- **Grace period**: 1-minute grace for failed refreshes

### 3. Retry Logic
- **Max retries**: 3 attempts (configurable)
- **Exponential backoff**: 1s → 2s → 4s
- **Fallback**: Uses expired cache if refresh fails

### 4. Rate Limiting
- **Window**: 1 minute (configurable)
- **Max requests**: 30 per IP (configurable)
- **Headers**: Returns rate limit info in response headers

### 5. Streaming
- Memory-efficient streaming
- Supports large files
- Progress tracking

### 6. Error Handling
- 400: Invalid file_id
- 404: File not found
- 429: Rate limit exceeded
- 500: Internal server error

### 7. Logging
- Multiple levels: debug, info, warn, error
- Request tracking
- Performance metrics

---

## 📦 Installation

### Option 1: As Part of Existing Project (Recommended)

The proxy is already integrated into your project! No additional installation needed.

### Option 2: Copy to New Project

1. **Copy the `proxy/` directory** to your new project
2. **Install peer dependencies**:
   ```bash
   npm install vite  # Only if using Vite plugin
   ```

3. **Add to Vite config**:
   ```typescript
   // vite.config.ts
   import { viteTelegramProxyPlugin } from './proxy/src/vitePlugin';

   export default defineConfig({
     plugins: [
       viteTelegramProxyPlugin({
         cacheTTL: 600,
         maxRetries: 3,
         rateLimitWindow: 60000,
         rateLimitMaxRequests: 30
       })
     ]
   });
   ```

---

## ⚙️ Configuration

### Environment Variables

Add to your `.env` file:

```env
# Required
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
VITE_TELEGRAM_CHAT_ID=your_chat_id

# Optional - Proxy Settings
PROXY_CACHE_TTL=600                    # Cache TTL in seconds (default: 600 = 10 min)
PROXY_MAX_RETRIES=3                    # Max retry attempts (default: 3)
PROXY_RATE_LIMIT_WINDOW=60000          # Rate limit window in ms (default: 60000 = 1 min)
PROXY_RATE_LIMIT_MAX_REQUESTS=30       # Max requests per window (default: 30)
PROXY_LOG_LEVEL=info                   # Log level: debug, info, warn, error (default: info)
PROXY_ENABLE_LOGGING=true              # Enable/disable logging (default: true)
```

### Getting Telegram Credentials

1. **Bot Token**: Message `@BotFather` on Telegram → `/newbot` → follow instructions
2. **Chat ID**: Add your bot to a group/channel → use `@userinfobot` or visit:
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```
   Look for `"chat":{"id":-100xxxxxxxxxx}`

---

## 🚀 Usage

### Upload Files

The upload process is unchanged - use the existing `TelegramService.uploadFile()`:

```typescript
import { TelegramService } from '@services/telegram.service';

const result = await TelegramService.uploadFile(
  file,              // File object
  'lectures',        // Category
  'student_123'      // Target ID
);

// Returns:
// {
//   success: true,
//   url: '/api/media?f=f_abc123xyz',  // ← Proxy URL!
//   fileId: 'AgACAgIAAxkBAA...',
//   name: 'lecture.pdf',
//   shortId: 'f_abc123xyz'
// }
```

### Access Files

All file access goes through the proxy:

```html
<!-- Images -->
<img src="/api/media?f=f_abc123" />

<!-- Videos -->
<video src="/api/media?f=f_xyz789" controls />

<!-- PDFs (with PDF viewer) -->
<embed src="/api/media?f=f_pdf456" type="application/pdf" />

<!-- Downloads -->
<a href="/api/media?f=f_doc789" download>Download</a>
```

### Direct API Access

You can also access the proxy programmatically:

```typescript
// The proxy works with fetch() automatically
const response = await fetch('/api/media?f=f_abc123');
const blob = await response.blob();
```

---

## 🔌 API Reference

### `/api/media`

**Method**: GET

**Query Parameters**:
- `f` or `file` or `file_id` (string, required): The file identifier

**Response**:
- `200`: File stream (content varies by file type)
- `400`: Invalid or missing file_id
- `404`: File not found
- `429`: Rate limit exceeded
- `500`: Internal server error

**Headers**:
```
Content-Type: <detected from file>
Cache-Control: public, max-age=600
X-Content-Type-Options: nosniff
Accept-Ranges: bytes
Content-Length: <file size>
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 28
X-RateLimit-Reset: 1234567890
```

**Example**:
```
GET /api/media?f=f_abc123xyz

Response: 200 OK
Content-Type: application/pdf
Content-Length: 1234567

[Binary file data...]
```

---

## 🔒 Security

### 1. Token Protection
Bot token is **never exposed** to the client. All API calls happen server-side.

### 2. Rate Limiting
Prevents abuse with configurable rate limits per IP.

### 3. File ID Validation
Only valid file_id formats are accepted.

### 4. Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer`

### 5. CORS Control
Configurable CORS policy - restrict to your domain in production.

---

## 🌐 Production Deployment

### Option 1: Docker (Recommended)

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

### Option 2: Manual Deployment

1. **Build the app**:
   ```bash
   npm run build
   ```

2. **Install production dependencies**:
   ```bash
   npm install express cors helmet
   npm install -D @types/express @types/cors
   ```

3. **Start the server**:
   ```bash
   npx tsx api/server.ts
   ```

### Option 3: Serverless (Vercel, Netlify, etc.)

Create an API route:

```typescript
// api/media.ts (Vercel/Netlify)
import { MediaHandler } from '../proxy/src/middleware/mediaHandler';

const handler = new MediaHandler({
  botToken: process.env.VITE_TELEGRAM_BOT_TOKEN!,
  chatId: process.env.VITE_TELEGRAM_CHAT_ID!,
  cacheTTL: 600000,
  maxRetries: 3,
  rateLimitWindow: 60000,
  rateLimitMaxRequests: 30,
  enableLogging: true,
  logLevel: 'warn'
});

export default async (req: Request) => {
  return await handler.handle(req, req.headers.get('x-forwarded-for'));
};
```

---

## 🐛 Troubleshooting

### Problem: "Telegram credentials not configured"

**Solution**: Add `VITE_TELEGRAM_BOT_TOKEN` and `VITE_TELEGRAM_CHAT_ID` to your `.env` file.

### Problem: Files not loading on localhost

**Solution**: The Vite plugin should handle this automatically. Check:
1. Vite dev server is running (`npm run dev`)
2. Environment variables are set
3. Check browser console for errors

### Problem: "Rate limit exceeded"

**Solution**: You're making too many requests. Options:
1. Increase `PROXY_RATE_LIMIT_MAX_REQUESTS`
2. Increase `PROXY_RATE_LIMIT_WINDOW`
3. Check for infinite loops in your code

### Problem: Files expire or show 404

**Solution**: This should not happen with the proxy! The proxy stores only `file_id` and generates fresh URLs. Check:
1. File still exists on Telegram (bots can access it)
2. Bot token is still valid
3. Check logs for errors

### Problem: Slow file loading

**Solution**: 
1. Check your internet connection to Telegram servers
2. Increase cache TTL to reduce API calls
3. Enable debug logging to identify bottlenecks:
   ```env
   PROXY_LOG_LEVEL=debug
   ```

---

## 📦 Portability Guide

### Copying to Another Project

The proxy is designed to be **100% portable**:

1. **Copy the `proxy/` directory**
2. **Add environment variables** to new project's `.env`
3. **Integrate with Vite** (or use Express server)
4. **Done!** 🎉

### Minimal Integration

```typescript
// vite.config.ts
import { viteTelegramProxyPlugin } from './proxy/src/vitePlugin';

export default defineConfig({
  plugins: [viteTelegramProxyPlugin()]
});
```

That's it! The proxy handles everything automatically.

### Custom Configuration

```typescript
import { viteTelegramProxyPlugin } from './proxy/src/vitePlugin';

viteTelegramProxyPlugin({
  botToken: 'your-token',      // Or use env var
  chatId: 'your-chat-id',      // Or use env var
  cacheTTL: 300,               // 5 minutes
  maxRetries: 5,
  rateLimitWindow: 120000,     // 2 minutes
  rateLimitMaxRequests: 50,
  enableLogging: true,
  logLevel: 'debug'
})
```

---

## 📊 System Monitoring

### Cache Statistics

```typescript
import { MediaHandler } from './proxy/src/middleware/mediaHandler';

const handler = new MediaHandler(config);
const stats = handler.getStats();

console.log(stats);
// {
//   cache: {
//     total: 45,
//     active: 32,
//     expired: 13,
//     ttl: '600s'
//   },
//   rateLimiter: {
//     activeClients: 12
//   }
// }
```

### Health Check (Production)

```
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2025-04-05T12:00:00.000Z",
  "uptime": 12345.67,
  "proxy": {
    "cache": { ... },
    "rateLimiter": { ... }
  }
}
```

---

## 📚 Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Vite Plugin Development](https://vitejs.dev/guide/api-plugin.html)
- [Express.js Documentation](https://expressjs.com/)

---

## 📝 License

MIT - EduSafa Team
