import { Badge } from '@/components/ui';
import { FILLING_FAST_SPOTS } from '@/constants/studio';

export interface SpotsBadgeProps {
  spotsLeft: number;
  isFull: boolean;
}

/** "Full" is calm and solid; "Filling fast" (≤ 3 spots) gets the pulse dot. */
export function SpotsBadge({ spotsLeft, isFull }: SpotsBadgeProps) {
  if (isFull) return <Badge tone="danger">Full</Badge>;

  const spots = `${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`;
  if (spotsLeft <= FILLING_FAST_SPOTS) {
    return (
      <Badge tone="warning" dot="pulse">
        Filling fast · {spots}
      </Badge>
    );
  }
  return (
    <Badge tone="success" dot="static">
      {spots}
    </Badge>
  );
}
