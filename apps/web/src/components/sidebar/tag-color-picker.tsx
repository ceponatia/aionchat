const TAG_COLOR_OPTIONS = [
  "#38bdf8",
  "#2dd4bf",
  "#84cc16",
  "#f59e0b",
  "#fb7185",
  "#f97316",
  "#a78bfa",
  "#facc15",
];

export const DEFAULT_TAG_COLOR = "#38bdf8";

interface TagColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function TagColorPicker({
  value,
  onChange,
}: TagColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLOR_OPTIONS.map((color) => (
        <button
          key={color}
          type="button"
          className={
            value === color
              ? "h-6 w-6 rounded-full ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-950"
              : "h-6 w-6 rounded-full ring-1 ring-white/10"
          }
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={`Select ${color} tag color`}
        />
      ))}
    </div>
  );
}