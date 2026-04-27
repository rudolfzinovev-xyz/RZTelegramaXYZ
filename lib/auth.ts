import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user || user.isBot || !user.passwordHash) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          phone: user.phone,
          timezone: user.timezone,
          line: user.line,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.phone = (user as any).phone;
        token.timezone = (user as any).timezone;
        token.line = (user as any).line;
      }
      // Re-fetch line from DB on every token refresh so stale JWTs
      // (issued before the line field existed) always get the correct value.
      if (token.id && !token.line) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { line: true },
          });
          if (fresh) token.line = fresh.line;
        } catch { /* ignore */ }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).username = token.username;
        (session.user as any).phone = token.phone;
        (session.user as any).timezone = token.timezone;
        (session.user as any).line = token.line;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
};
