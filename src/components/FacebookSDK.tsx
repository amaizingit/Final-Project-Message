import React, { useEffect } from 'react';

/**
 * FacebookSDK
 * 
 * Handles the asynchronous loading and initialization of the Facebook JS SDK.
 * Reads the App ID from VITE_FB_APP_ID environment variable.
 */
const FacebookSDK: React.FC = () => {
  useEffect(() => {
    const fbAppId = (import.meta as any).env.VITE_FB_APP_ID;

    if (!fbAppId) {
      console.error("VITE_FB_APP_ID is not defined in environment variables.");
      return;
    }

    // Define the async init function
    (window as any).fbAsyncInit = function() {
      (window as any).FB.init({
        appId: fbAppId,
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
    };

    // Load the SDK script
    (function(d, s, id) {
      let js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  return null; // Component does not render anything
};

export default FacebookSDK;
