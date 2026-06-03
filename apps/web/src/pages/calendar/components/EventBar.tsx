import dayjs from 'dayjs';
import type { CalendarEvent, NormalisedBooking } from '../../../api/calendar';
import { getEventColor } from '../constants';

// ─── Mini event bar (used in month cells) ────────────────────────────────────

export function EventBar({
  event,
  onClick,
}: {
  event: CalendarEvent | NormalisedBooking;
  onClick: () => void;
}) {
  const color = getEventColor(event);
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: `${color}22`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 3,
        padding: '1px 4px',
        marginBottom: 2,
        cursor: 'pointer',
        fontSize: 11,
        color,
        fontWeight: 500,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
      title={event.title}
    >
      {event.isAllDay ? '' : `${dayjs(event.startTime).format('HH:mm')} `}{event.title}
    </div>
  );
}
