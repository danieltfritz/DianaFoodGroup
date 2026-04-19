"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { X, Plus } from "lucide-react";
import { addMenuItem, removeMenuItem } from "@/lib/actions/menus";

type FoodItem = { id: number; name: string; tempType: string };
type Meal = { id: number; name: string };
type MenuItem = { id: number; foodItemId: number; mealId: number; week: number; dayId: number; foodItem: FoodItem };

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

interface MenuItemsGridProps {
  menuId: number;
  cycleWeeks: number;
  meals: Meal[];
  foodItems: FoodItem[];
  menuItems: MenuItem[];
}

export function MenuItemsGrid({ menuId, cycleWeeks, meals, foodItems, menuItems }: MenuItemsGridProps) {
  const [selectedMeal, setSelectedMeal] = useState<string>("");
  const [selectedFood, setSelectedFood] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("1");
  const [selectedDay, setSelectedDay] = useState<string>("1");

  function getItems(week: number, dayId: number, mealId: number) {
    return menuItems.filter((i) => i.week === week && i.dayId === dayId && i.mealId === mealId);
  }

  async function handleAdd() {
    if (!selectedMeal || !selectedFood) return;
    await addMenuItem({
      menuId,
      foodItemId: Number(selectedFood),
      mealId: Number(selectedMeal),
      week: Number(selectedWeek),
      dayId: Number(selectedDay),
    });
    setSelectedFood("");
  }

  return (
    <div className="space-y-6">
      {/* Add item controls */}
      <div className="flex flex-wrap gap-3 items-end p-4 border rounded-lg bg-muted/30">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Week</p>
          <Select value={selectedWeek} onValueChange={(v) => v && setSelectedWeek(v)}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: cycleWeeks }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>Week {i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Day</p>
          <Select value={selectedDay} onValueChange={(v) => v && setSelectedDay(v)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Meal</p>
          <Select value={selectedMeal} onValueChange={(v) => v && setSelectedMeal(v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Select meal" /></SelectTrigger>
            <SelectContent>
              {meals.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-48">
          <p className="text-xs text-muted-foreground">Food Item</p>
          <Combobox
            value={selectedFood}
            onValueChange={(v) => setSelectedFood(v)}
            options={foodItems.map((f) => ({ value: String(f.id), label: f.name }))}
            placeholder="Select food item…"
          />
        </div>
        <Button onClick={handleAdd} disabled={!selectedMeal || !selectedFood}>
          <Plus className="mr-2 size-4" />Add Item
        </Button>
      </div>

      {/* Grid by week */}
      {Array.from({ length: cycleWeeks }, (_, wi) => {
        const week = wi + 1;
        return (
          <div key={week} className="space-y-2">
            <h3 className="font-semibold">Week {week}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border bg-muted px-3 py-2 text-left w-32">Meal</th>
                    {DAYS.map((d) => (
                      <th key={d} className="border bg-muted px-3 py-2 text-left">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {meals.map((meal) => (
                    <tr key={meal.id}>
                      <td className="border px-3 py-2 font-medium bg-muted/30">{meal.name}</td>
                      {DAYS.map((_, di) => {
                        const dayId = di + 1;
                        const items = getItems(week, dayId, meal.id);
                        return (
                          <td key={dayId} className="border px-2 py-1 align-top min-w-40">
                            <div className="flex flex-wrap gap-1">
                              {items.map((item) => (
                                <Badge
                                  key={item.id}
                                  variant={item.foodItem.tempType === "hot" ? "destructive" : "secondary"}
                                  className="flex items-center gap-1 text-xs"
                                >
                                  {item.foodItem.name}
                                  <button
                                    onClick={() => removeMenuItem(item.id, menuId)}
                                    className="ml-1 hover:opacity-70"
                                  >
                                    <X className="size-2.5" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
