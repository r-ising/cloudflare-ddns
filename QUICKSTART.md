# Quick Start Guide

Get your FritzBox DDNS service running in 5 minutes!

## Prerequisites Checklist

- [ ] Cloudflare account
- [ ] Domain managed by Cloudflare
- [ ] Node.js installed (v16 or later)
- [ ] FritzBox router

## Step 1: Install Wrangler (2 minutes)

```bash
npm install -g wrangler
wrangler login
```

Follow the browser prompt to authenticate with Cloudflare.

## Step 2: Get Cloudflare Credentials (2 minutes)

### Get Zone ID:
1. Go to https://dash.cloudflare.com
2. Click your domain
3. Copy the **Zone ID** from the right sidebar (under API section)

### Create API Token:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use **Edit zone DNS** template
4. Select your zone
5. Click **Continue to summary** → **Create Token**
6. **Copy the token** (you won't see it again!)

## Step 3: Deploy Worker (1 minute)

```bash
git clone https://github.com/r-ising/cloudflare-ddns.git
cd cloudflare-ddns

# Set secrets
wrangler secret put DDNS_USERNAME
# Enter a username when prompted (e.g., "fritzbox")

wrangler secret put DDNS_PASSWORD
# Enter a secure password when prompted

wrangler secret put CLOUDFLARE_API_TOKEN
# Paste your API token

wrangler secret put CLOUDFLARE_ZONE_ID
# Paste your Zone ID

# Deploy!
wrangler deploy
```

After deployment, you'll see your worker URL like:
```
https://cloudflare-ddns.your-subdomain.workers.dev
```

**Save this URL!** You'll need it for FritzBox.

## Step 4: Configure FritzBox (1 minute)

1. Open http://fritz.box in your browser
2. Go to: **Internet** → **Permit Access** → **DynDNS**
3. Check **Use DynDNS**
4. Select **Custom**
5. Fill in:

   ```
   Update-URL: https://cloudflare-ddns.YOUR-SUBDOMAIN.workers.dev/update?hostname=<domain>&myip=<ipaddr>
   Domain Name: home.yourdomain.com
   Username: (the username you set in step 3)
   Password: (the password you set in step 3)
   ```

   **Important**: Replace `YOUR-SUBDOMAIN` with your actual worker subdomain, but keep `<domain>` and `<ipaddr>` exactly as shown!

6. Click **Apply**

## Step 5: Test (30 seconds)

Test from your computer:

```bash
curl -u "your-username:your-password" \
  "https://your-worker.workers.dev/update?hostname=home.yourdomain.com&myip=1.2.3.4"
```

Expected response:
```
good 1.2.3.4
```

Verify DNS:
```bash
dig home.yourdomain.com +short
```

You should see: `1.2.3.4`

## Done! 🎉

Your FritzBox will now automatically update DNS when your IP changes.

## Next Steps

- Read [CONFIGURATION.md](CONFIGURATION.md) for detailed configuration options
- Check [EXAMPLES.md](EXAMPLES.md) for advanced usage and troubleshooting
- Monitor updates with: `wrangler tail`

## Troubleshooting

### "badauth" error
- Double-check username and password in FritzBox match the secrets you set
- Re-set secrets: `wrangler secret put DDNS_USERNAME`

### "911" error
- Verify API token has DNS edit permissions
- Check Zone ID is correct: `wrangler secret list`

### DNS not updating
- View logs: `wrangler tail`
- Check Cloudflare dashboard for the DNS record
- Verify hostname is in the correct zone

### FritzBox shows "Update failed"
- Check Update-URL format
- Ensure `<domain>` and `<ipaddr>` are placeholders (not replaced)
- Test with curl first

## Support

- Issues: https://github.com/r-ising/cloudflare-ddns/issues
- Documentation: [README.md](README.md)
- Examples: [EXAMPLES.md](EXAMPLES.md)
