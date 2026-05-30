export default function IOSInstallGuide({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-3">Install JDM</h2>
        <ol className="space-y-2 text-sm text-gray-700">
          <li>1. Tap the <strong>Share</strong> button in Safari (box with arrow)</li>
          <li>2. Scroll down and tap <strong>Add to Home Screen</strong></li>
          <li>3. Tap <strong>Add</strong> to confirm</li>
        </ol>
        <button onClick={onClose} className="btn-primary w-full mt-4">Got it</button>
      </div>
    </div>
  );
}
