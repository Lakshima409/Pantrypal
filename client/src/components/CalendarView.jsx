function CalendarView({ weeks = [], onSelectDay }) {
  if (!weeks.length) {
    return <p className="text-sm text-gray-500 text-center py-4">No weeks to display.</p>;
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {weeks.map((week, index) => (
        <button
          key={index}
          onClick={() => onSelectDay && onSelectDay(week)}
          className="bg-white border border-gray-200 rounded-md p-2 text-sm hover:border-orange-400 hover:shadow transition"
        >
          <div className="font-medium text-gray-800">{week.day || `Day ${index + 1}`}</div>
          {week.label && <div className="text-xs text-gray-500 truncate">{week.label}</div>}
        </button>
      ))}
    </div>
  );
}

export default CalendarView;

