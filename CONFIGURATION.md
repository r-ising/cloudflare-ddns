# Configuration Guide

## Required Environment Variables

The worker requires four secret environment variables to function:

### 1. DDNS_USERNAME
The username for Basic Authentication. FritzBox will use this to authenticate.

**Example**: `fritzbox` or `ddns-user`

**How to set**:
```bash
wrangler secret put DDNS_USERNAME
```
Then enter your chosen username when prompted.

### 2. DDNS_PASSWORD
The password for Basic Authentication. Should be strong and unique.

**Example**: Use a password generator for a secure password

**How to set**:
```bash
wrangler secret put DDNS_PASSWORD
```
Then enter your chosen password when prompted.

### 3. CLOUDFLARE_API_TOKEN
A Cloudflare API token with DNS edit permissions for your zone.

**How to create**:
1. Visit https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use the "Edit zone DNS" template
4. Zone Resources: Include → Specific zone → Select your zone
5. Click "Continue to summary"
6. Click "Create Token"
7. Copy the token (you won't be able to see it again!)

**How to set**:
```bash
wrangler secret put CLOUDFLARE_API_TOKEN
```
Then paste your token when prompted.

### 4. CLOUDFLARE_ZONE_ID
Your Cloudflare Zone ID for the domain you want to update.

**How to find**:
1. Visit https://dash.cloudflare.com
2. Select your domain
3. Scroll down on the Overview page
4. Look for "Zone ID" in the API section on the right sidebar
5. Copy the Zone ID

**How to set**:
```bash
wrangler secret put CLOUDFLARE_ZONE_ID
```
Then paste your Zone ID when prompted.

## Verifying Secrets

To verify your secrets are set (without revealing their values):

```bash
wrangler secret list
```

This will show which secrets are configured.

## FritzBox Update URL Format

When configuring your FritzBox, use this exact URL format:

```
https://your-worker.your-subdomain.workers.dev/update?hostname=<domain>&myip=<ipaddr>
```

**Important**: 
- Replace `your-worker.your-subdomain.workers.dev` with your actual worker URL
- Keep `<domain>` and `<ipaddr>` exactly as shown (FritzBox will replace these automatically)
- The hostname parameter value `<domain>` will be replaced by FritzBox with the domain name you configure
- The myip parameter value `<ipaddr>` will be replaced by FritzBox with your current IP address

## Example FritzBox Configuration

Let's say:
- Your worker URL is: `https://cloudflare-ddns.myname.workers.dev`
- Your domain is: `home.example.com`
- Your DDNS username is: `fritzbox`
- Your DDNS password is: `SecurePassword123!`

FritzBox configuration:
- **Update-URL**: `https://cloudflare-ddns.myname.workers.dev/update?hostname=<domain>&myip=<ipaddr>`
- **Domain Name**: `home.example.com`
- **Username**: `fritzbox`
- **Password**: `SecurePassword123!`

## Supported DNS Record Types

The worker automatically determines the DNS record type based on the IP address:
- **IPv4 addresses** (e.g., `192.168.1.1`) → Creates/updates **A** records
- **IPv6 addresses** (e.g., `2001:db8::1`) → Creates/updates **AAAA** records

## DNS Record Settings

When creating or updating DNS records, the worker uses these settings:
- **TTL**: 120 seconds (2 minutes) - appropriate for dynamic IPs
- **Proxied**: false - direct DNS (required for accurate IP resolution)

## Testing Your Configuration

Before configuring FritzBox, test the endpoint manually:

```bash
curl -u "your-username:your-password" \
  "https://your-worker.workers.dev/update?hostname=home.example.com&myip=1.2.3.4"
```

Expected response:
```
good 1.2.3.4
```

If you see this response, your configuration is correct!

## Common Issues

### Issue: "badauth - authentication failed"
**Solution**: Check that:
- DDNS_USERNAME and DDNS_PASSWORD secrets are set correctly
- FritzBox is using the correct username and password
- No extra spaces in username or password

### Issue: "911 - Missing Cloudflare API credentials"
**Solution**: Ensure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID secrets are set

### Issue: DNS record not updating
**Solution**: 
- Check that the API token has "Edit" permission for DNS
- Verify the Zone ID matches your domain
- Check worker logs: `wrangler tail`

### Issue: "badparam - hostname missing"
**Solution**: Ensure the Update-URL includes `?hostname=<domain>`

## Security Best Practices

1. **Use strong passwords**: Generate a random password for DDNS_PASSWORD
2. **Limit API token scope**: Only grant DNS edit permission for the specific zone
3. **Use HTTPS**: Always use `https://` in your Update-URL
4. **Rotate credentials**: Periodically update your DDNS password and API token
5. **Monitor access**: Use `wrangler tail` to monitor worker requests

## Advanced Configuration

### Custom Worker Name

Edit `wrangler.toml` to change the worker name:

```toml
name = "my-custom-ddns"
```

Then deploy:
```bash
wrangler deploy
```

### Multiple Hostnames

The worker supports updating different hostnames. Each hostname must:
1. Be in the same Cloudflare zone
2. Use the same authentication credentials

Simply configure different FritzBox devices or profiles with different domain names.

### Rate Limiting

For production use, consider adding rate limiting to prevent abuse. This can be done with Cloudflare's Rate Limiting feature or by implementing it in the worker code.
