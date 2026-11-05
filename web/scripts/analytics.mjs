// Build-time only: no tags or external requests unless configured.
export function analyticsTags(env = {}) {
 const tags = [];
 if (env.VITE_GSC_VERIFICATION) tags.push({tag:'meta',attrs:{name:'google-site-verification',content:env.VITE_GSC_VERIFICATION}});
 const ga = env.VITE_GA4_ID || '';
 if (/^G-[A-Z0-9]+$/.test(ga)) {
  tags.push({tag:'script',attrs:{async:true,src:`https://www.googletagmanager.com/gtag/js?id=${ga}`}});
  tags.push({tag:'script',children:`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}',{send_page_view:true});`});
 }
 const clarity = env.VITE_CLARITY_ID || '';
 if (/^[a-z0-9]+$/i.test(clarity)) tags.push({tag:'script',children:`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','${clarity}');`});
 return tags;
}
