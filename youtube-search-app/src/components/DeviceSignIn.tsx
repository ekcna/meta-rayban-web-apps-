import {useEffect, useRef, useState} from 'react';
import {chevronLeftOutline} from '@wearables-ui-toolkit/icons';
import {
  Button,
  IconImage,
  IndeterminateLoader,
  IndeterminateLoaderSize,
  InputTextView,
  TextColor,
  TextStyle,
  TextView,
} from '@wearables-ui-toolkit/mrbd';
import {
  readDeviceOAuthConfig,
  saveDeviceOAuthConfig,
  type DeviceOAuthConfig,
} from '../lib/deviceAuthStore';
import {DeviceAuthError, pollForToken, requestDeviceCode} from '../lib/googleDeviceAuth';

type Step =
  | {kind: 'configuring'}
  | {kind: 'requesting'}
  | {kind: 'waiting'; userCode: string; verificationUrl: string}
  | {kind: 'error'; message: string};

export default function DeviceSignIn({
  onSuccess,
  onClose,
}: {
  onSuccess: (accessToken: string) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<DeviceOAuthConfig | undefined>(() => readDeviceOAuthConfig());
  const [clientIdDraft, setClientIdDraft] = useState('');
  const [clientSecretDraft, setClientSecretDraft] = useState('');
  const [step, setStep] = useState<Step>(config ? {kind: 'requesting'} : {kind: 'configuring'});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (step.kind !== 'requesting' || !config) return;

    const controller = new AbortController();
    abortRef.current = controller;

    requestDeviceCode(config.clientId, controller.signal)
      .then(info => {
        setStep({kind: 'waiting', userCode: info.userCode, verificationUrl: info.verificationUrl});
        return pollForToken(config, info.deviceCode, info.interval, info.expiresIn, controller.signal);
      })
      .then(accessToken => onSuccess(accessToken))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStep({
          kind: 'error',
          message: error instanceof DeviceAuthError ? error.message : "Couldn't reach Google. Check your connection.",
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind, config]);

  function handleSaveConfig() {
    const clientId = clientIdDraft.trim();
    const clientSecret = clientSecretDraft.trim();
    if (!clientId || !clientSecret) return;
    const next = {clientId, clientSecret};
    saveDeviceOAuthConfig(next);
    setConfig(next);
    setStep({kind: 'requesting'});
  }

  return (
    <div className="device-signin-overlay">
      <button
        type="button"
        className="keyboard-back-btn device-signin-close"
        onClick={onClose}
        aria-label="Close sign-in"
      >
        <IconImage source={chevronLeftOutline} className="keyboard-back-icon" />
      </button>

      <div className="device-signin-card">
        {step.kind === 'configuring' && (
          <>
            <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
              Set up Google sign-in
            </TextView>
            <TextView as="p" textStyle={TextStyle.BODY2} textColor={TextColor.SECONDARY}>
              Paste the two values Google Cloud Console showed you after creating the "TVs and
              Limited Input devices" OAuth client: the Client ID, then the Client secret.
            </TextView>
            <InputTextView text={clientIdDraft} onTextChange={setClientIdDraft} hint="Client ID" />
            <InputTextView
              text={clientSecretDraft}
              onTextChange={setClientSecretDraft}
              hint="Client secret"
              showActionButton
              actionLabel="Save"
              onSend={handleSaveConfig}
            />
          </>
        )}

        {step.kind === 'requesting' && <IndeterminateLoader size={IndeterminateLoaderSize.MEDIUM} />}

        {step.kind === 'waiting' && (
          <>
            <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
              Sign in to YouTube
            </TextView>
            <TextView as="p" textStyle={TextStyle.BODY2} textColor={TextColor.SECONDARY}>
              Open the address below on your phone to connect this account
            </TextView>
            <div className="device-signin-code">{step.userCode}</div>
            <TextView as="p" textStyle={TextStyle.BODY2_EMPHASIZED}>
              {step.verificationUrl.replace(/^https?:\/\//, '')}
            </TextView>
            <div className="device-signin-waiting-row">
              <IndeterminateLoader size={IndeterminateLoaderSize.MEDIUM} />
              <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                Waiting…
              </TextView>
            </div>
          </>
        )}

        {step.kind === 'error' && (
          <>
            <TextView as="p" textStyle={TextStyle.BODY2}>
              {step.message}
            </TextView>
            <Button title="Try again" onClick={() => setStep({kind: 'requesting'})} />
          </>
        )}
      </div>
    </div>
  );
}
