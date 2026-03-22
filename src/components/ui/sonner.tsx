import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={(theme === "light" ? "dark" : theme) as ToasterProps["theme"]}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-white/10 bg-slate-900/95 text-white shadow-2xl shadow-cyan-950/20",
          title: "text-white",
          description: "text-white/65",
          actionButton: "bg-lime-400 text-slate-950 hover:bg-lime-300",
          cancelButton: "bg-white/10 text-white hover:bg-white/15",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
