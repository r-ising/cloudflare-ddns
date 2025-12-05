# Cloudflare DDNS for FritzBox

A Cloudflare Worker that provides a Dynamic DNS (DDNS) service compatible with FritzBox routers. This allows your FritzBox to automatically update DNS records in Cloudflare when your IP address changes.

## Features

- ✅ FritzBox DDNS protocol compatible
- ✅ Basic Authentication support
- ✅ IPv4 and IPv6 support
- ✅ Automatic DNS record creation and updates
- ✅ Cloudflare API integration
- ✅ Standard DDNS response codes

## Prerequisites

- A Cloudflare account
- A domain managed by Cloudflare
- Node.js and npm (for deployment)
- Wrangler CLI (Cloudflare Workers CLI)
- A FritzBox router

## Installation

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Clone this repository

```bash
git clone https://github.com/r-ising/cloudflare-ddns.git
cd cloudflare-ddns
```

### 3. Login to Cloudflare

```bash
wrangler login
```

### 4. Get your Cloudflare Zone ID

1. Go to your Cloudflare dashboard
2. Select your domain
3. Scroll down on the Overview page to find your Zone ID
4. Copy the Zone ID

### 5. Create a Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit zone DNS" template
4. Select your zone
5. Create the token and copy it

### 6. Configure secrets

Set up the required secrets using Wrangler:

```bash
# Set your DDNS username (you choose this)
wrangler secret put DDNS_USERNAME

# Set your DDNS password (you choose this)
wrangler secret put DDNS_PASSWORD

# Set your Cloudflare API token
wrangler secret put CLOUDFLARE_API_TOKEN

# Set your Cloudflare Zone ID
wrangler secret put CLOUDFLARE_ZONE_ID
```

### 7. Deploy the worker

```bash
wrangler deploy
```

After deployment, you'll get a URL like: `https://cloudflare-ddns.your-subdomain.workers.dev`

## FritzBox Configuration

1. Log into your FritzBox admin interface (usually http://fritz.box)
2. Go to **Internet** → **Permit Access** → **DynDNS**
3. Enable DynDNS and select **Custom**
4. Configure the following:

   - **Update-URL**: `https://your-worker.your-subdomain.workers.dev/update?hostname=<domain>&myip=<ipaddr>`
   - **Domain Name**: `subdomain.yourdomain.com` (the full hostname you want to update)
   - **Username**: The username you set in `DDNS_USERNAME`
   - **Password**: The password you set in `DDNS_PASSWORD`

5. Click **Apply**

## URL Parameters

The update endpoint supports the following FritzBox standard parameters:

- `hostname` (required): The full hostname to update (e.g., `home.example.com`)
- `myip` (optional): The IP address to set. If not provided, uses the client's IP address

Example:
```
https://your-worker.workers.dev/update?hostname=home.example.com&myip=1.2.3.4
```

## Response Codes

The service returns standard DDNS response codes:

- `good <ipaddr>` - Update successful
- `badauth` - Authentication failed
- `badparam` - Missing or invalid parameters
- `911` - Server error

## Testing

You can test the service using curl:

```bash
curl -u username:password \
  "https://your-worker.workers.dev/update?hostname=subdomain.yourdomain.com&myip=1.2.3.4"
```

Expected response: `good 1.2.3.4`

## Troubleshooting

### Authentication fails
- Verify your username and password are correctly set using `wrangler secret list`
- Check that FritzBox is sending the correct credentials

### DNS record not updating
- Verify your Cloudflare API token has DNS edit permissions
- Check that the Zone ID matches your domain
- View worker logs with `wrangler tail`

### FritzBox shows error
- Check the Update-URL format is correct
- Ensure `<domain>` and `<ipaddr>` placeholders are used (not replaced)
- Verify the hostname exists or can be created in your zone

## Security Notes

- Always use HTTPS for the update URL
- Store credentials as Worker secrets, never in code
- Use a strong, unique password for DDNS authentication
- Limit API token permissions to only DNS edit for the specific zone
- Consider IP-based rate limiting for production use

## Development

To test locally:

```bash
wrangler dev
```

This starts a local development server. You can test with:

```bash
curl -u testuser:testpass \
  "http://localhost:8787/update?hostname=test.example.com&myip=1.2.3.4"
```

## License

MIT License - feel free to use and modify as needed.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.