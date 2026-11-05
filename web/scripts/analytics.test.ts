import { expect, it, vi } from 'vitest';
import { analyticsTags } from './analytics.mjs';
it('emits nothing without configuration and rejects unsafe script IDs', () => {
 expect(analyticsTags()).toEqual([]);
 expect(analyticsTags({VITE_GA4_ID:'',VITE_CLARITY_ID:'',VITE_GSC_VERIFICATION:''})).toEqual([]);
 expect(analyticsTags({VITE_GA4_ID:"G-';alert(1)",VITE_CLARITY_ID:'</script>'})).toEqual([]);
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
