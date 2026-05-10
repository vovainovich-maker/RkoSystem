import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation, useNavigate } from "@tanstack/react-router";
import { AppSidebar, MobileMenuProvider, MobileDrawer, MobileHeader, ImpersonationBanner } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { createContext, useContext, useEffect } from "react";
import { Toaster } from "sonner";
import type { AuthState } from "@/hooks/useAuth";

const AuthContext = createContext<(AuthState & { signOut: () => Promise<void>; refetchProfile: () => void }) | null>(null);
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Rko System — CRM Platform" },
      { name: "description", content: "Premium CRM система для управления продажами и лидами" },
      { name: "author", content: "Rko System" },
      { property: "og:title", content: "Rko System — CRM Platform" },
      { property: "og:description", content: "Premium CRM система для управления продажами и лидами" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Rko System — CRM Platform" },
      { name: "twitter:description", content: "Premium CRM система для управления продажами и лидами" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/X2eDgpAUyXZuk0wRLsjI2CoL9HA2/social-images/social-1777638462524-ChatGPT_Image_1_мая_2026_г.,_18_27_23_(1).webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/X2eDgpAUyXZuk0wRLsjI2CoL9HA2/social-images/social-1777638462524-ChatGPT_Image_1_мая_2026_г.,_18_27_23_(1).webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    // During impersonation, skip auto-redirect so verifyOtp can complete
    if (typeof window !== 'undefined' && sessionStorage.getItem('impersonating')) return;
    if (!auth.loading && !auth.user && !isLoginPage) {
      navigate({ to: '/login' });
    }
    if (!auth.loading && auth.user && isLoginPage) {
      navigate({ to: '/' });
    }
  }, [auth.loading, auth.user, isLoginPage, navigate]);

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald font-bold text-emerald-foreground text-2xl animate-pulse">RS</div>
      </div>
    );
  }

  // Login page — no sidebar
  if (isLoginPage) {
    return (
      <AuthContext.Provider value={{ ...auth, signOut: auth.signOut, refetchProfile: auth.refetchProfile as () => void }}>
        <Outlet />
        <Toaster position="top-right" theme="dark" />
      </AuthContext.Provider>
    );
  }

  // All other pages — always show sidebar layout (even if user is briefly null during redirect)
  return (
    <AuthContext.Provider value={{ ...auth, signOut: auth.signOut, refetchProfile: auth.refetchProfile as () => void }}>
      <MobileMenuProvider>
        <div className="flex min-h-screen bg-background">
          <AppSidebar />
          <MobileDrawer />
          <div className="flex-1 md:ml-[240px] transition-all duration-300 flex flex-col min-w-0">
            <ImpersonationBanner />
            <MobileHeader />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </MobileMenuProvider>
      <Toaster position="top-right" theme="dark" />
    </AuthContext.Provider>
  );
}
