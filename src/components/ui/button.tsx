import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const variants = cva('button', {
  variants: {
    variant: {
      default: 'button--primary',
      outline: 'button--outline',
      ghost: 'button--ghost',
    },
    size: { default: '', icon: 'button--icon' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
type Props = ComponentProps<'button'> &
  VariantProps<typeof variants> & { asChild?: boolean };
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: Props) {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(variants({ variant, size }), className)}
      {...(!asChild ? { type: 'button' as const } : {})}
      {...props}
    />
  );
}
