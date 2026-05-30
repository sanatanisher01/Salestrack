import { useState, useEffect } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { prompt, isInstalled, isIOS, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('install_dismissed') === '1');
  const [showGuide, setShowGuide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent));
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('install_dismissed', '1');
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (prompt) {
      await install();
      setDismissed(true);
    } else {
      setShowGuide(true);
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed || !isMobile) return null;

  return (
    <>
      <div className="fixed bottom-20 left-3 right-3 z-[9999] sm:hidden">
        <div className="bg-white rounded-3xl shadow-float border border-indigo-100 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-gray-900">Install JDM</p>
            <p className="text-xs text-gray-400">Add to home screen for quick access</p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button onClick={handleInstall}
              className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-all">
              Install
            </button>
            <button onClick={handleDismiss}
              className="text-gray-400 text-xs font-medium px-3 py-1 rounded-xl hover:bg-gray-100 transition-all">
              Not now
            </button>
          </div>
        </div>
      </div>

      {/* Install guide modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/50 z-[99999] flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Install JDM</h2>

            {isIOS ? (
              <div className="space-y-3 mt-4">
                <p className="text-sm text-gray-500 text-center mb-3">Follow these steps in Safari:</p>
                {[
                  { step: '1', text: 'Tap the Share button', sub: 'The box with an arrow at the bottom' },
                  { step: '2', text: 'Tap "Add to Home Screen"', sub: 'Scroll down in the share menu' },
                  { step: '3', text: 'Tap "Add"', sub: 'Confirm in the top right corner' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{s.step}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{s.text}</p>
                      <p className="text-xs text-gray-400">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                <p className="text-sm text-gray-500 text-center mb-3">Follow these steps in Chrome:</p>
                {[
                  { step: '1', text: 'Tap the menu (⋮)', sub: 'Three dots in the top right corner' },
                  { step: '2', text: 'Tap "Add to Home screen"', sub: 'Or "Install app" if available' },
                  { step: '3', text: 'Tap "Add"', sub: 'Confirm the installation' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{s.step}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{s.text}</p>
                      <p className="text-xs text-gray-400">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setShowGuide(false); handleDismiss(); }}
              className="btn-primary w-full mt-5">Got it!</button>
          </div>
        </div>
      )}
    </>
  );
}
