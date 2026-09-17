import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// Admin dashboard skeleton. The runner routes each have one; the founder area
// had none, so every tab tap sat on the previous screen with no sign the app
// had registered it. Skeleton's fill is the on-dark token, so it is overridden
// to the light-surface mist here.
const BLOCK = 'bg-wi-mist';

/** Dashboard skeleton: mirrors the heading, the two config cards, and the member grid so the real page lands with no shift. */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className={`h-8 w-32 ${BLOCK}`} />

      {[0, 1].map((card) => (
        <Card key={card}>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className={`h-3 w-40 ${BLOCK}`} />
            <Skeleton className={`h-4 w-full max-w-lg ${BLOCK}`} />
            <Skeleton className={`h-11 w-56 ${BLOCK}`} />
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col gap-2">
        <Skeleton className={`h-6 w-24 ${BLOCK}`} />
        <Skeleton className={`h-4 w-48 ${BLOCK}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className={`h-4 w-32 ${BLOCK}`} />
                <Skeleton className={`h-5 w-24 rounded-full ${BLOCK}`} />
              </div>
              <div className="flex flex-col gap-2 border-t border-wi-line pt-3">
                <Skeleton className={`h-4 w-full ${BLOCK}`} />
                <Skeleton className={`h-4 w-full ${BLOCK}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
