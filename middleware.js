// middleware.js
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      // Permitem acces oricărei rute care începe cu /api/auth (login, register, NextAuth)
      if (req.nextUrl.pathname.startsWith("/api/auth")) return true;
      // Permitem acces pentru paginile publice:
      if (req.nextUrl.pathname.startsWith("/auth")) return true;
      if (req.nextUrl.pathname === "/") return true;
      // Toate celelalte rute necesită token (user logat)
      return !!token;
    },
  },
});

// Specificăm pentru ce rute se aplică middleware-ul:
export const config = { matcher: ["/api/:path*", "/auth/:path*", "/connections/:path*", "/dashboard/:path*"] };
