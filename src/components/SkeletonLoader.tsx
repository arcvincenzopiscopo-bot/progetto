import React from 'react';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  lines?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'rectangular',
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-200';

  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded';
      default:
        return 'rounded-md';
    }
  };

  const getSizeClasses = () => {
    if (variant === 'circular') {
      return {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: typeof height === 'number' ? `${height}px` : height,
      };
    }

    if (variant === 'text') {
      return {
        width: typeof width === 'number' ? `${width}px` : width,
        height: '1rem',
        marginBottom: '0.5rem',
      };
    }

    return {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    };
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...getSizeClasses(),
              width: index === lines - 1 ? '60%' : '100%', // Last line is shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={getSizeClasses()}
    />
  );
};

// Specific skeleton components for common use cases
export const MapSkeleton = () => (
  <div className="bg-gray-200 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
    <div className="h-[66vh] w-full bg-gray-300 animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-400 rounded-full mx-auto mb-4 animate-pulse"></div>
        <SkeletonLoader variant="text" width="120px" height="1.5rem" />
        <SkeletonLoader variant="text" width="80px" height="1rem" className="mt-2" />
      </div>
    </div>
  </div>
);

export const POICardSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
    <div className="flex items-center space-x-3">
      <SkeletonLoader variant="circular" width={32} height={32} />
      <div className="flex-1">
        <SkeletonLoader variant="text" width="60%" height="1.2rem" />
        <SkeletonLoader variant="text" width="40%" height="0.9rem" className="mt-1" />
      </div>
    </div>
    <SkeletonLoader variant="text" lines={2} />
    <div className="flex space-x-2">
      <SkeletonLoader width="80px" height="32px" />
      <SkeletonLoader width="80px" height="32px" />
    </div>
  </div>
);

export const FilterSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
    <SkeletonLoader variant="text" width="100px" height="1.2rem" />
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          <SkeletonLoader variant="rectangular" width={20} height={20} />
          <SkeletonLoader variant="text" width="80px" height="1rem" />
        </div>
      ))}
    </div>
  </div>
);

export default SkeletonLoader;