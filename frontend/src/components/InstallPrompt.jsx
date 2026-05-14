import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import IOSInstallGuide from './IOSInstallGuide';

export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt();
  const [showIOS, setShowIOS] = useState(false);

  if (isInstalled) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <>
      <button
        onClick={isIOS ? () => setShowIOS(true) : install}
        className="btn-primary text-sm px-3 py-1.5"
      >
        Install App
      </button>
      {showIOS && <IOSInstallGuide onClose={() => setShowIOS(false)} />}
    </>
  );
}
