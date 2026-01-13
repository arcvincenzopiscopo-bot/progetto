import React from 'react';

interface FilterButtonProps {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
  colorClass: string;
  className?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  label,
  emoji,
  active,
  onClick,
  colorClass,
  className = ''
}) => {
      return (
    <button
      onClick={onClick}
      className={`w-full px-1 py-0.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-1 border ${className} ${
        active
          ? `bg-transparent text-gray-800 border-gray-400 hover:bg-gray-100 hover:border-gray-600 shadow-sm`
          : `bg-transparent text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400 cursor-not-allowed`
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
};

export default FilterButton;
