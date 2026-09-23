"use client";

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-navy">{title}</h2>
          <button className="ghost-btn px-3 py-1" onClick={onClose}>
            إغلاق
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
