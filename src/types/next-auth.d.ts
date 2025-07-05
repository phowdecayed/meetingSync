import type { DefaultSession, User as NextAuthUser } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'member';
    } & DefaultSession['user'];
  }

  interface User extends NextAuthUser {
    role: 'admin' | 'member';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'member';
  }
}
