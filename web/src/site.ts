export function proNotificationURL(email: string): string {
  return `mailto:noaitell@knowhy.net?subject=${encodeURIComponent('Notify me: NoAITell Pro')}&body=${encodeURIComponent(`Please notify me when NoAITell Pro launches.\nEmail: ${email}`)}`;
}
document.querySelector<HTMLFormElement>('[data-pro-notify]')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim();
  window.location.href = proNotificationURL(email);
});
