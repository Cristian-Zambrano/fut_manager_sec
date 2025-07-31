/**
 * Utility function to get the API base URL from environment variables
 */
export const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
  console.log('🔗 API Base URL:', baseUrl) // Debug log
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const fullUrl = `${baseUrl}/${cleanPath}`
  console.log('🎯 Full API URL:', fullUrl) // Debug log
  return fullUrl
}

/**
 * Utility function to make authenticated API calls
 */
export const apiCall = async (
  path: string, 
  options: RequestInit = {}, 
  token?: string
): Promise<Response> => {
  const url = getApiUrl(path)
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  }

  console.log('📡 Making API call to:', url) // Debug log
  console.log('🔑 With headers:', headers) // Debug log

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })
    
    console.log('📨 Response status:', response.status) // Debug log
    return response
  } catch (error) {
    console.error('❌ API call failed:', error) // Debug log
    throw error
  }
}
