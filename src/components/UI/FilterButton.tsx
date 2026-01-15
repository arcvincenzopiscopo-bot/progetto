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
      className={`w-[90%] px-1 py-0.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-1 ${className} ${
        active
          ? `${colorClass} text-white shadow-md`
          : `${colorClass}/20 text-white hover:${colorClass}/40 border border-gray-300`
      }`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
};

export default FilterButton;
