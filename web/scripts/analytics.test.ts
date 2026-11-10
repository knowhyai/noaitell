import { expect, it, vi } from 'vitest';
import { analyticsTags, integrationStatus, newsletterHref } from './analytics.mjs';
it('emits nothing without configuration and rejects unsafe script IDs', () => {
 expect(analyticsTags()).toEqual([]);
 expect(analyticsTags({VITE_GA4_ID:'',VITE_CLARITY_ID:'',VITE_GSC_VERIFICATION:'',VITE_BING_VERIFICATION:'',VITE_NEWSLETTER_URL:''})).toEqual([]);
 expect(analyticsTags({VITE_GA4_ID:"G-';alert(1)",VITE_CLARITY_ID:'</script>',VITE_BING_VERIFICATION:'<script>',VITE_GSC_VERIFICATION:'bad"token',VITE_NEWSLETTER_URL:'javascript:alert(1)'})).toEqual([]);
 expect(newsletterHref()).toBe('');
 expect(newsletterHref({VITE_NEWSLETTER_URL:'http://example.com/list'})).toBe('');
});
it('reports every integration as missing, configured, or invalid without failing', () => {
 expect(integrationStatus({}).map(row => row.state)).toEqual(['missing','missing','missing','missing','missing']);
 const rows = integrationStatus({VITE_GSC_VERIFICATION:'test-verification',VITE_BING_VERIFICATION:'ABCDEF1234567890',VITE_GA4_ID:'not-a-ga-id',VITE_NEWSLETTER_URL:'https://example.com/news'});
 expect(rows.find(row => row.key === 'VITE_GSC_VERIFICATION')?.state).toBe('configured');
 expect(rows.find(row => row.key === 'VITE_BING_VERIFICATION')?.state).toBe('configured');
 expect(rows.find(row => row.key === 'VITE_GA4_ID')?.state).toBe('invalid');
 expect(rows.find(row => row.key === 'VITE_CLARITY_ID')?.state).toBe('missing');
 expect(rows.find(row => row.key === 'VITE_NEWSLETTER_URL')?.state).toBe('configured');
 expect(newsletterHref({VITE_NEWSLETTER_URL:'https://example.com/news'})).toBe('https://example.com/news');
});
it('emits the Bing verification meta tag for a safe token', () => {
 const tags = analyticsTags({ VITE_BING_VERIFICATION: 'ABCDEF1234567890' });
 expect(tags).toEqual([{ tag: 'meta', attrs: { name: 'msvalidate.01', content: 'ABCDEF1234567890' } }]);
});
it('generates configured verification and analytics tags', () => {
 const tags=analyticsTags({VITE_GSC_VERIFICATION:'test-verification',VITE_GA4_ID:'G-TEST123',VITE_CLARITY_ID:'test123'});
 expect(tags).toHaveLength(4);
 expect(tags[0].attrs.content).toBe('test-verification');
 expect(tags[1].attrs.src).toContain('id=G-TEST123');
 expect(tags[2].children).toContain("gtag('config','G-TEST123'");
 expect(tags[3].children).toContain('https://www.clarity.ms/tag/');
});
it('encodes the email notification recipient, subject and body', async () => {
 vi.stubGlobal('document',{querySelector:()=>null});
 const {proNotificationURL}=await import('../src/site');
 const url=new URL(proNotificationURL('reader+news@example.com'));
 expect(url.pathname).toBe('noaitell@knowhy.net');
 expect(url.searchParams.get('subject')).toBe('Notify me: NoAITell Pro');
 expect(url.searchParams.get('body')).toContain('reader+news@example.com');
 vi.unstubAllGlobals();
});
