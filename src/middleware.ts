import { auth } from "@/lib/auth";

const ADMIN_ROUTES = ["/schools", "/menus", "/admin", "/billing"];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  if (isLoggedIn) {
    const role = (req.auth?.user as { role?: string })?.role;
    const path = req.nextUrl.pathname;
    const isAdminRoute = ADMIN_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
    if (role !== "admin" && isAdminRoute) {
      return Response.redirect(new URL("/", req.nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
