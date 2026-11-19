"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { itemVariants, listVariants } from "@/lib/motion";

/** Container, dessen direkte <StaggerItem>-Kinder gestaffelt einblenden. */
export function Stagger({ children, className, as = "div", ...props }: HTMLMotionProps<"div"> & { as?: "div" | "ul" | "section" }) {
  const Comp = as === "ul" ? motion.ul : as === "section" ? motion.section : motion.div;
  return (
    <Comp variants={listVariants} initial="hidden" animate="show" className={className} {...(props as object)}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = "div", ...props }: HTMLMotionProps<"div"> & { as?: "div" | "li" }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp variants={itemVariants} className={className} {...(props as object)}>
      {children}
    </Comp>
  );
}
