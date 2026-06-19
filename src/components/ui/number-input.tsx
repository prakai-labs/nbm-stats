'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
  /** ค่าปัจจุบัน */
  value: string | number
  /** เรียกเมื่อค่าเปลี่ยน — ส่ง string เพื่อรองรับช่องว่าง */
  onValueChange: (value: string) => void
  /** ค่าสูงสุด (default 999) */
  max?: number
  /** ค่าต่ำสุด (default 0) */
  min?: number
  /** จำนวนหลักสูงสุด (default 4) */
  maxLength?: number
  /** ความกว้างของช่อง input (px) — default 48 */
  inputWidth?: number
  /** สีของตัวเลข เช่น 'text-sky-700' */
  colorClassName?: string
  /** ขนาดปุ่ม: 'sm' | 'md' */
  size?: 'sm' | 'md'
  /** ปิดการใช้งาน */
  disabled?: boolean
  /** placeholder */
  placeholder?: string
}

/**
 * NumberInput — กล่องกรอกตัวเลขที่มีปุ่ม +/- อยู่ด้านนอก
 * - ซ่อน spinner ดั้งเดิมของ <input type="number">
 * - แสดงตัวเลขได้ชัดเจนแม้ 2-3 หลัก
 * - ปุ่ม +/- อยู่ด้านข้างนอกกล่อง กดได้ง่ายบนมือถือ (touch target 36×36)
 */
export function NumberInput({
  value,
  onValueChange,
  max = 999,
  min = 0,
  maxLength = 4,
  inputWidth = 48,
  colorClassName = 'text-slate-800',
  size = 'sm',
  disabled = false,
  placeholder = '0',
  ...props
}: NumberInputProps) {
  const sanitize = (v: string) => v.replace(/[^0-9]/g, '').slice(0, maxLength)
  const currentNum = Number(value) || 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(sanitize(e.target.value))
  }

  const increment = () => {
    const next = Math.min(max, currentNum + 1)
    onValueChange(String(next))
  }

  const decrement = () => {
    const next = Math.max(min, currentNum - 1)
    onValueChange(String(next))
  }

  const btnSize = size === 'sm' ? 'h-9 w-7' : 'h-9 w-9'
  const inputSize = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || currentNum <= min}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-600 transition-colors',
          'hover:bg-slate-100 hover:text-slate-800',
          'active:bg-slate-200',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-50',
          btnSize
        )}
        aria-label="ลดจำนวน"
        tabIndex={-1}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'h-9 border-y border-slate-300 bg-white text-center font-semibold tabular-nums outline-none transition-colors',
          'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60',
          inputSize,
          colorClassName
        )}
        style={{ width: `${inputWidth}px` }}
        {...props}
      />
      <button
        type="button"
        onClick={increment}
        disabled={disabled || currentNum >= max}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-r-md border border-l-0 border-slate-300 bg-slate-50 text-slate-600 transition-colors',
          'hover:bg-slate-100 hover:text-slate-800',
          'active:bg-slate-200',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-50',
          btnSize
        )}
        aria-label="เพิ่มจำนวน"
        tabIndex={-1}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
