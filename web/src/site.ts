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

export async function startCheckout(plan: string): Promise<string> {
  const response = await fetch('/api/waffo/checkout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const result = await response.json() as { checkoutUrl?: string; error?: string };
  if (!response.ok || !result.checkoutUrl) throw new Error(result.error || 'Checkout is unavailable. Please try again later.');
  return result.checkoutUrl;
}
document.querySelectorAll<HTMLButtonElement>('[data-checkout-plan]').forEach(button => {
  button.addEventListener('click', async () => {
    const message = document.querySelector<HTMLElement>('[data-checkout-status]');
    button.disabled = true;
    if (message) message.textContent = 'Opening checkout…';
    try {
      window.location.href = await startCheckout(button.dataset.checkoutPlan!);
    } catch (error) {
      if (message) message.textContent = error instanceof Error ? error.message : 'Checkout is unavailable.';
      button.disabled = false;
    }
  });
});
