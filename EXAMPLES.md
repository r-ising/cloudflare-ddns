# Examples and Testing

This document provides practical examples for testing and using the DDNS service.

## Manual Testing with curl

### Basic Update Request

```bash
curl -u "myusername:mypassword" \
  "https://your-worker.workers.dev/update?hostname=home.example.com&myip=1.2.3.4"
```

Expected response:
```
good 1.2.3.4
```

### Update with IPv6

```bash
curl -u "myusername:mypassword" \
  "https://your-worker.workers.dev/update?hostname=home.example.com&myip=2001:db8::1"
```

Expected response:
```
good 2001:db8::1
```

### Update Without Specifying IP (uses client IP)

```bash
curl -u "myusername:mypassword" \
  "https://your-worker.workers.dev/update?hostname=home.example.com"
```

Expected response:
```
good <your-actual-ip>
```

## Testing Error Conditions

### Missing Hostname

```bash
curl -u "myusername:mypassword" \
  "https://your-worker.workers.dev/update?myip=1.2.3.4"
```

Expected response:
```
badparam - hostname missing
```

### Invalid IP Address

```bash
curl -u "myusername:mypassword" \
  "https://your-worker.workers.dev/update?hostname=home.example.com&myip=999.999.999.999"
```

Expected response:
```
badparam - invalid IP address format
```

### Wrong Credentials

```bash
curl -u "wronguser:wrongpass" \
  "https://your-worker.workers.dev/update?hostname=home.example.com&myip=1.2.3.4"
```

Expected response:
```
badauth - authentication failed
```

### No Credentials

```bash
curl "https://your-worker.workers.dev/update?hostname=home.example.com&myip=1.2.3.4"
```

Expected response:
```
badauth - authentication failed
```

## FritzBox Configuration Examples

### Example 1: Simple Home Setup

**Scenario**: You have a home server at `home.example.com` and want FritzBox to keep it updated.

**FritzBox Configuration**:
- Update-URL: `https://cloudflare-ddns.yourname.workers.dev/update?hostname=<domain>&myip=<ipaddr>`
- Domain Name: `home.example.com`
- Username: `fritzbox-home`
- Password: `SecurePass123!`

### Example 2: Multiple Subdomains

**Scenario**: You run multiple services and want different subdomains.

For the first service (e.g., Plex):
- Domain Name: `plex.example.com`

For the second service (e.g., Home Assistant):
- Domain Name: `homeassistant.example.com`

Both can use the same Update-URL and credentials. Configure them as separate DynDNS profiles if FritzBox supports multiple entries, or update them one at a time.

### Example 3: IPv6 Only

**Scenario**: Your ISP provides IPv6 only.

FritzBox will automatically send your IPv6 address in the `myip` parameter. The worker will create AAAA records automatically.

**FritzBox Configuration**:
- Update-URL: `https://cloudflare-ddns.yourname.workers.dev/update?hostname=<domain>&myip=<ipaddr>`
- Domain Name: `home.example.com`
- Username: `fritzbox-ipv6`
- Password: `SecurePass456!`

### Example 4: Dual Stack (IPv4 + IPv6)

**Scenario**: You have both IPv4 and IPv6 addresses.

You'll need to configure FritzBox to update both. Some FritzBox models support this natively. Configure two separate profiles:

Profile 1 (IPv4):
- Domain Name: `home.example.com`
- Ensure FritzBox sends IPv4 address

Profile 2 (IPv6):
- Domain Name: `home.example.com` (same hostname)
- Ensure FritzBox sends IPv6 address

The worker will maintain both A and AAAA records for the same hostname.

## Verifying DNS Updates

After FritzBox sends an update, verify the DNS record was updated:

### Check A Record (IPv4)

```bash
dig A home.example.com +short
```

### Check AAAA Record (IPv6)

```bash
dig AAAA home.example.com +short
```

### Check from FritzBox

```bash
nslookup home.example.com 8.8.8.8
```

## Monitoring and Debugging

### View Worker Logs

```bash
wrangler tail
```

This will show real-time logs of all requests to your worker. Look for:
- Authentication attempts
- DNS update requests
- Error messages

### Test DNS Update via Cloudflare API

You can manually verify the Cloudflare API is working:

```bash
# List DNS records
curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/dns_records?name=home.example.com" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

### Simulate FritzBox Request

To test exactly what FritzBox sends:

```bash
# FritzBox sends GET request with Basic Auth
curl -v -u "username:password" \
  "https://your-worker.workers.dev/update?hostname=home.example.com&myip=1.2.3.4"
```

The `-v` flag shows verbose output including the request headers.

## Automated Testing Script

Save this as `test-ddns.sh`:

```bash
#!/bin/bash

WORKER_URL="https://your-worker.workers.dev"
USERNAME="your-username"
PASSWORD="your-password"
HOSTNAME="test.example.com"

echo "Testing DDNS Service..."
echo ""

# Test 1: Valid IPv4 update
echo "Test 1: Valid IPv4 update"
RESPONSE=$(curl -s -u "$USERNAME:$PASSWORD" "$WORKER_URL/update?hostname=$HOSTNAME&myip=1.2.3.4")
echo "Response: $RESPONSE"
echo ""

# Test 2: Valid IPv6 update
echo "Test 2: Valid IPv6 update"
RESPONSE=$(curl -s -u "$USERNAME:$PASSWORD" "$WORKER_URL/update?hostname=$HOSTNAME&myip=2001:db8::1")
echo "Response: $RESPONSE"
echo ""

# Test 3: Update without IP (uses client IP)
echo "Test 3: Update without IP"
RESPONSE=$(curl -s -u "$USERNAME:$PASSWORD" "$WORKER_URL/update?hostname=$HOSTNAME")
echo "Response: $RESPONSE"
echo ""

# Test 4: Missing hostname
echo "Test 4: Missing hostname (should fail)"
RESPONSE=$(curl -s -u "$USERNAME:$PASSWORD" "$WORKER_URL/update?myip=1.2.3.4")
echo "Response: $RESPONSE"
echo ""

# Test 5: Wrong credentials
echo "Test 5: Wrong credentials (should fail)"
RESPONSE=$(curl -s -u "wrong:wrong" "$WORKER_URL/update?hostname=$HOSTNAME&myip=1.2.3.4")
echo "Response: $RESPONSE"
echo ""

echo "Testing complete!"
```

Make it executable and run:

```bash
chmod +x test-ddns.sh
./test-ddns.sh
```

## Performance Considerations

### Expected Response Times

- Typical response time: 100-500ms
- With DNS update: 500-1000ms
- FritzBox retries on timeout after 30 seconds

### Rate Limiting

FritzBox typically updates:
- On IP change (immediate)
- Periodic refresh (every 24 hours)

This results in minimal requests. For production with multiple clients, consider implementing rate limiting.

## Common Integration Scenarios

### Scenario 1: Home Automation

Access your Home Assistant instance from anywhere:

1. Configure DDNS for `homeassistant.yourdomain.com`
2. Set up HTTPS with Let's Encrypt
3. Access your home automation from anywhere

### Scenario 2: Remote Access

Access your NAS or home computer:

1. Configure DDNS for `nas.yourdomain.com`
2. Set up port forwarding on FritzBox
3. Access your files remotely

### Scenario 3: Security Cameras

View security cameras remotely:

1. Configure DDNS for `cameras.yourdomain.com`
2. Set up VPN or secure access
3. Monitor your home from anywhere

## Troubleshooting with Examples

### Problem: "good" response but DNS not updating

**Debug steps**:

1. Check if request reached Cloudflare:
```bash
wrangler tail
```

2. Verify API token permissions:
```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

3. Check Zone ID matches your domain:
```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Problem: FritzBox shows "Update failed"

**Debug steps**:

1. Test the exact URL FritzBox uses:
```bash
curl -v -u "user:pass" "https://your-worker.workers.dev/update?hostname=domain.com&myip=1.2.3.4"
```

2. Check FritzBox logs (if available)

3. Verify Update-URL format has `<domain>` and `<ipaddr>` placeholders

### Problem: Authentication keeps failing

**Debug steps**:

1. List secrets:
```bash
wrangler secret list
```

2. Re-set credentials:
```bash
wrangler secret put DDNS_USERNAME
wrangler secret put DDNS_PASSWORD
```

3. Test with curl to verify credentials work:
```bash
curl -u "newuser:newpass" "https://your-worker.workers.dev/update?hostname=test.com&myip=1.2.3.4"
```

## Best Practices

1. **Test before deploying to FritzBox**: Always test with curl first
2. **Use strong passwords**: Generate random passwords
3. **Monitor logs initially**: Use `wrangler tail` when first setting up
4. **Keep credentials secure**: Never share or commit credentials
5. **Document your setup**: Keep notes on which domains use which workers
6. **Regular testing**: Periodically verify DNS updates are working
7. **Backup configuration**: Save your FritzBox configuration

## Advanced Usage

### Custom Response Messages

If you need different response formats, modify the worker's response handling.

### Multiple Zones

To support multiple Cloudflare zones, you could:
1. Deploy multiple workers (one per zone)
2. Modify the worker to accept zone as a parameter
3. Store multiple zone configurations

### Logging and Analytics

Add request logging to track:
- Update frequency
- IP changes
- Authentication attempts

Example addition to worker:

```javascript
// Log update
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  hostname: hostname,
  ip: ipAddress,
  success: true
}))
```

View logs with `wrangler tail`.
