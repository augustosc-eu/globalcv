'use client';

import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { useCVStore } from '@/store/cvStore';
import { PersonalInfo } from '@/types/cv.types';
import { Market } from '@/types/cv.types';
import { MarketConfig } from '@/types/market.types';
import PhotoUpload from '@/components/form-fields/PhotoUpload';
import StepHeader from './StepHeader';

interface Props {
  market: Market;
  config: MarketConfig;
}

export default function PersonalInfoStep({ config }: Props) {
  const { cv, setPersonalInfo } = useCVStore();
  const { register, watch, reset, formState: { errors } } = useForm<PersonalInfo>({
    defaultValues: cv.personalInfo,
    mode: 'onBlur',
  });

  useEffect(() => {
    reset(cv.personalInfo);
  }, [cv.personalInfo.firstName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync form changes to store
  useEffect(() => {
    const sub = watch((data) => {
      setPersonalInfo(data as Partial<PersonalInfo>);
    });
    return () => sub.unsubscribe();
  }, [watch, setPersonalInfo]);

  const f = config.fields;
  const show = (v: typeof f.photo) => v.visibility !== 'hidden';
  const req = (v: typeof f.photo) => v.visibility === 'required';

  return (
    <div className="space-y-6">
      <StepHeader
        title={config.ui.personalInfoTitle}
        description={config.ui.personalInfoDesc}
      />

      {/* Photo upload */}
      {show(f.photo) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {f.photo.label ?? 'Photo'}
            {req(f.photo) && <span className="text-red-500 ml-1">*</span>}
          </label>
          {f.photo.helpText && (
            <p className="text-xs text-gray-500 mb-2">{f.photo.helpText}</p>
          )}
          <PhotoUpload
            value={cv.personalInfo.photo}
            onChange={(b64) => setPersonalInfo({ photo: b64 })}
            aspectRatio={config.photoAspectRatio}
          />
        </div>
      )}

      {/* Furigana */}
      {show(f.furigana) && (
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={`${f.furigana.label ?? 'Furigana'} (姓)`}
            required={req(f.furigana)}
            helpText={f.furigana.helpText}
          >
            <input {...register('furiganaLastName')} className={inputCls} placeholder="やまだ" />
          </Field>
          <Field label="ふりがな (名)" required={req(f.furigana)}>
            <input {...register('furiganaFirstName')} className={inputCls} placeholder="たろう" />
          </Field>
        </div>
      )}

      {/* Name */}
      <div className="grid grid-cols-2 gap-4">
        <Field label={config.ui.firstName} required error={errors.firstName?.message}>
          <input {...register('firstName', { required: 'First name is required' })} className={inputCls + (errors.firstName ? ' border-red-400 focus:ring-red-400' : '')} placeholder={config.ui.firstNamePlaceholder} />
        </Field>
        <Field label={config.ui.lastName} required error={errors.lastName?.message}>
          <input {...register('lastName', { required: 'Last name is required' })} className={inputCls + (errors.lastName ? ' border-red-400 focus:ring-red-400' : '')} placeholder={config.ui.lastNamePlaceholder} />
        </Field>
      </div>

      {/* Email & Phone */}
      <div className="grid grid-cols-2 gap-4">
        <Field label={config.ui.email} required error={errors.email?.message}>
          <input
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            })}
            type="email"
            className={inputCls + (errors.email ? ' border-red-400 focus:ring-red-400' : '')}
            placeholder={config.ui.emailPlaceholder}
          />
        </Field>
        <Field label={config.ui.phone} required error={errors.phone?.message}>
          <input {...register('phone', { required: 'Phone is required' })} type="tel" className={inputCls + (errors.phone ? ' border-red-400 focus:ring-red-400' : '')} placeholder={config.ui.phonePlaceholder} />
        </Field>
      </div>

      {/* LinkedIn & Website */}
      <div className="grid grid-cols-2 gap-4">
        <Field label={config.ui.linkedIn}>
          <input {...register('linkedIn')} className={inputCls} placeholder="linkedin.com/in/username" />
        </Field>
        <Field label={config.ui.website}>
          <input {...register('website')} className={inputCls} placeholder="yoursite.com" />
        </Field>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <Field label={config.ui.city} required>
          <input
            onChange={(e) => setPersonalInfo({ address: { ...cv.personalInfo.address, city: e.target.value, country: cv.personalInfo.address?.country ?? '' } })}
            defaultValue={cv.personalInfo.address?.city ?? ''}
            className={inputCls}
            placeholder={config.ui.cityPlaceholder}
          />
        </Field>
        <Field label={config.ui.country}>
          <input
            onChange={(e) => setPersonalInfo({ address: { ...cv.personalInfo.address, country: e.target.value, city: cv.personalInfo.address?.city ?? '' } })}
            defaultValue={cv.personalInfo.address?.country ?? ''}
            className={inputCls}
            placeholder={config.ui.countryPlaceholder}
          />
        </Field>
      </div>

      {/* Date of birth */}
      {show(f.dateOfBirth) && (
        <Field
          label={f.dateOfBirth.label ?? 'Date of Birth'}
          required={req(f.dateOfBirth)}
          helpText={f.dateOfBirth.helpText}
        >
          <input {...register('dateOfBirth')} type="date" className={inputCls} />
        </Field>
      )}

      {/* Nationality */}
      {show(f.nationality) && (
        <Field
          label={f.nationality.label ?? 'Nationality'}
          required={req(f.nationality)}
          helpText={f.nationality.helpText}
        >
          <input {...register('nationality')} className={inputCls} placeholder="e.g. Spanish" />
        </Field>
      )}

      {/* Marital status */}
      {show(f.maritalStatus) && (
        <Field
          label={f.maritalStatus.label ?? 'Marital Status'}
          required={req(f.maritalStatus)}
        >
          <select {...register('maritalStatus')} className={inputCls}>
            <option value="">{config.ui.maritalSelect}</option>
            <option value="single">{config.ui.maritalSingle}</option>
            <option value="married">{config.ui.maritalMarried}</option>
            <option value="divorced">{config.ui.maritalDivorced}</option>
            <option value="widowed">{config.ui.maritalWidowed}</option>
            <option value="prefer_not">{config.ui.maritalPreferNot}</option>
          </select>
        </Field>
      )}

      {/* ID number */}
      {show(f.idNumber) && (
        <Field
          label={f.idNumber.label ?? 'ID / Document Number'}
          required={req(f.idNumber)}
          helpText="DNI, CURP, RUT, etc."
        >
          <input {...register('idNumber')} className={inputCls} />
        </Field>
      )}

      {/* Gender */}
      {show(f.gender) && (
        <Field
          label={f.gender.label ?? 'Gender'}
          required={req(f.gender)}
          helpText={f.gender.helpText}
        >
          <select {...register('gender')} className={inputCls}>
            {config.market === 'jp' ? (
              <>
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
                <option value="prefer_not">回答しない</option>
              </>
            ) : config.market === 'latam' ? (
              <>
                <option value="">Seleccionar</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
                <option value="prefer_not">Prefiero no decir</option>
              </>
            ) : (
              <>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not">Prefer not to say</option>
              </>
            )}
          </select>
        </Field>
      )}

      {/* Nearest station (Japan) */}
      {show(f.nearestStation) && (
        <Field
          label={f.nearestStation.label ?? 'Nearest Station'}
          required={req(f.nearestStation)}
          helpText={f.nearestStation.helpText}
        >
          <input
            {...register('nearestStation')}
            className={inputCls}
            placeholder="例：渋谷駅（JR山手線）"
          />
        </Field>
      )}

      {/* Commute time (Japan) */}
      {show(f.commuteTime) && (
        <Field
          label={f.commuteTime.label ?? 'Commute Time (minutes)'}
          required={req(f.commuteTime)}
          helpText={f.commuteTime.helpText}
        >
          <input
            {...register('commuteTime', { valueAsNumber: true })}
            type="number"
            min={0}
            max={240}
            className={inputCls}
            placeholder="30"
          />
        </Field>
      )}

      {/* Emergency contact (Japan) */}
      {show(f.emergencyContact) && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-4">
          <h3 className="font-medium text-gray-800 text-sm">
            {f.emergencyContact.label ?? 'Emergency Contact'}
            {req(f.emergencyContact) && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name / 氏名">
              <input
                className={inputCls}
                placeholder="山田 花子"
                onChange={(e) =>
                  setPersonalInfo({
                    emergencyContact: {
                      ...cv.personalInfo.emergencyContact,
                      name: e.target.value,
                      relationship: cv.personalInfo.emergencyContact?.relationship ?? '',
                      phone: cv.personalInfo.emergencyContact?.phone ?? '',
                    },
                  })
                }
                defaultValue={cv.personalInfo.emergencyContact?.name ?? ''}
              />
            </Field>
            <Field label="Relationship / 続柄">
              <input
                className={inputCls}
                placeholder="配偶者"
                onChange={(e) =>
                  setPersonalInfo({
                    emergencyContact: {
                      ...cv.personalInfo.emergencyContact,
                      relationship: e.target.value,
                      name: cv.personalInfo.emergencyContact?.name ?? '',
                      phone: cv.personalInfo.emergencyContact?.phone ?? '',
                    },
                  })
                }
                defaultValue={cv.personalInfo.emergencyContact?.relationship ?? ''}
              />
            </Field>
            <Field label="Phone / 電話番号">
              <input
                className={inputCls}
                placeholder="090-0000-0000"
                onChange={(e) =>
                  setPersonalInfo({
                    emergencyContact: {
                      ...cv.personalInfo.emergencyContact,
                      phone: e.target.value,
                      name: cv.personalInfo.emergencyContact?.name ?? '',
                      relationship: cv.personalInfo.emergencyContact?.relationship ?? '',
                    },
                  })
                }
                defaultValue={cv.personalInfo.emergencyContact?.phone ?? ''}
              />
            </Field>
          </div>
        </div>
      )}

      {/* Personal seal (Japan) */}
      {show(f.personalSeal) && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={cv.personalInfo.personalSeal ?? false}
            onChange={(e) => setPersonalInfo({ personalSeal: e.target.checked })}
          />
          <div>
            <span className="text-sm font-medium text-gray-800">
              {f.personalSeal.label ?? 'Personal Seal (捺印)'}
            </span>
            {f.personalSeal.helpText && (
              <p className="text-xs text-gray-500">{f.personalSeal.helpText}</p>
            )}
          </div>
        </label>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

function Field({
  label,
  required,
  helpText,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-gray-500 mb-1">{helpText}</p>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
