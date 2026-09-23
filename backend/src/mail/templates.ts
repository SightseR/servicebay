/** Bilingual (IT first, then EN) — we don't know the recipient's language preference at this point. */
export function passwordResetEmail(link: string, expiresMinutes: number) {
  const subject = 'Reimposta la tua password / Reset your password — ServiceBay';
  const text = [
    'Hai richiesto di reimpostare la password del tuo account ServiceBay.',
    `Apri questo link entro ${expiresMinutes} minuti per scegliere una nuova password:`,
    link,
    'Se non hai richiesto tu la reimpostazione, ignora questa email: la tua password non cambierà.',
    '',
    '— — —',
    '',
    'You asked to reset the password for your ServiceBay account.',
    `Open this link within ${expiresMinutes} minutes to choose a new password:`,
    link,
    "If you didn't request this, ignore this email — your password will not change.",
  ].join('\n');
  const btn = `<p style="margin:20px 0"><a href="${link}" style="background:#e0a339;color:#14171a;padding:10px 18px;border-radius:3px;text-decoration:none;font-weight:600">Reimposta la password / Reset password</a></p>`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;color:#222;line-height:1.5">
<h2 style="letter-spacing:.06em;margin:0 0 12px">SERVICE<span style="color:#e0a339">BAY</span></h2>
<p>Hai richiesto di reimpostare la password del tuo account ServiceBay. Apri il link entro <b>${expiresMinutes} minuti</b> per scegliere una nuova password.</p>
${btn}
<p style="color:#666;font-size:13px">Se non hai richiesto tu la reimpostazione, ignora questa email: la tua password non cambierà.</p>
<hr style="border:0;border-top:1px solid #ddd;margin:24px 0">
<p>You asked to reset the password for your ServiceBay account. Open the link within <b>${expiresMinutes} minutes</b> to choose a new password.</p>
${btn}
<p style="color:#666;font-size:13px">If you didn't request this, ignore this email — your password will not change.</p>
<p style="color:#999;font-size:12px;word-break:break-all">${link}</p>
</div>`;
  return { subject, text, html };
}
