import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYesterday, endOfYesterday } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  className?: string;
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>("30d");

  const presets = [
    { label: "Hoje", value: "today", getRange: () => ({ from: new Date(), to: new Date() }) },
    { label: "Ontem", value: "yesterday", getRange: () => ({ from: startOfYesterday(), to: endOfYesterday() }) },
    { label: "Últimos 7 Dias", value: "7d", getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
    { label: "Últimos 30 Dias", value: "30d", getRange: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
    { label: "Este Mês", value: "thisMonth", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Mês Passado", value: "lastMonth", getRange: () => {
      const d = subDays(startOfMonth(new Date()), 1);
      return { from: startOfMonth(d), to: endOfMonth(d) };
    } },
    { label: "Período Personalizado", value: "custom", getRange: () => date },
  ];

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value !== "custom") {
      const preset = presets.find((p) => p.value === value);
      if (preset) {
        onDateChange(preset.getRange() as DateRange);
      }
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center gap-2">
        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[260px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd/MM/yyyy")} -{" "}
                    {format(date.to, "dd/MM/yyyy")}
                  </>
                ) : (
                  format(date.from, "dd/MM/yyyy")
                )
              ) : (
                <span>Selecione um período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(newDate) => {
                onDateChange(newDate);
                setSelectedPreset("custom");
              }}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
