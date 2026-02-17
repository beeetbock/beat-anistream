export default function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[160px] sm:w-[180px]">
      <div className="aspect-[2/3] rounded-lg shimmer" />
      <div className="mt-2 h-4 w-3/4 rounded shimmer" />
      <div className="mt-1 h-3 w-1/2 rounded shimmer" />
    </div>
  );
}
