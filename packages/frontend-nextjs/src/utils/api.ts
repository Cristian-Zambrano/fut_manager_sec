/**
 * Utility function to get the API base URL from environment variables
 */
export const getApiUrl = (path: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${baseUrl}/${cleanPath}`
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

  return fetch(url, {
    ...options,
    headers,
  })
}
