import { ShoppingBasket } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <ShoppingBasket className="size-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assistant Familial</h1>
          <p className="text-muted-foreground text-sm">Vos courses, votre maison, en famille.</p>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
