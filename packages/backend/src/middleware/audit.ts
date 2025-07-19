import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../index'
import type { AuthContext } from './auth'

export interface AuditLogData {
  action: string
  resource_type: string
  resource_id?: string
  request_data?: any
  response_data?: any
}

// Audit logging middleware for security requirement S-02 (FAU_GEN.1.2)
export const auditMiddleware = createMiddleware<{ 
  Bindings: Env, 
  Variables: AuthContext & { auditLog: (data: AuditLogData) => Promise<void> }
}>(
  async (c, next) => {
    const startTime = Date.now()
    const requestData = {
      method: c.req.method,
      url: c.req.url,
      headers: Object.fromEntries(c.req.header()),
      body: c.req.method !== 'GET' ? await c.req.text() : undefined
    }

    // Create audit logging function
    const auditLog = async (data: AuditLogData) => {
      try {
        const supabase = createClient(
          c.env.SUPABASE_URL,
          c.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )

        const user = c.get('user')
        const clientIP = c.req.header('CF-Connecting-IP') || 
                        c.req.header('X-Forwarded-For') || 
                        c.req.header('X-Real-IP') || 
                        'unknown'

        await supabase
          .from('audit_logs')
          .insert({
            user_id: user?.id || null,
            action: data.action,
            resource_type: data.resource_type,
            resource_id: data.resource_id || null,
            request_data: {
              ...requestData,
              ...data.request_data
            },
            response_data: data.response_data,
            ip_address: clientIP,
            user_agent: c.req.header('User-Agent') || 'unknown',
            created_at: new Date().toISOString()
          })
      } catch (error) {
        // Don't fail the request if audit logging fails, but log the error
        console.error('Audit logging failed:', error)
      }
    }

    // Set audit log function in context
    c.set('auditLog', auditLog)

    await next()

    // Log the request after completion
    const endTime = Date.now()
    const responseTime = endTime - startTime

    // Extract response data if it's JSON
    let responseData
    try {
      const response = c.res.clone()
      const responseText = await response.text()
      responseData = {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        responseTime
      }
    } catch (error) {
      responseData = {
        status: c.res.status,
        responseTime,
        error: 'Could not extract response data'
      }
    }

    // Auto-log the request
    await auditLog({
      action: `${c.req.method} ${new URL(c.req.url).pathname}`,
      resource_type: 'api_request',
      response_data: responseData
    })
  }
)

// Helper function for specific audit actions
export const logAuditAction = async (
  c: any,
  action: string,
  resourceType: string,
  resourceId?: string,
  additionalData?: any
) => {
  const auditLog = c.get('auditLog')
  if (auditLog) {
    await auditLog({
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      request_data: additionalData
    })
  }
}
