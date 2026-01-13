# 🚀 Launch Guide for Mindful AI

## Pre-Launch Checklist

### 1. Environment Configuration
- [ ] Update domain URL in SEOHead component (`src/components/SEOHead.tsx`)
- [ ] Update sitemap.xml with your actual domain
- [ ] Update robots.txt with your domain
- [ ] Configure environment variables in production
- [ ] Test Supabase connection in production

### 2. Branding & Content
- [ ] Add your logo to `public/` folder using the Settings page logo upload feature
- [ ] Create og-image.png (1200x630px) for social sharing
- [ ] Update all "Mindful AI" references to your brand name
- [ ] Update landing page copy to match your offering
- [ ] Create favicon.ico

### 3. Legal Pages (Required)
Create these pages before launch:
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Cookie Policy
- [ ] HIPAA Compliance Notice (for healthcare data)

### 4. Analytics Setup
1. Get Google Analytics 4 tracking ID
2. Add to `src/utils/analytics.ts`:
```typescript
// Replace the console.log statements with:
gtag('config', 'YOUR-GA4-ID', { page_path: path });
gtag('event', eventName, properties);
```
3. Add GA4 script to `index.html`:
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA4-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR-GA4-ID');
</script>
```

### 5. Stripe Configuration
- [ ] Switch from Stripe test mode to live mode
- [ ] Update Stripe webhook endpoints
- [ ] Test payment flows with real credit card
- [ ] Verify recurring billing works
- [ ] Configure Stripe Customer Portal settings

### 6. Email Configuration (Resend)
- [ ] Verify your sending domain at resend.com
- [ ] Update email templates with your branding
- [ ] Test all email notifications
- [ ] Set up SPF and DKIM records

### 7. Integrations (Optional)
**Note**: Mindful AI integrates with third-party tools for specific functionalities:
- **Zoom**: For telehealth/video sessions (requires Zoom account & OAuth setup)
- **Google Calendar**: For calendar synchronization (requires Google API credentials)
- **Stripe**: For payment processing (already configured for billing)
- **Twilio**: For SMS notifications (optional, requires Twilio account)

Integration buttons in Settings → Integrations will create placeholder entries. For full OAuth flows:
- [ ] Configure OAuth credentials in each service's developer console
- [ ] Update integration OAuth callback URLs
- [ ] Test connection flows end-to-end

**Important**: Mindful AI does not provide built-in telehealth or SMS - it integrates with external services.

### 8. Security Review
- [ ] Audit all RLS policies
- [ ] Test with different user roles
- [ ] Verify admin access is secure (Code: 6741YEW)
- [ ] Check for exposed sensitive data
- [ ] Run Supabase linter
- [ ] Enable 2FA for admin accounts

### 9. Performance Testing
```bash
# Test lighthouse scores
npx lighthouse https://yourdomain.com --view

# Check bundle size
npm run build
# Review dist/ folder sizes
```

### 10. Domain & Hosting
#### Option A: Deploy to Lovable (Recommended)
1. Click "Publish" in Lovable
2. Go to Settings → Domains
3. Add your custom domain
4. Update DNS records as instructed
5. Wait for SSL certificate (automatic)

#### Option B: Export and Deploy Elsewhere
1. Export code from Lovable
2. Deploy to Vercel/Netlify:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 11. Post-Deployment Tests
Test these critical flows in production:
- [ ] Sign up new professional user
- [ ] Password reset
- [ ] Add client
- [ ] Schedule appointment
- [ ] Create SOAP note
- [ ] Generate invoice
- [ ] Process payment
- [ ] Client portal access with access code
- [ ] Admin portal access (email: matthewharnisch@icloud.com, code: 6741YEW)
- [ ] Mobile responsive check
- [ ] AI Assistant functionality (create reminder, appointment, invoice)
- [ ] Settings page features:
  - [ ] Profile updates
  - [ ] Logo upload with preview
  - [ ] Export data feature
  - [ ] 2FA setup
  - [ ] Integration connections

### 12. Monitoring Setup
1. **Error Monitoring** (Optional but recommended)
   - Sign up for Sentry.io
   - Install: `npm install @sentry/react`
   - Initialize in `main.tsx`

2. **Uptime Monitoring**
   - UptimeRobot (free tier available)
   - Monitor main endpoints
   - Set up alerts

3. **Performance Monitoring**
   - Google PageSpeed Insights
   - Weekly performance audits

### 13. Backup Strategy
- [ ] Supabase automatic backups enabled
- [ ] Document backup restoration process
- [ ] Test database restore
- [ ] Export user data monthly using Settings → Export Data

### 14. Support Setup
- [ ] Create support email (support@yourdomain.com)
- [ ] Set up help documentation
- [ ] Create FAQ page
- [ ] Add contact form

## Key Features to Highlight for Users

### AI Assistant
- Creates reminders, appointments, and invoices via natural language
- Understands relative dates ("tomorrow at 2 PM", "next Monday")
- Real-time database updates with confirmation messages
- No JSON/backend code shown to users - clean, natural responses

### Professional Sign-Up
- Removed license number requirement (no longer needed)
- Added "Official Title" field (e.g., Doctor, Therapist, Counselor)
- Simple, modern onboarding flow

### Settings Page
- **2FA Setup**: Step-by-step instructions with 5 backup codes
- **Logo Upload**: Live preview with image confirmation before upload
- **Export Data**: Granular control - select specific clients and data types, download as PDFs
- **Integrations**: Easy connection to Zoom, Google Calendar, Stripe (via third-party accounts)

### Admin Portal
- Accessible at `/admin-portal`
- Credentials: matthewharnisch@icloud.com / MMtatE2248! / Code: 6741YEW
- Automatically redirects to `/admin-dashboard` after login
- Full analytics, user management, system settings

## Launch Day Tasks

### Morning of Launch
1. **Final checks**
   ```bash
   # Run production build locally
   npm run build
   npm run preview
   ```

2. **Deploy to production**
   - Click Publish in Lovable
   - Verify deployment successful
   - Check all environment variables

3. **Smoke tests**
   - Visit homepage
   - Sign up flow
   - Payment flow
   - AI Assistant test
   - Mobile check

### Launch Announcement
1. **Social Media**
   - Prepare posts for Twitter, LinkedIn
   - Include screenshot/demo
   - Highlight: "Integrates seamlessly with Zoom, Google Calendar, and Stripe"
   - Use relevant hashtags (#mentalhealth #therapists #practicemanagement)

2. **Email**
   - Notify beta users
   - Send to waiting list
   - Professional networks

3. **Landing Page**
   - Update with "Now Live" banner
   - Add testimonials (if available)
   - Clear call-to-action
   - Highlight integration capabilities

### First Week Monitoring
- [ ] Monitor error logs daily
- [ ] Check analytics for user behavior
- [ ] Review support tickets
- [ ] Watch for performance issues
- [ ] Gather user feedback
- [ ] Monitor AI Assistant action logs

## Scaling Considerations

### When you hit 100 users:
- Review database performance
- Consider CDN for assets
- Upgrade Supabase instance if needed
- Implement caching strategies

### When you hit 1,000 users:
- Load balancing considerations
- Database read replicas
- Advanced monitoring
- Performance optimization

### When you hit 10,000 users:
- Dedicated support team
- Enterprise Supabase plan
- Advanced security measures
- SOC 2 compliance (if needed)

## Troubleshooting Common Issues

### Issue: Slow page loads
- Check database indexes
- Review Supabase instance size
- Optimize images
- Enable caching

### Issue: Email not sending
- Verify Resend domain
- Check SPF/DKIM records
- Review edge function logs
- Test with different email providers

### Issue: Payment failures
- Check Stripe webhook endpoint
- Verify Stripe keys (live mode)
- Review error logs
- Test with different cards

### Issue: AI Assistant not working
- Check edge function logs (`ai-router`, `ai-action-executor`)
- Verify ANTHROPIC_API_KEY and OPENAI_API_KEY are set
- Test date/time parsing with various inputs
- Check database RLS policies

### Issue: Mobile display problems
- Test on real devices
- Check responsive breakpoints
- Review Tailwind classes
- Test different browsers

### Issue: Logo upload failing
- Check file size (<2MB)
- Verify image format (JPG, PNG, SVG)
- Check Supabase storage bucket permissions
- Review browser console for errors

## Support Resources

- **Lovable Docs**: https://docs.lovable.dev/
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **React Query Docs**: https://tanstack.com/query
- **Tailwind CSS Docs**: https://tailwindcss.com/docs

## Emergency Contacts

Keep these handy for launch day:
- Domain registrar support
- Hosting provider support
- Stripe support
- Supabase support

## Post-Launch Optimization

### Week 1-2:
- Fix critical bugs
- Address user feedback
- Optimize slow queries
- Improve onboarding
- Add more AI Assistant capabilities if requested

### Month 1:
- A/B test landing page
- Implement requested features
- Performance optimization
- SEO improvements
- Refine AI Assistant date/time parsing

### Month 2-3:
- Advanced analytics
- User retention strategies
- Feature expansion
- Marketing optimization
- Full OAuth integration flows (if needed)

## Success Metrics to Track

- **User Acquisition**: Sign-ups per week
- **Activation**: Users who add first client
- **Retention**: Weekly/monthly active users
- **Revenue**: MRR (Monthly Recurring Revenue)
- **Performance**: Page load times <2s
- **Satisfaction**: NPS score, support tickets
- **AI Usage**: AI Assistant action success rate

---

## 🎉 You're Ready to Launch!

This application is production-ready. Follow this guide step-by-step, and you'll have a successful launch. 

**Recent Updates for Launch**:
- ✅ AI Assistant now performs real database actions silently
- ✅ Removed license number requirement, added official title
- ✅ Improved 2FA with clear instructions and 5 backup codes
- ✅ Logo upload with live preview and confirmation
- ✅ Export data with granular PDF control
- ✅ Landing page highlights integration capabilities
- ✅ Admin portal properly redirects after login

Remember to monitor closely in the first week and iterate based on real user feedback.

Good luck! 🚀