"use client"

import { useMemo, useState } from "react"
import { ChevronsUpDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getTimezones, offsetLabel } from "@/lib/time"

const NONE: string[] = []

export function TimezonePicker({
  value,
  onChange,
  placeholder,
  exclude = NONE,
  searchPlaceholder,
  emptyText,
}: {
  value?: string
  onChange: (tz: string) => void
  placeholder: string
  exclude?: string[]
  searchPlaceholder: string
  emptyText: string
}) {
  const [open, setOpen] = useState(false)
  const zones = useMemo(() => {
    const now = new Date()
    return getTimezones()
      .filter((z) => !exclude.includes(z))
      .map((z) => ({ z, off: offsetLabel(z, now) }))
  }, [exclude])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{value ? value.replace(/_/g, " ") : placeholder}</span>
          <span className="ml-2 flex items-center gap-2 text-muted-foreground">
            {value && <span className="text-xs">{offsetLabel(value)}</span>}
            <ChevronsUpDownIcon className="size-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {zones.map(({ z, off }) => (
              <CommandItem
                key={z}
                data-checked={value === z}
                value={`${z} ${z.replace(/_/g, " ")} ${off}`}
                onSelect={() => {
                  onChange(z)
                  setOpen(false)
                }}
              >
                <span className="flex-1 truncate">{z.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">{off}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
