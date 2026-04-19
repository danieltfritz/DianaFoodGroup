"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { addMenuItem, removeMenuItem } from "@/lib/actions/menus";

type FoodItem = { id: number; name: string; tempType: string };
type Meal = { id: number; name: string };
type MenuItem = { id: number; foodItemId: number; mealId: number; week: number; dayId: number; foodItem: FoodItem };

const DAYS = [
  { id: 1, label: "Monday" },
  { id: 2, label: "Tuesday" },
  { id: 3, label: "Wednesday" },
  { id: 4, label: "Thursday" },
  { id: 5, label: "Friday" },
  { id: 6, label: "Saturday" },
  { id: 7, label: "Sunday" },
];

interface MenuItemsPickerProps {
  menuId: number;
  cycleWeeks: number;
  meals: Meal[];
  foodItems: FoodItem[];
  menuItems: MenuItem[];
}

export function MenuItemsPicker({ menuId, cycleWeeks, meals, foodItems, menuItems: initial }: MenuItemsPickerProps) {
  const [items, setItems] = useState<MenuItem[]>(initial);
  const [week, setWeek] = useState(1);
  const [dayId, setDayId] = useState(1);
  const [mealId, setMealId] = useState(meals[0]?.id ?? 1);
  const [, startTransition] = useTransition();

  const selected = items.filter((i) => i.week === week && i.dayId === dayId && i.mealId === mealId);
  const selectedFoodIds = new Set(selected.map((i) => i.foodItemId));
  const available = foodItems.filter((f) => !selectedFoodIds.has(f.id));

  function handleAdd(food: FoodItem) {
    const optimistic: MenuItem = {
      id: -(Date.now()),
      foodItemId: food.id,
      mealId,
      week,
      dayId,
      foodItem: food,
    };
    setItems((prev) => [...prev, optimistic]);
    startTransition(async () => {
      const result = await addMenuItem({ menuId, foodItemId: food.id, mealId, week, dayId });
      if (result?.id) {
        setItems((prev) => prev.map((i) => (i.id === optimistic.id ? { ...i, id: result.id } : i)));
      }
    });
  }

  function handleRemove(item: MenuItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    startTransition(async () => {
      await removeMenuItem(item.id, menuId);
    });
  }

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Left sidebar: weeks + days */}
      <div className="flex flex-col gap-4 w-40 shrink-0">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Week</p>
          <div className="border rounded-md overflow-hidden">
            {Array.from({ length: cycleWeeks }, (_, i) => i + 1).map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={cn(
                  "w-full px-3 py-1.5 text-sm text-left transition-colors",
                  week === w
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted"
                )}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Day</p>
          <div className="space-y-1">
            {DAYS.map((d) => (
              <label key={d.id} className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
                <input
                  type="radio"
                  name="day"
                  value={d.id}
                  checked={dayId === d.id}
                  onChange={() => setDayId(d.id)}
                  className="accent-primary"
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 gap-3">
        {/* Meal tabs */}
        <div className="flex gap-1 border-b">
          {meals.map((m) => (
            <button
              key={m.id}
              onClick={() => setMealId(m.id)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium border border-b-0 rounded-t transition-colors -mb-px",
                mealId === m.id
                  ? "bg-background border-border text-foreground"
                  : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Two panels */}
        <div className="flex gap-3 flex-1 min-h-0">
          {/* Available foods (left) */}
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Available — click to add</p>
            <div className="border rounded-md flex-1 overflow-y-auto">
              {available.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 italic">All food items added</p>
              )}
              {available.map((food) => (
                <button
                  key={food.id}
                  onClick={() => handleAdd(food)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-b-0"
                >
                  {food.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected foods (right) */}
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">
              Selected — click to remove
              {selected.length > 0 && <span className="ml-2 font-medium text-foreground">{selected.length} items</span>}
            </p>
            <div className="border rounded-md flex-1 overflow-y-auto">
              {selected.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 italic">No items for this week / day / meal</p>
              )}
              {selected.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleRemove(item)}
                  className="w-full text-left px-3 py-1.5 text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition-colors border-b last:border-b-0"
                >
                  {item.foodItem.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
