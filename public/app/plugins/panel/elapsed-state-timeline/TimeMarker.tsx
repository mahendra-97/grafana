import { timeMarker, timeMarkerPointer } from './styles';

interface TimeMarkerProps {
  position: number;
  type: 'start' | 'end';
  onPointerDown: (
    event: React.PointerEvent,
    marker: 'start' | 'end',
  ) => void;
}

export const TimeMarker = ({ position, type, onPointerDown }: TimeMarkerProps) => {
  return (
    <div
      className={timeMarker}
      style={{
        left: `${position}%`,
      }}
      onPointerDown={(event) => {
        onPointerDown(event, type);
      }}>
        <div className={timeMarkerPointer}></div>
    </div>
  )
}