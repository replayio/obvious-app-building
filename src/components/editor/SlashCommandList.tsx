import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { SlashCommandItem } from '../../extensions/SlashCommand';

interface Props {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandList = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') { setSelectedIndex((i) => (i - 1 + items.length) % items.length); return true; }
        if (event.key === 'ArrowDown') { setSelectedIndex((i) => (i + 1) % items.length); return true; }
        if (event.key === 'Enter') { selectItem(selectedIndex); return true; }
        return false;
      },
    }));

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    if (!items.length) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl py-2 min-w-[260px] max-h-[400px] overflow-y-auto z-50">
        <div className="px-3 pb-1">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Blocks</span>
        </div>
        {items.map((item, index) => (
          <button
            key={item.title}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${index === selectedIndex ? 'bg-indigo-50' : ''}`}
            onClick={() => selectItem(index)}
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-mono font-medium text-gray-600 flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-800">{item.title}</div>
              <div className="text-xs text-gray-400">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }
);
SlashCommandList.displayName = 'SlashCommandList';
