export function proNotificationURL(email: string): string {
  return `mailto:noaitell@knowhy.net?subject=${encodeURIComponent('Notify me: NoAITell Pro')}&body=${encodeURIComponent(`Please notify me when NoAITell Pro launches.\nEmail: ${email}`)}`;
}

function ensureFormError(form: HTMLFormElement): HTMLElement {
  let message = form.querySelector<HTMLElement>('[data-form-error]');
  if (!message) {
    message = document.createElement('p');
    message.className = 'form-error';
    message.setAttribute('role', 'alert');
    message.dataset.formError = '';
    form.append(message);
  }
  return message;
}

const canBindDom = typeof document !== 'undefined' && typeof document.querySelector === 'function' && typeof document.querySelectorAll === 'function';
if (canBindDom) document.querySelector<HTMLFormElement>('[data-pro-notify]')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const email = form.elements.namedItem('email') as HTMLInputElement;
  const message = ensureFormError(form);
  const value = email.value.trim();
  if (!value) {
    email.setAttribute('aria-invalid', 'true');
    message.textContent = 'Enter an email address.';
    email.focus();
    return;
  }
  if (!email.checkValidity()) {
    email.setAttribute('aria-invalid', 'true');
    message.textContent = 'Enter a valid email address.';
    email.focus();
    return;
  }
  email.removeAttribute('aria-invalid');
  message.textContent = '';
  window.location.href = proNotificationURL(value);
});

export function checkoutFailureMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  if (/not available yet/i.test(text)) return 'This plan is not available yet.';
  if (/temporarily unavailable|try again later/i.test(text)) return 'Checkout is temporarily unavailable. Please try again later.';
  return 'Checkout couldn’t be opened. Check your connection and try again.';
}

export async function startCheckout(plan: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/waffo/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
  } catch {
    throw new Error('Checkout couldn’t be opened. Check your connection and try again.');
  }
  let result: { checkoutUrl?: string; error?: string } = {};
  try { result = await response.json(); } catch { result = {}; }
  if (!response.ok || !result.checkoutUrl) throw new Error(checkoutFailureMessage(new Error(result.error || '')));
  return result.checkoutUrl;
}
if (canBindDom) document.querySelectorAll<HTMLButtonElement>('[data-checkout-plan]').forEach(button => {
  button.addEventListener('click', async () => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-checkout-plan]')];
    const message = document.querySelector<HTMLElement>('[data-checkout-status]');
    buttons.forEach(item => { item.disabled = true; item.setAttribute('aria-busy', 'true'); });
    if (message) message.textContent = 'Opening checkout…';
    try {
      window.location.href = await startCheckout(button.dataset.checkoutPlan!);
    } catch (error) {
      if (message) message.textContent = checkoutFailureMessage(error);
      buttons.forEach(item => { item.disabled = false; item.removeAttribute('aria-busy'); });
    }
  });
});
