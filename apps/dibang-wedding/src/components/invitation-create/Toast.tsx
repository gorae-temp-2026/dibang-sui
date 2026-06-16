export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 flex justify-center animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-gray-900/95 backdrop-blur-sm px-6 py-4 shadow-2xl flex items-center gap-4">
        <div className="w-1 h-8 rounded-full bg-red-400 shrink-0" />
        <span className="text-base text-white flex-1">{message}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg shrink-0">&times;</button>
      </div>
    </div>
  );
}
