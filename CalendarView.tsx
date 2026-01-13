import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";

interface CalendarViewProps {
  appointments: any[];
  onDateSelect: (date: Date) => void;
  onAppointmentClick: (appointment: any) => void;
}

export function CalendarView({ appointments, onDateSelect, onAppointmentClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");

  const navigateDate = (direction: "prev" | "next") => {
    if (view === "day") {
      setCurrentDate(prev => addDays(prev, direction === "next" ? 1 : -1));
    } else if (view === "week") {
      setCurrentDate(prev => direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.appointment_date), date) && apt.status !== 'cancelled'
    );
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(currentDate);
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

    return (
      <div className="space-y-2">
        {hours.map(hour => {
          const hourAppointments = dayAppointments.filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            return aptDate.getHours() === hour;
          });

          return (
            <div key={hour} className="flex border-b">
              <div className="w-20 text-sm text-muted-foreground p-2">
                {format(new Date().setHours(hour, 0), 'h:mm a')}
              </div>
              <div className="flex-1 min-h-[60px] p-2 space-y-1">
                {hourAppointments.map(apt => (
                  <div
                    key={apt.id}
                    onClick={() => onAppointmentClick(apt)}
                    className="bg-primary/10 border-l-4 border-primary p-2 rounded cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    <p className="font-medium text-sm">
                      {apt.clients?.first_name} {apt.clients?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.appointment_date), 'h:mm a')} ({apt.duration_minutes} min)
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const dayAppointments = getAppointmentsForDate(day);
          return (
            <div
              key={day.toString()}
              className="border rounded-lg cursor-pointer hover:bg-accent/40 transition-colors"
              onClick={() => {
                setCurrentDate(day);
                setView("day");
                onDateSelect(day);
              }}
            >
              <div className="p-2 border-b bg-accent/50">
                <p className="text-sm font-medium">{format(day, 'EEE')}</p>
                <p className="text-2xl font-bold">{format(day, 'd')}</p>
              </div>
              <div className="p-2 space-y-1 min-h-[200px]">
                {dayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(apt);
                    }}
                    className="bg-primary/10 border-l-2 border-primary p-1 rounded text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    <p className="font-medium truncate">
                      {format(new Date(apt.appointment_date), 'h:mm a')}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {apt.clients?.first_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = startOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ 
      start: startDate, 
      end: addDays(endDate, 6) 
    });

    return (
      <div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const dayAppointments = getAppointmentsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toString()}
                onClick={() => {
                  setCurrentDate(day);
                  setView("day");
                  onDateSelect(day);
                }}
                className={`border rounded-lg p-2 min-h-[100px] cursor-pointer hover:bg-accent/50 transition-colors ${
                  !isCurrentMonth ? 'opacity-50' : ''
                } ${isToday ? 'border-primary border-2' : ''}`}
              >
                <p className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(apt);
                      }}
                      className="bg-primary/10 px-1 py-0.5 rounded text-[10px] truncate"
                    >
                      {format(new Date(apt.appointment_date), 'h:mm a')}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{dayAppointments.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {view === "day" && format(currentDate, 'EEEE, MMMM d, yyyy')}
            {view === "week" && `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
            {view === "month" && format(currentDate, 'MMMM yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {view === "day" && renderDayView()}
        {view === "week" && renderWeekView()}
        {view === "month" && renderMonthView()}
      </CardContent>
    </Card>
  );
}
