/**
 * Cloudflare Worker for FritzBox DDNS Updates
 * 
 * This worker accepts DDNS update requests from FritzBox routers and updates
 * DNS records in Cloudflare.
 * 
 * FritzBox Configuration:
 * - Update-URL: https://your-worker.your-subdomain.workers.dev/update?hostname=<domain>&myip=<ipaddr>
 * - Domain Name: your-domain.com
 * - Username: configured in worker environment variables
 * - Password: configured in worker environment variables
 */

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env)
  }
}

async function handleRequest(request, env) {
  const url = new URL(request.url)
  
  // Only handle /update endpoint
  if (url.pathname !== '/update') {
    return new Response('Not Found', { status: 404 })
  }

  // Check Basic Authentication
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !await validateAuth(authHeader, env)) {
    return new Response('badauth - authentication failed', { 
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="DDNS"'
      }
    })
  }
  
  // Parse query parameters
  const hostname = url.searchParams.get('hostname')
  const myip = url.searchParams.get('myip')
  
  if (!hostname) {
    return new Response('badparam - hostname missing', { status: 400 })
  }
  
  // If IP not provided, use the client's IP
  const ipAddress = myip || request.headers.get('CF-Connecting-IP')
  
  if (!ipAddress) {
    return new Response('badparam - IP address missing', { status: 400 })
  }
  
  // Validate IP address format (IPv4 or IPv6)
  if (!isValidIP(ipAddress)) {
    return new Response('badparam - invalid IP address format', { status: 400 })
  }
  
  try {
    // Update DNS record
    const result = await updateDNSRecord(hostname, ipAddress, env)
    
    if (result.success) {
      // FritzBox expects specific success responses
      return new Response(`good ${ipAddress}`, { status: 200 })
    } else {
      return new Response(`911 - ${result.error}`, { status: 500 })
    }
  } catch (error) {
    console.error('Error updating DNS:', error)
    return new Response('911 - internal error', { status: 500 })
  }
}

/**
 * Validate Basic Authentication
 */
async function validateAuth(authHeader, env) {
  try {
    const [scheme, credentials] = authHeader.split(' ')
    
    if (scheme !== 'Basic' || !credentials) {
      return false
    }
    
    // atob can throw on invalid Base64 - wrapped in try-catch
    const decoded = atob(credentials)
    const [username, password] = decoded.split(':', 2)
    
    // Validate that both username and password exist
    if (!username || !password) {
      return false
    }
    
    // Check against environment variables
    // These should be set in your Cloudflare Worker settings
    const validUsername = env.DDNS_USERNAME
    const validPassword = env.DDNS_PASSWORD
    
    return username === validUsername && password === validPassword
  } catch (error) {
    console.error('Auth validation error:', error)
    return false
  }
}

/**
 * Validate IP address format
 */
function isValidIP(ip) {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  
  if (ipv4Pattern.test(ip)) {
    // Validate each octet is 0-255
    const octets = ip.split('.')
    return octets.every(octet => {
      const num = parseInt(octet, 10)
      return num >= 0 && num <= 255
    })
  }
  
  // IPv6 validation - comprehensive pattern covering:
  // - Full notation (8 groups of 4 hex digits): 2001:0db8:85a3:0000:0000:8a2e:0370:7334
  // - Compressed notation with :: : 2001:db8::1
  // - Edge cases: ::1 (localhost), :: (all zeros)
  // This regex handles all valid IPv6 formats per RFC 4291
  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::)$/
  
  return ipv6Pattern.test(ip)
}

/**
 * Update DNS record in Cloudflare
 */
async function updateDNSRecord(hostname, ipAddress, env) {
  const apiToken = env.CLOUDFLARE_API_TOKEN
  const zoneId = env.CLOUDFLARE_ZONE_ID
  
  if (!apiToken || !zoneId) {
    return {
      success: false,
      error: 'Missing Cloudflare API credentials'
    }
  }
  
  try {
    // Determine record type based on IP version
    const recordType = ipAddress.includes(':') ? 'AAAA' : 'A'
    
    // List existing DNS records for this hostname
    const listUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?type=${recordType}&name=${hostname}`
    const listResponse = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    const listData = await listResponse.json()
    
    if (!listData.success) {
      return {
        success: false,
        error: `Failed to list DNS records: ${JSON.stringify(listData.errors)}`
      }
    }
    
    const records = listData.result
    
    if (records.length === 0) {
      // Create new record
      const createUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: recordType,
          name: hostname,
          content: ipAddress,
          ttl: 120, // 2 minutes for dynamic DNS
          proxied: false
        })
      })
      
      const createData = await createResponse.json()
      
      if (!createData.success) {
        return {
          success: false,
          error: `Failed to create DNS record: ${JSON.stringify(createData.errors)}`
        }
      }
      
      return { success: true }
    } else {
      // Update existing record
      const recordId = records[0].id
      const currentIp = records[0].content
      
      // Skip update if IP hasn't changed
      if (currentIp === ipAddress) {
        return { success: true }
      }
      
      const updateUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: recordType,
          name: hostname,
          content: ipAddress,
          ttl: 120,
          proxied: false
        })
      })
      
      const updateData = await updateResponse.json()
      
      if (!updateData.success) {
        return {
          success: false,
          error: `Failed to update DNS record: ${JSON.stringify(updateData.errors)}`
        }
      }
      
      return { success: true }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
