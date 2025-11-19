# Accessing JWT in Spring Boot OAuth2 Resource Server

## Solution 1: Use @AuthenticationPrincipal with Jwt (RECOMMENDED)

```java
@GetMapping("/api/hello")
public String hello(@AuthenticationPrincipal Jwt jwt) {
    String username = jwt.getClaimAsString("preferred_username");
    return "Hello " + username;
}
```

**Why this works:**
- `@AuthenticationPrincipal` extracts the principal from the Authentication object
- For JWT authentication, the principal is the `Jwt` object itself
- Direct access to all JWT claims

## Solution 2: Use JwtAuthenticationToken without @AuthenticationPrincipal

```java
@GetMapping("/api/hello")
public String hello(JwtAuthenticationToken jwtAuth) {
    Jwt jwt = jwtAuth.getToken();
    String username = jwt.getClaimAsString("preferred_username");
    return "Hello " + username;
}
```

**Why this works:**
- Spring automatically injects the Authentication object (which is JwtAuthenticationToken)
- You then extract the Jwt from it
- Access to both JWT claims and Spring Security authorities

## Solution 3: Use Authentication parameter (Most Flexible)

```java
@GetMapping("/api/hello")
public String hello(Authentication authentication) {
    if (authentication instanceof JwtAuthenticationToken) {
        JwtAuthenticationToken jwtAuth = (JwtAuthenticationToken) authentication;
        Jwt jwt = jwtAuth.getToken();
        String username = jwt.getClaimAsString("preferred_username");
        return "Hello " + username;
    }
    return "Hello " + authentication.getName();
}
```

**Why this works:**
- Most generic approach
- Works with any authentication type
- Safe casting with type checking

## Solution 4: Combine Jwt and Authentication (BEST PRACTICE)

```java
@GetMapping("/api/hello")
public Map<String, Object> hello(@AuthenticationPrincipal Jwt jwt, Authentication authentication) {
    Map<String, Object> response = new HashMap<>();
    
    // Get user info from JWT
    response.put("username", jwt.getClaimAsString("preferred_username"));
    response.put("email", jwt.getClaimAsString("email"));
    
    // Get roles/authorities from Authentication
    response.put("roles", authentication.getAuthorities());
    
    return response;
}
```

**Why this is best:**
- Direct access to JWT claims
- Access to Spring Security authorities
- Clean and readable code

## Common JWT Claims from Keycloak

### Standard Claims
```java
jwt.getSubject()                    // User ID
jwt.getIssuer()                     // Keycloak URL
jwt.getIssuedAt()                   // Token issue time
jwt.getExpiresAt()                  // Token expiration time
```

### Keycloak-Specific Claims
```java
jwt.getClaimAsString("preferred_username")  // Username
jwt.getClaimAsString("email")               // Email
jwt.getClaimAsBoolean("email_verified")     // Email verified status
jwt.getClaimAsString("name")                // Full name
jwt.getClaimAsString("given_name")          // First name
jwt.getClaimAsString("family_name")         // Last name
```

### Role Claims
```java
// Realm roles
Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
List<String> realmRoles = (List<String>) realmAccess.get("roles");

// Client roles
Map<String, Object> resourceAccess = jwt.getClaimAsMap("resource_access");
Map<String, Object> clientAccess = (Map<String, Object>) resourceAccess.get("your-client-id");
List<String> clientRoles = (List<String>) clientAccess.get("roles");
```

## Complete Example Controller

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class HelloController {

    // Simple hello with username
    @GetMapping("/hello")
    public String hello(@AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        return "Hello " + (username != null ? username : jwt.getSubject());
    }

    // Detailed user info
    @GetMapping("/user")
    public Map<String, Object> getUserInfo(@AuthenticationPrincipal Jwt jwt, 
                                           Authentication authentication) {
        Map<String, Object> userInfo = new HashMap<>();
        
        // Basic info
        userInfo.put("username", jwt.getClaimAsString("preferred_username"));
        userInfo.put("email", jwt.getClaimAsString("email"));
        userInfo.put("name", jwt.getClaimAsString("name"));
        
        // Roles
        userInfo.put("roles", authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
        
        // Token info
        userInfo.put("subject", jwt.getSubject());
        userInfo.put("expiresAt", jwt.getExpiresAt());
        
        return userInfo;
    }

    // Role-based endpoint
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminOnly(@AuthenticationPrincipal Jwt jwt) {
        return "Hello Admin: " + jwt.getClaimAsString("preferred_username");
    }
}
```

## Important Notes

### ❌ Don't Do This
```java
// WRONG - @AuthenticationPrincipal expects Jwt, not JwtAuthenticationToken
@GetMapping("/hello")
public String hello(@AuthenticationPrincipal JwtAuthenticationToken jwt) {
    return "Hello";
}
```

### ✅ Do This Instead
```java
// CORRECT - Use Jwt with @AuthenticationPrincipal
@GetMapping("/hello")
public String hello(@AuthenticationPrincipal Jwt jwt) {
    return "Hello";
}

// OR use JwtAuthenticationToken without @AuthenticationPrincipal
@GetMapping("/hello")
public String hello(JwtAuthenticationToken jwtAuth) {
    Jwt jwt = jwtAuth.getToken();
    return "Hello";
}
```

## Null Safety

Always check for null values:

```java
@GetMapping("/hello")
public String hello(@AuthenticationPrincipal Jwt jwt) {
    String username = jwt.getClaimAsString("preferred_username");
    
    // Keycloak might not include preferred_username
    if (username == null) {
        username = jwt.getSubject(); // Fallback to subject (always present)
    }
    
    return "Hello " + username;
}
```

## Type-Safe Claim Access

```java
// String claim
String email = jwt.getClaimAsString("email");

// Boolean claim
Boolean verified = jwt.getClaimAsBoolean("email_verified");

// Instant/Date claim
Instant issuedAt = jwt.getIssuedAt();
Instant expiresAt = jwt.getExpiresAt();

// Map claim
Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");

// List claim (need to cast)
List<String> audiences = jwt.getAudience();

// Generic claim (need to cast)
Object customClaim = jwt.getClaim("custom_claim");
```

## Testing Your Changes

### 1. Start the Application
```bash
mvn spring-boot:run
```

### 2. Get a Token
```bash
TOKEN=$(curl -s -X POST 'http://localhost:8080/realms/myrealm/protocol/openid-connect/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_id=react-app' \
  -d 'username=testuser' \
  -d 'password=password' \
  -d 'grant_type=password' | jq -r '.access_token')
```

### 3. Test the Endpoint
```bash
# Test basic hello
curl -X GET 'http://localhost:8081/api/hello' \
  -H "Authorization: Bearer $TOKEN"

# Test different methods
curl -X GET 'http://localhost:8081/api/examples/method1' \
  -H "Authorization: Bearer $TOKEN"

curl -X GET 'http://localhost:8081/api/examples/method4' \
  -H "Authorization: Bearer $TOKEN"

# Test JWT claims
curl -X GET 'http://localhost:8081/api/examples/claims' \
  -H "Authorization: Bearer $TOKEN"
```

## Key Takeaways

1. **Use `@AuthenticationPrincipal Jwt`** - Simplest and most direct
2. **Use `JwtAuthenticationToken` without `@AuthenticationPrincipal`** - When you need authentication details
3. **Combine both** - When you need both JWT claims and authorities
4. **Always check for null** - Not all claims are guaranteed to be present
5. **Use type-safe methods** - `getClaimAsString()`, `getClaimAsBoolean()`, etc.

## Summary Table

| Pattern | Use Case | Example |
|---------|----------|---------|
| `@AuthenticationPrincipal Jwt` | Access JWT claims directly | `jwt.getClaimAsString("email")` |
| `JwtAuthenticationToken` | Need authentication + JWT | `jwtAuth.getToken()` |
| `Authentication` | Generic, works with any auth | Cast to `JwtAuthenticationToken` |
| Both Jwt + Authentication | Need claims + authorities | Best of both worlds |

---

**Now your JWT access is fixed and follows Spring Security best practices! ✅**

# Keycloak OAuth2 React App

A React + Vite application with Keycloak OAuth2/OIDC authentication, featuring session timeout after 5 minutes of inactivity.

## Features

- ✅ OAuth2/OIDC authentication with Keycloak
- ✅ Protected routes requiring authentication
- ✅ Automatic session expiration after 5 minutes of inactivity
- ✅ Display user roles from Keycloak
- ✅ Modern, responsive UI

## Prerequisites

Before running this application, you need to have:

1. **Node.js** (v16 or higher)
2. **Keycloak Server** running and configured

## Keycloak Setup

### 1. Install and Start Keycloak

Download Keycloak from [https://www.keycloak.org/downloads](https://www.keycloak.org/downloads) or run with Docker:

```bash
docker run -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:latest start-dev
```

### 2. Configure Keycloak

1. Access Keycloak admin console: `http://localhost:8080`
2. Login with admin credentials (admin/admin if using Docker command above)
3. Create a new realm (e.g., "myrealm") or use an existing one
4. Create a new client:
   - Client ID: `react-app` (or your preferred name)
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Valid Redirect URIs: `http://localhost:5173/*`
   - Web Origins: `http://localhost:5173`
5. Create users and assign roles as needed

### 3. Update Application Configuration

Edit `src/keycloak.js` with your Keycloak settings:

```javascript
const keycloak = new Keycloak({
  url: 'http://localhost:8080',  // Your Keycloak server URL
  realm: 'myrealm',               // Your realm name
  clientId: 'react-app',          // Your client ID
});
```

## Installation

```bash
# Install dependencies
npm install
```

## Running the Application

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## How It Works

### Authentication Flow

1. User visits the app and is redirected to `/login`
2. Clicking "Login with Keycloak" redirects to Keycloak login page
3. After successful authentication, user is redirected to `/secure` page
4. The secure page displays:
   - Personalized greeting
   - User information (email, name)
   - Assigned roles from Keycloak
   - Session timeout warning

### Session Timeout

- The app monitors user activity (mouse, keyboard, scroll, touch events)
- After 5 minutes of inactivity, the session automatically expires
- User is logged out and shown an alert
- Activity timer resets with each user interaction

### User Roles

The app displays both:
- **Realm roles**: Roles assigned at the realm level
- **Client roles**: Roles assigned specifically to this client

## Project Structure

```
src/
├── App.jsx                 # Main app component with routing
├── App.css                 # Global styles
├── AuthContext.jsx         # Authentication context and session management
├── keycloak.js            # Keycloak configuration
├── Login.jsx              # Login page component
├── Login.css              # Login page styles
├── SecurePage.jsx         # Protected page component
├── SecurePage.css         # Secure page styles
└── ProtectedRoute.jsx     # Route guard component
```

## Customization

### Change Session Timeout

Edit `INACTIVITY_TIMEOUT` in `src/AuthContext.jsx`:

```javascript
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
```

### Modify Authentication Behavior

Update the Keycloak initialization options in `src/AuthContext.jsx`:

```javascript
const auth = await keycloak.init({
  onLoad: 'check-sso',        // or 'login-required'
  checkLoginIframe: false,
  pkceMethod: 'S256'
});
```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Technologies Used

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Keycloak JS** - Keycloak JavaScript adapter
- **React Router** - Client-side routing

## Troubleshooting

### CORS Issues

Make sure your Keycloak client has the correct Web Origins configured (`http://localhost:5173` for development).

### Session Not Expiring

Check browser console for errors. Ensure the inactivity timer is properly initialized after authentication.

### Roles Not Showing

Verify that:
1. Roles are assigned to the user in Keycloak
2. The client has role mappings configured
3. The token includes the roles (check token in browser dev tools)

## License

MIT
