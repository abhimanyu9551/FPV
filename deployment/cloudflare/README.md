# Cloudflare Tunnel — FPV Dashboard

Expose your local FPV dashboard securely without port forwarding or Vercel.

## Prerequisites

1. Free Cloudflare account
2. A domain managed by Cloudflare (or use `*.cfargotunnel.com`)
3. `cloudflared` installed on your machine

## Install cloudflared

**Windows:**
```powershell
winget install --id Cloudflare.cloudflared
```

**Mac:**
```bash
brew install cloudflared
```

## One-Time Setup

```bash
# 1. Authenticate
cloudflared tunnel login

# 2. Create tunnel
cloudflared tunnel create fpv-dashboard

# 3. Note the tunnel ID from output (e.g., abc123-...)
```

## Create Config File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /Users/<you>/.cloudflared/<YOUR_TUNNEL_ID>.json

ingress:
  - hostname: fpv.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

## Create DNS Record

```bash
cloudflared tunnel route dns fpv-dashboard fpv.yourdomain.com
```

## Run Tunnel

**Manually (dev):**
```bash
cloudflared tunnel run fpv-dashboard
```

**As a service (auto-start):**
```bash
# Windows
cloudflared service install
# Mac
sudo cloudflared service install
```

## Access

Once running, your dashboard is accessible at `https://fpv.yourdomain.com` from any device on any network — including your phone.

## Telegram Bot Integration

Update `FINANCE_API_BASE_URL` in `apps/telegram-bot/.env` to use your tunnel URL:

```env
FINANCE_API_BASE_URL=https://fpv.yourdomain.com
```

This lets the Raspberry Pi bot reach the dashboard even when you're away from home.
