import { UserManager } from 'oidc-client-ts';

// OIDC Configuration
// NOTE: These values must match your Identity Provider (e.g., Keycloak) configuration
const settings = {
  authority: 'http://localhost:9191/realms/demo-realm', // The URL to your realm/issuer
  client_id: 'demo-client',                            // Your OIDC client ID
  redirect_uri: window.location.origin,                // Where to return after login/logout
  response_type: 'code',                               // Use PKCE flow for security
  scope: 'openid profile email',                       // Requested scopes
  post_logout_redirect_uri: window.location.origin,    // Where to return after logout
  monitorSession: true,                                // Monitor for session changes
  userStore: window.localStorage,                      // Store user state in local storage
};

// Create a UserManager instance
const userManager = new UserManager(settings);

/**
 * Initiates the OIDC login process.
 */
export const login = () => {
  return userManager.signinRedirect();
};

/**
 * Handles the redirect from the OIDC server after login.
 * This should be called on the `redirect_uri` page.
 */
export const handleRedirect = () => {
  return userManager.signinRedirectCallback();
};

/**
 * Retrieves the currently authenticated user (and their token).
 */
export const getUser = () => {
  return userManager.getUser();
};

/**
 * Initiates the OIDC logout process.
 */
export const logout = () => {
  return userManager.signoutRedirect();
};

/**
 * Gets the access token.
 * We rely on oidc-client-ts to automatically renew the token if necessary.
 */
export const getAccessToken = async () => {
  const user = await userManager.getUser();
  if (user && !user.expired) {
    return user.access_token;
  }
  // If user is null or expired, the system will need to re-login, 
  // which will be handled by the consuming service if token is null.
  return null;
};

// Export the UserManager and core functions
export default userManager;