"use client";

import { motion } from "framer-motion";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Sign in with your username and password.
        </p>
      </div>

      <LoginForm />
    </motion.div>
  );
}
