// shadcn/ui Sheet (Radix Dialog 기반) — 하단/측면 시트. 핸드오프 §7: 하단 시트 = Sheet.
// 표준 shadcn 소스를 이 레포 관례(상대 import, lng/디방 토큰 호환)에 맞춰 이식.
import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { translate, useLangStore } from '../../lib/i18n'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
}

const sheetVariants = cva(
  'fixed z-50 mx-auto max-w-[420px] bg-[#0A1626] text-[#E8EFF6] shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-300',
  {
    variants: {
      side: {
        bottom:
          'inset-x-0 bottom-0 rounded-t-[26px] border-t border-white/10 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-[90vh] overflow-auto',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l border-white/10 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      },
    },
    defaultVariants: { side: 'bottom' },
  },
)

interface SheetContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** 우측 상단 닫기(X) 버튼 노출 여부. */
  showClose?: boolean
}

function SheetContent({ side = 'bottom', showClose = true, className, children, ...props }: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), 'p-5 pb-7', className)} {...props}>
        {children}
        {showClose && (
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-white/60 opacity-80 transition hover:opacity-100 focus:outline-none">
            <X className="h-5 w-5" />
            <span className="sr-only">{translate(useLangStore.getState().lang, 'common.close')}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mb-3 flex flex-col gap-1 text-left', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn('text-lg font-bold text-white', className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-sm leading-relaxed text-white/60', className)} {...props} />
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}
