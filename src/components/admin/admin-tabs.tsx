"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LookupTable } from "./lookup-table";
import { FoodItemsTable } from "./food-items-table";
import { PaperItemsTab } from "./paper-items-tab";
import { UsersTab } from "./users-tab";
import { AuditLogTab } from "./audit-log-tab";
import {
  createRoute, updateRoute, deleteRoute,
  createCounty, updateCounty, deleteCounty,
  createAgeGroup, updateAgeGroup, deleteAgeGroup,
  createMeal, updateMeal, deleteMeal,
} from "@/lib/actions/lookups";

type Route = { id: number; name: string; driver: string | null };
type County = { id: number; name: string };
type AgeGroup = { id: number; name: string; startAge: number; endAge: number };
type Meal = { id: number; name: string };
type FoodItem = {
  id: number; name: string; tempType: string; isMilk: boolean;
  hasLabel: boolean; showOnReport: boolean; pkUnit: string | null;
  pkSize: number | null; defaultContainerId: number | null;
  foodTypeId: number | null; menuTypeId: number | null; containerThreshold: unknown;
  containerStrategy: string;
};
type Container = { id: number; name: string };
type User = { id: string; name: string | null; email: string; role: string; createdAt: Date };
type AuditEntry = {
  id: number; schoolName: string; date: Date; mealName: string;
  ageGroupName: string; oldCount: number; newCount: number;
  userName: string | null; userEmail: string; changedAt: Date;
};
type PaperSize = { id: number; name: string | null };
type PaperContainer = { id: number; paperSizeId: number; containerName: string; containerSize: number };
type PaperItem = { id: number; name: string; active: boolean; sizes: PaperSize[]; containers: PaperContainer[] };

interface AdminTabsProps {
  routes: Route[];
  counties: County[];
  ageGroups: AgeGroup[];
  meals: Meal[];
  foodItems: FoodItem[];
  containers: Container[];
  users: User[];
  currentUserId: string;
  auditEntries: AuditEntry[];
  paperItems: PaperItem[];
}

export function AdminTabs({
  routes, counties, ageGroups, meals, foodItems, containers,
  users, currentUserId, auditEntries, paperItems,
}: AdminTabsProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin</h1>
      <Tabs defaultValue="users">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="counties">Counties</TabsTrigger>
          <TabsTrigger value="ageGroups">Age Groups</TabsTrigger>
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="food">Food Items</TabsTrigger>
          <TabsTrigger value="paper">Paper Items</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab users={users} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTab entries={auditEntries} />
        </TabsContent>

        <TabsContent value="routes">
          <LookupTable
            title="Routes"
            rows={routes}
            columns={[{ key: "name", label: "Route Name" }, { key: "driver", label: "Driver" }]}
            onCreate={(d) => createRoute({ name: d.name, driver: d.driver })}
            onUpdate={(id, d) => updateRoute(id, { name: d.name, driver: d.driver })}
            onDelete={deleteRoute}
          />
        </TabsContent>

        <TabsContent value="counties">
          <LookupTable
            title="Counties"
            rows={counties}
            columns={[{ key: "name", label: "County Name" }]}
            onCreate={(d) => createCounty({ name: d.name })}
            onUpdate={(id, d) => updateCounty(id, { name: d.name })}
            onDelete={deleteCounty}
          />
        </TabsContent>

        <TabsContent value="ageGroups">
          <LookupTable
            title="Age Groups"
            rows={ageGroups}
            columns={[
              { key: "name", label: "Name" },
              { key: "startAge", label: "Start Age", type: "number" },
              { key: "endAge", label: "End Age", type: "number" },
            ]}
            onCreate={(d) => createAgeGroup({ name: d.name, startAge: Number(d.startAge), endAge: Number(d.endAge) })}
            onUpdate={(id, d) => updateAgeGroup(id, { name: d.name, startAge: Number(d.startAge), endAge: Number(d.endAge) })}
            onDelete={deleteAgeGroup}
          />
        </TabsContent>

        <TabsContent value="meals">
          <LookupTable
            title="Meals"
            rows={meals}
            columns={[{ key: "name", label: "Meal Name" }]}
            onCreate={(d) => createMeal({ name: d.name })}
            onUpdate={(id, d) => updateMeal(id, { name: d.name })}
            onDelete={deleteMeal}
          />
        </TabsContent>

        <TabsContent value="food">
          <FoodItemsTable foodItems={foodItems} containers={containers} />
        </TabsContent>

        <TabsContent value="paper">
          <PaperItemsTab paperItems={paperItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
