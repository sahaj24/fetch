import { hash } from "bcrypt";

// This is a simple in-memory user database for demo purposes
// In a real application, you would use a database
export let users = [
  {
    id: "1",
    name: "Demo User",
    email: "user@example.com",
    password: "$2b$10$8r0qPieXUJO.3P1Zx2F6ZuQkLu3zUYW1sUu1w/fBPwvPyfNnJzqAa", // hashed 'password123'
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
  },
];

// Helper function to register a new user
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
