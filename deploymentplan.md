# Production Deployment & Hosting Plan
**Project:** Flour Mill  
**Document:** `deploymentplan.md`  
**Date:** September 2026  

---

## 1. Architecture Overview (Frontend, Backend & Database)

Before choosing a host, it is important to understand how this application is structured:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│  (Owner Dashboard / Customer Portal / Receipt Printing)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (Port 443)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Unified Next.js 16 Application                │
│                                                             │
│  ┌────────────────────────────┐  ┌───────────────────────┐  │
│  │    Frontend (React 19)     │  │  Backend (API Routes) │  │
│  │  - Server Components (SSR) │  │  - /api/auth/*        │  │
│  │  - Client Components (UI)  │  │  - /api/orders/*      │  │
│  │  - Static assets & styles  │  │  - /api/customers/*   │  │
│  └────────────────────────────┘  │  - /api/owner/*       │  │
│                                  │  - /api/my/*          │  │
│                                  └───────────┬───────────┘  │
│                                              │              │
│       Native Addons: argon2 (C++ binary)     │              │
│       In-Memory Rate Limiting & Auth State  │              │
└──────────────────────────────────────────────┼──────────────┘
                                               │ TCP / Mongoose
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer (MongoDB)                  │
│       - MongoDB Atlas (Cloud) or Self-Hosted MongoDB        │
│       - Collections: Customers, Orders, Settings, etc.      │
└─────────────────────────────────────────────────────────────┘
```

### Key Takeaways:
1. **The Backend and Frontend are NOT separate projects**:  
   This application is a **Next.js Full-Stack Monolith**. The API routes (`/api/*`) and the user interface (`/owner`, `/my`, etc.) run inside the same single Node.js process. You only need to deploy **one** application service, not two.
2. **Database is MongoDB**:  
   Communicates over Mongoose via standard MongoDB connection URI (`MONGODB_URI`).
3. **Critical Native Dependency (`argon2`)**:  
   Used for enterprise-grade cryptographic hashing of owner passwords and customer PINs. Requires a Node.js runtime that supports compiled C++ addons (standard Linux x64 environment).
4. **Stateful In-Memory Components**:  
   Rate limiters (`RATE_LIMITS` for login and mutations) and connection pools thrive best on a persistent Node.js instance rather than cold-starting ephemeral serverless functions.

---

## 2. Where to Host the Database?

### Recommendation: MongoDB Atlas (Managed Cloud Database)
**Verdict:** **Strongly Recommended** for production.

* **Provider:** [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database)
* **Tier Options:**
  * **Free Shared Tier (M0):** 512 MB storage, shared RAM. Perfect for initial testing and small production pilot (up to tens of thousands of orders/customers).
  * **Serverless / Dedicated Tier (M10):** Scalable storage and automated daily backups for full business operations.
* **Why MongoDB Atlas?**
  * Automated security patches, SSL/TLS encryption in transit and at rest.
  * Easy backup snapshots (can restore to any point in time).
  * Managed connection pooling.
  * Simple connection string format: `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/flour_mill?retryWrites=true&w=majority`.

---

## 3. Where to Host the Application / Backend?

Here is a side-by-side comparison of the top hosting options:

| Hosting Option | Type | Cost | Pros | Cons | Recommendation Level |
|---|---|---|---|---|:---:|
| **Railway / Render** | Managed PaaS (Containers) | ~$5 – $7 / month (Free tiers for testing) | • Zero DevOps required<br>• Full Node.js runtime (Argon2 works out of the box)<br>• Automated Git deployments (`git push`)<br>• Persistent process (no serverless cold starts)<br>• Free automatic SSL certificates | Costs slightly more than a raw VPS at high scale | ⭐⭐⭐⭐⭐ **Top Choice (Easiest & Most Reliable)** |
| **Ubuntu VPS (DigitalOcean / Hetzner / Hostinger)** | Virtual Private Server | ~$4 – $6 / month flat | • Complete control<br>• Cheapest long-term option<br>• Can run app + MongoDB on the same box if desired<br>• High CPU/RAM performance | Requires basic Linux setup (Nginx, PM2, Certbot SSL, firewall) | ⭐⭐⭐⭐ **Best for Lowest Cost & Full Control** |
| **Vercel** | Serverless Platform | Free / $20 mo | • Native Next.js platform<br>• Fast edge caching | • Ephemeral serverless functions reset in-memory rate-limit buckets<br>• Database connection spike risks without Prisma Data Proxy or Atlas serverless pooling<br>• Argon2 native binary size limits | ⭐⭐⭐ **Good, but requires extra tuning** |

---

## 4. Recommended Production Setup

For a flour mill business requiring high reliability, no maintenance headaches, and fast performance:

### Primary Recommendation: **Railway or Render + MongoDB Atlas**
- **Hosting:** [Railway.app](https://railway.app/) or [Render.com](https://render.com/) (Web Service running Node.js 20 or 22).
- **Database:** MongoDB Atlas (AWS Mumbai `ap-south-1` region for lowest latency in India).
- **Domain:** Any custom domain (e.g. `millname.in` or `.com`) connected with free automated SSL.

---

## 5. Pre-Deployment Configuration & Checklist

### 1. Environment Variables (`.env.production`)
Ensure the following variables are configured in your hosting dashboard:

```ini
# Production Environment
NODE_ENV=production

# Database (From MongoDB Atlas)
MONGODB_URI=mongodb+srv://dbuser:StrongPassword@cluster0.xxxxx.mongodb.net/flour_mill_prod?retryWrites=true&w=majority

# App Domain & Security
NEXT_PUBLIC_APP_URL=https://your-domain.com
SESSION_SECRET=create-a-random-64-character-hex-string-for-cookie-encryption
SESSION_TTL=1209600
SESSION_IDLE_TTL=1800
AUTH_COOKIE_SECURE=true

# Reverse Proxy Trust (Set to "true" on Railway/Render/Nginx)
TRUST_PROXY=true

# Owner Default Admin Credentials (Used on initial seed)
OWNER_NAME=Mill Owner
OWNER_EMAIL=owner@yourmill.com
OWNER_PASSWORD=SelectAStrongAdminPassword123!
```

> **Generating SESSION_SECRET:**  
> Run this command in terminal to create a secure random string:  
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

### 2. Initial Owner Account Setup (Database Seed)
When connecting to a brand new production database for the first time, initialize the owner account by running the seed script once:
```bash
node scripts/seed-admin.mjs
```
*(This creates the owner admin document in the database using `OWNER_EMAIL` and `OWNER_PASSWORD`).*

---

### 3. Note on Content Security Policy (`next.config.ts`)
In [next.config.ts](file:///c:/Users/ASUS/OneDrive/Desktop/Free-Lance/FlourMill--Kadus/next.config.ts), there is a strict production CSP header:
```typescript
"script-src 'self'",
```
In Next.js, production client hydration scripts sometimes need `'unsafe-inline'` or script hashes depending on the exact build output. When deploying, verify in browser console that scripts hydrate without CSP violations. If blocked, adjust `script-src 'self' 'unsafe-inline'` or use Next.js nonce headers.

---

## 6. Step-by-Step Deployment Guides

### Option A: Deploy to Railway (Fastest, ~10 Minutes)

1. **Set up MongoDB Atlas:**
   - Go to [mongodb.com/atlas](https://www.mongodb.com/atlas).
   - Create a free cluster in AWS Mumbai (`ap-south-1`).
   - Create a database user (e.g. `appuser`) and note the password.
   - Under **Network Access**, add `0.0.0.0/0` (Allow access from anywhere).
   - Click **Connect** → **Drivers** and copy the `mongodb+srv://...` URI.

2. **Deploy Code to Railway:**
   - Push your code repository to GitHub (Private repository).
   - Go to [railway.app](https://railway.app/) and sign in with GitHub.
   - Click **New Project** → **Deploy from GitHub repo** → select this repository.
   - Go to **Settings** → **Variables** and add all environment variables listed in Section 5.
   - Set Build Command: `npm run build`
   - Set Start Command: `npm start`
   - Railway will build and deploy your app with a public `*.up.railway.app` URL and free SSL.
   - Go to **Settings** → **Networking** → **Custom Domain** to link your custom domain (e.g. `mill.yourbusiness.com`).

3. **Initialize Admin:**
   - In Railway dashboard, open the **CLI / Terminal** tab on your deployed service.
   - Run: `node scripts/seed-admin.mjs`
   - You can now log into `/login` with your configured owner credentials!

---

### Option B: Deploy to an Ubuntu VPS (DigitalOcean / Hetzner / AWS EC2)

For maximum control and lowest fixed monthly cost ($4–$6/mo):

1. **Server Setup:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git nginx
   # Install Node.js 22 LTS
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   # Install PM2 Process Manager
   sudo npm install -g pm2
   ```

2. **Clone and Build Application:**
   ```bash
   git clone <your-repo-url> /var/www/flour-mill
   cd /var/www/flour-mill
   npm ci
   cp .env.example .env.local  # Fill in production values
   npm run build
   node scripts/seed-admin.mjs # Seed initial owner
   ```

3. **Start Application with PM2:**
   ```bash
   pm2 start npm --name "flour-mill" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx Reverse Proxy (`/etc/nginx/sites-available/flourmill`):**
   ```nginx
   server {
       server_name yourmilldomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/flourmill /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

5. **Install Free SSL Certificate (Certbot):**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourmilldomain.com
   ```

---

## 7. Post-Deployment Maintenance & Operations

1. **Daily Database Backups:**
   - In MongoDB Atlas, enable automated backup snapshots under cluster settings.
2. **Monitoring & Health Checks:**
   - The application provides a health endpoint at `/api/health` returning database connectivity status. Configure an uptime monitor (e.g. UptimeRobot or BetterStack - both free) pointing to `https://your-domain.com/api/health`.
3. **Admin Password & 2FA:**
   - Immediately upon first login, navigate to `/owner/settings` to configure TOTP Two-Factor Authentication (authenticator app) for the owner.
