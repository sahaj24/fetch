import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare, hash } from "bcrypt";

// This is a simple in-memory user database for demo purposes
// In a real application, you would use a database
let users = [
  {
    id: "1",
    name: "Demo User",
    email: "user@example.com",
    password: "$2b$10$8r0qPieXUJO.3P1Zx2F6ZuQkLu3zUYW1sUu1w/fBPwvPyfNnJzqAa", // hashed 'password123'
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
  },
];

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = users.find((user) => user.email === credentials.email);

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key",
});

export { handler as GET, handler as POST };

// Helper function to register a new user (for demo purposes)
export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
}) {
  const existingUser = users.find((user) => user.email === userData.email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await hash(userData.password, 10);
  const newUser = {
    id: String(users.length + 1),
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`,
  };

  users.push(newUser);
  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    image: newUser.image,
  };
}
