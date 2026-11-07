"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function MainTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}
      className="flex h-full min-h-0 w-full flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
