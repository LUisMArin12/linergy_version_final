import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}

export default function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="block text-sm font-semibold tracking-[-0.01em] text-[#0f172a]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-full rounded-2xl border px-4 py-2.5 pr-11 text-left transition-all duration-200',
            'bg-white/90 shadow-[0_6px_18px_rgba(15,23,42,0.04)] focus:outline-none focus:ring-2 focus:ring-[rgba(21,122,90,0.25)]',
            isOpen ? 'border-[rgba(21,122,90,0.3)]' : 'border-[rgba(15,23,42,0.08)] hover:border-[rgba(21,122,90,0.2)]',
            !value && 'text-[#94a3b8]'
          )}
        >
          <span className="block truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown
            className={clsx(
              'absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748b] transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <div className="border-b border-[rgba(15,23,42,0.06)] p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-10 py-2.5 text-sm outline-none ring-0 transition-all focus:border-transparent focus:ring-2 focus:ring-[rgba(21,122,90,0.25)]"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-1.5">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-4 text-center text-sm text-[#64748b]">No se encontraron resultados</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={clsx(
                      'w-full rounded-2xl px-4 py-2.5 text-left text-sm transition-colors duration-150',
                      option.value === value
                        ? 'bg-[rgba(21,122,90,0.1)] font-medium text-[#0b3d2e]'
                        : 'text-[#0f172a] hover:bg-[rgba(15,23,42,0.04)]'
                    )}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
