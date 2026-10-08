/**
 * Form behaviour: inline validation, conditional follow-up questions, and
 * submission as JSON to the endpoint in `data-endpoint` (PUBLIC_FORM_ENDPOINT).
 * On success the visitor is redirected (data-redirect) or shown the success message.
 */
const MSG = {
  required: (t: string) => `${t} is required.`,
  email: 'Email addresses should follow the format user@domain.com.',
  url: 'Must be a valid URL.',
  failed: 'Unable to submit form. Please try again later.',
  unconfigured: 'This form is not connected yet. Please email team@helloseo.com.',
};

function fieldError(field: HTMLElement): string | null {
  if (field.hidden) return null;
  const title = field.dataset.title ?? '';
  const inputs = [...field.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')];
  const required = field.hasAttribute('data-required');
  if (inputs.some((i) => i.type === 'checkbox' || i.type === 'radio')) {
    return required && !inputs.some((i) => (i as HTMLInputElement).checked) ? MSG.required(title) : null;
  }
  for (const i of inputs) {
    const v = i.value.trim();
    if (required && !v) return MSG.required(title);
    if (v && i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return MSG.email;
    if (v && i.type === 'url' && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i.test(v)) return MSG.url;
  }
  return null;
}

function collect(form: HTMLFormElement) {
  const data: Record<string, string> = {};
  for (const el of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')) {
    if (!el.name || el.name === '_gotcha' || el.closest('[hidden]')) continue;
    if ((el.type === 'checkbox' || el.type === 'radio') && !(el as HTMLInputElement).checked) continue;
    let v = el.value.trim();
    if (el.type === 'url' && v && !/^https?:\/\//.test(v)) v = 'http://' + v;
    data[el.name] = data[el.name] ? `${data[el.name]}, ${v}` : v;
  }
  return data;
}

export function initForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-form]').forEach((form) => {
    const fields = [...form.querySelectorAll<HTMLElement>('.form-field')];
    const status = form.querySelector<HTMLElement>('.form__status')!;

    // placeholder styling + conditional follow-ups for selects
    form.querySelectorAll<HTMLSelectElement>('select').forEach((s) => {
      s.addEventListener('change', () => {
        s.classList.toggle('is-placeholder', !s.value);
        form.querySelectorAll<HTMLElement>(`[data-follow-up-of="${s.id}"]`).forEach((f) => (f.hidden = s.value !== f.dataset.condition));
      });
    });

    const show = (field: HTMLElement, msg: string | null) => {
      const el = field.querySelector<HTMLElement>('.form-field__error');
      field.classList.toggle('has-error', !!msg);
      if (el) {
        el.textContent = msg ?? '';
        el.hidden = !msg;
      }
    };
    fields.forEach((f) => f.addEventListener('change', () => f.classList.contains('has-error') && show(f, fieldError(f))));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.hidden = true;
      const errors = fields.map((f) => [f, fieldError(f)] as const);
      errors.forEach(([f, m]) => show(f, m));
      const first = errors.find(([, m]) => m);
      if (first) {
        first[0].querySelector<HTMLElement>('input, textarea, select')?.focus();
        return;
      }
      if ((form.querySelector<HTMLInputElement>('[name="_gotcha"]')?.value ?? '') !== '') return;

      const endpoint = form.dataset.endpoint;
      const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      if (!endpoint) {
        status.textContent = MSG.unconfigured;
        status.hidden = false;
        return;
      }
      button.disabled = true;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ form: form.dataset.formName, ...collect(form) }),
        });
        if (!res.ok) throw new Error(String(res.status));
        if (form.dataset.redirect) {
          window.location.href = form.dataset.redirect;
          return;
        }
        const success = form.parentElement?.querySelector<HTMLElement>('.form__success');
        form.hidden = true;
        if (success) success.hidden = false;
      } catch {
        status.textContent = MSG.failed;
        status.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  });
}
