import { InteractionRequiredAuthError } from '@azure/msal-browser';

export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID}`,
    redirectUri: process.env.REACT_APP_REDIRECT_URI,
  },
  cache: {
    cacheLocation: 'localStorage', // or 'sessionStorage'
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'Sites.Read.All', 'Files.Read.All'], // scopes you need
};

export async function getAccessToken(instance, account) {
  const request = {
    ...loginRequest,
    account,
  };

  try {
    const response = await instance.acquireTokenSilent(request);
    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const response = await instance.acquireTokenPopup(request);
      return response.accessToken;
    } else {
      console.error('Token acquisition failed:', error);
      throw error;
    }
  }
}

  