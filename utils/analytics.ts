// Analytics tracking utility for production
// Replace with your actual analytics provider (Google Analytics, Mixpanel, etc.)

export const analytics = {
  page: (path: string) => {
    if (import.meta.env.PROD) {
      // Example: Google Analytics
      // gtag('config', 'GA_MEASUREMENT_ID', { page_path: path });
    }
  },

  event: (eventName: string, properties?: Record<string, any>) => {
    if (import.meta.env.PROD) {
      // Example: Google Analytics
      // gtag('event', eventName, properties);
    }
  },

  identify: (userId: string, traits?: Record<string, any>) => {
    if (import.meta.env.PROD) {
      // Example: Set user ID
      // gtag('set', { user_id: userId });
    }
  },

  track: {
    signUp: (method: string) => {
      analytics.event('sign_up', { method });
    },
    
    login: (method: string) => {
      analytics.event('login', { method });
    },
    
    clientAdded: () => {
      analytics.event('client_added');
    },
    
    appointmentScheduled: () => {
      analytics.event('appointment_scheduled');
    },
    
    noteCreated: (type: string) => {
      analytics.event('note_created', { type });
    },
    
    invoiceCreated: (amount: number) => {
      analytics.event('invoice_created', { amount });
    },
    
    subscriptionStarted: (plan: string) => {
      analytics.event('subscription_started', { plan });
    }
  }
};

// Track page views on route change
export const setupAnalytics = () => {
  // Track initial page load
  analytics.page(window.location.pathname);
  
  // Track subsequent navigation
  let lastPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      analytics.page(lastPath);
    }
  });
  
  observer.observe(document, { subtree: true, childList: true });
};
