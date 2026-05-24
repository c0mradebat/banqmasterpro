import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden">
        <div className="absolute inset-0 gradient-primary" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="rounded-xl bg-white/15 p-2 backdrop-blur">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">BanqMaster Pro</div>
            <div className="text-xs opacity-80">Banquet Hall Management</div>
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Run your banquet hall
            <br />
            like a five-star resort.
          </h1>
          <p className="text-white/80 max-w-md">
            Bookings, enquiries, payments, rooms, vendors, electricity, calendar,
            availability — every part of your business in one beautiful workspace.
          </p>
        </div>
        <div className="relative z-10 text-sm text-white/70">
          © {new Date().getFullYear()} BanqMaster · Built for hospitality
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="rounded-lg gradient-primary p-2 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">BanqMaster Pro</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your staff account to continue.
            </p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
          <div className="rounded-lg border bg-muted/40 p-4 text-xs space-y-1.5">
            <div className="font-semibold text-foreground">Demo accounts (password: <code>admin123</code>)</div>
            <div className="grid grid-cols-2 gap-y-1 text-muted-foreground">
              <span>owner</span><span>Full access</span>
              <span>admin</span><span>Settings & users</span>
              <span>manager</span><span>Bookings & reports</span>
              <span>reception</span><span>Front desk</span>
              <span>accountant</span><span>Payments & finance</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
