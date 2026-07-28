import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-text-primary text-surface-1 hover:opacity-90",
        secondary:
          "border border-border bg-surface-2 text-text-primary hover:bg-surface-3 hover:border-border-strong",
        ghost: "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
        accent: "bg-accent text-accent-fg hover:opacity-90",
        outline:
          "border border-border bg-transparent hover:bg-surface-2 text-text-primary",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5 text-xs",
        icon: "h-8 w-8",
        iconSm: "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
