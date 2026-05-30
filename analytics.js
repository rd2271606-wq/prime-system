// Vercel Web Analytics
import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject({
  mode: 'production',
  debug: false
});
