# @lambda-edge-authorizers/example-auth0

Lambda@Edge Authorizer for Auth0, using the `createAuth0Provider` helper to create the Oauth Provider.

## Setup

- An Auth0 tenant.
  - Save the Auth0 Domain to be passed into `createAuth0Provider`.
- An Auth0 client for this tenant:
  - Created as a "Regular Web Application" or "Traditional web app using redirects".
  - Save the Client ID & Client Secret to be passed into `createAuth0Provider`.
- Deploy your Lambda@Edge function with the authorizer.
- Modify your Auth0 client to set the Application URIs:
  - **Application Login URI:** `https://${CloudfrontDomain}/auth/login`
  - **Allowed Callback URLs:** `https://${CloudfrontDomain}/auth/callback`
  - **Allowed Logout URLs:** `https://${CloudfrontDomain}/auth/logout`
- Try it out!
