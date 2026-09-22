export function GlassCard({ children, className = '' }) {
  return (
    <div className={`glass-panel rounded-[2.5rem] p-8 md:p-10 ${className}`}>
      {children}
    </div>
  );
}
