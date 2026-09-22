import { Check, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../../../app/hooks';
import { Alert } from '../../../../components/Alert';
import { FormField, TextInput } from '../../../../components/FormField';
import { Spinner } from '../../../../components/Spinner';
import { fetchCompanyProfile, removeLogo, saveCompanyProfile, uploadLogo } from '../companySlice';
import type { CompanyProfileInput } from '../types';

const empty: CompanyProfileInput = {
  companyName: '', tagline: '', addressLine1: '', addressLine2: '', postalCode: '', city: '', country: '',
  phone: '', email: '', website: '', businessId: '', vatId: '',
};

export function CompanyProfilePage() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { data, loading, saving, logoBusy, error, justSaved } = useAppSelector((s) => s.company);
  const [form, setForm] = useState<CompanyProfileInput>(empty);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => { dispatch(fetchCompanyProfile()); }, [dispatch]);
  useEffect(() => {
    if (!data) return;
    // Only the fields the form actually edits — the API response also carries id/updatedAt
    // (and logoPath, not yet editable here), which PUT /company must not receive back.
    setForm({
      companyName: data.companyName ?? '', tagline: data.tagline ?? '',
      addressLine1: data.addressLine1 ?? '', addressLine2: data.addressLine2 ?? '',
      postalCode: data.postalCode ?? '', city: data.city ?? '', country: data.country ?? '',
      phone: data.phone ?? '', email: data.email ?? '', website: data.website ?? '',
      businessId: data.businessId ?? '', vatId: data.vatId ?? '',
    });
  }, [data]);

  const set = (k: keyof CompanyProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onSave = () => { dispatch(saveCompanyProfile(form)); };

  if (loading && !data) return <div className="p-8 flex items-center gap-2 text-muted"><Spinner className="h-4 w-4" /> {t('common.loading')}</div>;

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <h1 className="text-2xl mb-1">{t('company.title')}</h1>
      <p className="text-muted mb-6">{t('company.subtitle')}</p>

      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="space-y-6">
        <div className="panel p-4">
          <h2 className="text-sm text-muted mb-3">{t('company.logo')}</h2>
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {data?.logoPath ? (
              <img src={data.logoPath} alt="" className="h-16 max-w-[240px] object-contain bg-white rounded p-1" />
            ) : (
              <p className="text-sm text-muted">{t('company.noLogo')}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap sm:ml-auto sm:shrink-0">
              <input
                ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                aria-label={t('company.uploadLogo')}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) dispatch(uploadLogo(f)); e.target.value = ''; }}
              />
              <button type="button" className="btn-ghost text-sm" disabled={logoBusy} onClick={() => fileInput.current?.click()}>
                {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {data?.logoPath ? t('company.replaceLogo') : t('company.uploadLogo')}
              </button>
              {data?.logoPath && (
                <button type="button" className="btn-ghost text-sm hover:!text-rust" disabled={logoBusy} onClick={() => dispatch(removeLogo())}>
                  <Trash2 className="h-4 w-4" /> {t('company.removeLogo')}
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted mt-3">{t('company.logoHint')}</p>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm text-muted mb-3">{t('company.identity')}</h2>
          <div className="space-y-4">
            <FormField label={t('company.companyName')}><TextInput value={form.companyName ?? ''} onChange={set('companyName')} /></FormField>
            <FormField label={t('company.tagline')}><TextInput value={form.tagline ?? ''} onChange={set('tagline')} /></FormField>
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm text-muted mb-3">{t('company.contact')}</h2>
          <div className="space-y-4">
            <FormField label={t('company.addressLine1')}><TextInput value={form.addressLine1 ?? ''} onChange={set('addressLine1')} /></FormField>
            <FormField label={t('company.addressLine2')}><TextInput value={form.addressLine2 ?? ''} onChange={set('addressLine2')} /></FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label={t('company.postalCode')}><TextInput value={form.postalCode ?? ''} onChange={set('postalCode')} /></FormField>
              <FormField label={t('company.city')}><TextInput value={form.city ?? ''} onChange={set('city')} /></FormField>
              <FormField label={t('company.country')}><TextInput value={form.country ?? ''} onChange={set('country')} /></FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label={t('company.phone')}><TextInput value={form.phone ?? ''} onChange={set('phone')} /></FormField>
              <FormField label={t('company.email')}><TextInput type="email" value={form.email ?? ''} onChange={set('email')} /></FormField>
              <FormField label={t('company.website')}><TextInput value={form.website ?? ''} onChange={set('website')} /></FormField>
            </div>
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm text-muted mb-3">{t('company.legal')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={t('company.businessId')}><TextInput value={form.businessId ?? ''} onChange={set('businessId')} /></FormField>
            <FormField label={t('company.vatId')}><TextInput value={form.vatId ?? ''} onChange={set('vatId')} /></FormField>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {t('company.save')}
          </button>
          {justSaved && !saving && (
            <span className="flex items-center gap-1.5 text-sm text-moss"><Check className="h-4 w-4" /> {t('company.saved')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
