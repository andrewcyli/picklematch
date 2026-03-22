import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="border-white/10 bg-slate-900/95 text-white shadow-2xl shadow-cyan-950/20">
            <div className="grid gap-1">
              {title && <ToastTitle className="text-white">{title}</ToastTitle>}
              {description && <ToastDescription className="text-white/65">{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose className="text-white/50 hover:text-white" />
          </Toast>
        );
      })}
      <ToastViewport className="fixed left-1/2 top-2 -translate-x-1/2 z-[100] w-full max-w-[420px] p-4" />
    </ToastProvider>
  );
}
